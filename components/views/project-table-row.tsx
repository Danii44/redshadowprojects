import { Edit2, Eye } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import type { Project } from "@/lib/types";
import {
  calculateTimeLeft,
  normalizeProjectStatus,
  projectStatusColor,
  projectStatusLabel,
} from "@/lib/utils";
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
  const timeLeft = calculateTimeLeft(project.deadline, project.project_type);
  const isOpenDueSoon =
    normalizeProjectStatus(project.status) === "open" &&
    ["today", "soon"].includes(timeLeft.urgencyLevel);

  return (
    <tr
      className="project-list-row transition"
      data-urgent={isOpenDueSoon}
      data-selected={selected}
    >
      {canEditProject && (
        <td className="py-3.5 pl-4 pr-2">
          <input
            type="checkbox"
            aria-label={`Select ${project.name}`}
            checked={selected}
            onChange={() => onToggleSelect(project.id)}
            className="rounded border-slate-300 text-primary focus:ring-red-400"
          />
        </td>
      )}
      <td className={`py-3.5 ${canEditProject ? "px-3" : "pl-4 pr-3"}`}>
        <button
          onClick={() => onOpenDetail(project, "overview")}
          className="text-left group cursor-pointer"
        >
          <span className="font-semibold text-slate-900 group-hover:text-red-600 transition text-sm">
            {project.name}
          </span>
          {project.client && (
            <span className="text-xs text-slate-400 block font-medium">
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
            <span className="text-slate-900 font-semibold block">{project.due}</span>
            <span className={`text-xs font-semibold ${timeLeft.tone}`}>
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
