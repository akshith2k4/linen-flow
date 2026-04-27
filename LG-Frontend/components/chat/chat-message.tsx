"use client";

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { MessageContent } from "./message-content";

interface ChatMessageProps {
  sender: "user" | "bot";
  text: string;
  children?: React.ReactNode;
  summaryData?: {
    title?: string;
    items: { label: string; value: string }[];
  }[];
  quickActions?: Array<{
    label: string;
    action: string;
  }>;
  onQuickAction?: (action: string) => void;
  threadId?: string;
}

export function ChatMessage({ sender, text, children, summaryData, quickActions, onQuickAction, threadId }: ChatMessageProps) {
  const isUser = sender === "user";

  return (
    <div className={cn("flex gap-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className="flex-shrink-0">
        {isUser ? (
          <Avatar initials="RK" size="sm" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
        )}
      </div>

      <div className={cn("flex-1 flex flex-col space-y-3 min-w-0", isUser ? "items-end" : "items-start")}>
        {isUser ? (
          <div className="inline-block max-w-[85%] rounded-2xl p-0 overflow-hidden text-[14px] bg-[#3B8246] text-white shadow-sm rounded-tr-sm leading-relaxed whitespace-pre-wrap">
            {summaryData ? (
              <div className="p-4 sm:p-5 pb-5">
                 <div className="text-[11px] font-bold uppercase tracking-widest text-[#A0D468] mb-4 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-[#A0D468] shadow-[0_0_8px_rgba(160,212,104,0.6)]"></div> Form Submitted
                 </div>
                 <div className="flex flex-col gap-4">
                   {summaryData.map((group, gIdx) => (
                     <div key={gIdx} className="bg-black/10 rounded-xl p-3 border border-white/5 shadow-inner">
                       {group.title && <h4 className="text-[10px] font-bold uppercase text-white/80 tracking-widest mb-3 pb-2 border-b border-white/10">{group.title}</h4>}
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                         {group.items.map((item, iIdx) => (
                           <div key={iIdx} className="bg-black/15 px-3.5 py-2.5 rounded-lg flex flex-col justify-center border border-white/5 transition-colors hover:bg-black/25">
                             <span className="text-[9px] text-white/60 font-bold uppercase tracking-widest mb-1">{item.label}</span>
                             <span className="text-[13px] font-medium text-white/95 truncate" title={item.value}>{item.value || "-"}</span>
                           </div>
                         ))}
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            ) : (
              <div className="px-5 py-3.5 text-[15px]">{text}</div>
            )}
          </div>
        ) : (
          <div className="w-full h-full min-w-0">
            <MessageContent text={text} threadId={threadId} />
            
            {/* Quick Action Buttons - Only show after workflow completion */}
            {quickActions && quickActions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => onQuickAction?.(action.action)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            
            {/* Forms or other child elements - Center-aligned for spacious feel */}
            {children && (
              <div className="mt-4 flex justify-start sm:pr-8">
                {children}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
