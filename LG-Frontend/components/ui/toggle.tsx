import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, id, ...props }, ref) => {
    const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="checkbox"
            id={toggleId}
            className="peer sr-only"
            ref={ref}
            {...props}
          />
          <label
            htmlFor={toggleId}
            className={cn(
              "block w-11 h-6 rounded-full transition-all duration-300 cursor-pointer shadow-inner",
              "bg-border/60 hover:bg-border/80",
              "peer-checked:bg-primary peer-checked:hover:bg-primary/90",
              "peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary/20",
              "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
              className
            )}
          >
            <span
              className={cn(
                "absolute left-[2px] top-[2px] w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.2)]",
                "peer-checked:translate-x-5"
              )}
            />
          </label>
        </div>
        {label && (
          <label
            htmlFor={toggleId}
            className="text-sm text-text-body cursor-pointer select-none"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);
Toggle.displayName = "Toggle";

export { Toggle };
