import { useState } from "react";
import { ArrowUpRight, Check, RotateCcw, CheckCircle2 } from "lucide-react";
import type { Project, Task, User } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Panel, EmptyState } from "./panel";
import { normalizeProjectStatus } from "@/lib/utils";

export function ApprovalPanel({
  tasks,
  projects,
  people,
  onReviewDecision,
  onViewAll,
  onOpenTask,
}: {
  tasks: Task[];
  projects: Project[];
  people: User[];
  onReviewDecision?: (
    task: Task,
    state: "Completed" | "Open",
  ) => void | Promise<void>;
  onViewAll: () => void;
  onOpenTask?: (task: Task) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const queue = tasks.filter((task) =>
    ["in_review", "in_revision"].includes(
      task.status.toLowerCase().replaceAll(" ", "_"),
    ),
  );
  const projectQueue = projects.filter((project) =>
    ["in_review", "revisions"].includes(normalizeProjectStatus(project.status)),
  );
  const act = async (task: Task, state: "Completed" | "Open") => {
    setPending(String(task.id));
    try {
      await onReviewDecision?.(task, state);
    } finally {
      setPending(null);
    }
  };
  return (
    <Panel
      title="Awaiting approval"
      subtitle={`${queue.length} task${queue.length === 1 ? "" : "s"} · ${projectQueue.length} project${projectQueue.length === 1 ? "" : "s"} to review`}
      action={
        <button className="studio-link" onClick={onViewAll}>
          View all <ArrowUpRight size={14} />
        </button>
      }
    >
      <div className="studio-panel-scroll">
        {!queue.length && !projectQueue.length && (
          <EmptyState>
            <CheckCircle2 size={24} />
            <strong>All caught up</strong>
            <span>No submissions need your review.</span>
          </EmptyState>
        )}
        {queue.slice(0, 4).map((task) => {
          const person = people.find(
            (person) => person.id === task.assignee_id,
          );
          return (
            <div className="studio-approval-row" key={task.id}>
              <div className="flex items-start gap-3">
                <Avatar name={task.owner} src={person?.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="studio-row-title">{onOpenTask ? <button className="text-left hover:text-primary" onClick={() => onOpenTask(task)}>{task.title}</button> : task.title}</p>
                  <p className="studio-person-name">{task.owner}</p>
                  <p className="studio-meta">
                    {task.project} ·{" "}
                    {projects.find((project) => project.id === task.project_id)
                      ?.phase ?? "Task"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <StatusBadge status={task.state} task />
                {task.submitted_at && (
                  <time className="studio-meta" dateTime={task.submitted_at}>
                    {new Date(task.submitted_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="studio-action studio-action--approve"
                  disabled={pending !== null || !onReviewDecision}
                  onClick={() => act(task, "Completed")}
                >
                  <Check size={14} />
                  {pending === String(task.id) ? "Saving…" : "Approve"}
                </button>
                <button
                  className="studio-action"
                  disabled={pending !== null || !onReviewDecision}
                  onClick={() => act(task, "Open")}
                >
                  <RotateCcw size={13} />
                  Request Changes
                </button>
              </div>
            </div>
          );
        })}
        {projectQueue.slice(0, Math.max(0, 4 - queue.length)).map((project) => (
          <button
            key={project.id}
            className="studio-list-row w-full text-left"
            onClick={onViewAll}
          >
            <div className="min-w-0">
              <p className="studio-row-title">{project.name}</p>
              <p className="studio-meta">{project.phase} · Project review</p>
            </div>
            <StatusBadge status={project.status} />
          </button>
        ))}
      </div>
    </Panel>
  );
}
