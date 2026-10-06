import React from "react";
import { LucideIcon } from "lucide-react";

interface InfoCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  tone?: "blue" | "emerald" | "amber" | "violet" | "slate" | "red";
}

const toneStyles = {
  blue: "bg-blue-soft text-blue border-blue-border",
  emerald: "bg-green-soft text-green border-green-border",
  amber: "bg-amber-soft text-amber border-amber-border",
  violet: "bg-purple-soft text-purple border-purple-border",
  slate: "bg-subtle text-foreground border-border",
  red: "bg-red-soft text-red border-red-border",
};

export function InfoCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  tone = "slate",
}: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className={`rounded-xl border p-2.5 ${toneStyles[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-foreground tracking-tight">
          {value}
        </span>
        {trend && (
          <span className="text-xs font-medium text-green">
            {trend}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs font-medium text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
