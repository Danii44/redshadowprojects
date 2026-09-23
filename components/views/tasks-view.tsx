import React, { useEffect, useState } from "react";
import { TaskCard } from "@/components/task-card";
import type { Project, Role, Task, User } from "@/lib/types";
import { canEdit } from "@/lib/utils";
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

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        title: taskForm.title,
        project_id: taskForm.projectId,
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

  if (kanban) {
    return (
      <>
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-bold text-red-600">Workflow</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Task board</h1>
            <p className="mt-2 text-sm text-slate-500">
              Choose a project to focus the board on one piece of work.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label
              className="text-xs font-black uppercase tracking-wide text-slate-400"
              htmlFor="kanban-project"
            >
              Project
            </label>
            <select
              id="kanban-project"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="h-11 min-w-60 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
            >
              <option value="all">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-sm font-bold text-slate-600">
            {selectedProjectId === "all"
              ? "All project tasks"
              : projects.find((project) => project.id === selectedProjectId)?.name}
          </span>
          <span className="text-xs font-black text-slate-400">
            {boardTasks.length} {boardTasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {boardColumns.map((column) => {
            const columnTasks = boardTasks.filter((task) =>
              column.states.includes(task.state),
            );
            return (
              <div
                key={column.label}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedTaskId !== null) {
                    updateTask(draggedTaskId, column.states[0]);
                    setDraggedTaskId(null);
                  }
                }}
                className="min-h-[230px] rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-sm font-black text-slate-900">
                    {column.label}
                  </span>
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {columnTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      t={t}
                      people={people}
                      updateTask={updateTask}
                      assignTask={assignTask}
                      deleteTask={deleteTask}
                      editable={userCanEdit}
                      statusEditable={userCanChangeStatus}
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

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-slate-900">Tasks</h1>
        {role !== "Team Member" && (
          <button
            onClick={() => setCreating(!creating)}
            className="flex items-center gap-2 rounded-xl bg-[#e3292f] px-4 py-2.5 text-xs font-black text-white hover:bg-red-700 transition shadow-xs cursor-pointer"
          >
            {creating ? "Cancel" : "+ New Task"}
          </button>
        )}
      </div>

      {creating && (
        <form
          onSubmit={createTask}
          className="mb-5 grid gap-3.5 rounded-2xl border border-red-100 bg-white p-5 md:grid-cols-4 shadow-xs"
        >
          <input
            required
            placeholder="Task title"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-50 transition"
          />
          <select
            required
            value={taskForm.projectId}
            onChange={(e) =>
              setTaskForm({ ...taskForm, projectId: e.target.value })
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 transition cursor-pointer"
          >
            <option value="">Select project</option>
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
            required
            type="date"
            aria-label="Task deadline"
            value={taskForm.deadline}
            onChange={(e) =>
              setTaskForm({ ...taskForm, deadline: e.target.value })
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 transition"
          />
          <button className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white md:col-span-4 hover:bg-slate-800 transition cursor-pointer shadow-xs">
            Create task
          </button>
        </form>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="divide-y divide-slate-100">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center hover:bg-slate-50 transition"
            >
              <div className="flex-1">
                <p className="font-bold text-slate-900">{t.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {t.project} · Assigned to {t.owner}
                </p>
              </div>
              <select
                aria-label={`Assign ${t.title}`}
                disabled={!userCanEdit}
                value={t.assignee_id ?? ""}
                onChange={(e) => assignTask(String(t.id), e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold disabled:bg-slate-100 disabled:text-slate-400"
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
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold disabled:bg-slate-100 disabled:text-slate-400"
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
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
              <span
                className={`text-sm font-bold ${
                  t.dueTone || "text-slate-500"
                }`}
              >
                {t.due}
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-[10px] font-black text-white">
                {t.initials}
              </span>
            </div>
          ))}
          {!tasks.length && (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">
              No tasks available.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
