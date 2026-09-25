import { Edit2, Eye } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import type { Project } from "@/lib/types";
import { calculateTimeLeft, projectStatusColor, projectStatusLabel } from "@/lib/utils";
import { TeamAvatarStack } from "./team-avatar-stack";

interface ProjectTableRowProps {
  project: Project;
  selected: boolean;
  canEditProject: boolean;
  onOpenDetail: (project: Project, tab?: "overview" | "edit") => void;
  onToggleSelect: (projectId: string) => void;
}

export function ProjectTableRow({
  project,
  selected,
  canEditProject,
  onOpenDetail,
  onToggleSelect,
}: ProjectTableRowProps) {
  const timeLeft = calculateTimeLeft(project.deadline);

  return (
    <tr
      className={`hover:bg-slate-50/80 transition ${selected ? "bg-red-50/30" : ""}`}
    >
      {canEditProject && (
        <td className="py-3.5 pl-4 pr-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(project.id)}
            className="rounded border-slate-300 text-[#e3292f] focus:ring-red-400"
          />
        </td>
      )}
      <td className={`py-3.5 ${canEditProject ? "px-3" : "pl-4 pr-3"}`}>
        <button
          onClick={() => onOpenDetail(project, "overview")}
          className="text-left group cursor-pointer"
        >
          <span className="font-mono text-[10px] font-bold text-red-600 block">
            {project.code}
          </span>
          <span className="font-bold text-slate-900 group-hover:text-red-600 transition text-sm">
            {project.name}
          </span>
          {project.client && (
            <span className="text-[11px] text-slate-400 block font-medium">
              {project.client}
            </span>
          )}
        </button>
      </td>
      <td className="py-3.5 px-3">
        <Pill color={projectStatusColor(project.status)}>
          {projectStatusLabel(project.status)}
        </Pill>
      </td>
      <td className="py-3.5 px-3 font-semibold text-slate-600">{project.phase}</td>
      <td className="py-3.5 px-3 font-semibold text-slate-900">{project.leader}</td>
      <td className="py-3.5 px-3">
        <TeamAvatarStack members={project.team ?? []} />
      </td>
      {canEditProject && (
        <td className="py-3.5 px-3">
          <div>
            <span className="text-slate-900 font-bold block">{project.due}</span>
            <span className={`text-[10px] font-bold ${timeLeft.tone}`}>
              {timeLeft.label}
            </span>
          </div>
        </td>
      )}
      <td className="py-3.5 pr-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onOpenDetail(project, "overview")}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
            title="View Project"
          >
            <Eye size={16} />
          </button>
          {canEditProject && (
            <button
              onClick={() => onOpenDetail(project, "edit")}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
              title="Edit Project & Team"
            >
              <Edit2 size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
