import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-semibold transition-all duration-200 border whitespace-nowrap shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-white text-text-heading border-border/80 hover:bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        primary: "bg-primary text-white border-transparent shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:bg-primary/95",
        active: "bg-success/15 text-success border-success/30 shadow-none hover:bg-success/20",
        pending: "bg-warning/15 text-warning border-warning/30 shadow-none hover:bg-warning/20",
        inactive: "bg-text-muted/10 text-text-muted border-text-muted/20 shadow-none hover:bg-text-muted/15",
      },
      size: {
        sm: "px-2.5 py-0.5 text-[11px] uppercase tracking-wider",
        md: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
