import { useCallback, useState } from "react";
import { sendBrowserNotification } from "@/lib/notifications";

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((message: string, title?: string) => {
    setToast(message);

    // Send browser native popup notification (works on same tab, other tabs, or background)
    sendBrowserNotification(title || "Red Shadow Designs", {
      body: message,
    });

    setTimeout(() => {
      setToast(null);
    }, 2400);
  }, []);

  return { toast, notify };
}
