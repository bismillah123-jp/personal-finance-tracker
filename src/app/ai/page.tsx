import { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Bot, Send, Sparkles, User, RefreshCw, TrendingUp, PiggyBank, Target, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers";
import { getTransactions, getWallets, getBudgets, getDebts } from "@/lib/supabase";
import { getCurrentMonth, formatCurrency } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { icon: TrendingUp, label: "Analisis keuanganku", prompt: "Tolong analisis kondisi keuangan saya berdasarkan data yang ada dan berikan saran praktis." },
  { icon: PiggyBank, label: "Tips hemat bulan ini", prompt: "Berikan tips hemat uang yang spesifik dan bisa saya terapkan mulai bulan ini." },
  { icon: Target, label: "Cara atur budget", prompt: "Bagaimana cara mengatur budget yang efektif? Bantu saya membuat rencana keuangan yang lebih baik." },
  { icon: Lightbulb, label: "Saran investasi", prompt: "Berikan saran investasi yang cocok untuk pemula dengan modal terbatas. Apa yang sebaiknya saya mulai?" },
];

const AI_API_URL = "https://ai.sumopod.com/v1/chat/completions";
const AI_API_KEY = "sk-L_rYj-1Pk8sRpRPl2Athyw";
const AI_MODEL = "seed-2-0-pro";

