import { StatusBadge } from "@/components/ui/status-badge";
import { PersonIdentity } from "@/components/ui/person-identity";
import React from "react";
import {
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import type { Task, User } from "@/lib/types";

interface TaskCardProps {
  deadlineEditor?: React.ReactNode;
  onOpen?: () => void;
  t: Task;
  people: User[];
  updateTask: (id: string | number, state: string) => void;
  assignTask: (id: string, assigneeId: string) => void;
  deleteTask: (task: Task) => void;
  editable: boolean;
  statusEditable: boolean;
  canLogWork: boolean;
  workSubmitting: boolean;
  onLogWork: () => void;
  onDone: () => void;
  onDragStart: () => void;
}

/** Compute deadline info from a raw ISO date string */
function getDeadlineInfo(due_at?: string | null): {
  label: string;
  sublabel: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: React.ReactNode;
  pulse: boolean;
} {
  if (!due_at) {
    return {
      label: "No deadline",
      sublabel: "",
      bgClass: "bg-subtle",
      textClass: "text-muted-foreground",
      borderClass: "border-t-border",
      icon: <Clock size={12} className="text-muted-foreground" />,
      pulse: false,
    };
  }

  const now = Date.now();
  const due = new Date(due_at).getTime();
  const diffMs = due - now;
  const diffHours = diffMs / 3600000;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const dateStr = new Date(due_at).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = new Date(due_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diffMs < 0) {
    const days = Math.abs(diffDays);
    return {
      label: days === 0 ? "Overdue today" : `${days}d overdue`,
      sublabel: dateStr,
      bgClass: "bg-red-soft",
      textClass: "text-red",
      borderClass: "border-t-red",
      icon: <AlertCircle size={12} className="text-red" />,
      pulse: true,
    };
  }

  if (diffHours <= 24) {
    return {
      label: "Due today",
      sublabel: timeStr,
      bgClass: "bg-red-soft",
      textClass: "text-red",
      borderClass: "border-t-red",
      icon: <AlertCircle size={12} className="text-red" />,
      pulse: true,
    };
  }

  if (diffDays <= 3) {
    return {
      label: `${diffDays}d left`,
      sublabel: dateStr,
      bgClass: "bg-orange-soft",
      textClass: "text-orange",
      borderClass: "border-t-orange",
      icon: <Clock size={12} className="text-orange" />,
      pulse: false,
    };
  }

  if (diffDays <= 7) {
    return {
      label: `${diffDays}d left`,
      sublabel: dateStr,
      bgClass: "bg-amber-soft",
      textClass: "text-amber",
      borderClass: "border-t-amber",
      icon: <Clock size={12} className="text-amber" />,
      pulse: false,
    };
  }

  return {
    label: `${diffDays}d left`,
    sublabel: dateStr,
    bgClass: "bg-green-soft",
    textClass: "text-green",
    borderClass: "border-t-green",
    icon: <CheckCircle size={12} className="text-green" />,
    pulse: false,
  };
}

export function TaskCard({
  onOpen,
  deadlineEditor,
  t,
  people,
  updateTask,
  assignTask,
  deleteTask,
  editable,
  statusEditable,
  canLogWork,
  workSubmitting,
  onLogWork,
  onDone,
  onDragStart,
}: TaskCardProps) {
  const dl = ["Completed", "Closed", "Cancelled"].includes(t.state)
    ? {
        label: t.state === "Cancelled" ? "Cancelled" : "Completed",
        sublabel: "",
        bgClass: "bg-subtle",
        textClass: "text-secondary-foreground",
        borderClass: "border-t-border",
        icon: <CheckCircle size={12} className="text-muted-foreground" />,
        pulse: false,
      }
    : getDeadlineInfo(t.due_at);

  const priorityStyles =
    t.priority === "critical"
      ? "bg-red-soft text-red border border-red-border"
      : t.priority === "high"
        ? "bg-amber-soft text-amber border border-amber-border"
        : "bg-muted text-muted-foreground";

  return (
    <div
      draggable={false}
      onDragStart={onDragStart}
      className={`w-full rounded-2xl border border-border bg-card overflow-hidden shadow-xs transition hover:shadow-md ${
        ""
      }`}
    >
      {deadlineEditor && <div className="border-b border-border px-3.5 py-2">{deadlineEditor}</div>}
      {/* â”€â”€ Deadline Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className={`flex items-center justify-between gap-3 border-t-2 px-3.5 py-3 shadow-sm ring-1 ring-inset ring-black/5 ${
          dl.bgClass
        } ${dl.borderClass}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card shadow-sm">
            {dl.icon}
          </span>
          <div className="min-w-0">
            <span
              className={`block text-sm font-semibold tracking-wide ${""} ${dl.textClass}`}
            >
              {dl.label}
            </span>
            {dl.sublabel && (
              <span
                className={`block text-xs font-semibold uppercase tracking-[0.12em] ${dl.textClass} opacity-80`}
              >
                {dl.sublabel}
              </span>
            )}
          </div>
        </div>
        {dl.label !== "No deadline" && (
          <Calendar
            size={14}
            className={`shrink-0 ${dl.textClass} opacity-75`}
          />
        )}
      </div>

      {/* â”€â”€ Card Body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="px-4 pt-3 pb-4">
        {/* Title + Priority */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-semibold leading-snug text-foreground break-words">
            {onOpen ? <button type="button" onClick={onOpen} className="text-left hover:text-red" aria-label={`Open ${t.title} in ${t.project || "General work"}`}>{t.title}</button> : t.title}
          </p>
          <span
            className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold uppercase tracking-tight ${priorityStyles}`}
          >
            {t.priority || "normal"}
          </span>
        </div>

        {/* Project name */}
        <p className="mt-1.5 text-xs font-medium text-muted-foreground break-words">
          {t.project || "General"}
        </p>

        <div className="mt-4">
          <PersonIdentity name={t.owner} />
        </div>
        {/* Status */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <StatusBadge status={t.state} task />
        </div>

        {canLogWork && (
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={onDone}
              disabled={workSubmitting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-green-border px-2.5 py-2 text-xs font-semibold text-green transition hover:bg-green-soft disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              Submit for review
            </button>
            <button
              type="button"
              onClick={onLogWork}
              disabled={workSubmitting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-strong px-2.5 py-2 text-xs font-semibold text-on-strong transition hover:bg-strong-hover disabled:opacity-50"
            >
              <FileText size={14} />
              Log Work
            </button>
          </div>
        )}

        {/* Admin controls */}
        {(editable || statusEditable) && (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            {editable && (
              <select
                aria-label={`Assign ${t.title}`}
                value={t.assignee_id ?? ""}
                onChange={(e) => assignTask(String(t.id), e.target.value)}
                className="w-full rounded-xl border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground bg-subtle hover:border-border cursor-pointer"
              >
                <option value="">Unassigned</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            )}
            {statusEditable && (
              <select
                aria-label={`Status for ${t.title}`}
                value={t.state}
                onChange={(e) => updateTask(t.id, e.target.value)}
                className="w-full rounded-xl border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground bg-subtle hover:border-border cursor-pointer"
              >
                {[
                  "Open",
                  "In Progress",
                  "In Review",
                  "In Revision",
                  "Closed",
                  "Cancelled",
                  "Completed",
                ].map((state) => (
                  <option key={state}>{state}</option>
                ))}
              </select>
            )}
            {editable && <details className="task-danger-actions">
              <summary className="text-xs text-muted-foreground cursor-pointer">More actions</summary>
              <button type="button" onClick={() => deleteTask(t)} className="mt-2 h-11 rounded-xl border border-red-border px-3 text-xs font-semibold text-red hover:bg-red-soft">Delete task</button>
            </details>}
          </div>
        )}
      </div>
    </div>
  );
}
