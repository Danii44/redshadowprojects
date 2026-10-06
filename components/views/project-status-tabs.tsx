import { PROJECT_STATUSES } from "@/lib/constants";
import type { ProjectStatus } from "@/lib/types";
import { projectStatusHighlight } from "@/lib/utils";

interface ProjectStatusTabsProps {
  statusCounts: Record<string, number>;
  statusFilter: ProjectStatus | "active" | "all";
  onChange: (next: ProjectStatus | "active" | "all") => void;
}

export function ProjectStatusTabs({
  statusCounts,
  statusFilter,
  onChange,
}: ProjectStatusTabsProps) {
  return (
    <div className="status-strip flex items-center gap-1.5 overflow-x-auto pb-2">
      <button
        aria-pressed={statusFilter === "active"}
        onClick={() => onChange("active")}
        className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
          statusFilter === "active"
            ? "bg-strong text-on-strong"
            : "bg-card text-secondary-foreground border border-border hover:bg-subtle"
        }`}
      >
        Active ({statusCounts.active})
      </button>

      <button
        aria-pressed={statusFilter === "all"}
        onClick={() => onChange("all")}
        className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
          statusFilter === "all"
            ? "bg-strong text-on-strong"
            : "bg-card text-secondary-foreground border border-border hover:bg-subtle"
        }`}
      >
        All ({statusCounts.all})
      </button>

      <div className="h-4 w-px bg-hover mx-1 shrink-0" />

      {PROJECT_STATUSES.map(([val, label]) => {
        const count = statusCounts[val as keyof typeof statusCounts] ?? 0;
        const active = statusFilter === val;
        return (
          <button
            key={val}
            aria-pressed={active}
            onClick={() => onChange(val as ProjectStatus)}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer ${
              active
                ? "bg-strong text-on-strong"
                : "bg-card text-secondary-foreground border border-border hover:bg-subtle"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${projectStatusHighlight(val)}`} />
            {label}
            <span className="opacity-60">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
