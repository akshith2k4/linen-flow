"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input);
      setInput("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200/80 rounded-[14px] p-2 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex gap-2 items-center relative">
        <input
          type="text"
          placeholder="What would you like to do next?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          className="flex-1 rounded-lg border-none bg-transparent px-4 py-3 text-[14px] focus:outline-none transition-all placeholder:text-gray-400 text-gray-900"
        />
        <Button 
          type="submit" 
          disabled={!input.trim() || disabled} 
          className={cn(
            "h-10 w-10 rounded-[10px] shadow-sm flex items-center justify-center text-white transition-all duration-200",
            input.trim() ? "bg-emerald-600 hover:bg-emerald-700 scale-100 opacity-100" : "bg-gray-300 scale-95 opacity-60"
          )}
        >
          <Send size={16} />
        </Button>
      </div>
    </form>
  );
}