async function chatWithAI(
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<string> {
  const response = await fetch(AI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 800,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "Maaf, saya tidak bisa merespons saat ini.";
}

export default function AIAssistantPage() {
  const { user, currency, locale } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Halo! Saya FinBot, asisten keuangan pribadi Anda 👋\n\nSaya siap membantu Anda:\n• Menganalisis kondisi keuangan berdasarkan data real Anda\n• Memberikan saran penghematan yang spesifik\n• Menjelaskan strategi investasi yang cocok\n• Menjawab pertanyaan seputar pengelolaan uang\n\nAda yang ingin Anda tanyakan?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [financialContext, setFinancialContext] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!user) return;

    const loadContext = async () => {
      try {
        const month = getCurrentMonth();
        const [wallets, transactions, budgets, debts] = await Promise.all([
          getWallets(user.id),
          getTransactions(user.id, { month }),
          getBudgets(user.id, month),
          getDebts(user.id),
        ]);

        const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
        const totalIncome = transactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const totalExpense = transactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const totalDebt = debts
          .filter((d) => d.debt_type === "hutang")
          .reduce((sum, d) => sum + Number(d.remaining_amount), 0);
        const totalPiutang = debts
          .filter((d) => d.debt_type === "piutang")
          .reduce((sum, d) => sum + Number(d.remaining_amount), 0);

        // Top expense categories
        const expenseByCategory = transactions
          .filter((t) => t.type === "expense")
          .reduce<Record<string, number>>((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
            return acc;
          }, {});
        const topCategories = Object.entries(expenseByCategory)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([cat, amt]) => `${cat}: ${formatCurrency(amt, currency, locale)}`)
          .join(", ");

        setFinancialContext(
          `DATA KEUANGAN USER (bulan ${month}):\n` +
          `- Total saldo semua dompet: ${formatCurrency(totalBalance, currency, locale)}\n` +
          `- Pemasukan bulan ini: ${formatCurrency(totalIncome, currency, locale)}\n` +
          `- Pengeluaran bulan ini: ${formatCurrency(totalExpense, currency, locale)}\n` +
          `- Cashflow: ${formatCurrency(totalIncome - totalExpense, currency, locale)}\n` +
          `- Total hutang aktif: ${formatCurrency(totalDebt, currency, locale)}\n` +
          `- Total piutang aktif: ${formatCurrency(totalPiutang, currency, locale)}\n` +
          `- Jumlah dompet: ${wallets.length}\n` +
          `- Jumlah transaksi bulan ini: ${transactions.length}\n` +
          `- Budget aktif: ${budgets.length} kategori\n` +
          (topCategories ? `- Top pengeluaran: ${topCategories}` : "")
        );
      } catch {
        // Context loading failed silently — AI still works without context
      }
    };

    loadContext();
  }, [user, currency, locale]);

  const buildSystemPrompt = useCallback(() => {
    return `Kamu adalah FinBot, asisten keuangan pribadi yang cerdas, ramah, dan profesional untuk aplikasi FinTrack.

KEPRIBADIAN:
- Berbicara Bahasa Indonesia yang santai tapi profesional
- Memberikan saran praktis, spesifik, dan mudah dipahami
- Selalu encourage user untuk membuat keputusan keuangan yang lebih bijak
- Gunakan angka dan persentase konkret saat memberi saran
- Gunakan emoji secukupnya untuk membuat percakapan lebih hidup

${financialContext ? `\n${financialContext}\n` : ""}

KEMAMPUAN UTAMA:
- Analisis mendalam kondisi keuangan berdasarkan data user
- Tips penghematan spesifik berdasarkan pola pengeluaran
- Panduan investasi untuk berbagai level (pemula hingga menengah)
- Perencanaan budget yang realistis
- Edukasi konsep keuangan (inflasi, compound interest, dll)

FORMAT RESPONS:
- Gunakan bullet points (•) untuk daftar
- Gunakan bold (**teks**) untuk emphasis penting
- Pisahkan topik berbeda dengan baris kosong
- Jaga respons tetap fokus dan tidak terlalu panjang

ATURAN:
- Selalu berdasarkan data keuangan user jika tersedia
- Saran harus actionable dan bisa dilakukan sekarang
- Jika tidak ada data, minta user untuk mengecek menu terkait
- Ingatkan bahwa saran bukan pengganti konsultasi profesional jika diperlukan`;
  }, [financialContext]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = messages
        .filter((m) => m.id !== "welcome")
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      const aiResponse = await chatWithAI(
        [...chatHistory, { role: "user", content: content.trim() }],
        buildSystemPrompt()
      );

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: aiResponse,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Maaf, terjadi kesalahan saat menghubungi AI. Coba lagi ya! 😅",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: "Chat baru dimulai! Ada yang bisa saya bantu hari ini? 😊",
        timestamp: new Date(),
      },
    ]);
  };

  const showQuickPrompts = messages.length <= 1;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl flex flex-col" style={{ height: "calc(100vh - 140px)" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                FinBot AI
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                  <Sparkles className="inline h-3 w-3 mr-1" />
                  Smart
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">Asisten keuangan pribadi Anda</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs" onClick={clearChat}>
            <RefreshCw className="h-3 w-3" />
            Reset Chat
          </Button>
        </div>

        {/* Quick Prompts */}
        {showQuickPrompts && (
          <div className="grid grid-cols-2 gap-2 mb-4 shrink-0">
            {QUICK_PROMPTS.map((qp) => {
              const Icon = qp.icon;
              return (
                <button
                  key={qp.label}
                  onClick={() => sendMessage(qp.prompt)}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-medium leading-snug text-foreground">{qp.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 animate-fade-in-up",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold shadow-sm mt-0.5",
                  message.role === "assistant"
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                    : "bg-gradient-to-br from-violet-500 to-fuchsia-500"
                )}
              >
                {message.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                  message.role === "assistant"
                    ? "bg-card border border-border text-foreground rounded-tl-none"
                    : "bg-primary text-primary-foreground rounded-tr-none"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p
                  className={cn(
                    "mt-1.5 text-[10px] opacity-60",
                    message.role === "assistant" ? "text-muted-foreground" : "text-primary-foreground"
                  )}
                >
                  {message.timestamp.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3 animate-fade-in-up">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="mt-3 border-t border-border pt-3 shrink-0">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan sesuatu tentang keuangan Anda... (Enter untuk kirim, Shift+Enter untuk baris baru)"
              className="flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[52px] max-h-36 transition"
              rows={1}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-[52px] w-[52px] rounded-xl shrink-0 shadow-md"
              disabled={!input.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/70">
            FinBot menggunakan AI — verifikasi informasi penting sebelum membuat keputusan keuangan besar.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
