import { Pill } from "@/components/ui/pill";
import type { Project } from "@/lib/types";
import {
  calculateTimeLeft,
  normalizeProjectStatus,
  projectStatusColor,
  projectStatusLabel,
} from "@/lib/utils";

interface ProjectGridCardProps {
  project: Project;
  canEditProject: boolean;
  onOpenDetail: (project: Project, tab?: "overview" | "edit") => void;
}

export function ProjectGridCard({
  project,
  canEditProject,
  onOpenDetail,
}: ProjectGridCardProps) {
  const timeLeft = calculateTimeLeft(project.deadline, project.project_type);
  const isOpenDueSoon =
    normalizeProjectStatus(project.status) === "open" &&
    ["today", "soon"].includes(timeLeft.urgencyLevel);

  return (
    <div
      className="project-grid-surface group relative flex flex-col justify-between rounded-2xl border p-5 shadow-2xs transition"
      data-urgent={isOpenDueSoon}
    >
      <div>
        <div className="flex items-start justify-end">
          <Pill color={projectStatusColor(project.status)}>
            {projectStatusLabel(project.status)}
          </Pill>
        </div>
        <h3 className="mt-2 text-base font-semibold text-foreground">
          <button onClick={() => onOpenDetail(project, "overview")} className="text-left hover:text-red">{project.name}</button>
        </h3>
        <p className="text-xs font-semibold text-muted-foreground mt-0.5">
          {project.client ? `Client: ${project.client}` : "Internal Project"}
        </p>
      </div>

      <div className="mt-6 border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">Leader</span>
          <span className="text-foreground">{project.leader}</span>
        </div>
        {canEditProject && (
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Deadline</span>
            <span className={timeLeft.tone}>{project.due}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex -space-x-1">
            {project.team?.slice(0, 4).map((initials, idx) => (
              <span
                key={`${initials}-${idx}`}
                className="grid h-6 w-6 place-items-center rounded-full bg-strong text-[8.5px] font-semibold text-on-strong ring-2 ring-card"
              >
                {initials}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenDetail(project, "overview")}
              className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-subtle cursor-pointer"
            >
              Overview
            </button>
            {canEditProject && (
              <button
                onClick={() => onOpenDetail(project, "edit")}
                className="rounded-lg bg-strong px-3 py-1 text-xs font-semibold text-on-strong hover:bg-strong-hover cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
