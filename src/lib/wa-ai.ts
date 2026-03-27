// src/lib/wa-ai.ts
// AI processing layer — understands natural language finance messages

const AI_API_URL = "https://ai.sumopod.com/v1/chat/completions";
const AI_API_KEY = "sk-L_rYj-1Pk8sRpRPl2Athyw";
const AI_MODEL = "seed-2-0-pro";

const SYSTEM_PROMPT = `Kamu adalah asisten keuangan pribadi untuk aplikasi FinTrack.
Kamu berbicara dalam Bahasa Indonesia yang santai dan ramah.

TUGAS UTAMA:
1. Jika pesan adalah INPUT TRANSAKSI → ekstrak ke JSON
2. Jika pesan adalah PERTANYAAN tentang keuangan → jawab berdasarkan data yang diberikan
3. Jika pesan tidak jelas → minta klarifikasi

ATURAN PARSING TRANSAKSI:
- Ekstrak: type (income/expense), amount (angka), category, note, tanggal
- "beli", "bayar", "habis", "keluar" → expense
- "dapat", "gajian", "masuk", "terima" → income
- Angka: "10k" = 10000, "50rb" = 50000, "1jt" = 1000000, "1,5juta" = 1500000, "2.5jt" = 2500000
- Tanggal: "kemaren" = yesterday, "tadi pagi/siang/malam" = today, "tanggal 10" = 10th this month
- "bulan lalu" = last month, "awal bulan" = 1st this month
- Kategorisasi otomatis: makanan/minuman→Makanan, bensin/grab/gojek/transport→Transportasi, listrik/pulsa/data→Tagihan, belanja/shopping→Belanja, obat/rumah sakit→Kesehatan, sewa/kost→Tempat Tinggal, nongkrong/hiburan/film→Hiburan, bayar hutang/cicilan→Hutang, gaji/freelance/bonus→Gaji, tabungan/investasi→Investasi, lainnya→Lainnya

KATEGORI YANG TERSEDIA:
Expense: Makanan, Transportasi, Tagihan, Belanja, Kesehatan, Tempat Tinggal, Hiburan, Hutang, Lainnya
Income: Gaji, Freelance, Bonus, Investasi, Hadiah, Lainnya

ATURAN TANGGAL:
- Jika tidak disebutkan tanggal → gunakan tanggal HARI INI yang diberikan dalam context
- "kemarin"/"kemaren" → tanggal kemarin
- "tadi pagi/siang/malam" → tanggal hari ini
- "tanggal X" → tanggal X bulan ini
- "bulan lalu" → tanggal yang sama bulan lalu
- Format output tanggal: YYYY-MM-DD

RESPONSE FORMAT untuk TRANSAKSI:
Return ONLY valid JSON, no markdown, no code block:
{
  "intent": "transaction",
  "type": "expense" atau "income",
  "amount": angka_tanpa_titik,
  "category": "Kategori",
  "note": "deskripsi singkat dari pesan user",
  "date": "YYYY-MM-DD"
}

RESPONSE FORMAT untuk PERTANYAAN:
Return ONLY valid JSON:
{
  "intent": "query",
  "query_type": "saldo|pengeluaran|pemasukan|hutang|budget|ringkasan|export|other",
  "period": "hari_ini|bulan_ini|minggu_ini|semua",
  "reply_hint": "indikasi singkat apa yang user tanyakan"
}

RESPONSE FORMAT untuk COMMAND:
{
  "intent": "command",
  "command": "/saldo|/budget|/hutang|/export|/help"
}

RESPONSE FORMAT untuk PESAN TIDAK JELAS:
{
  "intent": "clarify",
  "reply": "Minta klarifikasi dengan ramah"
}

RESPONSE FORMAT untuk BUKAN FINANCE:
{
  "intent": "other",
  "reply": "Jawab dengan ramah bahwa kamu asisten keuangan"
}

PENTING:
- SELALU return JSON murni, tanpa markdown/code block
- Jangan tambahkan penjelasan apapun, hanya JSON
- Jumlah harus angka INTEGER, bukan string
- Jangan ada trailing comma di JSON`;

