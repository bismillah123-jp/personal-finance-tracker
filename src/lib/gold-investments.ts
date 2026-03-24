import type { GoldPriceData } from "@/lib/gold-price";
import type { Investment as DbInvestment } from "@/lib/supabase";

export const GOLD_INVESTMENT_TYPE = "emtas";
const GOLD_NOTES_SCHEMA = "fintrack.gold.v1";

export interface GoldInvestmentMeta {
  grams?: number;
  monthlyBudget?: number;
}

export interface ParsedInvestmentNotes {
  userNotes?: string;
  goldMeta?: GoldInvestmentMeta;
}

export interface EnrichedInvestment extends DbInvestment {
  live_current_value: number;
  user_notes?: string;
  gold_grams?: number;
  monthly_budget?: number;
  live_price_per_gram?: number;
  is_live_gold: boolean;
}

function toOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isGoldInvestmentType(type?: string | null): boolean {
  return type === GOLD_INVESTMENT_TYPE;
}

export function parseInvestmentNotes(notes?: string | null): ParsedInvestmentNotes {
  if (!notes) return {};

  try {
    const parsed = JSON.parse(notes);

    if (parsed && parsed.schema === GOLD_NOTES_SCHEMA) {
      return {
        userNotes: typeof parsed.userNotes === "string" ? parsed.userNotes : "",
        goldMeta: {
          grams: toOptionalNumber(parsed.grams),
          monthlyBudget: toOptionalNumber(parsed.monthlyBudget),
        },
      };
    }
  } catch {
    // Fallback to legacy plain-text notes.
  }

  return { userNotes: notes };
}

export function serializeInvestmentNotes(params: {
  type: string;
  userNotes?: string;
  grams?: number | string;
  monthlyBudget?: number | string;
}): string | undefined {
  const cleanedNotes = params.userNotes?.trim() ?? "";

  if (!isGoldInvestmentType(params.type)) {
    return cleanedNotes || undefined;
  }

  const payload = {
    schema: GOLD_NOTES_SCHEMA,
    grams: toOptionalNumber(params.grams) ?? 0,
    monthlyBudget: toOptionalNumber(params.monthlyBudget),
    userNotes: cleanedNotes || undefined,
  };

  return JSON.stringify(payload);
}

export function enrichInvestmentWithGoldPrice(
  investment: DbInvestment,
  goldPrice?: GoldPriceData | null,
): EnrichedInvestment {
  const { userNotes, goldMeta } = parseInvestmentNotes(investment.notes);
  const grams = goldMeta?.grams;
  const hasLiveGoldPrice = isGoldInvestmentType(investment.type) && typeof grams === "number" && grams > 0 && Boolean(goldPrice?.gold);
  const liveCurrentValue = hasLiveGoldPrice ? grams * toNumber(goldPrice?.gold) : toNumber(investment.current_value);

  return {
    ...investment,
    live_current_value: liveCurrentValue,
    user_notes: userNotes,
    gold_grams: grams,
    monthly_budget: goldMeta?.monthlyBudget,
    live_price_per_gram: goldPrice?.gold,
    is_live_gold: hasLiveGoldPrice,
  };
}

export function enrichInvestmentsWithGoldPrice(
  investments: DbInvestment[],
  goldPrice?: GoldPriceData | null,
): EnrichedInvestment[] {
  return investments.map((investment) => enrichInvestmentWithGoldPrice(investment, goldPrice));
}

export function estimateGoldGramsForBudget(monthlyBudget?: number, pricePerGram?: number): number {
  const budget = toNumber(monthlyBudget);
  const price = toNumber(pricePerGram);

  if (budget <= 0 || price <= 0) return 0;
  return budget / price;
}
