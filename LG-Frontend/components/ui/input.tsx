import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  autoFilled?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, autoFilled, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200",
          "text-text-heading font-medium placeholder:text-text-muted/70",
          "focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary hover:border-primary/40",
          "disabled:cursor-not-allowed disabled:opacity-60",
          autoFilled 
            ? "disabled:bg-blue-50/50 disabled:border-blue-200 disabled:text-blue-900" 
            : "disabled:bg-surface",
          error ? "border-danger focus:ring-danger/20 focus:border-danger hover:border-danger/50" : "border-border",
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
