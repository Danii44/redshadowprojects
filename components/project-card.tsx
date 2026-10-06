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
      className="rounded-2xl border border-border p-4 text-left hover:shadow-md transition-shadow bg-card"
    >
      <div className="mb-4 flex items-start justify-end">
        <Pill color={projectStatusColor(project.status)}>
          {projectStatusLabel(project.status)}
        </Pill>
      </div>
      <h3 className="font-semibold text-foreground">{project.name}</h3>
      <p
        className={`mt-2 text-sm font-semibold ${
          project.deadlineTone || "text-muted-foreground"
        }`}
      >
        Due {project.due || "No deadline"}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Current phase
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {project.phase || "Requirements"} · {project.revision || "R1"}
          </p>
        </div>
        <div className="flex -space-x-2">
          {project.team?.map((initials: string, index: number) => (
            <span
              key={`${initials}-${index}`}
              className="grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-strong-hover text-xs font-semibold text-on-strong"
            >
              {initials}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
