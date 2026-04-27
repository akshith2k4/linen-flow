import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative group">
        <select
          className={cn(
            "w-full appearance-none rounded-lg border bg-white px-3.5 py-2.5 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200",
            "text-text-heading font-medium",
            "focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary hover:border-primary/40",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface",
            error ? "border-danger focus:ring-danger/20 focus:border-danger hover:border-danger/50" : "border-border",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted transition-colors group-hover:text-primary/70">
          <ChevronDown size={15} strokeWidth={2.5} className="opacity-70" />
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
