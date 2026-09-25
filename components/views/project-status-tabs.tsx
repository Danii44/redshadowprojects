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
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => onChange("active")}
        className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
          statusFilter === "active"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
        }`}
      >
        Active ({statusCounts.active})
      </button>

      <button
        onClick={() => onChange("all")}
        className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
          statusFilter === "all"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
        }`}
      >
        All ({statusCounts.all})
      </button>

      <div className="h-4 w-px bg-slate-300 mx-1 shrink-0" />

      {PROJECT_STATUSES.map(([val, label]) => {
        const count = statusCounts[val as keyof typeof statusCounts] ?? 0;
        const active = statusFilter === val;
        return (
          <button
            key={val}
            onClick={() => onChange(val as ProjectStatus)}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
              active
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
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
