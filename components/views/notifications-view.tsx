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
      return <CircleAlert size={18} className="text-red shrink-0" />;
    if (severity === "warning")
      return <TriangleAlert size={18} className="text-amber shrink-0" />;
    return <Info size={18} className="text-blue shrink-0" />;
  };

  const severityBorder = (severity: string) => {
    if (severity === "critical") return "border-l-red";
    if (severity === "warning") return "border-l-amber";
    return "border-l-blue";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Bell size={26} className="text-red" />
            Notifications
          </h1>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Your project alerts, task assignments, and required actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {unread.length > 0 && (
            <span className="rounded-full bg-red-soft border border-red-border px-3 py-1 text-xs font-semibold text-red">
              {unread.length} unread
            </span>
          )}
          {unread.length > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-subtle transition shadow-xs cursor-pointer"
            >
              <CheckCheck size={15} />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Desktop notification permission — not yet decided */}
      {permBanner === "pending" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-border bg-blue-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BellRing size={20} className="text-blue shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue">
                Enable desktop notifications
              </p>
              <p className="text-xs font-semibold text-blue">
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
              className="rounded-xl bg-blue-strong px-4 py-2 text-xs font-semibold text-on-strong hover:bg-blue-strong transition cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {requesting ? "Waiting for browser…" : "Allow"}
            </button>
            <button
              type="button"
              onClick={() => setPermBanner("hidden")}
              className="rounded-lg p-1.5 text-blue hover:text-blue hover:bg-blue-soft transition cursor-pointer"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Previously blocked — tell user how to re-enable */}
      {permBanner === "denied" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-border bg-amber-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <TriangleAlert size={20} className="text-amber shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber">
                Desktop notifications are blocked
              </p>
              <p className="text-xs font-semibold text-amber">
                In Chrome/Edge: click the lock icon left of the URL → Site
                settings → Notifications → Allow. Then refresh this page.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPermBanner("hidden")}
            className="rounded-lg p-1.5 text-amber hover:text-amber hover:bg-amber-soft transition cursor-pointer self-end sm:self-auto"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Unsupported / non-HTTPS */}
      {permBanner === "unsupported" && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-subtle px-5 py-4">
          <div className="flex items-center gap-3">
            <Info size={20} className="text-muted-foreground shrink-0" />
            <p className="text-xs font-semibold text-secondary-foreground">
              Desktop notifications need a modern browser over HTTPS (or
              localhost).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPermBanner("hidden")}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-secondary-foreground transition cursor-pointer"
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
            className={`flex items-start gap-4 rounded-2xl border border-l-4 bg-card p-5 transition ${
              severityBorder(item.severity)
            } ${
              item.read_at
                ? "border-border bg-subtle"
                : "border-border shadow-xs"
            }`}
          >
            <div className="mt-0.5">{severityIcon(item.severity)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <p className="font-semibold text-foreground text-sm leading-snug">
                  {item.title}
                  {!item.read_at && (
                    <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
                  )}
                </p>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  {new Date(item.created_at).toLocaleDateString()} ·{" "}
                  {new Date(item.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {item.body && (
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {item.body}
                </p>
              )}

              {item.actor?.name && (
                <div className="mt-2 flex items-center gap-1.5">
                  <User size={11} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    by {item.actor.name}
                  </span>
                </div>
              )}
            </div>

            {!item.read_at && (
              <button
                onClick={() => markRead(item.id)}
                className="shrink-0 self-start rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-subtle transition cursor-pointer"
              >
                Mark read
              </button>
            )}
          </div>
        ))}

        {!notifications.length && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
            <Bell size={32} className="mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-foreground text-base">All caught up!</h3>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              No notifications yet. You&apos;ll be notified about project updates,
              task assignments, and deadlines.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
