import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "IDR",
  locale: string = "id-ID"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

export function formatDate(
  date: string | Date,
  locale: string = "id-ID"
): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatShortDate(date: string | Date, locale: string = "id-ID"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(new Date(date));
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthName(monthStr: string, locale: string = "id-ID"): string {
  const [year, month] = monthStr.split("-");
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(parseInt(year), parseInt(month) - 1));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getTransactionColor(type: "income" | "expense"): string {
  return type === "income" ? "#2ECC71" : "#E74C3C";
}

export function getPercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function groupByDate<T extends { date: string }>(
  items: T[]
): Record<string, T[]> {
  return items.reduce((groups, item) => {
    const dateKey = item.date.split("T")[0];
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/** Format a raw number string with thousand separators (dots for id-ID) */
export function formatNumberInput(value: string): string {
  const cleaned = value.replace(/[^\d]/g, "");
  if (!cleaned) return "";
  return new Intl.NumberFormat("id-ID").format(Number(cleaned));
}

/** Parse a formatted number string back to a number */
export function parseFormattedNumber(value: string): number {
  const cleaned = value.replace(/[^\d]/g, "");
  return Number(cleaned) || 0;
}
