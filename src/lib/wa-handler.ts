// src/lib/wa-handler.ts
// Main message handler — routes WhatsApp messages to the right flow

import { supabase, isSupabaseConfigured } from "./supabase";
import {
  analyzeMessage,
  buildTransactionReply,
  buildQueryReply,
  formatRupiah,
  getTodayWIB,
  getMonthWIB,
  type AIIntent,
} from "./wa-ai";

// ─── Constants ──────────────────────────────────────────────
const GOWA_API_URL = process.env.GOWA_API_URL || "http://localhost:3000";
const GOWA_API_KEY = process.env.GOWA_API_KEY || "";

// ─── User mapping: WhatsApp number → Supabase user_id ──────
// In production, you'd have a proper mapping table
// For now, we use a simple lookup
interface WAUserMapping {
  wa_number: string;
  user_id: string;
  device_id: string;
}

async function getUserByPhone(phone: string): Promise<WAUserMapping | null> {
  if (!isSupabaseConfigured) return null;

  // Normalize phone number (remove +, ensure starts with country code)
  const normalizedPhone = phone.replace(/[^0-9]/g, "");

  const { data, error } = await supabase
    .from("wa_users")
    .select("wa_number, user_id, device_id")
    .eq("wa_number", normalizedPhone)
    .single();

  if (error || !data) return null;
  return data as WAUserMapping;
}

