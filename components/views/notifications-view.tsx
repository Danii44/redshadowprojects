import React from "react";
import { CircleAlert } from "lucide-react";
import type { Notification } from "@/lib/types";
import { supabase } from "@/lib/supabase";

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
    notify("Notification marked read");
  };

  return (
    <>
      <h1 className="mb-2 text-3xl font-black text-slate-900">Notifications</h1>
      <p className="mb-6 text-slate-500">
        Your project alerts and required actions.
      </p>
      <div className="max-w-4xl space-y-3">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-4 rounded-2xl border bg-white p-5 transition ${
              item.read_at ? "border-slate-200 opacity-70" : "border-red-200 shadow-xs"
            }`}
          >
            <CircleAlert
              className={
                item.severity === "critical"
                  ? "text-red-600 shrink-0"
                  : item.severity === "warning"
                  ? "text-amber-500 shrink-0"
                  : "text-blue-500 shrink-0"
              }
            />
            <div className="flex-1">
              <p className="font-black text-slate-900">{item.title}</p>
              {item.body && (
                <p className="mt-1 text-sm text-slate-500">{item.body}</p>
              )}
              <p className="mt-2 text-xs font-semibold text-slate-400">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
            {!item.read_at && (
              <button
                onClick={() => markRead(item.id)}
                className="text-sm font-black text-red-600 hover:underline"
              >
                Mark read
              </button>
            )}
          </div>
        ))}
        {!notifications.length && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            No notifications yet.
          </div>
        )}
      </div>
    </>
  );
}
