"use client";

import * as React from "react";
import { cn, formatNumberInput, parseFormattedNumber } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: string;
  onValueChange: (raw: number, formatted: string) => void;
  prefix?: string;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, prefix = "Rp", placeholder = "0", ...props }, ref) => {
    const displayValue = React.useMemo(() => {
      const num = parseFormattedNumber(value);
      return num > 0 ? formatNumberInput(String(num)) : value.replace(/[^\d]/g, "") ? formatNumberInput(value) : "";
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, "");
      const num = Number(raw) || 0;
      const formatted = raw ? formatNumberInput(raw) : "";
      onValueChange(num, formatted);
    };

    return (
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          className={cn(
            "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            prefix && "pl-10",
            className
          )}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
