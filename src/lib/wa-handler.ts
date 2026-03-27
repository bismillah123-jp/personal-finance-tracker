// src/lib/wa-handler.ts
// Main message handler — routes WhatsApp messages to the right flow

import { supabase, isSupabaseConfigured, getSupabaseAdmin } from "./supabase";
import {
  analyzeMessage,
  buildTransactionReply,
  buildQueryReply,
  formatRupiah,
  getTodayWIB,
  getMonthWIB,
  type AIIntent,
} from "./wa-ai";

const GOWA_API_URL = process.env.GOWA_API_URL || "http://localhost:3000";
const GOWA_API_KEY = process.env.GOWA_API_KEY || "";

interface WAUserMapping {
  wa_number: string;
  user_id: string;
  device_id: string;
}

// ─── DB helper — admin client bypasses RLS ──────────────────
function db() {
  return getSupabaseAdmin() || supabase;
}

// ─── User mapping: WhatsApp number → user_id ────────────────
async function getUserByPhone(phone: string): Promise<WAUserMapping | null> {
  if (!isSupabaseConfigured) return null;
  const normalizedPhone = phone.replace(/[^0-9]/g, "");
  const { data, error } = await db()
    .from("wa_users")
    .select("wa_number, user_id, device_id")
    .eq("wa_number", normalizedPhone)
    .single();
  if (error || !data) return null;
  return data as WAUserMapping;
}

