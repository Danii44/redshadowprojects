import React from "react";
import { Bell, Menu, Search } from "lucide-react";
import type { Notification, Role, View } from "@/lib/types";

interface HeaderProps {
  role: Role;
  query: string;
  setQuery: (query: string) => void;
  setView: (view: View) => void;
  notifications: Notification[];
  setMenuOpen: (open: boolean) => void;
}

export function Header({
  role,
  query,
  setQuery,
  setView,
  notifications,
  setMenuOpen,
}: HeaderProps) {
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
      <button
        className="rounded-lg p-2 lg:hidden cursor-pointer"
        onClick={() => setMenuOpen(true)}
      >
        <Menu />
      </button>
      <div className="relative hidden max-w-xl flex-1 md:block">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, tasks or people..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-50 text-slate-900"
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 sm:block">
          {role}
        </div>
        <button
          onClick={() => setView("Notifications")}
          className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer"
          aria-label="Open notifications"
        >
          <Bell size={19} className="text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e3292f] px-1 text-[10px] font-black text-white shadow-md ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
