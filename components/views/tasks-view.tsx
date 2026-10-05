import { TaskOverview } from "@/components/tasks/task-overview";
import { StatusBadge } from "@/components/ui/status-badge";
import { PersonIdentity } from "@/components/ui/person-identity";
import { Modal } from "@/components/ui/modal";
import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Layers,
  List,
  Columns3,
  Plus,
  Search,
  Clock,
  Send,
  X,
} from "lucide-react";
import { TaskCard } from "@/components/task-card";
import type { Project, Role, Task, User } from "@/lib/types";
import { canEdit, updateTaskWithFallback } from "@/lib/utils";
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
  initialSearch?: string;
  initialTaskId?: string | null;
  title?: string;
  detailOnly?: boolean;
  onOpenTask?: (task: Task) => void;
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
  initialSearch = "",
  initialTaskId = null,
  title = "Tasks",
  detailOnly = false,
  onOpenTask,
}: TasksViewProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [loggingProgressTask, setLoggingProgressTask] = useState<Task | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [progressForm, setProgressForm] = useState({
    notes: "",
    completionPct: 50,
    hoursSpent: "4",
    blocker: "",
    taskState: "In Progress",
  });
  const [selectedPersonId, setSelectedPersonId] = useState<string>("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState<
    "all" | "open" | "in_progress" | "in_review" | "completed"
  >("all");
  const [urgency, setUrgency] = useState("all");
  const [sort, setSort] = useState("deadline");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    projectId: "",
    assigneeId: "",
    deadline: "",
  });

  const userCanEdit = canEdit(role);
  const isManagerRole = role !== "Team Member";
  const selectedPerson = people.find(
    (person) => person.id === selectedPersonId,
  );
  const memberProfile = people.find((person) => person.id === profileId);
  const completedTaskStates = ["Completed", "Closed", "Cancelled"];

  const isCompletedTask = (task: Task) =>
    completedTaskStates.includes(task.state);

  const canMemberLogWork = (task: Task) =>
    role === "Team Member" &&
    (task.assignee_id === profileId || task.owner === memberProfile?.name) &&
    !["In Review", "Completed", "Closed", "Cancelled"].includes(task.state);

  const startProgressLog = (task: Task) => {
    setLoggingProgressTask(task);
    setProgressForm({
      notes: "",
      completionPct: task.completion_percentage ?? 25,
      hoursSpent: "4",
      blocker: "",
      taskState: task.state || "In Progress",
    });
  };

  const memberTaskSet = tasks.filter(
    (task) =>
      task.assignee_id === profileId || task.owner === memberProfile?.name,
  );

  const personTaskSet =
    selectedPersonId === "all"
      ? tasks
      : tasks.filter(
          (task) =>
            task.assignee_id === selectedPersonId ||
            task.owner === selectedPerson?.name,
        );

  const matchesTaskStatus = (task: Task) => {
    switch (taskStatusFilter) {
      case "open":
        return task.state === "Open";
      case "in_progress":
        return task.state === "In Progress";
      case "in_review":
        return ["In Review", "In Revision"].includes(task.state);
      case "completed":
        return isCompletedTask(task);
      case "all":
      default:
        return (
          detailOnly || Boolean(initialSearch) || !isCompletedTask(task)
        );
    }
  };

  // List view hides completed tasks by default; board view can still show them.
  const listVisibleTasks = tasks.filter((task) => {
    if (
      initialTaskId &&
      searchQuery === initialSearch &&
      searchQuery &&
      String(task.id) !== initialTaskId
    )
      return false;
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.owner ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.project ?? "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!isManagerRole) {
      const matchesSelf =
        task.assignee_id === profileId || task.owner === memberProfile?.name;
      return matchesSearch && matchesSelf && matchesTaskStatus(task);
    }

    const matchesPerson =
      selectedPersonId === "all" ||
      task.assignee_id === selectedPersonId ||
      task.owner === selectedPerson?.name;

    return matchesSearch && matchesPerson && matchesTaskStatus(task);
  });

  const boardVisibleTasks = tasks.filter((task) => {
    if (
      initialTaskId &&
      searchQuery === initialSearch &&
      searchQuery &&
      String(task.id) !== initialTaskId
    )
      return false;
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.owner ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.project ?? "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!isManagerRole) {
      const matchesSelf =
        task.assignee_id === profileId || task.owner === memberProfile?.name;
      return matchesSearch && matchesSelf && matchesTaskStatus(task);
    }

    const matchesPerson =
      selectedPersonId === "all" ||
      task.assignee_id === selectedPersonId ||
      task.owner === selectedPerson?.name;

    return matchesSearch && matchesPerson && matchesTaskStatus(task);
  });

  const scopedTasks = isManagerRole ? personTaskSet : memberTaskSet;
  const visibleTasks = (viewMode === "list" ? listVisibleTasks : boardVisibleTasks)
    .filter(task => {
      if (urgency === "all") return true;
      if (isCompletedTask(task) || !task.due_at) return false;
      const delta = new Date(task.due_at).getTime() - now;
      return urgency === "overdue" ? delta < 0 : delta >= 0 && delta <= 7 * 86400000;
    }).sort((a, b) => sort === "name" ? a.title.localeCompare(b.title) :
      (a.due_at ? new Date(a.due_at).getTime() : Infinity) -
      (b.due_at ? new Date(b.due_at).getTime() : Infinity));
  const pageCount = Math.max(1, Math.ceil(visibleTasks.length / 12));
  const currentPage = Math.min(page, pageCount);
  const pageTasks = visibleTasks.slice((currentPage - 1) * 12, currentPage * 12);

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
          created_by: profileId || null,
          due_at: taskForm.deadline
            ? new Date(taskForm.deadline).toISOString()
            : null,
          status: "open",
        },
      ]);

      if (error) return notify(`Error creating task: ${error.message}`);

      if (taskForm.assigneeId && taskForm.projectId) {
        await supabase
          .from("project_members")
          .upsert(
            { project_id: taskForm.projectId, user_id: taskForm.assigneeId },
            { onConflict: "project_id,user_id" },
          );
      }
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
      await supabase
        .from("project_members")
        .upsert(
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

  const handleQuickCompleteTask = async (task: Task) => {
    if (!supabase || !canMemberLogWork(task)) return;

    setSubmitting(true);
    const { error } = await updateTaskWithFallback(supabase, task.id, {
      completion_percentage: 100,
      status: "in_review",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setSubmitting(false);

    if (error) {
      notify(`Could not send task to review: ${error.message}`);
      return;
    }

    await supabase.from("task_comments").insert({
      task_id: task.id,
      author_id: profileId,
      body: JSON.stringify({
        type: "daily_progress",
        notes: "Task submitted for admin review.",
        completionPct: 100,
        hoursSpent: 0,
        blocker: null,
      }),
    });

    notify("Task sent to review");
    refresh();
  };

  const handleSubmitProgress = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !loggingProgressTask) return;

    if (!canMemberLogWork(loggingProgressTask)) {
      notify(
        "This task is already in review or completed and cannot be updated.",
      );
      setLoggingProgressTask(null);
      return;
    }

    setSubmitting(true);
    const databaseState = progressForm.taskState
      .toLowerCase()
      .replaceAll(" ", "_");

    await supabase.from("daily_updates").insert({
      user_id: profileId,
      project_id: loggingProgressTask.project_id || null,
      summary: progressForm.notes.trim(),
      blockers: progressForm.blocker.trim() || null,
      next_steps: `Completion: ${progressForm.completionPct}%, Hours: ${progressForm.hoursSpent}h`,
      update_date: new Date().toISOString().slice(0, 10),
    });

    await supabase.from("task_comments").insert({
      task_id: loggingProgressTask.id,
      author_id: profileId,
      body: JSON.stringify({
        type: "daily_progress",
        notes: progressForm.notes.trim(),
        completionPct: progressForm.completionPct,
        hoursSpent: parseFloat(progressForm.hoursSpent) || 0,
        blocker: progressForm.blocker.trim() || null,
      }),
    });

    const { error } = await updateTaskWithFallback(
      supabase,
      loggingProgressTask.id,
      {
        completion_percentage: progressForm.completionPct,
        status: databaseState,
        submitted_at:
          databaseState === "in_review" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
    );
    setSubmitting(false);

    if (error) {
      notify(`Could not update task progress: ${error.message}`);
      return;
    }

    setLoggingProgressTask(null);
    setProgressForm({
      notes: "",
      completionPct: 50,
      hoursSpent: "4",
      blocker: "",
      taskState: "In Progress",
    });
    notify("Daily progress log recorded successfully!");
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
      states: ["Closed", "Completed", "Cancelled"],
      color: "border-t-emerald-500",
      badge: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="task-workspace space-y-6">
      {!detailOnly && <>
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {title === "My Tasks" ? "Your workspace" : "Task Management"}
          </p>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-semibold text-slate-900">
            {title}
          </h1>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {title === "My Tasks" ? "Your assignments, deadlines and progress in one place." : "Track assignments and keep studio work moving."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-56 sm:flex-none">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              aria-label="Search tasks"
              placeholder="Search tasks or projects…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
            />
          </div>

          {/* Team member view: no people filter */}
          {isManagerRole && title !== "My Tasks" && (
            <select
              aria-label="Filter tasks by person"
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 cursor-pointer"
            >
              <option value="all">All People</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "list"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <List size={14} />
              List
            </button>
            <button
              aria-pressed={viewMode === "board"}
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
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
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-red-900/20 hover:bg-red-700 transition cursor-pointer"
            >
              <Plus size={16} />
              New Task
            </button>
          )}
        </div>
      </div>

      <TaskOverview now={now} tasks={scopedTasks} personal={title === "My Tasks"} />
      <section className="studio-panel task-filter-panel" aria-label="Task filters">
        <div className="task-status-tabs" role="group" aria-label="Filter tasks by status">
          {([
            ["all", "Active", scopedTasks.filter(t => !isCompletedTask(t)).length],
            ["open", "Open", scopedTasks.filter(t => t.state === "Open").length],
            ["in_progress", "In Progress", scopedTasks.filter(t => t.state === "In Progress").length],
            ["in_review", "Review / Revision", scopedTasks.filter(t => ["In Review", "In Revision"].includes(t.state)).length],
            ["completed", "Finished", scopedTasks.filter(isCompletedTask).length],
          ] as const).map(([key, label, count]) => <button key={key} type="button"
            aria-pressed={taskStatusFilter === key} onClick={() => { setTaskStatusFilter(key); setPage(1); }}>
            {label}<span>{count}</span>
          </button>)}
        </div>
        <div className="task-secondary-filters">
          <span className="studio-meta" aria-live="polite">{visibleTasks.length} matching {visibleTasks.length === 1 ? "task" : "tasks"}</span>
          <select aria-label="Filter task deadlines" value={urgency} onChange={e => { setUrgency(e.target.value); setPage(1); }}>
            <option value="all">All deadlines</option><option value="overdue">Overdue</option><option value="soon">Due in 7 days</option>
          </select>
          <select aria-label="Sort tasks" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
            <option value="deadline">Deadline first</option><option value="name">Task name</option>
          </select>
        </div>
      </section>

      </>}
      {/* Main View: List or Board */}
      {viewMode === "list" ? (
        <div className={detailOnly ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"}>
          {visibleTasks.length === 0 ? (
            <div className="col-span-full grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Layers className="h-10 w-10 text-slate-300 mb-3" />
              <h3 className="text-sm font-semibold text-slate-700">
                No tasks found
              </h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                {searchQuery || urgency !== "all" || taskStatusFilter !== "all" ? "Try another search or reset the filters." : "New assignments will appear here when work is assigned to you."}
              </p>
              {(searchQuery || urgency !== "all" || taskStatusFilter !== "all") && <button className="studio-button mt-4" onClick={() => { setSearchQuery(""); setUrgency("all"); setTaskStatusFilter("all"); setPage(1); }}>Reset filters</button>}
            </div>
          ) : (
            pageTasks.map((task) => (
              <TaskCard
                key={task.id}
                t={task}
                onOpen={onOpenTask ? () => onOpenTask(task) : undefined}
                people={people}
                updateTask={updateTask}
                assignTask={updateAssignee}
                deleteTask={deleteTask}
                editable={userCanEdit}
                statusEditable={role !== "Team Member"}
                canLogWork={canMemberLogWork(task)}
                workSubmitting={submitting}
                onLogWork={() => startProgressLog(task)}
                onDone={() => handleQuickCompleteTask(task)}
                onDragStart={() => {}}
              />
            ))
          )}
        </div>
      ) : (
        /* Board View (Kanban) */
        <div
          role="region"
          aria-label="Task board"
          tabIndex={0}
          className="flex snap-x snap-proximity gap-4 overflow-x-auto pb-4"
        >
          {taskBoardColumns.map((col) => {
            const colTasks = visibleTasks.filter((t) =>
              col.states.some((s) => s.toLowerCase() === t.state.toLowerCase()),
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
                className={`flex w-[min(18rem,85vw)] min-w-0 shrink-0 snap-start flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-3 border-t-2 ${col.color} min-h-[280px]`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    {col.label}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${col.badge}`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable={isManagerRole}
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", String(task.id))
                      }
                      className="group relative rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-md transition cursor-grab active:cursor-grabbing"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate max-w-[140px]">
                          {task.project || "General"}
                        </span>
                        {task.due && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                            <Clock size={10} />
                            {task.due}
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-semibold text-slate-900 break-words">
                        {onOpenTask ? <button type="button" className="text-left hover:text-primary" aria-label={`Open ${task.title} in ${task.project || "General work"}`} onClick={() => onOpenTask(task)}>{task.title}</button> : task.title}
                      </h4>

                      <div className="mt-3 flex flex-col items-start gap-3 border-t border-slate-100 pt-3">
                        <PersonIdentity name={task.owner} />

                        {/* Status selector */}
                        {isManagerRole ? (
                          <select
                            aria-label={`Status for ${task.title}`}
                            value={task.state}
                            onChange={(e) =>
                              updateTask(task.id, e.target.value)
                            }
                            className="h-6 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="In Review">In Review</option>
                            <option value="In Revision">In Revision</option>
                            <option value="Completed">Completed</option>
                          </select>
                        ) : (
                          <StatusBadge status={task.state} task />
                        )}
                      </div>

                      {canMemberLogWork(task) && (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickCompleteTask(task)}
                            disabled={submitting}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-200 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            <CheckCircle2 size={12} />
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => startProgressLog(task)}
                            disabled={submitting}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            <FileText size={12} />
                            Log Work
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-center">
                      <p className="text-xs font-semibold text-slate-400">
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

      {!detailOnly && viewMode === "list" && visibleTasks.length > 0 && <nav className="task-pagination" aria-label="Task pagination">
        <span className="studio-meta">Showing {(currentPage - 1) * 12 + 1}–{Math.min(currentPage * 12, visibleTasks.length)} of {visibleTasks.length} tasks</span>
        <div><button className="studio-button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
        <span className="studio-meta">{currentPage} / {pageCount}</span>
        <button className="studio-button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div>
      </nav>}
      {/* Create Task Modal */}
      {creating && (
        <Modal title="Create new task" onClose={() => setCreating(false)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Create New Task
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Add a new task to your workspace project.
            </p>

            <form onSubmit={handleCreateTask} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-md shadow-red-950/20 hover:bg-red-700 transition cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {loggingProgressTask && (
        <Modal
          title="Log task progress"
          onClose={() => setLoggingProgressTask(null)}
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                  {loggingProgressTask.project}
                </p>
                <h2 className="mt-0.5 text-xl font-semibold text-slate-900">
                  Log Progress: {loggingProgressTask.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLoggingProgressTask(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label="Close progress log"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProgress} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Task Status Update
                  <select
                    value={progressForm.taskState}
                    onChange={(event) =>
                      setProgressForm({
                        ...progressForm,
                        taskState: event.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">Submit for Review</option>
                    <option value="In Revision">In Revision</option>
                    <option value="Completed">Completed</option>
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hours Worked Today
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={progressForm.hoursSpent}
                    onChange={(event) =>
                      setProgressForm({
                        ...progressForm,
                        hoursSpent: event.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-900"
                  />
                </label>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Completion: {progressForm.completionPct}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressForm.completionPct}
                  onChange={(event) =>
                    setProgressForm({
                      ...progressForm,
                      completionPct: Number.parseInt(event.target.value, 10),
                    })
                  }
                  className="mt-2 h-2 w-full accent-[#e3292f]"
                />
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Work Accomplished Notes *
                <textarea
                  required
                  rows={3}
                  value={progressForm.notes}
                  onChange={(event) =>
                    setProgressForm({
                      ...progressForm,
                      notes: event.target.value,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-900"
                />
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Blockers / Help Needed (Optional)
                <input
                  value={progressForm.blocker}
                  onChange={(event) =>
                    setProgressForm({
                      ...progressForm,
                      blocker: event.target.value,
                    })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-900"
                />
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setLoggingProgressTask(null)}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting || !progressForm.notes.trim()}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <Send size={14} />
                  {submitting ? "Saving..." : "Save Progress Log"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
