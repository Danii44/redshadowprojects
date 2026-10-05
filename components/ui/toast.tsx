import React from "react";
import { Sparkles } from "lucide-react";

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div role="status" aria-live="polite" aria-atomic="true"
      className="fixed bottom-5 left-4 right-4 z-[100] animate-in fade-in duration-200 sm:left-auto sm:right-6 sm:max-w-md">
      <div className="flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
        <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}
