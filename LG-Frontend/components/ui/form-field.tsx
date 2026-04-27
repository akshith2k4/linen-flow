import * as React from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string | React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="flex items-center min-h-[22px] text-[10px] uppercase font-bold text-text-muted/80 tracking-widest pl-1">
        <div className="flex items-center gap-1 min-w-0 flex-wrap">
          {label}
          {required && <span className="text-danger leading-none flex items-center h-full mb-0.5" style={{ fontSize: "14px", lineHeight: "0" }}>*</span>}
        </div>
      </label>
      {children}
      {error && (
        <p className="text-xs text-danger mt-1">{error}</p>
      )}
    </div>
  );
}
