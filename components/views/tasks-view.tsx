import React, { useState } from "react";
import { Layers, List, Columns3, Plus, Search, Clock } from "lucide-react";
import { TaskCard } from "@/components/task-card";
import type { Project, Role, Task, User } from "@/lib/types";
import { canEdit, getInitials } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface TasksViewProps {
  tasks: Task[];
  projects: Project[];
  people: User[];
  profileId: string;
  role: Role;
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
  updateTask,
  notify,
  onRefresh,
}: TasksViewProps) {
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    projectId: "",
    assigneeId: "",
    deadline: "",
  });

  const userCanEdit = canEdit(role);

  // Filter tasks according to user role, search, and project
  const visibleTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.project ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject =
      selectedProjectId === "all" || task.project_id === selectedProjectId;

    return matchesSearch && matchesProject;
  });

  const refresh = () => {
    onRefresh?.();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return notify("Please enter a task title");
    if (!taskForm.projectId) return notify("Please select a project");

    if (supabase) {
      const { error } = await supabase.from("tasks").insert([
        {
          title: taskForm.title.trim(),
          project_id: taskForm.projectId,
          assignee_id: taskForm.assigneeId || null,
          due_at: taskForm.deadline
            ? new Date(taskForm.deadline).toISOString()
            : null,
          status: "open",
        },
      ]);

      if (error) return notify(`Error creating task: ${error.message}`);
    }

    notify("Task created successfully");
    setCreating(false);
    setTaskForm({ title: "", projectId: "", assigneeId: "", deadline: "" });
    refresh();
  };

  const updateAssignee = async (taskId: string, assigneeId: string) => {
    if (!supabase || !userCanEdit) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const { error } = await supabase
      .from("tasks")
      .update({ assignee_id: assigneeId || null })
      .eq("id", taskId);

    if (error) return notify(error.message);

    if (assigneeId && task.project_id) {
      await supabase.from("project_members").upsert(
        { project_id: task.project_id, user_id: assigneeId },
        { onConflict: "project_id,user_id" },
      );
    }

    notify("Assignee updated");
    refresh();
  };

  const deleteTask = async (task: Task) => {
    if (
      !supabase ||
      !userCanEdit ||
      !window.confirm(`Delete task "${task.title}"?`)
    )
      return;

    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) return notify(error.message);
    notify("Task deleted");
    refresh();
  };

  const taskBoardColumns = [
    {
      label: "To Do",
      states: ["Open"],
      color: "border-t-sky-500",
      badge: "bg-sky-50 text-sky-700",
    },
    {
      label: "In Progress",
      states: ["In Progress"],
      color: "border-t-blue-500",
      badge: "bg-blue-50 text-blue-700",
    },
    {
      label: "In Review",
      states: ["In Review", "In Revision"],
      color: "border-t-amber-500",
      badge: "bg-amber-50 text-amber-700",
    },
    {
      label: "Completed",
      states: ["Closed", "Completed"],
      color: "border-t-emerald-500",
      badge: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#e3292f]">
            Task Management
          </p>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-black text-slate-900">
            Tasks
          </h1>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"}{" "}
            visible
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
            />
          </div>

          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 cursor-pointer"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "list"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <List size={14} />
              List
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "board"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Columns3 size={14} />
              Board
            </button>
          </div>

          {/* Create Task Button */}
          {userCanEdit && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-xl bg-[#e3292f] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-red-900/20 hover:bg-red-700 transition cursor-pointer"
            >
              <Plus size={16} />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Main View: List or Board */}
      {viewMode === "list" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleTasks.length === 0 ? (
            <div className="col-span-full grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Layers className="h-10 w-10 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                No tasks found
              </h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                Try adjusting your search query or filters, or create a new
                task.
              </p>
            </div>
          ) : (
            visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                t={task}
                people={people}
                updateTask={updateTask}
                assignTask={updateAssignee}
                deleteTask={deleteTask}
                editable={userCanEdit}
                statusEditable={true}
                onDragStart={() => {}}
              />
            ))
          )}
        </div>
      ) : (
        /* Board View (Kanban) */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {taskBoardColumns.map((col) => {
            const colTasks = visibleTasks.filter((t) =>
              col.states.some(
                (s) => s.toLowerCase() === t.state.toLowerCase(),
              ),
            );

            return (
              <div
                key={col.label}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("text/plain");
                  if (taskId) {
                    updateTask(taskId, col.states[0]);
                  }
                }}
                className={`flex flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-3 border-t-4 ${col.color} min-h-[500px]`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    {col.label}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${col.badge}`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", String(task.id))
                      }
                      className="group relative rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-md transition cursor-grab active:cursor-grabbing"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[140px]">
                          {task.project || "General"}
                        </span>
                        {task.due && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                            <Clock size={10} />
                            {task.due}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2">
                        {task.title}
                      </h4>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-800 text-[8px] font-black text-white">
                            {getInitials(task.owner)}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[90px]">
                            {task.owner}
                          </span>
                        </div>

                        {/* Status selector */}
                        <select
                          value={task.state}
                          onChange={(e) => updateTask(task.id, e.target.value)}
                          className="h-6 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-bold text-slate-700 outline-none cursor-pointer"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="In Review">In Review</option>
                          <option value="In Revision">In Revision</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-center">
                      <p className="text-[10px] font-bold text-slate-400">
                        No tasks
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900">
              Create New Task
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Add a new task to your workspace project.
            </p>

            <form onSubmit={handleCreateTask} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design homepage wireframe"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project *
                </label>
                <select
                  required
                  value={taskForm.projectId}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, projectId: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assignee
                </label>
                <select
                  value={taskForm.assigneeId}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, assigneeId: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                >
                  <option value="">Unassigned</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name} ({person.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={taskForm.deadline}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, deadline: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#e3292f] px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-950/20 hover:bg-red-700 transition cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
