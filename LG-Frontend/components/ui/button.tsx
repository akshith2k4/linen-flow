import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 rounded-lg active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white shadow-[0_2px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:bg-primary-hover active:bg-primary-active",
        secondary: "bg-white text-text-body border border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-surface hover:border-border/80 active:bg-surface/80",
        outline: "border-[1.5px] border-primary text-primary shadow-sm hover:bg-primary/5 active:bg-primary/10",
        danger: "bg-danger text-white shadow-[0_2px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:bg-[#d63838] active:bg-[#c22e2e]",
        ghost: "text-text-body hover:bg-surface active:bg-surface/80",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
