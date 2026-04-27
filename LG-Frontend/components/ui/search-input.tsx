import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-primary group-hover:text-primary/70" size={16} />
        <input
          type="search"
          className={cn(
            "w-full rounded-lg border bg-white pl-10 pr-3.5 py-2.5 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200",
            "text-text-heading font-medium placeholder:text-text-muted/70",
            "focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary hover:border-primary/40",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface",
            "border-border",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";

export { SearchInput };
