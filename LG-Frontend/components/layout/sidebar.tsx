import { Zap, Plus, MessageSquare, Clock, Settings, User, LogOut, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const recentChats = [
    { id: 1, title: "Hotel Booking - Taj Palace", time: "2 min ago" },
    { id: 2, title: "Room Service Request", time: "1 hour ago" },
    { id: 3, title: "Guest Check-in Process", time: "3 hours ago" },
  ];

  const quickActions = [
    { icon: Sparkles, label: "New Booking", color: "bg-white/10" },
    { icon: TrendingUp, label: "View Reports", color: "bg-white/10" },
  ];

  return (
    <aside className={cn("w-64 bg-gradient-to-b from-[#4caf50] to-[#45a049] text-white flex flex-col h-full shadow-2xl relative z-20", className)}>
      {/* Header */}
      <div className="p-6 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-lg border border-white/20 backdrop-blur-sm">
            <Zap size={20} className="text-white fill-current" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold italic tracking-wider leading-none">FLASH</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/70 mt-1 font-medium">by LinenGrass</p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-4 mb-4">
        <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg">
          <Plus size={18} className="text-white" />
          <span className="font-semibold text-sm">New Chat</span>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3 px-2">Quick Actions</h3>
        <div className="space-y-2">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg py-2.5 px-3 flex items-center gap-3 transition-all duration-200 hover:translate-x-1"
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", action.color)}>
                <action.icon size={16} className="text-white" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="px-4 flex-1 overflow-y-auto hidden-scrollbar">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3 px-2">Recent</h3>
        <div className="space-y-1">
          {recentChats.map((chat) => (
            <button
              key={chat.id}
              className="w-full text-left bg-white/0 hover:bg-white/10 rounded-lg py-3 px-3 transition-all duration-200 group border border-transparent hover:border-white/20"
            >
              <div className="flex items-start gap-2">
                <MessageSquare size={16} className="text-white/70 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-white/90">
                    {chat.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock size={10} className="text-white/50" />
                    <p className="text-[10px] text-white/50">{chat.time}</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Card */}
      <div className="px-4 mb-4">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Today</span>
            <TrendingUp size={14} className="text-white/60" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">5</span>
            <span className="text-xs text-white/70">workflows completed</span>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-white/20 bg-black/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30">
            <User size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Guest User</p>
            <p className="text-[10px] text-white/60">guest@linengrass.com</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 bg-white/10 hover:bg-white/20 rounded-lg py-2 px-3 flex items-center justify-center gap-2 transition-all duration-200 border border-white/20">
            <Settings size={14} className="text-white" />
            <span className="text-xs font-medium">Settings</span>
          </button>
          <button className="bg-white/10 hover:bg-white/20 rounded-lg py-2 px-3 flex items-center justify-center transition-all duration-200 border border-white/20">
            <LogOut size={14} className="text-white" />
          </button>
        </div>
      </div>
    </aside>
  );
}
