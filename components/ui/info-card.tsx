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
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  violet: "bg-violet-50 text-violet-700 border-violet-100",
  slate: "bg-slate-50 text-slate-700 border-slate-100",
  red: "bg-red-50 text-red-700 border-red-100",
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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className={`rounded-xl border p-2.5 ${toneStyles[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </span>
        {trend && (
          <span className="text-xs font-medium text-emerald-600">
            {trend}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}
