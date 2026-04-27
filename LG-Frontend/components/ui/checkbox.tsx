import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="checkbox"
            id={checkboxId}
            className="peer sr-only"
            ref={ref}
            {...props}
          />
          <label
            htmlFor={checkboxId}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] transition-all duration-200 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
              "border-border bg-white hover:border-primary/50",
              "peer-checked:bg-primary peer-checked:border-primary peer-active:scale-95",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20",
              "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
              className
            )}
          >
            <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
          </label>
        </div>
        {label && (
          <label
            htmlFor={checkboxId}
            className="text-sm text-text-body cursor-pointer select-none"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
