import { DailyTaskQueue } from "@/components/tasks/daily-task-queue";
import { PersonIdentity } from "@/components/ui/person-identity";
import { Modal } from "@/components/ui/modal";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  List,
  Plus,
  Send,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import type { Project, Role, Task, User } from "@/lib/types";
import { getAppRole, getInitials, updateTaskWithFallback } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface DailyWorkViewProps {
  tasks: Task[];
  projects: Project[];
  people: User[];
  profileId: string;
  userName: string;
  role: Role;
  notify: (message: string) => void;
  onRefresh?: () => void;
  onOpenTask: (task: Task) => void;
}

interface LogEntry {
  id: string;
  task_id: string;
  author_id: string;
  author_name?: string;
  task_title?: string;
  project_name?: string;
  notes: string;
  completionPct: number;
  hoursSpent: number;
  blocker?: string | null;
  created_at: string;
}

export function DailyWorkView({
  tasks,
  projects,
  people,
  profileId,
  userName,
  role,
  notify,
  onRefresh,
  onOpenTask,
}: DailyWorkViewProps) {
  // View & Filter states
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all");
  const [workViewMode, setWorkViewMode] = useState<"stream" | "datasheet">("datasheet");

  // Modal states
  const [addingSelfTask, setAddingSelfTask] = useState(false);
  const [assigningMemberTask, setAssigningMemberTask] = useState(false);
  const [loggingProgressTask, setLoggingProgressTask] = useState<Task | null>(null);

  // Form states
  const [selfTaskForm, setSelfTaskForm] = useState({
    title: "",
    projectId: "",
    priority: "normal",
    deadline: new Date().toISOString().slice(0, 10),
  });

  const [assignForm, setAssignForm] = useState({
    assigneeId: "",
    title: "",
    projectId: "",
    priority: "normal",
    deadline: new Date().toISOString().slice(0, 10),
  });

  const [progressForm, setProgressForm] = useState({
    notes: "",
    completionPct: 50,
    hoursSpent: "4",
    blocker: "",
    taskState: "In Progress",
  });

  const [submitting, setSubmitting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const refresh = () => {
    if (onRefresh) onRefresh();
    else window.location.reload();
  };

  const isManagerRole = role !== "Team Member";
  const teamMembers = useMemo(
    () => people.filter((person) => getAppRole(person.role) === "Team Member"),
    [people],
  );
  const teamMemberIds = useMemo(
    () => new Set(teamMembers.map((person) => person.id)),
    [teamMembers],
  );
  const canLogWork = (task: Task) =>
    (role === "Team Member"
      ? task.assignee_id === profileId || task.owner === userName
      : task.created_by === profileId && task.assignee_id === profileId) &&
    !["In Review", "Completed", "Closed", "Cancelled"].includes(task.state);

  // Active tasks assigned: review items stay visible so the member can see they are waiting for approval.
  const myAssignedTasks = tasks.filter(
    (t) =>
      (role !== "Team Member" || t.assignee_id === profileId || t.owner === userName) &&
      !["Completed", "Closed", "Cancelled"].includes(t.state),
  );

  const fetchLogs = useCallback(async () => {
    if (!supabase) return;
    setLoadingLogs(true);

    const { data, error } = await supabase
      .from("task_comments")
      .select("id, task_id, author_id, body, created_at, tasks(title, project_id), users(name)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setLoadingLogs(false);
      return;
    }

    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    type TaskCommentItem = {
      id: string;
      task_id: string;
      author_id: string;
      body: string;
      created_at: string;
      tasks?:
        | { title?: string | null; project_id?: string | null }
        | Array<{ title?: string | null; project_id?: string | null }>
        | null;
      users?: { name?: string | null } | Array<{ name?: string | null }> | null;
    };

    const parsed: LogEntry[] = (data ?? [])
      .map((item: TaskCommentItem) => {
        const userNameFromRow = Array.isArray(item.users)
          ? item.users[0]?.name
          : item.users?.name;
        const taskData = Array.isArray(item.tasks) ? item.tasks[0] : item.tasks;

        let notesText = item.body;
        let comp = 50;
        let hours = 0;
        let block: string | null = null;

        try {
          if (item.body.startsWith("{")) {
            const json = JSON.parse(item.body) as {
              notes?: string;
              completionPct?: number;
              hoursSpent?: number;
              blocker?: string | null;
            };
            notesText = json.notes || item.body;
            comp = json.completionPct ?? 50;
            hours = json.hoursSpent ?? 0;
            block = json.blocker || null;
          }
        } catch {
          // Plain text comment
        }

        return {
          id: item.id,
          task_id: item.task_id,
          author_id: item.author_id,
          author_name: userNameFromRow || "Team Member",
          task_title: taskData?.title || "Assigned Task",
          project_name: projectMap.get(taskData?.project_id ?? "") || "General Work",
          notes: notesText,
          completionPct: comp,
          hoursSpent: hours,
          blocker: block,
          created_at: item.created_at,
        };
      })
      .filter((item) => role !== "Team Member" || item.author_id === profileId);

    setLogs(parsed);
    setLoadingLogs(false);
  }, [profileId, projects, role]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchLogs();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchLogs, tasks]);

  const filteredLogs = logs.filter((log) => {
    if (role === "Team Member") return log.author_id === profileId;
    if (selectedMemberFilter === "all") {
      return teamMemberIds.has(log.author_id) || log.author_id === profileId;
    }
    return log.author_id === selectedMemberFilter;
  });

  const filteredAssignedTasks = useMemo(
    () =>
      myAssignedTasks.filter((task) => {
        if (selectedMemberFilter === "all") return true;
        const targetPerson = people.find((p) => p.id === selectedMemberFilter);
        return (
          task.assignee_id === selectedMemberFilter ||
          task.owner === targetPerson?.name
        );
      }),
    [myAssignedTasks, people, selectedMemberFilter],
  );

  const todaySummary = useMemo(() => {
    const today = new Date();
    const dueTodayCount = filteredAssignedTasks.filter((task) => {
      if (!task.due_at) return false;
      const dueDate = new Date(task.due_at);
      return (
        dueDate.toDateString() === today.toDateString() &&
        !["Completed", "Closed", "Cancelled"].includes(task.state)
      );
    }).length;

    const blockedCount = filteredAssignedTasks.filter(
      (task) => task.state === "In Review" || task.state === "In Revision",
    ).length;

    const overdueCount = filteredAssignedTasks.filter((task) => {
      if (!task.due_at) return false;
      const dueDate = new Date(task.due_at);
      return (
        dueDate.getTime() < today.getTime() &&
        !["Completed", "Closed", "Cancelled"].includes(task.state)
      );
    }).length;

    return {
      total: filteredAssignedTasks.length,
      dueToday: dueTodayCount,
      blocked: blockedCount,
      overdue: overdueCount,
    };
  }, [filteredAssignedTasks]);

  const completedTodayTasks = useMemo(() => {
    const today = new Date();
    const selectedPerson = people.find((person) => person.id === selectedMemberFilter);

    return [...tasks]
      .filter(
        (task) =>
          role === "Team Member" ||
          selectedMemberFilter === "all" ||
          task.assignee_id === selectedMemberFilter ||
          task.owner === selectedPerson?.name,
      )
      .filter((task) => ["Completed", "Closed", "Cancelled"].includes(task.state))
      .filter((task) => {
        const lastUpdate = new Date(
          task.reviewed_at || task.submitted_at || task.updated_at || task.created_at || new Date(0).toISOString(),
        );
        return lastUpdate.toDateString() === today.toDateString();
      })
      .sort((a, b) => {
        const aDate = new Date(a.reviewed_at || a.submitted_at || a.updated_at || a.created_at || new Date(0).toISOString()).getTime();
        const bDate = new Date(b.reviewed_at || b.submitted_at || b.updated_at || b.created_at || new Date(0).toISOString()).getTime();
        return bDate - aDate;
      });
  }, [people, role, selectedMemberFilter, tasks]);

  const handleReviewDecision = async (task: Task, nextState: "Completed" | "Open") => {
    if (!supabase) return;

    const databaseState = nextState.toLowerCase();
    const { error } = await updateTaskWithFallback(supabase, task.id, {
      status: databaseState,
      completion_percentage:
        nextState === "Completed" ? 100 : task.completion_percentage ?? 60,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      notify(`Could not update review status: ${error.message}`);
      return;
    }

    if (task.assignee_id) {
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: task.assignee_id,
        type: nextState === "Open" ? "task_rework" : "task_approved",
        severity: nextState === "Open" ? "warning" : "success",
        title:
          nextState === "Open"
            ? "Task returned for rework"
            : "Task approved",
        body:
          nextState === "Open"
            ? `"${task.title}" was sent back to Open. Please update it and resubmit for review.`
            : `"${task.title}" was approved and marked complete. Great work!`,
        entity_type: "task",
        entity_id: String(task.id),
        actor_id: profileId,
      });

      if (notifError) {
        console.error(
          nextState === "Open"
            ? "Task rework notification failed:"
            : "Task approval notification failed:",
          notifError.message,
        );
      }
    }

    await supabase.from("task_comments").insert({
      task_id: task.id,
      author_id: profileId,
      body: JSON.stringify({
        type: "review_decision",
        notes:
          nextState === "Completed"
            ? "Approved by admin and marked complete."
            : "Returned to Open for rework by admin.",
        completionPct: nextState === "Completed" ? 100 : task.completion_percentage ?? 60,
        hoursSpent: 0,
        blocker: null,
      }),
    });

    notify(
      nextState === "Completed"
        ? "Task approved and marked complete"
        : "Task sent back to Open for rework",
    );
    refresh();
  };

  // Export Datasheet as CSV
  const exportDatasheetCSV = () => {
    if (!filteredLogs.length) return notify("No logs available to export");

    const headers = ["Date", "Time", "Team Member", "Task Title", "Project", "Hours Logged", "Completion %", "Work Notes", "Blockers"];
    const rows = filteredLogs.map((log) => [
      new Date(log.created_at).toLocaleDateString(),
      new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      `"${log.author_name || ""}"`,
      `"${log.task_title || ""}"`,
      `"${log.project_name || ""}"`,
      log.hoursSpent,
      `${log.completionPct}%`,
      `"${(log.notes || "").replace(/"/g, '""')}"`,
      `"${(log.blocker || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `daily_work_datasheet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("Daily Work Datasheet exported as CSV!");
  };

  // 1. Team member self-adds what they are working on today
  const handleAddSelfTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selfTaskForm.title.trim()) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("tasks")
      .insert({
        title: selfTaskForm.title.trim(),
        project_id: selfTaskForm.projectId || null,
        assignee_id: profileId,
        created_by: profileId,
        status: "in_progress",
        priority: selfTaskForm.priority,
        due_at: selfTaskForm.deadline
          ? new Date(`${selfTaskForm.deadline}T17:00:00`).toISOString()
          : null,
      })
      .select("id")
      .single();

    setSubmitting(false);
    if (error) return notify(`Could not add task: ${error.message}`);

    if (selfTaskForm.projectId) {
      await supabase.from("project_members").upsert(
        {
          project_id: selfTaskForm.projectId,
          user_id: profileId,
          project_role: "Team Member",
        },
        { onConflict: "project_id,user_id" },
      );
    }

    setAddingSelfTask(false);
    setSelfTaskForm({
      title: "",
      projectId: "",
      priority: "normal",
      deadline: new Date().toISOString().slice(0, 10),
    });

    notify("Task added to your Daily Work!");
    refresh();
  };

  // 2. Admin / Project Leader assigns a daily task to a member
  const handleAssignMemberTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !assignForm.title.trim() || !assignForm.assigneeId) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("tasks")
      .insert({
        title: assignForm.title.trim(),
        project_id: assignForm.projectId || null,
        assignee_id: assignForm.assigneeId,
        created_by: profileId,
        status: "in_progress",
        priority: assignForm.priority,
        due_at: assignForm.deadline
          ? new Date(`${assignForm.deadline}T17:00:00`).toISOString()
          : null,
      })
      .select("id")
      .single();

    setSubmitting(false);
    if (error) return notify(`Could not assign task: ${error.message}`);

    if (assignForm.projectId) {
      await supabase.from("project_members").upsert(
        {
          project_id: assignForm.projectId,
          user_id: assignForm.assigneeId,
          project_role: "Team Member",
        },
        { onConflict: "project_id,user_id" },
      );
    }

    setAssigningMemberTask(false);
    setAssignForm({
      assigneeId: "",
      title: "",
      projectId: "",
      priority: "normal",
      deadline: new Date().toISOString().slice(0, 10),
    });

    notify("Daily task assigned to member!");
    refresh();
  };

  const handleCompleteSelfTask = async (task: Task) => {
    if (
      !supabase ||
      task.created_by !== profileId ||
      task.assignee_id !== profileId
    ) {
      return;
    }

    setSubmitting(true);
    const completedAt = new Date().toISOString();
    const { error } = await updateTaskWithFallback(supabase, task.id, {
      completion_percentage: 100,
      status: "completed",
      updated_at: completedAt,
    });

    if (error) {
      setSubmitting(false);
      notify(`Could not complete task: ${error.message}`);
      return;
    }

    const { error: logError } = await supabase.from("task_comments").insert({
      task_id: task.id,
      author_id: profileId,
      body: JSON.stringify({
        type: "daily_progress",
        notes: "Task marked complete by team member.",
        completionPct: 100,
        hoursSpent: 0,
        blocker: null,
      }),
    });

    setSubmitting(false);
    if (logError) {
      notify(`Task completed, but its daily log could not be saved: ${logError.message}`);
      refresh();
      return;
    }

    notify("Task completed and added to the daily log.");
    void fetchLogs();
    refresh();
  };

  // 3. Submit progress log for a task
  const handleSubmitProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !loggingProgressTask) return;

    if (role === "Team Member" && ["In Review", "Completed", "Closed", "Cancelled"].includes(loggingProgressTask.state)) {
      notify("This task is already in review or completed and can only be managed by an admin.");
      setLoggingProgressTask(null);
      return;
    }

    setSubmitting(true);

    const payload = JSON.stringify({
      type: "daily_progress",
      notes: progressForm.notes.trim(),
      completionPct: progressForm.completionPct,
      hoursSpent: parseFloat(progressForm.hoursSpent) || 0,
      blocker: progressForm.blocker.trim() || null,
    });

    // Insert into daily_updates
    await supabase.from("daily_updates").insert({
      user_id: profileId,
      project_id: loggingProgressTask.project_id || null,
      summary: progressForm.notes.trim(),
      blockers: progressForm.blocker.trim() || null,
      next_steps: `Completion: ${progressForm.completionPct}%, Hours: ${progressForm.hoursSpent}h`,
      update_date: new Date().toISOString().slice(0, 10),
    });

    // Insert into task_comments
    await supabase.from("task_comments").insert({
      task_id: loggingProgressTask.id,
      author_id: profileId,
      body: payload,
    });

    // Update task status and completion percentage
    const databaseState = progressForm.taskState.toLowerCase().replaceAll(" ", "_");
    const { error: taskError } = await updateTaskWithFallback(supabase, loggingProgressTask.id, {
      completion_percentage: progressForm.completionPct,
      blocked_reason: progressForm.blocker.trim() || null,
      blocked_at: progressForm.blocker.trim() ? (loggingProgressTask.blocked_at || new Date().toISOString()) : null,
      status: databaseState,
      submitted_at: databaseState === "in_review" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    });

    setSubmitting(false);
    if (taskError) { notify(`Work log recorded, but task update failed: ${taskError.message}`); refresh(); return; }
    setLoggingProgressTask(null);
    setProgressForm({
      notes: "",
      completionPct: 50,
      hoursSpent: "4",
      blocker: "",
      taskState: "In Progress",
    });

    notify("Daily progress log recorded successfully!");
    fetchLogs();
    refresh();
  };

  return (
    <div className="space-y-7">
      {/* Top Header & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <CalendarCheck size={28} className="text-red" />
            Daily Work
          </h1>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {role === "Team Member"
              ? "Work through your tasks, log progress, and submit finished work for review."
              : "Assign work, track progress, and review submitted tasks."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setAddingSelfTask(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-strong hover:bg-red-strong transition shadow-xs cursor-pointer"
          >
            <Plus size={16} />
            Add my task
          </button>
          {isManagerRole && (
            <button
              onClick={() => setAssigningMemberTask(true)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-subtle transition cursor-pointer shadow-xs"
            >
              <UserCheck size={15} />
              Assign Daily Task to Member
            </button>
          )}
        </div>
      </div>

      {/* ADMIN / LEADER TEAM WORKSPACE BAR & FILTERS */}
      {isManagerRole && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Team Member Filter */}
            <div className="flex items-center gap-2">
              <Users size={16} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Filter Team Member:</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedMemberFilter}
                onChange={(e) => setSelectedMemberFilter(e.target.value)}
                className="h-10 rounded-xl border border-border bg-subtle px-3 text-xs font-semibold text-foreground outline-none focus:border-red cursor-pointer min-w-44"
              >
                <option value="all">All Team Members ({teamMembers.length})</option>
                {teamMembers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
              {selectedMemberFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedMemberFilter("all")}
                  className="rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold text-secondary-foreground hover:bg-subtle transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      <>
          {todaySummary.overdue > 0 || todaySummary.dueToday > 0 ? (
            <div className={`rounded-2xl border p-4 ${todaySummary.overdue > 0 ? "border-red-border bg-red-soft" : "border-amber-border bg-amber-soft"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className={todaySummary.overdue > 0 ? "text-red" : "text-amber"} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary-foreground">
                      {todaySummary.overdue > 0 ? "Urgent attention" : "Due soon"}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {todaySummary.overdue > 0
                        ? `${todaySummary.overdue} task${todaySummary.overdue === 1 ? "" : "s"} overdue`
                        : `${todaySummary.dueToday} task${todaySummary.dueToday === 1 ? "" : "s"} due today`}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${todaySummary.overdue > 0 ? "bg-red-soft text-red" : "bg-amber-soft text-amber"}`}>
                  {todaySummary.overdue > 0 ? "Action needed" : "Today"}
                </span>
              </div>
            </div>
          ) : null}

          <section className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Active tasks", value: todaySummary.total, tone: "bg-card text-foreground" },
                { label: "Due today", value: todaySummary.dueToday, tone: "bg-card text-amber" },
                { label: "In review", value: todaySummary.blocked, tone: "bg-card text-purple" },
              ].map((stat) => (
                <div key={stat.label} className={`metric-card rounded-2xl border border-border p-4 ${stat.tone}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold leading-none">{stat.value}</p>
                </div>
              ))}
            </div>

          </section>

        <div className="space-y-5">
          <DailyTaskQueue
            onOpenTask={onOpenTask}
            tasks={filteredAssignedTasks}
            people={people}
            personal={role === "Team Member"}
            renderActions={(task) => <>
                      {canLogWork(task) && (
                        <button
                          onClick={() => {
                            setLoggingProgressTask(task);
                            setProgressForm({
                              notes: "",
                              completionPct: task.completion_percentage ?? 0,
                              hoursSpent: "4",
                              blocker: task.blocked_reason ?? "",
                              taskState:
                                task.state === "In Progress" ? task.state : "In Progress",
                            });
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-strong px-3.5 py-2 text-xs font-semibold text-on-strong hover:bg-strong-hover transition cursor-pointer shadow-xs"
                        >
                          <FileText size={14} />
                          Log Work
                        </button>
                      )}
                      {task.created_by === profileId &&
                        task.assignee_id === profileId && (
                          <button
                            type="button"
                            onClick={() => void handleCompleteSelfTask(task)}
                            disabled={submitting}
                            className="flex items-center gap-1 rounded-lg border border-green-border bg-green-soft px-2.5 py-1.5 text-xs font-semibold text-green hover:bg-green-soft transition disabled:opacity-60"
                          >
                            <Check size={13} />
                            Complete
                          </button>
                        )}
                      {isManagerRole && task.state === "In Review" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReviewDecision(task, "Completed")}
                            className="rounded-lg border border-green-border bg-green-soft px-2 py-1.5 text-xs font-semibold text-green hover:bg-green-soft transition"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewDecision(task, "Open")}
                            className="rounded-lg border border-amber-border bg-amber-soft px-2 py-1.5 text-xs font-semibold text-amber hover:bg-amber-soft transition"
                          >
                            Rework
                          </button>
                        </>
                      )}
                      {role === "Team Member" && task.state === "In Review" && (
                        <span className="rounded-lg border border-purple-border bg-purple-soft px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-purple">
                          Awaiting review
                        </span>
                      )}
                      {task.state === "In Revision" && (
                        <span className="rounded-lg border border-amber-border bg-amber-soft px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber">
                          Rework requested
                        </span>
                      )}
            </>}
          />

          <section className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Completed today</h3>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {completedTodayTasks.length} done
              </span>
            </div>

            {completedTodayTasks.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {completedTodayTasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-green-border bg-green-soft p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">{task.title}</p>
                      <span className="rounded-full bg-green-soft px-2 py-0.5 text-xs font-semibold uppercase text-green">
                        {task.state}
                      </span>
                    </div>
                    <div className="mt-3"><PersonIdentity name={task.owner} label="Team member" /></div>
                    <p className="mt-2 text-sm text-muted-foreground">{task.project || "General"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-semibold text-muted-foreground">
                No task was completed today yet.
              </p>
            )}
          </section>

        </div>
      </>

      <details className="group rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold text-foreground">
          <span>Progress history</span>
          <span className="text-xs font-semibold text-muted-foreground">{filteredLogs.length} entries</span>
        </summary>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div className="flex items-center rounded-lg border border-border bg-subtle p-1">
            <button
              type="button"
              onClick={() => setWorkViewMode("datasheet")}
              aria-pressed={workViewMode === "datasheet"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition ${
                workViewMode === "datasheet"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-secondary-foreground hover:text-foreground"
              }`}
            >
              <FileSpreadsheet size={14} />
              Datasheet View
            </button>
            <button
              type="button"
              onClick={() => setWorkViewMode("stream")}
              aria-pressed={workViewMode === "stream"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition ${
                workViewMode === "stream"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-secondary-foreground hover:text-foreground"
              }`}
            >
              <List size={14} />
              Log Stream
            </button>
          </div>
          <button
            type="button"
            onClick={exportDatasheetCSV}
            disabled={!filteredLogs.length}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
        <section className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
        <div className="border-b border-border p-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-red" />
              {role === "Team Member" ? "Your Progress Log History" : "Team Daily Work Datasheet"}
            </h3>
            <p className="text-xs font-semibold text-muted-foreground">
              Work logs, hours tracked, completion percentage, and reported blockers
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {filteredLogs.length} logged entries
          </span>
        </div>

        {/* DATASHEET TABLE VIEW (For Admins & Leaders, or toggle) */}
        {workViewMode === "datasheet" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-subtle text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Task Title</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Work Summary</th>
                  <th className="py-3 px-4">Blockers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium text-foreground">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-subtle transition">
                    <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                      <div>
                        <span className="font-semibold text-foreground block">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-strong text-[8px] font-semibold text-on-strong shrink-0">
                          {getInitials(log.author_name || "TM")}
                        </span>
                        <span className="text-base">{log.author_name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-foreground max-w-xs truncate">
                      {log.task_title}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-muted-foreground max-w-xs truncate font-mono text-xs">
                      {log.project_name}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-foreground whitespace-nowrap">
                      {log.hoursSpent}h
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="rounded-full bg-red-soft border border-red-border px-2.5 py-0.5 text-xs font-semibold text-red">
                        {log.completionPct}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-foreground max-w-md">
                      <p className="line-clamp-2 leading-relaxed">{log.notes}</p>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {log.blocker ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-soft px-2 py-1 text-xs font-semibold text-red border border-red-border">
                          <AlertTriangle size={12} className="shrink-0 text-red" />
                          <span className="truncate">{log.blocker}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}

                {!filteredLogs.length && !loadingLogs && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground font-semibold">
                      No daily work datasheet entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* STREAM VIEW */
          <div className="p-5 space-y-3.5 max-h-[460px] overflow-y-auto">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-border bg-subtle p-4 space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-strong text-xs font-semibold text-on-strong shadow-2xs">
                      {getInitials(log.author_name || "TM")}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground text-xs">
                        {log.task_title}{" "}
                        <span className="text-muted-foreground font-normal font-mono">
                          ({log.project_name})
                        </span>
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Logged by <span className="text-base font-semibold text-foreground">{log.author_name}</span> ·{" "}
                        {new Date(log.created_at).toLocaleDateString()} at{" "}
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="rounded-md bg-card border border-border px-2.5 py-1 text-xs font-semibold text-foreground">
                      {log.hoursSpent}h logged
                    </span>
                    <span className="rounded-md bg-red-soft border border-red-border px-2.5 py-1 text-xs font-semibold text-red">
                      {log.completionPct}% Complete
                    </span>
                  </div>
                </div>

                <p className="text-xs font-medium text-foreground leading-relaxed bg-card rounded-lg p-3 border border-border">
                  {log.notes}
                </p>

                {log.blocker && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-soft border border-red-border p-2.5 text-xs font-semibold text-red">
                    <AlertTriangle size={15} className="shrink-0 text-red" />
                    <span>Blocker: {log.blocker}</span>
                  </div>
                )}
              </div>
            ))}

            {!filteredLogs.length && !loadingLogs && (
              <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
                No progress logs submitted yet.
              </div>
            )}
          </div>
        )}
      </section>
      </details>

      {/* MODAL 1: TEAM MEMBER SELF-ADDS TASK */}
      {addingSelfTask && (
        <Modal title="Add your daily task" onClose={() => setAddingSelfTask(false)}>
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red">
                  Quick Add Task
                </p>
                <h2 className="text-xl font-semibold text-foreground">
                  What Are You Working On Today?
                </h2>
              </div>
              <button
                onClick={() => setAddingSelfTask(false)}
                aria-label="Close daily task"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSelfTask} className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Task Title *
                <input
                  required
                  autoFocus
                  placeholder="e.g. Creating 3D CAD model for bracket assembly..."
                  value={selfTaskForm.title}
                  onChange={(e) =>
                    setSelfTaskForm({ ...selfTaskForm, title: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border px-3.5 text-xs font-semibold outline-none focus:border-red focus:ring-4 focus:ring-red-border text-foreground"
                />
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Project{" "}
                <span className="normal-case font-semibold text-muted-foreground">(optional)</span>
                <select
                  value={selfTaskForm.projectId}
                  onChange={(e) =>
                    setSelfTaskForm({ ...selfTaskForm, projectId: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3.5 text-xs font-semibold outline-none focus:border-red focus:ring-4 focus:ring-red-border text-foreground cursor-pointer"
                >
                  <option value="">No project / standalone task</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Priority
                  <select
                    value={selfTaskForm.priority}
                    onChange={(e) =>
                      setSelfTaskForm({
                        ...selfTaskForm,
                        priority: e.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold outline-none focus:border-red text-foreground cursor-pointer"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>

                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Target Date
                  <input
                    type="date"
                    value={selfTaskForm.deadline}
                    onChange={(e) =>
                      setSelfTaskForm({
                        ...selfTaskForm,
                        deadline: e.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-border px-3 text-xs font-semibold outline-none focus:border-red text-foreground"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setAddingSelfTask(false)}
                  className="h-10 rounded-xl border border-border px-4 text-xs font-semibold text-foreground hover:bg-subtle cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="h-10 rounded-xl bg-primary px-5 text-xs font-semibold text-on-strong hover:bg-red-strong disabled:opacity-60 transition cursor-pointer"
                >
                  {submitting ? "Adding..." : "Add to My Daily Work"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* MODAL 2: ADMIN / LEADER ASSIGNS TASK TO MEMBER */}
      {assigningMemberTask && (
        <Modal title="Assign a daily task" onClose={() => setAssigningMemberTask(false)}>
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red">
                  Assign Task
                </p>
                <h2 className="text-xl font-semibold text-foreground">
                  Assign Daily Task to Member
                </h2>
              </div>
              <button
                onClick={() => setAssigningMemberTask(false)}
                aria-label="Close task assignment"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignMemberTask} className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Team Member *
                <select
                  required
                  value={assignForm.assigneeId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, assigneeId: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3.5 text-xs font-semibold outline-none focus:border-red focus:ring-4 focus:ring-red-border text-foreground cursor-pointer"
                >
                  <option value="">Select team member...</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Task Title *
                <input
                  required
                  placeholder="Task title..."
                  value={assignForm.title}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, title: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border px-3.5 text-xs font-semibold outline-none focus:border-red focus:ring-4 focus:ring-red-border text-foreground"
                />
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Project{" "}
                <span className="normal-case font-semibold text-muted-foreground">(optional)</span>
                <select
                  value={assignForm.projectId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, projectId: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3.5 text-xs font-semibold outline-none focus:border-red text-foreground cursor-pointer"
                >
                  <option value="">No project / standalone task</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Priority
                  <select
                    value={assignForm.priority}
                    onChange={(e) =>
                      setAssignForm({
                        ...assignForm,
                        priority: e.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold outline-none focus:border-red text-foreground cursor-pointer"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>

                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Target Date
                  <input
                    type="date"
                    value={assignForm.deadline}
                    onChange={(e) =>
                      setAssignForm({
                        ...assignForm,
                        deadline: e.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-border px-3 text-xs font-semibold outline-none focus:border-red text-foreground"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setAssigningMemberTask(false)}
                  className="h-10 rounded-xl border border-border px-4 text-xs font-semibold text-foreground hover:bg-subtle cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="h-10 rounded-xl bg-strong px-5 text-xs font-semibold text-on-strong hover:bg-strong-hover disabled:opacity-60 transition cursor-pointer"
                >
                  {submitting ? "Assigning..." : "Assign Task"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* MODAL 3: LOG WORK PROGRESS FOR A TASK */}
      {loggingProgressTask && (
        <Modal title="Log daily progress" onClose={() => setLoggingProgressTask(null)}>
          <div className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red font-mono">
                  {loggingProgressTask.project}
                </p>
                <h2 className="text-xl font-semibold text-foreground mt-0.5">
                  Log Progress: {loggingProgressTask.title}
                </h2>
              </div>
              <button
                onClick={() => setLoggingProgressTask(null)}
                aria-label="Close progress log"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProgress} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Task Status Update
                  <select
                    value={progressForm.taskState}
                    onChange={(e) =>
                      setProgressForm({
                        ...progressForm,
                        taskState: e.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3.5 text-xs font-semibold outline-none focus:border-red text-foreground cursor-pointer"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">Submit for Review</option>
                  </select>
                </label>

                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Hours Worked Today
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={progressForm.hoursSpent}
                    onChange={(e) =>
                      setProgressForm({
                        ...progressForm,
                        hoursSpent: e.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-border px-3.5 text-xs font-semibold outline-none focus:border-red text-foreground"
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Completion Percentage:{" "}
                    <span className="text-foreground font-semibold">
                      {progressForm.completionPct}%
                    </span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressForm.completionPct}
                    onChange={(e) =>
                      setProgressForm({
                        ...progressForm,
                        completionPct: parseInt(e.target.value),
                      })
                    }
                    className="h-2 flex-1 rounded-lg accent-primary bg-border cursor-pointer"
                  />
                  <div className="flex gap-1">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() =>
                          setProgressForm({
                            ...progressForm,
                            completionPct: pct,
                          })
                        }
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                          progressForm.completionPct === pct
                            ? "bg-strong text-on-strong"
                            : "bg-muted text-secondary-foreground hover:bg-border"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Work Accomplished Notes *
                <textarea
                  required
                  rows={3}
                  placeholder="Describe work done today, CAD modeling progress, specifications updated..."
                  value={progressForm.notes}
                  onChange={(e) =>
                    setProgressForm({ ...progressForm, notes: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-xl border border-border p-3 text-xs font-semibold text-foreground outline-none focus:border-red focus:ring-4 focus:ring-red-border"
                />
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Blockers / Help Needed (Optional)
                <input
                  placeholder="e.g. Waiting for client STEP file approval..."
                  value={progressForm.blocker}
                  onChange={(e) =>
                    setProgressForm({
                      ...progressForm,
                      blocker: e.target.value,
                    })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border px-3.5 text-xs font-semibold outline-none focus:border-red text-foreground"
                />
              </label>

              <div className="flex justify-end gap-3 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setLoggingProgressTask(null)}
                  className="h-10 rounded-xl border border-border px-4 text-xs font-semibold text-foreground hover:bg-subtle cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting || !progressForm.notes.trim()}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-on-strong hover:bg-red-strong disabled:opacity-50 transition cursor-pointer"
                >
                  <Send size={14} />
                  {submitting
                    ? "Saving..."
                    : progressForm.taskState === "In Review"
                      ? "Submit for Review"
                      : "Save Progress"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
