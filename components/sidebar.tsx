import React, { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { nav, visibleViewsByRole } from "@/lib/constants";
import type { Notification, Role, View } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  role: Role;
  view: View;
  setView: (view: View) => void;
  userName: string;
  notifications: Notification[];
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  setAccountPanel: (panel: "profile" | "password" | null) => void;
}

export function Sidebar({
  role,
  view,
  setView,
  userName,
  notifications,
  menuOpen,
  setMenuOpen,
  setAccountPanel,
}: SidebarProps) {
  const [accountMenu, setAccountMenu] = useState(false);

  const initials = userName
    ? userName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "RS";

  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const visibleNavItems = nav.filter((n) =>
    visibleViewsByRole[role]?.includes(n.label),
  );

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-[248px] bg-[#15181d] text-white transition-transform lg:translate-x-0 ${
        menuOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e3292f] font-black shadow-lg shadow-red-950/50">
          R
        </div>
        <div>
          <div className="text-sm font-black tracking-wide">RED SHADOW</div>
          <div className="text-[11px] font-semibold tracking-[.18em] text-white/40">
            DESIGNS
          </div>
        </div>
        <button
          className="ml-auto lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <X size={20} />
        </button>
      </div>

      <div className="px-3 py-5">
        <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[.16em] text-white/30">
          Workspace
        </p>
        <nav className="space-y-1">
          {visibleNavItems.map((n) => (
            <div key={n.label}>
              {n.group && (
                <p className="mb-2 mt-6 px-3 text-[11px] font-bold uppercase tracking-[.16em] text-white/30">
                  Company
                </p>
              )}
              <button
                onClick={() => {
                  setView(n.label);
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  view === n.label
                    ? "bg-[#e3292f] text-white"
                    : "text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                <n.icon size={18} />
                {n.label}
                {n.label === "Notifications" && unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[11px]">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          ))}
        </nav>
      </div>

      <div className="absolute bottom-4 left-3 right-3">
        {accountMenu && (
          <div className="mb-2 overflow-hidden rounded-2xl border border-white/10 bg-[#24282f] p-1 shadow-xl">
            <button
              onClick={() => {
                setAccountPanel("profile");
                setAccountMenu(false);
              }}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
            >
              View profile
            </button>
            <button
              onClick={() => {
                setAccountPanel("password");
                setAccountMenu(false);
              }}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
            >
              Change password
            </button>
            <button
              onClick={async () => {
                await supabase?.auth.signOut();
                window.location.href = "/login";
              }}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-300 hover:bg-red-500/15"
            >
              Sign out
            </button>
          </div>
        )}
        <button
          onClick={() => setAccountMenu((open) => !open)}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10"
        >
          <div className="grid h-9 w-9 place-items-center rounded-full bg-red-100 text-xs font-black text-red-700">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{userName}</p>
            <p className="text-xs text-white/40">{role}</p>
          </div>
          <ChevronDown
            className={`ml-auto text-white/30 transition ${
              accountMenu ? "rotate-180" : ""
            }`}
            size={16}
          />
        </button>
      </div>
    </aside>
  );
}
