/**
 * Helper utilities for browser Web Notifications API
 */

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error("Failed to request notification permission:", err);
    return Notification.permission;
  }
}

export function sendBrowserNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    url?: string;
  }
) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (Notification.permission !== "granted") {
    return null;
  }

  try {
    const notification = new Notification(title, {
      body: options?.body,
      icon: options?.icon || "/favicon.ico",
      tag: options?.tag || `notif-${Date.now()}`,
    });

    if (options?.url) {
      notification.onclick = () => {
        window.focus();
        if (options.url) {
          window.location.href = options.url;
        }
      };
    }

    return notification;
  } catch (err) {
    console.error("Error launching browser notification:", err);
    return null;
  }
}
