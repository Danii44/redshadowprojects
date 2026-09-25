import { Pill } from "@/components/ui/pill";
import type { Project } from "@/lib/types";
import { calculateTimeLeft, projectStatusColor, projectStatusLabel } from "@/lib/utils";

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
  const timeLeft = calculateTimeLeft(project.deadline);

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition">
      <div>
        <div className="flex items-start justify-between">
          <span className="font-mono text-xs font-bold text-red-600">{project.code}</span>
          <Pill color={projectStatusColor(project.status)}>
            {projectStatusLabel(project.status)}
          </Pill>
        </div>
        <h3
          onClick={() => onOpenDetail(project, "overview")}
          className="mt-2 text-base font-black text-slate-900 group-hover:text-red-600 transition cursor-pointer"
        >
          {project.name}
        </h3>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          {project.client ? `Client: ${project.client}` : "Internal Project"}
        </p>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-400">Leader</span>
          <span className="text-slate-900">{project.leader}</span>
        </div>
        {canEditProject && (
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">Deadline</span>
            <span className={timeLeft.tone}>{project.due}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex -space-x-1">
            {project.team?.slice(0, 4).map((initials, idx) => (
              <span
                key={`${initials}-${idx}`}
                className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-[8.5px] font-black text-white ring-2 ring-white"
              >
                {initials}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenDetail(project, "overview")}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Overview
            </button>
            {canEditProject && (
              <button
                onClick={() => onOpenDetail(project, "edit")}
                className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
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
