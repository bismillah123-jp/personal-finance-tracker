import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl bg-background px-4 py-2",
          "text-sm shadow-sm transition-all duration-200",
          "placeholder:text-muted-foreground/60",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "border border-border/50",
          "text-wrap-safe",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
