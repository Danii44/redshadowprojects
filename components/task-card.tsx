import React from "react";
import { Calendar, Clock, AlertCircle, CheckCircle } from "lucide-react";
import type { Task, User } from "@/lib/types";

interface TaskCardProps {
  t: Task;
  people: User[];
  updateTask: (id: string | number, state: string) => void;
  assignTask: (id: string, assigneeId: string) => void;
  deleteTask: (task: Task) => void;
  editable: boolean;
  statusEditable: boolean;
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
      bgClass: "bg-slate-50",
      textClass: "text-slate-400",
      borderClass: "border-t-slate-200",
      icon: <Clock size={12} className="text-slate-400" />,
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
      label: `${days}d overdue`,
      sublabel: dateStr,
      bgClass: "bg-red-50",
      textClass: "text-red-700",
      borderClass: "border-t-red-500",
      icon: <AlertCircle size={12} className="text-red-500" />,
      pulse: true,
    };
  }

  if (diffHours <= 24) {
    return {
      label: "Due today",
      sublabel: timeStr,
      bgClass: "bg-red-50",
      textClass: "text-red-700",
      borderClass: "border-t-red-400",
      icon: <AlertCircle size={12} className="text-red-500" />,
      pulse: true,
    };
  }

  if (diffDays <= 3) {
    return {
      label: `${diffDays}d left`,
      sublabel: dateStr,
      bgClass: "bg-orange-50",
      textClass: "text-orange-700",
      borderClass: "border-t-orange-400",
      icon: <Clock size={12} className="text-orange-500" />,
      pulse: false,
    };
  }

  if (diffDays <= 7) {
    return {
      label: `${diffDays}d left`,
      sublabel: dateStr,
      bgClass: "bg-amber-50",
      textClass: "text-amber-700",
      borderClass: "border-t-amber-400",
      icon: <Clock size={12} className="text-amber-500" />,
      pulse: false,
    };
  }

  return {
    label: `${diffDays}d left`,
    sublabel: dateStr,
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-t-emerald-400",
    icon: <CheckCircle size={12} className="text-emerald-500" />,
    pulse: false,
  };
}

export function TaskCard({
  t,
  people,
  updateTask,
  assignTask,
  deleteTask,
  editable,
  statusEditable,
  onDragStart,
}: TaskCardProps) {
  const dl = getDeadlineInfo(t.due_at);

  const priorityStyles =
    t.priority === "critical"
      ? "bg-red-50 text-red-700 border border-red-200"
      : t.priority === "high"
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : "bg-slate-100 text-slate-500";

  const stateStyles: Record<string, string> = {
    "Open": "bg-sky-50 text-sky-700",
    "In Progress": "bg-blue-50 text-blue-700",
    "In Review": "bg-purple-50 text-purple-700",
    "In Revision": "bg-amber-50 text-amber-700",
    "Closed": "bg-emerald-50 text-emerald-700",
    "Completed": "bg-emerald-50 text-emerald-700",
    "Cancelled": "bg-slate-100 text-slate-400",
  };

  return (
    <div
      draggable={editable}
      onDragStart={onDragStart}
      className={`w-full rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition hover:shadow-md ${
        editable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      {/* â”€â”€ Deadline Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className={`flex items-center justify-between gap-3 border-t-[5px] px-3.5 py-3 shadow-sm ring-1 ring-inset ring-black/5 ${
          dl.bgClass
        } ${dl.borderClass}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 shadow-sm">
            {dl.icon}
          </span>
          <div className="min-w-0">
            <span
              className={`block text-sm font-black tracking-wide ${
                dl.pulse ? "animate-pulse" : ""
              } ${dl.textClass}`}
            >
              {dl.label}
            </span>
            {dl.sublabel && (
              <span className={`block text-[10px] font-bold uppercase tracking-[0.12em] ${dl.textClass} opacity-80`}>
                {dl.sublabel}
              </span>
            )}
          </div>
        </div>
        {dl.label !== "No deadline" && (
          <Calendar size={14} className={`shrink-0 ${dl.textClass} opacity-75`} />
        )}
      </div>

      {/* â”€â”€ Card Body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="px-4 pt-3 pb-4">
        {/* Title + Priority */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-black leading-snug text-slate-900 break-words">
            {t.title}
          </p>
          <span
            className={`shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-tight ${priorityStyles}`}
          >
            {t.priority || "normal"}
          </span>
        </div>

        {/* Project name */}
        <p className="mt-1.5 text-[11px] font-semibold text-slate-400 truncate">
          {t.project || "General"}
        </p>

        {/* Status + Assignee Row */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span
            className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${
              stateStyles[t.state] ?? "bg-slate-100 text-slate-500"
            }`}
          >
            {t.state}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-[9px] font-black text-white ring-2 ring-white"
              title={t.owner}
            >
              {t.initials || "?"}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 max-w-[80px] truncate">
              {t.owner}
            </span>
          </div>
        </div>

        {/* Admin controls */}
        {(editable || statusEditable) && (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            {editable && (
              <select
                aria-label={`Assign ${t.title}`}
                value={t.assignee_id ?? ""}
                onChange={(e) => assignTask(String(t.id), e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 hover:border-slate-300 cursor-pointer"
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
                value={t.state}
                onChange={(e) => updateTask(t.id, e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 hover:border-slate-300 cursor-pointer"
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
            {editable && (
              <button
                onClick={() => deleteTask(t)}
                className="w-full rounded-xl border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer"
              >
                Delete task
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
