import React, { useState } from "react";
import {
  Bell,
  BellRing,
  CheckCheck,
  CircleAlert,
  Info,
  TriangleAlert,
  User,
  X,
} from "lucide-react";
import type { Notification } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import {
  canUseNotifications,
  getNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from "@/lib/notifications";

interface NotificationsViewProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  notify: (message: string) => void;
}

export function NotificationsView({
  notifications,
  setNotifications,
  notify,
}: NotificationsViewProps) {
  const unread = notifications.filter((n) => !n.read_at);

  const getInitialPermitState = (): "pending" | "denied" | "hidden" | "unsupported" => {
    if (!canUseNotifications()) {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        return "unsupported";
      }
      if (typeof window !== "undefined" && !("Notification" in window)) {
        return "unsupported";
      }
      return "unsupported";
    }

    const perm = getNotificationPermission();
    if (perm === "default") return "pending";
    if (perm === "denied") return "denied";
    return "hidden";
  };

  const [permBanner, setPermBanner] = useState<
    "pending" | "denied" | "hidden" | "unsupported"
  >(getInitialPermitState);
  const [requesting, setRequesting] = useState(false);

  const handleAllowDesktopNotifs = async () => {
    if (requesting) return;
    setRequesting(true);

    try {
      const status = await requestBrowserNotificationPermission();

      if (status === "granted") {
        // Small delay so the browser finishes closing the permission dialog
        await new Promise((r) => setTimeout(r, 150));
        sendBrowserNotification("Red Shadow Alerts Active", {
          body: "You will now receive desktop notifications for tasks and projects.",
          tag: "rs-permission-granted",
        });
        notify("Desktop notifications enabled!");
        setPermBanner("hidden");
      } else if (status === "denied") {
        notify(
          "Notifications were blocked. Click the lock icon in the address bar → Site settings → Notifications → Allow, then refresh.",
        );
        setPermBanner("denied");
      } else if (status === "insecure") {
        notify(
          "Desktop notifications need HTTPS (or localhost). Open the app over a secure URL.",
        );
        setPermBanner("unsupported");
      } else if (status === "unsupported") {
        notify("This browser does not support desktop notifications.");
        setPermBanner("unsupported");
      } else {
        // User closed the dialog without choosing (still "default")
        notify("Permission not set yet. Click Allow again and choose Allow in the browser popup.");
        setPermBanner("pending");
      }
    } catch (err) {
      console.error(err);
      notify("Could not request notification permission. Try again.");
    } finally {
      setRequesting(false);
    }
  };

  const markRead = async (id: string) => {
    if (!supabase) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("id", id);

    if (error) return notify(error.message);
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, read_at: readAt } : item)),
    );
  };

  const markAllRead = async () => {
    if (!supabase || !unread.length) return;
    const readAt = new Date().toISOString();
    const ids = unread.map((n) => n.id);
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .in("id", ids);

    if (error) return notify(error.message);
    setNotifications((items) =>
      items.map((item) =>
        ids.includes(item.id) ? { ...item, read_at: readAt } : item,
      ),
    );
    notify("All notifications marked as read");
  };

  const severityIcon = (severity: string) => {
    if (severity === "critical")
      return <CircleAlert size={18} className="text-red-500 shrink-0" />;
    if (severity === "warning")
      return <TriangleAlert size={18} className="text-amber-500 shrink-0" />;
    return <Info size={18} className="text-blue-500 shrink-0" />;
  };

  const severityBorder = (severity: string) => {
    if (severity === "critical") return "border-l-red-400";
    if (severity === "warning") return "border-l-amber-400";
    return "border-l-blue-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Bell size={26} className="text-[#e3292f]" />
            Notifications
          </h1>
          <p className="mt-1 text-xs font-bold text-slate-500">
            Your project alerts, task assignments, and required actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {unread.length > 0 && (
            <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-black text-red-700">
              {unread.length} unread
            </span>
          )}
          {unread.length > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
            >
              <CheckCheck size={15} />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Desktop notification permission — not yet decided */}
      {permBanner === "pending" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BellRing size={20} className="text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-black text-blue-900">
                Enable desktop notifications
              </p>
              <p className="text-xs font-semibold text-blue-600">
                Get Windows alerts for tasks, deadlines, and project updates —
                even when you&apos;re in another tab.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={requesting}
              onClick={handleAllowDesktopNotifs}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {requesting ? "Waiting for browser…" : "Allow"}
            </button>
            <button
              type="button"
              onClick={() => setPermBanner("hidden")}
              className="rounded-lg p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition cursor-pointer"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Previously blocked — tell user how to re-enable */}
      {permBanner === "denied" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <TriangleAlert size={20} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-black text-amber-900">
                Desktop notifications are blocked
              </p>
              <p className="text-xs font-semibold text-amber-700">
                In Chrome/Edge: click the lock icon left of the URL → Site
                settings → Notifications → Allow. Then refresh this page.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPermBanner("hidden")}
            className="rounded-lg p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 transition cursor-pointer self-end sm:self-auto"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Unsupported / non-HTTPS */}
      {permBanner === "unsupported" && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <Info size={20} className="text-slate-500 shrink-0" />
            <p className="text-xs font-semibold text-slate-600">
              Desktop notifications need a modern browser over HTTPS (or
              localhost).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPermBanner("hidden")}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Notifications list */}
      <div className="space-y-2.5 max-w-4xl">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-4 rounded-2xl border border-l-4 bg-white p-5 transition ${
              severityBorder(item.severity)
            } ${
              item.read_at
                ? "border-slate-200 opacity-60"
                : "border-slate-200 shadow-xs"
            }`}
          >
            <div className="mt-0.5">{severityIcon(item.severity)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <p className="font-black text-slate-900 text-sm leading-snug">
                  {item.title}
                  {!item.read_at && (
                    <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[#e3292f] align-middle" />
                  )}
                </p>
                <span className="shrink-0 text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                  {new Date(item.created_at).toLocaleDateString()} ·{" "}
                  {new Date(item.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {item.body && (
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                  {item.body}
                </p>
              )}

              {item.actor?.name && (
                <div className="mt-2 flex items-center gap-1.5">
                  <User size={11} className="text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-400">
                    by {item.actor.name}
                  </span>
                </div>
              )}
            </div>

            {!item.read_at && (
              <button
                onClick={() => markRead(item.id)}
                className="shrink-0 self-start rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Mark read
              </button>
            )}
          </div>
        ))}

        {!notifications.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">
            <Bell size={32} className="mx-auto text-slate-300 mb-3" />
            <h3 className="font-black text-slate-800 text-base">All caught up!</h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              No notifications yet. You&apos;ll be notified about project updates,
              task assignments, and deadlines.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
