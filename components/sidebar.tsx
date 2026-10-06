import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { nav, visibleViewsByRole } from "@/lib/constants";
import type { Notification, Role, View } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { CompanyLogo } from "@/components/ui/company-logo";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  role: Role;
  view: View;
  setView: (view: View) => void;
  userName: string;
  avatarUrl?: string | null;
  notifications: Notification[];
  myTaskCount?: number;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  setAccountPanel: (panel: "profile" | "password" | null) => void;
}

export function Sidebar({
  role,
  view,
  setView,
  userName,
  avatarUrl,
  notifications,
  myTaskCount = 0,
  menuOpen,
  setMenuOpen,
  setAccountPanel,
}: SidebarProps) {
  const router = useRouter();
  const [accountMenu, setAccountMenu] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus after the mobile drawer has become visible in the next frame.
    const focusFrame = window.requestAnimationFrame(() => {
      sidebarRef.current?.querySelector<HTMLButtonElement>("nav button")?.focus();
    });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href]",
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [menuOpen, setMenuOpen]);

  useEffect(() => {
    if (!accountMenu) return;
    const dismiss = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node))
        setAccountMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenu(false);
        accountButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [accountMenu]);

  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const visibleNavItems = nav.filter((n) =>
    visibleViewsByRole[role]?.includes(n.label),
  );

  return (
    <aside
      ref={sidebarRef}
      id="workspace-navigation"
      data-open={menuOpen}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && menuOpen &&
          !event.currentTarget.contains(document.activeElement)) {
          event.currentTarget.querySelector<HTMLButtonElement>("nav button")?.focus();
        }
      }}
      aria-label="Workspace sidebar"
      className={`workspace-sidebar fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col text-foreground lg:translate-x-0 ${
        menuOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-20 shrink-0 items-center gap-2 px-4">
        <CompanyLogo />
        <div>
          <div className="text-sm font-semibold tracking-tight">RED SHADOW</div>
          <div className="mt-0.5 text-xs font-medium tracking-[.18em] text-muted-foreground">
            DESIGNS
          </div>
        </div>
        <button
          aria-label="Close navigation"
          className="ml-auto grid h-11 w-11 place-items-center rounded-xl text-muted-foreground hover:bg-card lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <X size={20} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
          Workspace
        </p>
        <nav aria-label="Main navigation" className="space-y-1">
          {visibleNavItems.map((n) => (
            <div key={n.label}>
              {n.group && (
                <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
                  Company
                </p>
              )}
              <button
                aria-current={view === n.label ? "page" : undefined}
                onClick={() => {
                  setView(n.label);
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition cursor-pointer ${
                  view === n.label
                    ? "studio-nav-active"
                    : "text-secondary-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <span
                  className={
                    view === n.label ? "text-red" : "text-muted-foreground"
                  }
                >
                  <n.icon size={18} />
                </span>
                {n.label}
                {n.label === "My Tasks" && myTaskCount > 0 && (
                  <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-xs text-secondary-foreground" aria-label={`${myTaskCount} active assignments`}>
                    {myTaskCount}
                  </span>
                )}
                {n.label === "Notifications" && unreadCount > 0 && (
                  <span
                    className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold transition ${
                      view === n.label
                        ? "bg-card text-red"
                        : "bg-primary text-on-strong"
                    }`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          ))}
        </nav>
      </div>

      <div ref={accountRef} className="relative mx-4 mb-5 mt-4 shrink-0">
        {accountMenu && (
          <div className="absolute bottom-full mb-2 w-full overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-lg">
            <button
              onClick={() => {
                setAccountPanel("profile");
                setAccountMenu(false);
              }}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              View profile
            </button>
            <button
              onClick={() => {
                setAccountPanel("password");
                setAccountMenu(false);
              }}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              Change password
            </button>
            <button
              onClick={async () => {
                await supabase?.auth.signOut();
                router.push("/login");
              }}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red hover:bg-red-soft cursor-pointer"
            >
              Sign out
            </button>
          </div>
        )}
        <button
          ref={accountButtonRef}
          aria-expanded={accountMenu}
          aria-label={`Account: ${userName}`}
          onClick={() => setAccountMenu((open) => !open)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left hover:bg-card cursor-pointer"
        >
          <Avatar name={userName} src={avatarUrl} />
          <div className="min-w-0">
            <p className="break-words text-base font-semibold">{userName}</p>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
          <ChevronDown
            className={`ml-auto text-muted-foreground transition ${
              accountMenu ? "rotate-180" : ""
            }`}
            size={16}
          />
        </button>
      </div>
    </aside>
  );
}
