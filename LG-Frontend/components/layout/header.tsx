"use client";

import { Globe } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 border-b border-border bg-white px-6 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-text-heading leading-tight">FLASH AI </h1>
        <p className="text-xs text-text-muted">An intelligent onboarding tool by Flash</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full text-xs text-text-muted">
          <Globe size={14} />
          <span>English</span>
        </div>
        <div className="hidden sm:flex items-center px-4 py-1.5 bg-surface rounded-full text-xs font-mono text-text-muted border border-border">
          Session: session_{Date.now().toString().slice(0, 12)}...
        </div>
      </div>
    </header>
  );
}