// ─── Send reply via GOWA ────────────────────────────────────
async function sendWhatsAppReply(phone: string, message: string, deviceId?: string): Promise<void> {
  try {
    const body: Record<string, string> = { phone, message };
    if (deviceId) body["device_id"] = deviceId;
    await fetch(`${GOWA_API_URL}/send/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(GOWA_API_KEY ? { Authorization: `Bearer ${GOWA_API_KEY}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[WA] Send reply failed:", err);
  }
}

// ─── Main handler ───────────────────────────────────────────
export async function handleWhatsAppMessage(senderPhone: string, messageText: string, deviceId?: string): Promise<void> {
  if (!messageText?.trim()) return;
  console.log("[WA] Incoming:", senderPhone, "→", messageText);

  const userMapping = await getUserByPhone(senderPhone);
  console.log("[WA] User:", userMapping ? "FOUND" : "NOT FOUND", senderPhone);

  if (!userMapping) {
    await sendWhatsAppReply(senderPhone,
      `Halo! 👋 Nomor kamu belum terdaftar di FinTrack.\n\nSilakan daftar di aplikasi FinTrack terlebih dahulu, lalu hubungkan nomor WhatsApp kamu di menu Settings.`,
      deviceId);
    return;
  }

  const userId = userMapping.user_id;
  const today = getTodayWIB();
  const currentMonth = getMonthWIB();

  try {
    const intent = await analyzeMessage(messageText, today);
    console.log("[WA] Intent:", JSON.stringify(intent).substring(0, 200));

    switch (intent.intent) {
      case "transaction": await handleTransaction(intent, userId, senderPhone, deviceId); break;
      case "query": await handleQuery(intent, userId, senderPhone, deviceId, currentMonth); break;
      case "command": await handleCommand(intent.command, userId, senderPhone, deviceId, currentMonth); break;
      case "clarify": await sendWhatsAppReply(senderPhone, intent.reply, deviceId); break;
      case "other": await sendWhatsAppReply(senderPhone, intent.reply, deviceId); break;
    }
  } catch (err) {
    console.error("[WA] Handler error:", err);
    await sendWhatsAppReply(senderPhone, "Maaf, ada kendala teknis. Coba lagi ya! 😅", deviceId);
  }
}

// ─── Handle transaction creation ────────────────────────────
async function handleTransaction(intent: Extract<AIIntent, { intent: "transaction" }>, userId: string, senderPhone: string, deviceId?: string) {
  if (!isSupabaseConfigured) { await sendWhatsAppReply(senderPhone, "Sistem belum terkonfigurasi.", deviceId); return; }

  const { data: wallet } = await db().from("wallets").select("*").eq("user_id", userId).eq("is_default", true).single();
  const walletId = wallet?.id || null;

  const { error: txError } = await db().from("transactions").insert({
    user_id: userId,
    wallet_id: walletId,
    type: intent.type,
    amount: intent.amount,
    category: intent.category,
    note: intent.note,
    date: intent.date,
  }).select().single();

  if (txError) {
    console.error("[WA] Tx error:", txError);
    await sendWhatsAppReply(senderPhone, "Gagal mencatat transaksi. Coba lagi ya! 😅", deviceId);
    return;
  }

  let totalBalance = 0;
  if (walletId) {
    const newBal = intent.type === "income" ? (wallet?.balance || 0) + intent.amount : (wallet?.balance || 0) - intent.amount;
    await db().from("wallets").update({ balance: newBal }).eq("id", walletId);
    const { data: allWallets } = await db().from("wallets").select("balance").eq("user_id", userId);
    totalBalance = allWallets?.reduce((s, w) => s + (w.balance || 0), 0) || 0;
  }

  const reply = buildTransactionReply(intent.type, intent.amount, intent.category, intent.note, intent.date, totalBalance);
  await sendWhatsAppReply(senderPhone, reply, deviceId);
}

// ─── Handle financial queries ───────────────────────────────
async function handleQuery(intent: Extract<AIIntent, { intent: "query" }>, userId: string, senderPhone: string, deviceId?: string, currentMonth?: string) {
  if (!isSupabaseConfigured) { await sendWhatsAppReply(senderPhone, "Sistem belum terkonfigurasi.", deviceId); return; }
  const month = currentMonth || getMonthWIB();

  switch (intent.query_type) {
    case "saldo": {
      const { data: wallets } = await db().from("wallets").select("name, balance").eq("user_id", userId);
      const total = wallets?.reduce((s, w) => s + (w.balance || 0), 0) || 0;
      await sendWhatsAppReply(senderPhone, buildQueryReply("saldo", { wallets: wallets || [], total }), deviceId);
      break;
    }
    case "pengeluaran": {
      const { data: txs } = await db().from("transactions").select("amount, category").eq("user_id", userId).eq("type", "expense").gte("date", `${month}-01`).lte("date", `${month}-31`);
      const byCat: Record<string, number> = {};
      let total = 0;
      for (const t of txs || []) { const c = t.category || "Lainnya"; byCat[c] = (byCat[c] || 0) + (t.amount || 0); total += t.amount || 0; }
      await sendWhatsAppReply(senderPhone, buildQueryReply("pengeluaran", { total, byCategory: byCat, period: `bulan ${month}` }), deviceId);
      break;
    }
    case "pemasukan": {
      const { data: txs } = await db().from("transactions").select("amount, category").eq("user_id", userId).eq("type", "income").gte("date", `${month}-01`).lte("date", `${month}-31`);
      const byCat: Record<string, number> = {};
      let total = 0;
      for (const t of txs || []) { const c = t.category || "Lainnya"; byCat[c] = (byCat[c] || 0) + (t.amount || 0); total += t.amount || 0; }
      await sendWhatsAppReply(senderPhone, buildQueryReply("pemasukan", { total, byCategory: byCat, period: `bulan ${month}` }), deviceId);
      break;
    }
    case "hutang": {
      const { data: debts } = await db().from("debts").select("name, debt_type, remaining_amount, due_date").eq("user_id", userId).gt("remaining_amount", 0);
      const h = debts?.filter(d => d.debt_type === "hutang") || [];
      const p = debts?.filter(d => d.debt_type === "piutang") || [];
      await sendWhatsAppReply(senderPhone, buildQueryReply("hutang", {
        debts: debts || [], totalHutang: h.reduce((s, d) => s + (d.remaining_amount || 0), 0), totalPiutang: p.reduce((s, d) => s + (d.remaining_amount || 0), 0),
      }), deviceId);
      break;
    }
    case "budget": {
      const { data: budgets } = await db().from("budgets").select("category, limit_amount").eq("user_id", userId).eq("month", month);
      const { data: txs } = await db().from("transactions").select("amount, category").eq("user_id", userId).eq("type", "expense").gte("date", `${month}-01`).lte("date", `${month}-31`);
      const spent: Record<string, number> = {};
      for (const t of txs || []) { const c = t.category || ""; spent[c] = (spent[c] || 0) + (t.amount || 0); }
      const progress = (budgets || []).map(b => ({ category: b.category, limit_amount: b.limit_amount, spent: spent[b.category] || 0, percentage: b.limit_amount > 0 ? ((spent[b.category] || 0) / b.limit_amount) * 100 : 0 }));
      await sendWhatsAppReply(senderPhone, buildQueryReply("budget", { budgets: progress }), deviceId);
      break;
    }
    case "ringkasan": {
      const { data: txs } = await db().from("transactions").select("type, amount").eq("user_id", userId).gte("date", `${month}-01`).lte("date", `${month}-31`);
      const income = (txs || []).filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
      const expense = (txs || []).filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
      await sendWhatsAppReply(senderPhone, buildQueryReply("ringkasan", { income, expense, period: `bulan ${month}` }), deviceId);
      break;
    }
    default:
      await sendWhatsAppReply(senderPhone, "Maaf, aku belum paham. Coba tanya saldo, pengeluaran, hutang, atau budget! 😊", deviceId);
  }
}

// ─── Handle slash commands ──────────────────────────────────
async function handleCommand(command: string, userId: string, senderPhone: string, deviceId?: string, currentMonth?: string) {
  const cmd = command.toLowerCase();
  const Q = (qt: string) => ({ intent: "query" as const, query_type: qt, period: "", reply_hint: "" });
  switch (cmd) {
    case "/saldo": await handleQuery(Q("saldo"), userId, senderPhone, deviceId, currentMonth); break;
    case "/budget": await handleQuery(Q("budget"), userId, senderPhone, deviceId, currentMonth); break;
    case "/hutang": await handleQuery(Q("hutang"), userId, senderPhone, deviceId, currentMonth); break;
    case "/export": await sendWhatsAppReply(senderPhone, "📊 *Export Data*\n\nKamu bisa download data di:\n🔗 https://fintrack.app/settings\n\nSettings → Export Data → Download CSV", deviceId); break;
    case "/help": await sendWhatsAppReply(senderPhone,
      "🤖 *FinTrack AI Assistant*\n\nKirim pesan biasa untuk mencatat transaksi:\n• \"beli makan siang 25rb\"\n• \"dapat gaji 5 juta\"\n• \"kemarin beli bensin 50k\"\n\nAtau tanyakan keuangan:\n• \"berapa saldo gw?\"\n• \"pengeluaran bulan ini?\"\n• \"utang gw ke siapa?\"\n\n*Perintah:*\n/saldo — Cek saldo\n/budget — Status budget\n/hutang — Daftar hutang\n/export — Download data\n/help — Bantuan", deviceId); break;
    default: await sendWhatsAppReply(senderPhone, "Perintah tidak dikenali. Ketik /help untuk bantuan.", deviceId);
  }
}