// ─── Send reply back to WhatsApp via GOWA ──────────────────
async function sendWhatsAppReply(
  phone: string,
  message: string,
  deviceId?: string
): Promise<void> {
  try {
    const url = `${GOWA_API_URL}/send/message`;
    const body: Record<string, string> = {
      phone: phone,
      message: message,
    };
    if (deviceId) {
      body["device_id"] = deviceId;
    }

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(GOWA_API_KEY ? { Authorization: `Bearer ${GOWA_API_KEY}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("Failed to send WhatsApp reply:", err);
  }
}

// ─── Main handler ───────────────────────────────────────────
export async function handleWhatsAppMessage(
  senderPhone: string,
  messageText: string,
  deviceId?: string
): Promise<void> {
  // Skip empty messages
  if (!messageText?.trim()) return;

  // 1. Find user by phone number
  const userMapping = await getUserByPhone(senderPhone);

  if (!userMapping) {
    await sendWhatsAppReply(
      senderPhone,
      `Halo! 👋 Nomor kamu belum terdaftar di FinTrack.\n\nSilakan daftar di aplikasi FinTrack terlebih dahulu, lalu hubungkan nomor WhatsApp kamu di menu Settings.`,
      deviceId
    );
    return;
  }

  const userId = userMapping.user_id;
  const today = getTodayWIB();
  const currentMonth = getMonthWIB();

  try {
    // 2. Parse message with AI
    const intent = await analyzeMessage(messageText, today);

    // 3. Route based on intent
    switch (intent.intent) {
      case "transaction":
        await handleTransaction(intent, userId, senderPhone, deviceId);
        break;
      case "query":
        await handleQuery(intent, userId, senderPhone, deviceId, currentMonth);
        break;
      case "command":
        await handleCommand(intent.command, userId, senderPhone, deviceId, currentMonth);
        break;
      case "clarify":
        await sendWhatsAppReply(senderPhone, intent.reply, deviceId);
        break;
      case "other":
        await sendWhatsAppReply(senderPhone, intent.reply, deviceId);
        break;
    }
  } catch (err) {
    console.error("Error handling message:", err);
    await sendWhatsAppReply(
      senderPhone,
      "Maaf, ada kendala teknis. Coba lagi ya! 😅",
      deviceId
    );
  }
}

// ─── Handle transaction creation ────────────────────────────
async function handleTransaction(
  intent: Extract<AIIntent, { intent: "transaction" }>,
  userId: string,
  senderPhone: string,
  deviceId?: string
) {
  if (!isSupabaseConfigured) {
    await sendWhatsAppReply(senderPhone, "Sistem belum terkonfigurasi. Silakan hubungi admin.", deviceId);
    return;
  }

  // Get default wallet
  const { data: wallets } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .single();

  const walletId = wallets?.id || null;

  // Create transaction
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      wallet_id: walletId,
      type: intent.type,
      amount: intent.amount,
      category: intent.category,
      note: intent.note,
      date: intent.date,
    })
    .select()
    .single();

  if (txError) {
    console.error("Transaction creation error:", txError);
    await sendWhatsAppReply(senderPhone, "Gagal mencatat transaksi. Coba lagi ya! 😅", deviceId);
    return;
  }

  // Update wallet balance
  if (walletId) {
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("id", walletId)
      .single();

    const newBalance =
      intent.type === "income"
        ? (wallet?.balance || 0) + intent.amount
        : (wallet?.balance || 0) - intent.amount;

    await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", walletId);

    // Get total balance across all wallets
    const { data: allWallets } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId);

    const totalBalance = allWallets?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0;

    const reply = buildTransactionReply(
      intent.type,
      intent.amount,
      intent.category,
      intent.note,
      intent.date,
      totalBalance
    );
    await sendWhatsAppReply(senderPhone, reply, deviceId);
  } else {
    const reply = buildTransactionReply(
      intent.type,
      intent.amount,
      intent.category,
      intent.note,
      intent.date,
      0
    );
    await sendWhatsAppReply(senderPhone, reply + "\n\n⚠️ Tidak ada wallet default", deviceId);
  }
}

// ─── Handle financial queries ───────────────────────────────
async function handleQuery(
  intent: Extract<AIIntent, { intent: "query" }>,
  userId: string,
  senderPhone: string,
  deviceId?: string,
  currentMonth?: string
) {
  if (!isSupabaseConfigured) {
    await sendWhatsAppReply(senderPhone, "Sistem belum terkonfigurasi.", deviceId);
    return;
  }

  const month = currentMonth || getMonthWIB();
  const today = getTodayWIB();

  switch (intent.query_type) {
    case "saldo": {
      const { data: wallets } = await supabase
        .from("wallets")
        .select("name, balance")
        .eq("user_id", userId);

      const total = wallets?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0;
      const reply = buildQueryReply("saldo", {
        wallets: wallets || [],
        total,
      });
      await sendWhatsAppReply(senderPhone, reply, deviceId);
      break;
    }

    case "pengeluaran": {
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, category")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("date", `${month}-01`)
        .lte("date", `${month}-31`);

      const byCategory: Record<string, number> = {};
      let total = 0;
      for (const t of transactions || []) {
        const cat = t.category || "Lainnya";
        byCategory[cat] = (byCategory[cat] || 0) + (t.amount || 0);
        total += t.amount || 0;
      }

      const reply = buildQueryReply("pengeluaran", {
        total,
        byCategory,
        period: `bulan ${month}`,
      });
      await sendWhatsAppReply(senderPhone, reply, deviceId);
      break;
    }

    case "pemasukan": {
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, category")
        .eq("user_id", userId)
        .eq("type", "income")
        .gte("date", `${month}-01`)
        .lte("date", `${month}-31`);

      const byCategory: Record<string, number> = {};
      let total = 0;
      for (const t of transactions || []) {
        const cat = t.category || "Lainnya";
        byCategory[cat] = (byCategory[cat] || 0) + (t.amount || 0);
        total += t.amount || 0;
      }

      const reply = buildQueryReply("pemasukan", {
        total,
        byCategory,
        period: `bulan ${month}`,
      });
      await sendWhatsAppReply(senderPhone, reply, deviceId);
      break;
    }

    case "hutang": {
      const { data: debts } = await supabase
        .from("debts")
        .select("name, debt_type, remaining_amount, due_date")
        .eq("user_id", userId)
        .gt("remaining_amount", 0);

      const hutang =
        debts?.filter((d) => d.debt_type === "hutang") || [];
      const totalHutang = hutang.reduce((s, d) => s + (d.remaining_amount || 0), 0);
      const piutang =
        debts?.filter((d) => d.debt_type === "piutang") || [];
      const totalPiutang = piutang.reduce((s, d) => s + (d.remaining_amount || 0), 0);

      const reply = buildQueryReply("hutang", {
        debts: debts || [],
        totalHutang,
        totalPiutang,
      });
      await sendWhatsAppReply(senderPhone, reply, deviceId);
      break;
    }

    case "budget": {
      const { data: budgets } = await supabase
        .from("budgets")
        .select("category, limit_amount")
        .eq("user_id", userId)
        .eq("month", month);

      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, category")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("date", `${month}-01`)
        .lte("date", `${month}-31`);

      const spentByCategory: Record<string, number> = {};
      for (const t of transactions || []) {
        const cat = t.category || "";
        spentByCategory[cat] = (spentByCategory[cat] || 0) + (t.amount || 0);
      }

      const budgetProgress = (budgets || []).map((b) => {
        const spent = spentByCategory[b.category] || 0;
        return {
          category: b.category,
          limit_amount: b.limit_amount,
          spent,
          percentage: b.limit_amount > 0 ? (spent / b.limit_amount) * 100 : 0,
        };
      });

      const reply = buildQueryReply("budget", { budgets: budgetProgress });
      await sendWhatsAppReply(senderPhone, reply, deviceId);
      break;
    }

    case "ringkasan": {
      const { data: txs } = await supabase
        .from("transactions")
        .select("type, amount")
        .eq("user_id", userId)
        .gte("date", `${month}-01`)
        .lte("date", `${month}-31`);

      const income = (txs || [])
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + (t.amount || 0), 0);
      const expense = (txs || [])
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + (t.amount || 0), 0);

      const reply = buildQueryReply("ringkasan", {
        income,
        expense,
        period: `bulan ${month}`,
      });
      await sendWhatsAppReply(senderPhone, reply, deviceId);
      break;
    }

    default:
      await sendWhatsAppReply(
        senderPhone,
        "Maaf, aku belum paham pertanyaan itu. Coba tanya saldo, pengeluaran, hutang, atau budget ya! 😊",
        deviceId
      );
  }
}

// ─── Handle slash commands ──────────────────────────────────
async function handleCommand(
  command: string,
  userId: string,
  senderPhone: string,
  deviceId?: string,
  currentMonth?: string
) {
  const cmd = command.toLowerCase();

  // Route commands as queries
  switch (cmd) {
    case "/saldo":
      await handleQuery(
        { intent: "query", query_type: "saldo", period: "semua", reply_hint: "" },
        userId,
        senderPhone,
        deviceId,
        currentMonth
      );
      break;
    case "/budget":
      await handleQuery(
        { intent: "query", query_type: "budget", period: "bulan_ini", reply_hint: "" },
        userId,
        senderPhone,
        deviceId,
        currentMonth
      );
      break;
    case "/hutang":
      await handleQuery(
        { intent: "query", query_type: "hutang", period: "semua", reply_hint: "" },
        userId,
        senderPhone,
        deviceId,
        currentMonth
      );
      break;
    case "/export":
      await sendWhatsAppReply(
        senderPhone,
        `📊 *Export Data*\n\nKamu bisa download data keuangan kamu di:\n\n🔗 https://fintrack.app/settings\n\nMasuk ke menu Settings → Export Data → Download CSV`,
        deviceId
      );
      break;
    case "/help":
      await sendWhatsAppReply(
        senderPhone,
        `🤖 *FinTrack AI Assistant*\n\nKirim pesan biasa untuk mencatat transaksi:\n• "beli makan siang 25rb"\n• "dapat gaji 5 juta"\n• "kemarin beli bensin 50k"\n\nAtau tanyakan tentang keuangan:\n• "berapa saldo gw?"\n• "pengeluaran bulan ini?"\n• "utang gw ke siapa?"\n\n*Perintah:*\n/saldo — Cek total saldo\n/budget — Status budget\n/hutang — Daftar hutang\n/export — Download data\n/help — Bantuan ini`,
        deviceId
      );
      break;
    default:
      await sendWhatsAppReply(senderPhone, "Perintah tidak dikenali. Ketik /help untuk bantuan.", deviceId);
  }
}
