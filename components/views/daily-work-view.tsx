import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
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
import { getInitials } from "@/lib/utils";
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
}: DailyWorkViewProps) {
  // View & Filter states
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all");
  const [workViewMode, setWorkViewMode] = useState<"stream" | "datasheet">("datasheet");
  const [dailyTab, setDailyTab] = useState<"overview" | "work" | "logs">("overview");

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
  const assignedMemberIds = useMemo(
    () =>
      new Set(
        tasks
          .map((task) => task.assignee_id)
          .filter((assigneeId): assigneeId is string => Boolean(assigneeId)),
      ),
    [tasks],
  );

  const canLogWork = (task: Task) =>
    role === "Team Member" &&
    (task.assignee_id === profileId || task.owner === userName) &&
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
      .limit(50);

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
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    if (role === "Team Member") return log.author_id === profileId;
    if (selectedMemberFilter === "all") return assignedMemberIds.has(log.author_id);
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

  const todayPriorities = useMemo(() => {
    const activeTasks = filteredAssignedTasks.filter(
      (task) => !["Completed", "Closed", "Cancelled"].includes(task.state),
    );

    return [...activeTasks]
      .sort((a, b) => {
        const aUrgency = Number(a.priority === "critical") * 3 + Number(a.priority === "high") * 2 + Number(!!a.due_at);
        const bUrgency = Number(b.priority === "critical") * 3 + Number(b.priority === "high") * 2 + Number(!!b.due_at);
        return bUrgency - aUrgency;
      })
      .slice(0, 3);
  }, [filteredAssignedTasks]);

  const completedTodayTasks = useMemo(() => {
    const today = new Date();

    return [...tasks]
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
  }, [tasks]);

  const reviewQueue = useMemo(() => {
    return [...tasks]
      .filter((task) => ["In Review", "In Revision"].includes(task.state))
      .filter(
        (task) =>
          role !== "Team Member" ||
          task.assignee_id === profileId ||
          task.owner === userName,
      )
      .sort((a, b) => {
        const aDate = new Date(
          a.submitted_at || a.updated_at || a.created_at || new Date(0).toISOString(),
        ).getTime();
        const bDate = new Date(
          b.submitted_at || b.updated_at || b.created_at || new Date(0).toISOString(),
        ).getTime();
        return bDate - aDate;
      });
  }, [tasks, role, profileId, userName]);

  const handleReviewDecision = async (task: Task, nextState: "Completed" | "Open") => {
    if (!supabase) return;

    const databaseState = nextState.toLowerCase();
    const { error } = await supabase
      .from("tasks")
      .update({
        status: databaseState,
        completion_percentage:
          nextState === "Completed" ? 100 : task.completion_percentage ?? 60,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (error) {
      notify(`Could not update review status: ${error.message}`);
      return;
    }

    if (nextState === "Open" && task.assignee_id) {
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: task.assignee_id,
        type: "task_rework",
        severity: "warning",
        title: "Task returned for rework",
        body: `"${task.title}" was sent back to Open. Please update it and resubmit for review.`,
        entity_type: "task",
        entity_id: String(task.id),
        actor_id: profileId,
      });

      if (notifError) {
        console.error("Task rework notification failed:", notifError.message);
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
    await supabase
      .from("tasks")
      .update({
        completion_percentage: progressForm.completionPct,
        status: databaseState,
        submitted_at: databaseState === "in_review" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", loggingProgressTask.id);

    setSubmitting(false);
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

  const handleQuickCompleteTask = async (task: Task) => {
    if (!supabase || task.state === "In Review") return;

    setSubmitting(true);

    const { error } = await supabase
      .from("tasks")
      .update({
        completion_percentage: 100,
        status: "in_review",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

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
    fetchLogs();
    refresh();
  };

  return (
    <div className="space-y-7">
      {/* Top Header & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <CalendarCheck size={28} className="text-[#e3292f]" />
            Daily Work & Progress Datasheet
          </h1>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {role === "Team Member"
              ? "Track assigned daily tasks, log your accomplishments, report blockers, or add what you're working on today."
              : "Monitor team member daily work datasheets, log streams, and assign daily tasks."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* TEAM MEMBER: Add what I am working on */}
          <button
            onClick={() => setAddingSelfTask(true)}
            className="flex items-center gap-2 rounded-xl bg-[#e3292f] px-4 py-2.5 text-xs font-black text-white hover:bg-red-700 transition shadow-xs cursor-pointer"
          >
            <Plus size={16} />
            + Add What I&apos;m Working On Today
          </button>

          {/* ADMIN / LEADER: Assign task to team member */}
          {(role === "Admin" || role === "Project Leader") && (
            <button
              onClick={() => setAssigningMemberTask(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
            >
              <UserCheck size={15} />
              Assign Daily Task to Member
            </button>
          )}
        </div>
      </div>

      {/* ADMIN / LEADER TEAM WORKSPACE BAR & FILTERS */}
      {isManagerRole && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Team Member Filter */}
            <div className="flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Filter Team Member:</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedMemberFilter}
                onChange={(e) => setSelectedMemberFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none focus:border-red-400 cursor-pointer min-w-44"
              >
                <option value="all">All Team Members ({people.length})</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
              {selectedMemberFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedMemberFilter("all")}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle: Stream vs Datasheet */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setWorkViewMode("datasheet")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  workViewMode === "datasheet"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileSpreadsheet size={14} />
                Datasheet View
              </button>
              <button
                onClick={() => setWorkViewMode("stream")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  workViewMode === "stream"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List size={14} />
                Log Stream
              </button>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={exportDatasheetCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-2xs">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "overview", label: "Overview" },
            { key: "work", label: "Work Queue" },
            { key: "logs", label: "Logs" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setDailyTab(tab.key as typeof dailyTab)}
              className={`rounded-xl px-3.5 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                dailyTab === tab.key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {dailyTab === "overview" && (
        <>
          {todaySummary.overdue > 0 || todaySummary.dueToday > 0 ? (
            <div className={`rounded-2xl border p-4 ${todaySummary.overdue > 0 ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className={todaySummary.overdue > 0 ? "text-red-600" : "text-amber-600"} />
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                      {todaySummary.overdue > 0 ? "Urgent attention" : "Due soon"}
                    </p>
                    <p className="text-sm font-black text-slate-900">
                      {todaySummary.overdue > 0
                        ? `${todaySummary.overdue} task${todaySummary.overdue === 1 ? "" : "s"} overdue`
                        : `${todaySummary.dueToday} task${todaySummary.dueToday === 1 ? "" : "s"} due today`}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${todaySummary.overdue > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                  {todaySummary.overdue > 0 ? "Action needed" : "Today"}
                </span>
              </div>
            </div>
          ) : null}

          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Active tasks", value: todaySummary.total, tone: "bg-slate-900 text-white" },
                { label: "Due today", value: todaySummary.dueToday, tone: "bg-amber-500 text-white" },
                { label: "In review", value: todaySummary.blocked, tone: "bg-red-500 text-white" },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${stat.tone}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-black leading-none">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">Today&apos;s priorities</h3>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Top 3</span>
              </div>
              <div className="space-y-2.5">
                {todayPriorities.length ? (
                  todayPriorities.map((task) => (
                    <div key={task.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-slate-900">{task.title}</p>
                        <p className="text-[10px] font-semibold text-slate-500">
                          {task.owner} · {task.project || "General"}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                        task.priority === "critical"
                          ? "bg-red-100 text-red-700"
                          : task.priority === "high"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-700"
                      }`}>
                        {task.priority || "normal"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-semibold text-slate-400">No active tasks flagged right now.</p>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {dailyTab === "work" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-black text-slate-900">
              {role === "Team Member" ? "Your Daily Tasks Today" : "Active Assigned Tasks"}
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {filteredAssignedTasks.length} active tasks
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAssignedTasks.map((task) => {
              const compPct = task.completion_percentage ?? 25;
              return (
                <div
                  key={task.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {task.project || "General"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                          task.priority === "critical"
                            ? "bg-red-50 text-red-700"
                            : task.priority === "high"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-black text-slate-900 leading-snug">
                      {task.title}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Assigned to: <span className="text-slate-900 font-bold">{task.owner}</span> · Target: {task.due}
                    </p>

                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-400 text-[11px] uppercase">
                          Progress
                        </span>
                        <span className="text-slate-900">{compPct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-[#e3292f] rounded-full transition-all duration-300"
                          style={{ width: `${compPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                        task.state === "Open"
                          ? "border-sky-200 bg-sky-50 text-sky-700"
                          : task.state === "In Progress"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : task.state === "In Review"
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : task.state === "In Revision"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : task.state === "Completed" || task.state === "Closed"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                    >
                      {task.state}
                    </span>
                    <div className="flex items-center gap-2">
                      {role === "Team Member" && canLogWork(task) && (
                        <button
                          type="button"
                          onClick={() => handleQuickCompleteTask(task)}
                          disabled={submitting}
                          className="rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700 hover:bg-emerald-50 transition cursor-pointer disabled:opacity-60"
                        >
                          Done
                        </button>
                      )}
                      {canLogWork(task) && (
                        <button
                          onClick={() => {
                            setLoggingProgressTask(task);
                            setProgressForm({
                              notes: "",
                              completionPct: compPct,
                              hoursSpent: "4",
                              blocker: "",
                              taskState: task.state || "In Progress",
                            });
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
                        >
                          <FileText size={14} />
                          Log Work
                        </button>
                      )}
                      {(["In Review", "Completed", "Closed", "Cancelled"].includes(task.state)) && (
                        <span className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-violet-700">
                          Awaiting review
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {!filteredAssignedTasks.length && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <CalendarCheck size={32} className="mx-auto text-slate-300 mb-2" />
                <h3 className="font-black text-slate-800 text-base">
                  No active tasks listed for this view!
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {role === "Team Member"
                    ? "Admin or Project Leader hasn&apos;t assigned a task yet. Click '+ Add What I&apos;m Working On Today' to add your task."
                    : "Try clearing the team member filter or assign a new task using the button above."}
                </p>
              </div>
            )}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Completed today</h3>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                {completedTodayTasks.length} done
              </span>
            </div>

            {completedTodayTasks.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {completedTodayTasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-slate-900 truncate">{task.title}</p>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700">
                        {task.state}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">
                      {task.owner} · {task.project || "General"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-400">
                No task was completed today yet.
              </p>
            )}
          </section>

          {isManagerRole && reviewQueue.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">Awaiting review</h3>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  {reviewQueue.length} waiting
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reviewQueue.map((task) => (
                  <div key={task.id} className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-slate-900 truncate">{task.title}</p>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-black uppercase text-violet-700">
                        {task.state}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">
                      {task.owner} · {task.project || "General"}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/60 p-1.5">
                      <button
                        type="button"
                        onClick={() => handleReviewDecision(task, "Completed")}
                        className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700 transition hover:bg-emerald-100 cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewDecision(task, "Open")}
                        className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-amber-700 transition hover:bg-amber-100 cursor-pointer"
                      >
                        Rework
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {dailyTab === "logs" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="border-b border-slate-100 p-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-[#e3292f]" />
              {role === "Team Member" ? "Your Progress Log History" : "Team Daily Work Datasheet"}
            </h3>
            <p className="text-xs font-semibold text-slate-400">
              Work logs, hours tracked, completion percentage, and reported blockers
            </p>
          </div>
          <span className="text-xs font-black text-slate-400">
            {filteredLogs.length} logged entries
          </span>
        </div>

        {/* DATASHEET TABLE VIEW (For Admins & Leaders, or toggle) */}
        {workViewMode === "datasheet" || role === "Team Member" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
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
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-[8px] font-black text-white shrink-0">
                          {getInitials(log.author_name || "TM")}
                        </span>
                        <span>{log.author_name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs truncate">
                      {log.task_title}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-500 max-w-xs truncate font-mono text-[11px]">
                      {log.project_name}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {log.hoursSpent}h
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[10px] font-black text-[#e3292f]">
                        {log.completionPct}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 max-w-md">
                      <p className="line-clamp-2 leading-relaxed">{log.notes}</p>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {log.blocker ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 border border-red-200">
                          <AlertTriangle size={12} className="shrink-0 text-red-500" />
                          <span className="truncate">{log.blocker}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}

                {!filteredLogs.length && !loadingLogs && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
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
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-[10px] font-black text-white shadow-2xs">
                      {getInitials(log.author_name || "TM")}
                    </span>
                    <div>
                      <p className="font-black text-slate-900 text-xs">
                        {log.task_title}{" "}
                        <span className="text-slate-400 font-normal font-mono">
                          ({log.project_name})
                        </span>
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500">
                        Logged by {log.author_name} ·{" "}
                        {new Date(log.created_at).toLocaleDateString()} at{" "}
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="rounded-md bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                      {log.hoursSpent}h logged
                    </span>
                    <span className="rounded-md bg-red-50 border border-red-200 px-2.5 py-1 text-[10px] font-black text-[#e3292f]">
                      {log.completionPct}% Complete
                    </span>
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-700 leading-relaxed bg-white rounded-lg p-3 border border-slate-100">
                  {log.notes}
                </p>

                {log.blocker && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200/80 p-2.5 text-xs font-bold text-red-700">
                    <AlertTriangle size={15} className="shrink-0 text-red-600" />
                    <span>Blocker: {log.blocker}</span>
                  </div>
                )}
              </div>
            ))}

            {!filteredLogs.length && !loadingLogs && (
              <div className="p-8 text-center text-xs font-semibold text-slate-400">
                No progress logs submitted yet.
              </div>
            )}
          </div>
        )}
      </section>
      )}

      {/* MODAL 1: TEAM MEMBER SELF-ADDS TASK */}
      {addingSelfTask && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                  Quick Add Task
                </p>
                <h2 className="text-xl font-black text-slate-900">
                  What Are You Working On Today?
                </h2>
              </div>
              <button
                onClick={() => setAddingSelfTask(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSelfTask} className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Task Title *
                <input
                  required
                  autoFocus
                  placeholder="e.g. Creating 3D CAD model for bracket assembly..."
                  value={selfTaskForm.title}
                  onChange={(e) =>
                    setSelfTaskForm({ ...selfTaskForm, title: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                />
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Project{" "}
                <span className="normal-case font-semibold text-slate-400">(optional)</span>
                <select
                  value={selfTaskForm.projectId}
                  onChange={(e) =>
                    setSelfTaskForm({ ...selfTaskForm, projectId: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900 cursor-pointer"
                >
                  <option value="">No project / standalone task</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Priority
                  <select
                    value={selfTaskForm.priority}
                    onChange={(e) =>
                      setSelfTaskForm({
                        ...selfTaskForm,
                        priority: e.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-red-400 text-slate-900 cursor-pointer"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>

                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
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
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold outline-none focus:border-red-400 text-slate-900"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setAddingSelfTask(false)}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="h-10 rounded-xl bg-[#e3292f] px-5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-60 transition cursor-pointer"
                >
                  {submitting ? "Adding..." : "Add to My Daily Work"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADMIN / LEADER ASSIGNS TASK TO MEMBER */}
      {assigningMemberTask && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                  Assign Task
                </p>
                <h2 className="text-xl font-black text-slate-900">
                  Assign Daily Task to Member
                </h2>
              </div>
              <button
                onClick={() => setAssigningMemberTask(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignMemberTask} className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Team Member *
                <select
                  required
                  value={assignForm.assigneeId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, assigneeId: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900 cursor-pointer"
                >
                  <option value="">Select team member...</option>
                  {people.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Task Title *
                <input
                  required
                  placeholder="Task title..."
                  value={assignForm.title}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, title: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                />
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Project{" "}
                <span className="normal-case font-semibold text-slate-400">(optional)</span>
                <select
                  value={assignForm.projectId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, projectId: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold outline-none focus:border-red-400 text-slate-900 cursor-pointer"
                >
                  <option value="">No project / standalone task</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Priority
                  <select
                    value={assignForm.priority}
                    onChange={(e) =>
                      setAssignForm({
                        ...assignForm,
                        priority: e.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-red-400 text-slate-900 cursor-pointer"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>

                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
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
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold outline-none focus:border-red-400 text-slate-900"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setAssigningMemberTask(false)}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="h-10 rounded-xl bg-slate-900 px-5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60 transition cursor-pointer"
                >
                  {submitting ? "Assigning..." : "Assign Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LOG WORK PROGRESS FOR A TASK */}
      {loggingProgressTask && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-600 font-mono">
                  {loggingProgressTask.project}
                </p>
                <h2 className="text-xl font-black text-slate-900 mt-0.5">
                  Log Progress: {loggingProgressTask.title}
                </h2>
              </div>
              <button
                onClick={() => setLoggingProgressTask(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProgress} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Task Status Update
                  <select
                    value={progressForm.taskState}
                    onChange={(e) =>
                      setProgressForm({
                        ...progressForm,
                        taskState: e.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold outline-none focus:border-red-400 text-slate-900 cursor-pointer"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">Submit for Review</option>
                    <option value="In Revision">In Revision</option>
                    <option value="Completed">Completed</option>
                  </select>
                </label>

                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
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
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-semibold outline-none focus:border-red-400 text-slate-900"
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Completion Percentage:{" "}
                    <span className="text-slate-900 font-black">
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
                    className="h-2 flex-1 rounded-lg accent-[#e3292f] bg-slate-200 cursor-pointer"
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
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                          progressForm.completionPct === pct
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Work Accomplished Notes *
                <textarea
                  required
                  rows={3}
                  placeholder="Describe work done today, CAD modeling progress, specifications updated..."
                  value={progressForm.notes}
                  onChange={(e) =>
                    setProgressForm({ ...progressForm, notes: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
                />
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
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
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-semibold outline-none focus:border-red-400 text-slate-900"
                />
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setLoggingProgressTask(null)}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting || !progressForm.notes.trim()}
                  className="flex items-center gap-2 rounded-xl bg-[#e3292f] px-5 py-2.5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
                >
                  <Send size={14} />
                  {submitting ? "Saving..." : "Save Progress Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
