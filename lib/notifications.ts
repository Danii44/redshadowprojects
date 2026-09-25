/**
 * Helper utilities for browser Web Notifications API
 */

export type NotifPermissionResult =
  | NotificationPermission
  | "unsupported"
  | "insecure";

/** True when the page can use the Notifications API (HTTPS or localhost). */
export function canUseNotifications(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  // Notifications require a secure context (https / localhost)
  if (!window.isSecureContext) return false;
  return true;
}

export function getNotificationPermission(): NotifPermissionResult {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (!window.isSecureContext) return "insecure";
  return Notification.permission;
}

/**
 * Must be called from a direct user gesture (button click).
 * Do NOT call this on page load — browsers will ignore or auto-deny it.
 */
export async function requestBrowserNotificationPermission(): Promise<NotifPermissionResult> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  if (!window.isSecureContext) {
    return "insecure";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  // Already blocked — browser will not show the prompt again
  if (Notification.permission === "denied") {
    return "denied";
  }

  try {
    // Modern browsers return a Promise; some older ones need a callback
    const result = await new Promise<NotificationPermission>((resolve) => {
      const maybePromise = Notification.requestPermission((perm) => {
        // Legacy callback path
        resolve(perm);
      });

      // Modern path: requestPermission returns a Promise
      if (maybePromise && typeof (maybePromise as Promise<NotificationPermission>).then === "function") {
        (maybePromise as Promise<NotificationPermission>).then(resolve).catch(() => {
          resolve(Notification.permission);
        });
      }
    });

    return result;
  } catch (err) {
    console.error("Failed to request notification permission:", err);
    return Notification.permission;
  }
}

function playNotificationSound() {
  if (typeof window === "undefined") return;

  try {
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const audioContext = new AudioCtor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.14, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.38);
  } catch {
    // Ignore sound errors silently so the notification still works if audio is blocked.
  }
}

export function sendBrowserNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    url?: string;
  },
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
      icon: options?.icon || "/favicon.svg",
      tag: options?.tag || `notif-${Date.now()}`,
      requireInteraction: false,
    });

    playNotificationSound();

    notification.onclick = () => {
      try {
        window.focus();
        if (options?.url) {
          window.location.href = options.url;
        }
      } catch {
        /* ignore */
      }
      notification.close();
    };

    return notification;
  } catch (err) {
    console.error("Error launching browser notification:", err);
    return null;
  }
}
