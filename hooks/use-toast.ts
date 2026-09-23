import { useCallback, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 2400);
  }, []);

  return { toast, notify };
}
