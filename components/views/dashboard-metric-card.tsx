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
  valueClassName = "text-foreground",
}: DashboardMetricCardProps) {
  return (
    <div className="metric-card rounded-2xl border border-border bg-card p-4 shadow-2xs  transition">
      <p className="text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold ${valueClassName}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-secondary-foreground">{subtitle}</p>
    </div>
  );
}
