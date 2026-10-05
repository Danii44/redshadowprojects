import { ArrowUpRight, AlertCircle, CalendarDays } from "lucide-react";
import type { Project, User } from "@/lib/types";
import { AvatarGroup } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Panel, EmptyState } from "./panel";
import { attentionProjects, daysLeft, upcomingProjects } from "./data";

export function AttentionList({
  projects,
  people,
  now,
  onSelect,
}: {
  projects: Project[];
  people: User[];
  now: number;
  onSelect: (id: string) => void;
}) {
  const urgent = attentionProjects(projects, now);
  return (
    <Panel
      title="Needs attention"
      subtitle="Overdue & due in next 2 days"
      action={<span className="studio-count">{urgent.length}</span>}
    >
      <div className="studio-panel-scroll">
        {!urgent.length && (
          <EmptyState>
            <AlertCircle size={24} />
            <strong>No urgent deadlines</strong>
            <span>Your upcoming work is on track.</span>
          </EmptyState>
        )}
        {urgent.slice(0, 6).map((project) => {
          const due = daysLeft(project, now);
          return (
            <button
              key={project.id}
              onClick={() => onSelect(project.id)}
              className="studio-list-row studio-deadline-row w-full text-left"
            >
              <span
                className={`studio-urgency-dot ${due.urgent ? "studio-urgency-dot--late" : ""}`}
              />
              <div className="min-w-0 flex-1">
                <p className="studio-row-title">{project.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={project.status} />
                  <span
                    className={`studio-deadline-label ${due.urgent ? "is-overdue" : ""}`}
                  >
                    {due.label}
                  </span>
                </div>
              </div>
              <AvatarGroup project={project} people={people} limit={2} />
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

export function DeadlineList({
  projects,
  people,
  now,
  onSelect,
  onCalendar,
}: {
  projects: Project[];
  people: User[];
  now: number;
  onSelect: (id: string) => void;
  onCalendar: () => void;
}) {
  const upcoming = upcomingProjects(projects, now);
  return (
    <Panel
      title="Upcoming deadlines"
      subtitle="Due in next 7 days"
      action={
        <button className="studio-link" onClick={onCalendar}>
          Calendar <ArrowUpRight size={14} />
        </button>
      }
    >
      <div className="studio-panel-scroll">
        {!upcoming.length && (
          <EmptyState>
            <CalendarDays size={24} />
            <strong>A clear week ahead</strong>
            <span>No project deadlines in the next 7 days.</span>
          </EmptyState>
        )}
        {upcoming.slice(0, 6).map((project) => {
          const date = new Date(project.deadline!);
          return (
            <button
              key={project.id}
              className="studio-list-row studio-deadline-row w-full text-left"
              onClick={() => onSelect(project.id)}
            >
              <span className="studio-date-block">
                <strong>{date.getDate()}</strong>
                <span>
                  {date.toLocaleDateString(undefined, { month: "short" })}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="studio-row-title">{project.name}</p>
                <p className="studio-meta">
                  {project.phase} · {daysLeft(project, now).label}
                </p>
              </div>
              <AvatarGroup project={project} people={people} limit={2} />
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
