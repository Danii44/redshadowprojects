interface DashboardMetricCardProps {
  label: string;
  value: number;
  subtitle: string;
  valueClassName?: string;
}

export function DashboardMetricCard({
  label,
  value,
  subtitle,
  valueClassName = "text-slate-900",
}: DashboardMetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition">
      <p className="text-xs font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-black ${valueClassName}`}>{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-600">{subtitle}</p>
    </div>
  );
}
