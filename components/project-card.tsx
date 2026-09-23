import React from "react";
import { Pill } from "@/components/ui/pill";
import { projectStatusColor, projectStatusLabel } from "@/lib/utils";
import type { Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-200 p-4 text-left hover:shadow-md transition-shadow bg-white"
    >
      <div className="mb-4 flex items-start justify-between">
        <span className="text-xs font-black text-slate-400">{project.code}</span>
        <Pill color={projectStatusColor(project.status)}>
          {projectStatusLabel(project.status)}
        </Pill>
      </div>
      <h3 className="font-black text-slate-900">{project.name}</h3>
      <p
        className={`mt-2 text-sm font-semibold ${
          project.deadlineTone || "text-slate-500"
        }`}
      >
        Due {project.due || "No deadline"}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div>
          <p className="text-[11px] font-bold uppercase text-slate-400">
            Current phase
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {project.phase || "Requirements"} · {project.revision || "R1"}
          </p>
        </div>
        <div className="flex -space-x-2">
          {project.team?.map((initials: string, index: number) => (
            <span
              key={`${initials}-${index}`}
              className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-slate-800 text-[9px] font-black text-white"
            >
              {initials}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
