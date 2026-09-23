import React from "react";
import { Sparkles } from "lucide-react";

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
        <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}
