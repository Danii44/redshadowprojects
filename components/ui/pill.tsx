import React from "react";
import { tone } from "@/lib/constants";

interface PillProps {
  children: React.ReactNode;
  color?: keyof typeof tone | string;
}

export function Pill({ children, color = "slate" }: PillProps) {
  const toneClass = tone[color] ?? tone.slate;
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset whitespace-nowrap ${toneClass}`}
    >
      {children}
    </span>
  );
}
