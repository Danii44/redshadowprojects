import React, { useEffect, useState } from "react";
import { Layers, GripVertical, AlertCircle } from "lucide-react";
import { TaskCard } from "@/components/task-card";
import type { Project, Role, Task, User } from "@/lib/types";
import {
  canEdit,
  calculateTimeLeft,
  normalizeProjectStatus,
  getInitials,
} from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface TasksViewProps {
  tasks: Task[];
  projects: Project[];
  people: User[];
  profileId: string;
  role: Role;
  kanban: boolean;
  updateTask: (id: string | number, state: string) => void;
  notify: (message: string) => void;
  onRefresh?: () => void;
}

export function TasksView({
  tasks,
  projects,
  people,
  profileId,
  role,
  kanban,
  updateTask,
  notify,
  onRefresh,
}: TasksViewProps) {
  const cols = [
    "Open",
    "In Progress",
    "In Review",
    "In Revision",
    "Closed",
    "Cancelled",
    "Completed",
  ];

  const [creating, setCreating] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    projectId: "",
    assigneeId: "",
    deadline: "",
  });

  const [draggedTaskId, setDraggedTaskId] = useState<string | number | null>(
    null,
  );
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("all");

  useEffect(() => {
    if (selectedProjectId === "all" && projects.length) {
      setSelectedProjectId("all");
    }
  }, [projects, selectedProjectId]);

  const userCanEdit = canEdit(role);
  const userCanChangeStatus = userCanEdit || role === "Team Member";

  const refresh = () => {
    if (onRefresh) onRefresh();
    else window.location.reload();
  };

  const updateProjectStatus = async (projectId: string, newStatus: string) => {
    if (!supabase || !userCanEdit) return;
    const { error } = await supabase
      .from("projects")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    if (error) return notify(`Could not update project: ${error.message}`);
    const label = newStatus
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    notify(`Project moved to ${label}`);
    refresh();
  };

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        title: taskForm.title,
        project_id: taskForm.projectId || null,
        assignee_id: taskForm.assigneeId || null,
        created_by: profileId,
        status: "open",
        priority: "normal",
        due_at: taskForm.deadline
          ? new Date(`${taskForm.deadline}T17:00:00`).toISOString()
          : null,
      })
      .select("id")
      .single();

    if (error) return notify(error.message);

    if (taskForm.assigneeId && taskForm.projectId) {
      const { error: memberError } = await supabase
        .from("project_members")
        .upsert(
          {
            project_id: taskForm.projectId,
            user_id: taskForm.assigneeId,
            project_role: "Team Member",
          },
          { onConflict: "project_id,user_id" },
        );

      if (memberError && task) {
        await supabase.from("tasks").delete().eq("id", task.id);
        return notify(`Task was not assigned: ${memberError.message}`);
      }
    }

    notify("Task created");
    setCreating(false);
    setTaskForm({ title: "", projectId: "", assigneeId: "", deadline: "" });
    refresh();
  };

  const assignTask = async (taskId: string, assigneeId: string) => {
    if (!supabase || !userCanEdit) return;
    const task = tasks.find((item) => String(item.id) === taskId);

    const { error } = await supabase
      .from("tasks")
      .update({
        assignee_id: assigneeId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) return notify(error.message);

    if (assigneeId && task?.project_id) {
      const { error: memberError } = await supabase
        .from("project_members")
        .upsert(
          {
            project_id: task.project_id,
            user_id: assigneeId,
            project_role: "Team Member",
          },
          { onConflict: "project_id,user_id" },
        );

      if (memberError) {
        await supabase
          .from("tasks")
          .update({ assignee_id: task.assignee_id ?? null })
          .eq("id", taskId);
        return notify(`Assignment was not saved: ${memberError.message}`);
      }
    }

    notify("Task assignee updated");
    refresh();
  };

  const deleteTask = async (task: Task) => {
    if (
      !supabase ||
      !userCanEdit ||
      !window.confirm(`Delete task "${task.title}"?`)
    )
      return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id);

    if (error) return notify(error.message);
    notify("Task deleted");
    refresh();
  };

  const boardColumns = [
    { label: "Backlog", states: ["Open"] },
    { label: "In progress", states: ["In Progress"] },
    { label: "Review", states: ["In Review", "In Revision"] },
    { label: "Done", states: ["Closed", "Completed"] },
    { label: "Cancelled", states: ["Cancelled"] },
  ];

  const boardTasks =
    selectedProjectId === "all"
      ? tasks
      : tasks.filter((task) => task.project_id === selectedProjectId);

  // ─── PROJECT PIPELINE KANBAN (Admin / Project Leader) ──────────────────
  if (kanban && role !== "Team Member") {
    const pipelineColumns = [
      {
        label: "Open",
        status: "open",
        accentClass: "border-t-sky-400",
        dotClass: "bg-sky-400",
        headerClass: "text-sky-700",
      },
      {
        label: "In Progress",
        status: "in_progress",
        accentClass: "border-t-blue-500",
        dotClass: "bg-blue-500",
        headerClass: "text-blue-700",
      },
      {
        label: "In Review",
        status: "in_review",
        accentClass: "border-t-amber-400",
        dotClass: "bg-amber-400",
        headerClass: "text-amber-700",
      },
      {
        label: "Revisions",
        status: "revisions",
        accentClass: "border-t-violet-500",
        dotClass: "bg-violet-500",
        headerClass: "text-violet-700",
      },
      {
        label: "On Hold",
        status: "on_hold",
        accentClass: "border-t-orange-400",
        dotClass: "bg-orange-400",
        headerClass: "text-orange-700",
      },
      {
        label: "Delivered",
        status: "delivered",
        accentClass: "border-t-emerald-500",
        dotClass: "bg-emerald-500",
        headerClass: "text-emerald-700",
      },
    ];

    const priorityBadge = (priority: string) => {
      if (priority === "critical")
        return "bg-red-50 text-red-700 border-red-200";
      if (priority === "high") return "bg-amber-50 text-amber-700 border-amber-200";
      return "bg-slate-100 text-slate-500 border-slate-200";
    };

    const priorityBar = (priority: string) => {
      if (priority === "critical") return "bg-red-500";
      if (priority === "high") return "bg-amber-400";
      return "bg-blue-400";
    };

    return (
      <>
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#e3292f]">
              Project Pipeline
            </p>
            <h1 className="mt-0.5 text-2xl sm:text-3xl font-black text-slate-900">
              Status Board
            </h1>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Drag projects between columns to update their status. All{" "}
              {projects.filter((p) => {
                const s = normalizeProjectStatus(p.status);
                return s !== "closed" && s !== "cancelled";
              }).length}{" "}
              active projects visible.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-2xs">
            <Layers size={14} className="text-[#e3292f]" />
            <span>{projects.length} total projects</span>
          </div>
        </div>

        {/* Pipeline board — compact & responsive grid, no horizontal scroll */}
        <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {pipelineColumns.map((col) => {
            const colProjects = projects.filter(
              (p) => normalizeProjectStatus(p.status) === col.status,
            );

            return (
              <div
                key={col.status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedProjectId) {
                    updateProjectStatus(draggedProjectId, col.status);
                    setDraggedProjectId(null);
                  }
                }}
                className={`flex flex-col rounded-xl border border-t-4 border-slate-200 bg-slate-50/70 ${
                  col.accentClass
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-2.5 py-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${col.dotClass}`} />
                    <span className={`text-[10px] font-black uppercase tracking-tight truncate ${col.headerClass}`}>
                      {col.label}
                    </span>
                  </div>
                  <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-white px-1 text-[9px] font-black text-slate-600 ring-1 ring-slate-200">
                    {colProjects.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 p-1.5 min-h-[160px]">
                  {colProjects.map((project) => {
                    const timeLeft = calculateTimeLeft(project.deadline);
                    const progress = project.completion_percentage ?? 0;
                    const prio = (project.priority || "normal").toLowerCase();

                    return (
                      <div
                        key={project.id}
                        draggable={userCanEdit}
                        onDragStart={() => setDraggedProjectId(project.id)}
                        onDragEnd={() => setDraggedProjectId(null)}
                        className={`group relative rounded-lg border border-slate-200 bg-white p-2 shadow-2xs transition ${
                          userCanEdit
                            ? "cursor-grab active:cursor-grabbing hover:shadow-sm hover:-translate-y-0.5"
                            : ""
                        }`}
                      >
                        {/* Priority left bar */}
                        <div
                          className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full ${priorityBar(prio)}`}
                        />

                        {/* Top row: code + priority */}
                        <div className="flex items-center justify-between gap-1 mb-1 pl-1.5">
                          <span className="font-mono text-[9px] font-bold text-slate-400 truncate">
                            {project.code}
                          </span>
                          <span
                            className={`shrink-0 rounded border px-1 py-0.2 text-[7.5px] font-black uppercase tracking-tight ${
                              priorityBadge(prio)
                            }`}
                          >
                            {prio}
                          </span>
                        </div>

                        {/* Project name */}
                        <p className="pl-1.5 text-[11px] font-bold leading-snug text-slate-900 line-clamp-2 break-words">
                          {project.name}
                        </p>

                        {/* Progress bar */}
                        <div className="pl-1.5 mt-1.5 space-y-0.5">
                          <div className="flex justify-between text-[8px] font-bold text-slate-400">
                            <span>Progress</span>
                            <span className="text-slate-700">{progress}%</span>
                          </div>
                          <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#e3292f] transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Footer: team + deadline */}
                        <div className="pl-1.5 mt-2 flex items-center justify-between gap-1">
                          <div className="flex -space-x-1 shrink-0">
                            {(project.team ?? []).slice(0, 2).map(
                              (initials: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="grid h-3.5 w-3.5 place-items-center rounded-full bg-slate-800 text-[6px] font-black text-white ring-1 ring-white"
                                >
                                  {initials}
                                </span>
                              ),
                            )}
                            {(project.team?.length ?? 0) > 2 && (
                              <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-slate-200 text-[6px] font-black text-slate-600 ring-1 ring-white">
                                +{(project.team?.length ?? 0) - 2}
                              </span>
                            )}
                          </div>
                          <span className={`text-[8.5px] font-bold truncate ${timeLeft.tone}`}>
                            {timeLeft.label}
                          </span>
                        </div>

                        {/* Drag handle hint */}
                        {userCanEdit && (
                          <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-40 transition">
                            <GripVertical size={10} className="text-slate-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!colProjects.length && (
                  <div className="m-1.5 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-4 text-center">
                    <span className={`text-[9px] font-bold ${col.headerClass} opacity-50`}>
                      Empty
                    </span>
                    <p className="mt-0.5 text-[8px] font-semibold text-slate-400">
                      Drop here
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  }

  // ─── TASK BOARD (Team Member) ────────────────────────────────────────────
  if (kanban && role === "Team Member") {
    const myTasks = tasks.filter(
      (t) => t.assignee_id === profileId || t.owner !== "Unassigned",
    );
    const boardTasks =
      selectedProjectId === "all"
        ? myTasks
        : myTasks.filter((t) => t.project_id === selectedProjectId);

    const taskBoardColumns = [
      { label: "To Do", states: ["Open"], color: "border-t-slate-400" },
      { label: "In Progress", states: ["In Progress"], color: "border-t-blue-500" },
      { label: "In Review", states: ["In Review", "In Revision"], color: "border-t-amber-400" },
      { label: "Done", states: ["Closed", "Completed"], color: "border-t-emerald-500" },
    ];

    return (
      <>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#e3292f]">My Work</p>
            <h1 className="mt-0.5 text-2xl sm:text-3xl font-black text-slate-900">Task Board</h1>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Drag tasks between columns to update their status.
            </p>
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 w-full sm:w-auto min-w-48 cursor-pointer"
          >
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {taskBoardColumns.map((column) => {
            const columnTasks = boardTasks.filter((t) =>
              column.states.includes(t.state),
            );
            return (
              <div
                key={column.label}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedTaskId !== null) {
                    updateTask(draggedTaskId, column.states[0]);
                    setDraggedTaskId(null);
                  }
                }}
                className={`min-h-[260px] rounded-2xl border border-t-4 border-slate-200 bg-slate-50/70 ${column.color}`}
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-2.5">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                    {column.label}
                  </span>
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1.5 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-2 p-2.5">
                  {columnTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      t={t}
                      people={people}
                      updateTask={updateTask}
                      assignTask={assignTask}
                      deleteTask={deleteTask}
                      editable={false}
                      statusEditable={true}
                      onDragStart={() => setDraggedTaskId(t.id)}
                    />
                  ))}
                  {!columnTasks.length && (
                    <div className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs font-semibold text-slate-400">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  // ─── TASKS LIST VIEW (view === "Tasks") ───────────────────────────────────
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Tasks</h1>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {tasks.length} total tasks across all projects & standalone assignments
          </p>
        </div>
        {role !== "Team Member" && (
          <button
            onClick={() => setCreating(!creating)}
            className="flex items-center gap-2 rounded-xl bg-[#e3292f] px-4 py-2.5 text-xs font-black text-white hover:bg-red-700 transition shadow-xs cursor-pointer self-start sm:self-auto"
          >
            {creating ? "Cancel" : "+ New Task"}
          </button>
        )}
      </div>

      {creating && (
        <form
          onSubmit={createTask}
          className="mb-5 grid gap-3 rounded-2xl border border-red-100 bg-white p-5 sm:grid-cols-2 md:grid-cols-4 shadow-xs"
        >
          <input
            required
            placeholder="Task title *"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-50 transition sm:col-span-2 md:col-span-1"
          />
          <select
            value={taskForm.projectId}
            onChange={(e) =>
              setTaskForm({ ...taskForm, projectId: e.target.value })
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 transition cursor-pointer"
          >
            <option value="">General / Standalone Task (No Project)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={taskForm.assigneeId}
            onChange={(e) =>
              setTaskForm({ ...taskForm, assigneeId: e.target.value })
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 transition cursor-pointer"
          >
            <option value="">Unassigned</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Task deadline"
            value={taskForm.deadline}
            onChange={(e) =>
              setTaskForm({ ...taskForm, deadline: e.target.value })
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 transition"
          />
          <button className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white sm:col-span-2 md:col-span-4 hover:bg-slate-800 transition cursor-pointer shadow-xs">
            Create task
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="divide-y divide-slate-100">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between hover:bg-slate-50/80 transition"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-900 text-sm">{t.title}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
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
                <p className="mt-1 text-xs text-slate-500 truncate">
                  <span className="font-semibold text-slate-700">{t.project}</span> · Assigned to {t.owner}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <select
                  aria-label={`Assign ${t.title}`}
                  disabled={!userCanEdit}
                  value={t.assignee_id ?? ""}
                  onChange={(e) => assignTask(String(t.id), e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
                <select
                  disabled={!userCanChangeStatus}
                  value={t.state}
                  onChange={(e) => updateTask(t.id, e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                >
                  {cols.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {userCanEdit && (
                  <button
                    onClick={() => deleteTask(t)}
                    className="h-9 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    Delete
                  </button>
                )}
                <span
                  className={`text-xs font-bold whitespace-nowrap px-1 ${
                    t.dueTone || "text-slate-500"
                  }`}
                >
                  {t.due}
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900 text-[9px] font-black text-white">
                  {t.initials}
                </span>
              </div>
            </div>
          ))}
          {!tasks.length && (
            <div className="p-8 text-center text-xs font-semibold text-slate-400">
              No tasks available.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
