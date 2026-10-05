import React from "react";
import { tone } from "@/lib/constants";
import { StatusBadge } from "./status-badge";

interface PillProps {
  children: React.ReactNode;
  color?: keyof typeof tone | string;
}

export function Pill({ children, color = "slate" }: PillProps) {
  if (
    typeof children === "string" &&
    [
      "open",
      "in progress",
      "in review",
      "in revision",
      "revisions",
      "delivered",
      "closed",
      "completed",
      "cancelled",
      "on hold",
    ].includes(children.toLowerCase())
  ) {
    return (
      <StatusBadge
        status={children}
        task={children === "Completed" || children === "In Revision"}
      />
    );
  }
  const toneClass = tone[color] ?? tone.slate;
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${toneClass}`}
    >
      {children}
    </span>
  );
}
