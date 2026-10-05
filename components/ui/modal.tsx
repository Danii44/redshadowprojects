"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  title: string;
  onClose: () => void;
  drawer?: boolean;
  instant?: boolean;
}

export function Modal({
  children,
  title,
  onClose,
  drawer = false,
  instant = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className={`workspace-dialog ${drawer ? "workspace-dialog--drawer" : ""} ${instant ? "workspace-dialog--instant" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      {children}
    </dialog>
  );
}
