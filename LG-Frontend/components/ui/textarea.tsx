import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 resize-none",
          "text-text-heading font-medium placeholder:text-text-muted/70",
          "focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary hover:border-primary/40",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface",
          error ? "border-danger focus:ring-danger/20 focus:border-danger hover:border-danger/50" : "border-border",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