export type AIIntent =
  | {
      intent: "transaction";
      type: "income" | "expense";
      amount: number;
      category: string;
      note: string;
      date: string;
    }
  | {
      intent: "query";
      query_type: string;
      period: string;
      reply_hint: string;
    }
  | {
      intent: "command";
      command: string;
    }
  | {
      intent: "clarify";
      reply: string;
    }
  | {
      intent: "other";
      reply: string;
    };

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function analyzeMessage(
  userMessage: string,
  todayDate: string,
  chatHistory: ChatMessage[] = []
): Promise<AIIntent> {
  // Add date context to the user message
  const contextualMessage = `[Konteks: Hari ini tanggal ${todayDate}]\n\nPesan user: ${userMessage}`;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...chatHistory,
    { role: "user", content: contextualMessage },
  ];

  const response = await fetch(AI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI API error:", response.status, errText);
    throw new Error(`AI API returned ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || "";

  // Try to parse JSON from response
  try {
    // Sometimes AI wraps in markdown code blocks — strip them
    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as AIIntent;
    return parsed;
  } catch {
    console.error("Failed to parse AI response:", content);
    return {
      intent: "clarify",
      reply: "Maaf, aku kurang paham maksudmu. Bisa diulang dengan lebih jelas? 😅",
    };
  }
}

// Generate a friendly reply for successful transaction
export function buildTransactionReply(
  type: "income" | "expense",
  amount: number,
  category: string,
  note: string,
  date: string,
  newBalance: number
): string {
  const emoji = type === "income" ? "💰" : "💸";
  const formattedAmount = formatRupiah(amount);
  const formattedBalance = formatRupiah(newBalance);

  // Friendly date display
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  let dateDisplay = date;
  if (date === today) dateDisplay = "Hari ini";
  else if (date === yesterday) dateDisplay = "Kemarin";

  return `${emoji} *Tercatat!*\n\n📋 ${category} — Rp ${formattedAmount}\n📝 ${note}\n📅 ${dateDisplay}\n💰 Sisa saldo: Rp ${formattedBalance}`;
}

// Build reply for query results
export function buildQueryReply(
  queryType: string,
  data: Record<string, unknown>
): string {
  switch (queryType) {
    case "saldo": {
      const wallets = data.wallets as Array<{ name: string; balance: number }>;
      const total = (data.total as number) || 0;
      let reply = `💰 *Total Saldo: Rp ${formatRupiah(total)}*\n\n`;
      if (wallets && wallets.length > 0) {
        for (const w of wallets) {
          reply += `🏦 ${w.name}: Rp ${formatRupiah(w.balance)}\n`;
        }
      }
      return reply.trim();
    }
    case "pengeluaran": {
      const total = (data.total as number) || 0;
      const byCategory = data.byCategory as Record<string, number>;
      const period = (data.period as string) || "";
      let reply = `💸 *Pengeluaran ${period}: Rp ${formatRupiah(total)}*\n\n`;
      if (byCategory && Object.keys(byCategory).length > 0) {
        const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a);
        for (const [cat, amount] of sorted) {
          const pct = total > 0 ? ((amount / total) * 100).toFixed(0) : "0";
          reply += `• ${cat}: Rp ${formatRupiah(amount)} (${pct}%)\n`;
        }
      }
      return reply.trim();
    }
    case "pemasukan": {
      const total = (data.total as number) || 0;
      const byCategory = data.byCategory as Record<string, number>;
      const period = (data.period as string) || "";
      let reply = `💰 *Pemasukan ${period}: Rp ${formatRupiah(total)}*\n\n`;
      if (byCategory && Object.keys(byCategory).length > 0) {
        const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a);
        for (const [cat, amount] of sorted) {
          reply += `• ${cat}: Rp ${formatRupiah(amount)}\n`;
        }
      }
      return reply.trim();
    }
    case "hutang": {
      const debts = data.debts as Array<{
        name: string;
        debt_type: string;
        remaining_amount: number;
        due_date?: string;
      }>;
      const totalHutang = (data.totalHutang as number) || 0;
      const totalPiutang = (data.totalPiutang as number) || 0;
      let reply = `📋 *Hutang & Piutang*\n\n`;
      reply += `🔴 Total Hutang: Rp ${formatRupiah(totalHutang)}\n`;
      reply += `🟢 Total Piutang: Rp ${formatRupiah(totalPiutang)}\n`;
      reply += `📊 Bersih: Rp ${formatRupiah(totalHutang - totalPiutang)}\n\n`;
      if (debts && debts.length > 0) {
        for (const d of debts) {
          const icon = d.debt_type === "hutang" ? "🔴" : "🟢";
          const due = d.due_date ? ` (jatuh tempo: ${d.due_date})` : "";
          reply += `${icon} ${d.name}: Rp ${formatRupiah(d.remaining_amount)}${due}\n`;
        }
      } else {
        reply += "✅ Tidak ada hutang aktif!";
      }
      return reply.trim();
    }
    case "budget": {
      const budgets = data.budgets as Array<{
        category: string;
        limit_amount: number;
        spent: number;
        percentage: number;
      }>;
      let reply = `📊 *Budget Bulan Ini*\n\n`;
      if (budgets && budgets.length > 0) {
        for (const b of budgets) {
          const bar = getProgressBar(b.percentage);
          const emoji = b.percentage >= 100 ? "🔴" : b.percentage >= 80 ? "🟡" : "🟢";
          reply += `${emoji} ${b.category}\n`;
          reply += `   ${bar} ${b.percentage.toFixed(0)}%\n`;
          reply += `   Rp ${formatRupiah(b.spent)} / Rp ${formatRupiah(b.limit_amount)}\n\n`;
        }
      } else {
        reply += "Belum ada budget yang diatur.";
      }
      return reply.trim();
    }
    case "ringkasan": {
      const income = (data.income as number) || 0;
      const expense = (data.expense as number) || 0;
      const cashflow = income - expense;
      const period = (data.period as string) || "";
      return (
        `📊 *Ringkasan ${period}*\n\n` +
        `💰 Pemasukan: Rp ${formatRupiah(income)}\n` +
        `💸 Pengeluaran: Rp ${formatRupiah(expense)}\n` +
        `📈 Cashflow: ${cashflow >= 0 ? "+" : ""}Rp ${formatRupiah(cashflow)}`
      );
    }
    default:
      return "Maaf, aku belum bisa menjawab pertanyaan itu. Coba tanya yang lain ya! 😅";
  }
}

// Format number to Indonesian Rupiah
export function formatRupiah(amount: number): string {
  return amount.toLocaleString("id-ID");
}

// Simple progress bar for budget
function getProgressBar(percentage: number): string {
  const filled = Math.min(Math.round(percentage / 10), 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

// Get today's date in YYYY-MM-DD format (WIB)
export function getTodayWIB(): string {
  const now = new Date();
  // WIB = UTC+7
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().split("T")[0];
}

// Get month string like "2026-03"
export function getMonthWIB(): string {
  return getTodayWIB().substring(0, 7);
}
