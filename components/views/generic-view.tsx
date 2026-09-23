import React from "react";
import type { View } from "@/lib/types";

interface GenericViewProps {
  view: View;
  notify: (message: string) => void;
}

export function GenericView({ view, notify }: GenericViewProps) {
  const copy: Record<string, string> = {
    Calendar: "Milestones and deadlines across every active project.",
    Team: "Availability, workload and daily status at a glance.",
    Activity: "A complete, accountable history of project changes.",
    Settings: "Manage people, roles, phases and workspace rules.",
  };

  return (
    <>
      <h1 className="text-3xl font-black text-slate-900">{view}</h1>
      <p className="mt-2 text-slate-500">{copy[view] || "Workspace view"}</p>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {["Today", "This week", "Coming next"].map((x, i) => (
          <button
            key={x}
            onClick={() => notify(`${view} item opened`)}
            className="min-h-40 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:shadow-md"
          >
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              {x}
            </p>
            <p className="mt-6 text-lg font-black text-slate-900">
              {i === 0
                ? "Design review at 3:00 PM"
                : i === 1
                ? "5 project milestones"
                : "Team capacity check"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Open to view details and responsible team members.
            </p>
          </button>
        ))}
      </div>
    </>
  );
}
