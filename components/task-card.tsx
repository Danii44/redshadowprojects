import React from "react";
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
  return (
    <div
      draggable={editable}
      onDragStart={onDragStart}
      className={`w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm ${
        editable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold leading-5 text-slate-900">{t.title}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ${
            t.priority === "critical"
              ? "bg-red-50 text-red-700"
              : t.priority === "high"
              ? "bg-amber-50 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {t.priority || "normal"}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">{t.project}</p>
      <p
        className={`mt-1 text-xs font-semibold ${
          t.dueTone || "text-slate-500"
        }`}
      >
        {t.owner} · Due {t.due || "No deadline"}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500">
          ☑ {t.checklist || "0/0"}
        </span>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-[9px] font-black text-white">
          {t.initials || "TM"}
        </span>
      </div>
      {(editable || statusEditable) && (
        <div className="mt-3 space-y-2">
          {editable && (
            <select
              aria-label={`Assign ${t.title}`}
              value={t.assignee_id ?? ""}
              onChange={(e) => assignTask(String(t.id), e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-800"
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
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-800"
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
              className="w-full rounded-lg border border-red-200 px-2 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
            >
              Delete task
            </button>
          )}
        </div>
      )}
    </div>
  );
}
