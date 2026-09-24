import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  FileClock,
  Layers,
  ListTodo,
  Plus,
  Sparkles,
} from "lucide-react";
import { Pill } from "@/components/ui/pill";
import {
  calculateTimeLeft,
  getInitials,
  normalizeProjectStatus,
  projectStatusColor,
  projectStatusLabel,
} from "@/lib/utils";
import type { Project, Role, Task, View } from "@/lib/types";

interface DashboardProps {
  role: Role;
  projects: Project[];
  tasks: Task[];
  profileId?: string;
  userName?: string;
  setView: (view: View) => void;
  notify: (message: string) => void;
  onRefresh?: () => void;
}

export function Dashboard({
  role,
  projects,
  tasks,
  profileId = "",
  userName = "Team Member",
  setView,
  notify,
  onRefresh,
}: DashboardProps) {
  const [deadlineFilter, setDeadlineFilter] = React.useState<
    "all" | "fixed_deadline" | "hourly_ongoing"
  >("all");

  // ─── TEAM MEMBER DASHBOARD ───────────────────────────────────────────────
  if (role === "Team Member") {
    const myTasks = tasks.filter(
      (t) =>
        t.assignee_id === profileId ||
        (userName && t.owner?.toLowerCase() === userName.toLowerCase()),
    );

    const rawMyProjects = projects.filter(
      (p) =>
        p.leader_id === profileId ||
        p.project_members?.some((m) => m.user_id === profileId),
    );

    const statusWorkflowOrder: Record<string, number> = {
      open: 1,
      in_progress: 2,
      in_review: 3,
      revisions: 4,
      on_hold: 5,
      delivered: 6,
      closed: 7,
      cancelled: 8,
    };

    const myProjects = [...rawMyProjects].sort((a, b) => {
      const rankA = statusWorkflowOrder[normalizeProjectStatus(a.status)] ?? 99;
      const rankB = statusWorkflowOrder[normalizeProjectStatus(b.status)] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return timeA - timeB;
    });

    const myInProgress = myTasks.filter((t) => t.state === "In Progress").length;
    const myInReview = myTasks.filter(
      (t) => t.state === "In Review" || t.state === "In Revision",
    ).length;
    const myCompleted = myTasks.filter(
      (t) => t.state === "Completed" || t.state === "Closed",
    ).length;
    const myOpen = myTasks.filter((t) => t.state === "Open").length;

    const urgentTasks = myTasks.filter(
      (t) => t.state !== "Completed" && t.state !== "Closed",
    );

    return (
      <div className="space-y-7">
        {/* Welcome Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#e3292f]">
              <Sparkles size={16} />
              Welcome Back
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">
              Hello, {userName}!
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Here is your active work summary and task list for today.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("Tasks")}
              className="flex items-center gap-2 rounded-xl bg-[#e3292f] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-red-950/20 hover:bg-red-700 transition cursor-pointer"
            >
              <ListTodo size={16} />
              View My Tasks ({myTasks.length})
            </button>
          </div>
        </div>

        {/* Simplified Stat Cards (4 Cards) */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              To Do Tasks
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">{myOpen}</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              ready to start
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              In Progress
            </p>
            <p className="mt-2 text-3xl font-black text-blue-600">
              {myInProgress}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              actively working
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              In Review / Revision
            </p>
            <p className="mt-2 text-3xl font-black text-amber-500">
              {myInReview}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              awaiting check
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Completed
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-600">
              {myCompleted}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              finished tasks
            </p>
          </div>
        </div>

        {/* 2-Column Section for Team Member: My Active Tasks & My Projects */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* My Active Tasks List */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-black text-slate-900 text-base">
                    My Active Tasks
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 font-semibold">
                    Tasks assigned specifically to you
                  </p>
                </div>
                <button
                  onClick={() => setView("Tasks")}
                  className="flex items-center gap-1 text-xs font-bold text-[#e3292f] hover:underline cursor-pointer"
                >
                  All Tasks <ArrowRight size={13} />
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {urgentTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {t.project || "General"}
                      </span>
                      <p className="font-bold text-slate-900 text-xs truncate mt-0.5">
                        {t.title}
                      </p>
                      {t.due && (
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 mt-1">
                          <Clock size={10} /> {t.due}
                        </span>
                      )}
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${t.state === "In Progress"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : t.state === "In Review"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : t.state === "In Revision"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {t.state}
                    </span>
                  </div>
                ))}

                {urgentTasks.length === 0 && (
                  <div className="p-10 text-center text-xs font-semibold text-slate-400">
                    No active tasks assigned to you right now! 🎉
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* My Assigned Projects */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-black text-slate-900 text-base">
                    My Assigned Projects
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 font-semibold">
                    Projects where you are a team member
                  </p>
                </div>
                <button
                  onClick={() => setView("Projects")}
                  className="flex items-center gap-1 text-xs font-bold text-[#e3292f] hover:underline cursor-pointer"
                >
                  All Projects <ArrowRight size={13} />
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {myProjects.map((p) => {
                  const timeLeft = calculateTimeLeft(p.deadline);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setView("Projects")}
                      className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-red-600">
                            {p.code}
                          </span>
                          <p className="font-black text-slate-900 text-xs truncate">
                            {p.name}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          Led by {p.leader}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <Pill color={projectStatusColor(p.status)}>
                          {projectStatusLabel(p.status)}
                        </Pill>
                        <span className={`text-[10px] font-bold block mt-1 ${timeLeft.tone}`}>
                          {timeLeft.label}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {myProjects.length === 0 && (
                  <div className="p-10 text-center text-xs font-semibold text-slate-400">
                    You are not assigned to any projects yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ─── ADMIN & PROJECT LEADER EXECUTIVE DASHBOARD ─────────────────────────
  const activeProjects = projects.filter(
    (p) =>
      !["delivered", "closed", "cancelled"].includes(
        normalizeProjectStatus(p.status),
      ),
  );

  const totalCount = projects.length;
  const activeCount = activeProjects.length;
  const openCount = projects.filter(
    (p) => normalizeProjectStatus(p.status) === "open",
  ).length;
  const inProgressCount = projects.filter(
    (p) => normalizeProjectStatus(p.status) === "in_progress",
  ).length;
  const inReviewCount = projects.filter(
    (p) => normalizeProjectStatus(p.status) === "in_review",
  ).length;
  const revisionsCount = projects.filter(
    (p) => normalizeProjectStatus(p.status) === "revisions",
  ).length;
  const deliveredCount = projects.filter((p) =>
    ["delivered", "closed"].includes(normalizeProjectStatus(p.status)),
  ).length;

  const needsAttentionProjects = projects.filter((p) => {
    const status = normalizeProjectStatus(p.status);
    if (["delivered", "closed", "cancelled"].includes(status)) return false;

    // Exclude hourly/ongoing projects from overdue alerts unless critical priority
    if (p.project_type === "hourly_ongoing" && p.priority?.toLowerCase() !== "critical") {
      return false;
    }

    // Require an actual deadline date (must be overdue or due in next 48 hours)
    if (!p.deadline) return false;

    const diffHours =
      (new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours <= 48;
  });

  const sortedNeedsAttention = [...needsAttentionProjects].sort((a, b) => {
    const timeA = new Date(a.deadline!).getTime();
    const timeB = new Date(b.deadline!).getTime();

    const now = Date.now();
    const diffDaysA = Math.ceil((timeA - now) / (1000 * 60 * 60 * 24));
    const diffDaysB = Math.ceil((timeB - now) / (1000 * 60 * 60 * 24));

    const getUrgencyRank = (days: number) => {
      if (days === 0) return 1;
      if (days < 0) return 2;
      return 3;
    };

    const rankA = getUrgencyRank(diffDaysA);
    const rankB = getUrgencyRank(diffDaysB);

    if (rankA !== rankB) return rankA - rankB;
    return timeA - timeB;
  });

  const sortedOpenProjects = [...activeProjects].sort((a, b) => {
    const statusWorkflowOrder: Record<string, number> = {
      open: 1,
      in_progress: 2,
      in_review: 3,
      revisions: 4,
      on_hold: 5,
      delivered: 6,
      closed: 7,
      cancelled: 8,
    };
    const rankA = statusWorkflowOrder[normalizeProjectStatus(a.status)] ?? 99;
    const rankB = statusWorkflowOrder[normalizeProjectStatus(b.status)] ?? 99;
    if (rankA !== rankB) return rankA - rankB;

    const isHourlyA = a.project_type === "hourly_ongoing" || !a.deadline;
    const isHourlyB = b.project_type === "hourly_ongoing" || !b.deadline;
    if (!isHourlyA && isHourlyB) return -1;
    if (isHourlyA && !isHourlyB) return 1;

    const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return timeA - timeB;
  });

  const filteredDeadlines = projects.filter((p) => {
    const status = normalizeProjectStatus(p.status);
    if (["delivered", "closed", "cancelled"].includes(status)) return false;

    if (deadlineFilter === "fixed_deadline") {
      return p.project_type !== "hourly_ongoing" && Boolean(p.deadline);
    }
    if (deadlineFilter === "hourly_ongoing") {
      return p.project_type === "hourly_ongoing" || !p.deadline;
    }
    return true; // "all"
  });

  const sortedDeadlines = [...filteredDeadlines].sort((a, b) => {
    const isHourlyA = a.project_type === "hourly_ongoing" || !a.deadline;
    const isHourlyB = b.project_type === "hourly_ongoing" || !b.deadline;

    if (!isHourlyA && !isHourlyB) {
      return new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime();
    }
    if (!isHourlyA && isHourlyB) return -1;
    if (isHourlyA && !isHourlyB) return 1;

    const timeA = a.last_activity_at
      ? new Date(a.last_activity_at).getTime()
      : a.created_at
        ? new Date(a.created_at).getTime()
        : 0;
    const timeB = b.last_activity_at
      ? new Date(b.last_activity_at).getTime()
      : b.created_at
        ? new Date(b.created_at).getTime()
        : 0;
    return timeB - timeA;
  });

  const pendingRevisions = projects.filter((p) => {
    const normStatus = normalizeProjectStatus(p.status);
    const rawStatus = (p.status || "").toLowerCase();
    const isRevisionStatus =
      normStatus === "revisions" ||
      normStatus === "in_review" ||
      rawStatus.includes("revision") ||
      rawStatus.includes("review") ||
      rawStatus === "waiting_client";

    const hasActiveChildRevision = (p.revisions ?? []).some(
      (rev) =>
        rev.state !== "approved" &&
        rev.state !== "closed" &&
        rev.state !== "completed",
    );

    return isRevisionStatus || hasActiveChildRevision;
  });

  const pendingTaskReviews = tasks.filter((t) => {
    const s = (t.state || t.status || "").toLowerCase().replace(/_/g, " ");
    const isReviewOrRevision = s.includes("revision") || s.includes("review");
    const isNotDone = !["completed", "closed", "cancelled"].includes(s);
    return isReviewOrRevision && isNotDone;
  });

  return (
    <div className="space-y-7">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Studio Dashboard
          </h1>
          <p className="mt-1 text-xs font-bold text-slate-600">
            Red Shadow Designs · {userName} ({role})
          </p>
        </div>

        <button
          onClick={() => setView("Projects")}
          className="flex items-center gap-2 rounded-xl bg-[#e3292f] px-4 py-2.5 text-xs font-black text-white hover:bg-red-700 transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Top Metric Cards Row (6 Cards) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">
            Total
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{totalCount}</p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            {activeCount} active
          </p>
        </div>

        <div className={`rounded-2xl border bg-white p-4 shadow-2xs transition ${
          openCount === 0 ? "border-slate-200/60 opacity-65" : "border-slate-200"
        }`}>
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">
            Open
          </p>
          <p className={`mt-2 text-3xl font-black ${openCount === 0 ? "text-slate-400" : "text-slate-900"}`}>
            {openCount}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            not started yet
          </p>
        </div>

        <div className={`rounded-2xl border bg-white p-4 shadow-2xs transition ${
          inProgressCount === 0 ? "border-slate-200/60 opacity-65" : "border-slate-200"
        }`}>
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">
            In Progress
          </p>
          <p className={`mt-2 text-3xl font-black ${inProgressCount === 0 ? "text-slate-400" : "text-blue-600"}`}>
            {inProgressCount}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            work happening
          </p>
        </div>

        <div className={`rounded-2xl border bg-white p-4 shadow-2xs transition ${
          inReviewCount === 0 ? "border-slate-200/60 opacity-65" : "border-slate-200"
        }`}>
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">
            In Review
          </p>
          <p className={`mt-2 text-3xl font-black ${inReviewCount === 0 ? "text-slate-400" : "text-amber-500"}`}>
            {inReviewCount}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            awaiting feedback
          </p>
        </div>

        <div className={`rounded-2xl border bg-white p-4 shadow-2xs transition ${
          revisionsCount === 0 ? "border-slate-200/60 opacity-65" : "border-slate-200"
        }`}>
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">
            Revisions
          </p>
          <p className={`mt-2 text-3xl font-black ${revisionsCount === 0 ? "text-slate-400" : "text-violet-600"}`}>
            {revisionsCount}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            client changes
          </p>
        </div>

        <div className={`rounded-2xl border bg-white p-4 shadow-2xs transition ${
          deliveredCount === 0 ? "border-slate-200/60 opacity-65" : "border-slate-200"
        }`}>
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">
            Delivered
          </p>
          <p className={`mt-2 text-3xl font-black ${deliveredCount === 0 ? "text-slate-400" : "text-emerald-600"}`}>
            {deliveredCount}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            completed / sent
          </p>
        </div>
      </div>

      {/* Middle Section (2-Column Grid: Needs Attention & Open Projects) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 bg-white">
              <div>
                <h2 className="font-black text-slate-900 text-base">
                  Needs Attention
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 font-semibold">
                  Overdue & due in next 2 days
                </p>
              </div>
              <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-black text-red-600">
                {sortedNeedsAttention.length} urgent
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {sortedNeedsAttention.map((p) => {
                const timeLeft = calculateTimeLeft(p.deadline, p.project_type);
                return (
                  <button
                    key={p.id}
                    onClick={() => setView("Projects")}
                    className={`flex w-full items-center justify-between p-4 text-left transition cursor-pointer ${timeLeft.borderClass} ${timeLeft.bgClass}`}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {p.code}
                        </span>
                        <p className="font-black text-slate-900 text-xs truncate">
                          {p.name}
                        </p>
                      </div>
                      <span className={`inline-block mt-1.5 rounded-full px-2.5 py-0.5 text-[11px] ${timeLeft.badgeClass}`}>
                        {timeLeft.label}
                      </span>
                    </div>

                    <Pill color={projectStatusColor(p.status)}>
                      {projectStatusLabel(p.status)}
                    </Pill>
                  </button>
                );
              })}

              {!sortedNeedsAttention.length && (
                <div className="p-8 text-center text-xs font-semibold text-slate-400 bg-white">
                  No urgent items or overdue deadlines right now!
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 bg-white">
              <div>
                <h2 className="font-black text-slate-900 text-base">
                  Open Projects
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 font-semibold">
                  Active deliverables aligned by timeline
                </p>
              </div>
              <button
                onClick={() => setView("Projects")}
                className="flex items-center gap-1 text-xs font-black text-[#e3292f] hover:underline cursor-pointer"
              >
                All <ArrowRight size={13} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {sortedOpenProjects.map((p) => {
                const isHourly = p.project_type === "hourly_ongoing";
                const timeLeft = calculateTimeLeft(p.deadline, p.project_type);
                const activeTaskCount = tasks.filter(
                  (t) =>
                    t.project_id === p.id &&
                    !["completed", "closed"].includes(
                      (t.state || t.status || "").toLowerCase(),
                    ),
                ).length;
                const progressPct =
                  p.completion_percentage ??
                  (p.phase === "Requirements"
                    ? 15
                    : p.phase === "Concept"
                      ? 35
                      : p.phase === "Detailed Design"
                        ? 60
                        : p.phase === "Client Review"
                          ? 80
                          : 95);

                return (
                  <button
                    key={p.id}
                    onClick={() => setView("Projects")}
                    className={`flex w-full items-center justify-between p-4 text-left transition cursor-pointer ${timeLeft.borderClass} ${timeLeft.bgClass}`}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {p.code}
                        </span>
                        <p className="font-black text-slate-900 text-xs truncate">
                          {p.name}
                        </p>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2">
                        {isHourly ? (
                          <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            Hourly Track · {activeTaskCount} active tasks
                          </span>
                        ) : (
                          <>
                            <div className="h-1.5 w-20 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full bg-slate-900 rounded-full"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">
                              {progressPct}%
                            </span>
                          </>
                        )}

                        <div className="flex -space-x-1 ml-1">
                          {p.team?.slice(0, 2).map((initials, idx) => (
                            <span
                              key={idx}
                              className="grid h-4.5 w-4.5 place-items-center rounded-full bg-slate-800 text-[7px] font-black text-white ring-1 ring-white"
                            >
                              {initials}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${timeLeft.badgeClass}`}>
                      {timeLeft.label}
                    </span>
                  </button>
                );
              })}

              {!sortedOpenProjects.length && (
                <div className="p-8 text-center text-xs font-semibold text-slate-400 bg-white">
                  No open active projects found.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Section: Upcoming Deadlines & Ongoing Projects Table */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-900 text-base">
              Upcoming Deadlines & Ongoing Projects
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 font-semibold">
              All active project target dates, retainers, and assignments
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setDeadlineFilter("all")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                deadlineFilter === "all"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Projects
            </button>
            <button
              onClick={() => setDeadlineFilter("fixed_deadline")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                deadlineFilter === "fixed_deadline"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Fixed Deadline
            </button>
            <button
              onClick={() => setDeadlineFilter("hourly_ongoing")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                deadlineFilter === "hourly_ongoing"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Hourly / Ongoing
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">CODE</th>
                <th className="py-3 px-4">PROJECT</th>
                <th className="py-3 px-4">ASSIGNED</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">TARGET DATE</th>
                <th className="py-3 px-4 text-right">TRACK / REMAINING</th>
                <th className="py-3 px-4 text-right pr-6">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {sortedDeadlines.map((p) => {
                const isHourly = p.project_type === "hourly_ongoing";
                const timeLeft = calculateTimeLeft(p.deadline, p.project_type);
                const deadlineDateStr = isHourly
                  ? "Ongoing Track"
                  : p.deadline
                    ? new Date(p.deadline).toLocaleDateString()
                    : "No deadline";

                return (
                  <tr
                    key={p.id}
                    onClick={() => setView("Projects")}
                    className={`transition cursor-pointer ${timeLeft.borderClass} ${timeLeft.bgClass}`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-red-600">
                      {p.code}
                    </td>

                    <td className="py-3.5 px-4 font-black text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {isHourly && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700">
                            Hourly
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {p.team && p.team.length > 0 ? (
                          <div className="flex -space-x-1.5">
                            {p.team.slice(0, 3).map((initials, idx) => (
                              <span
                                key={idx}
                                className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-[8.5px] font-black text-white ring-2 ring-white"
                              >
                                {initials}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[8.5px] font-black text-slate-800 ring-2 ring-white">
                              {getInitials(p.leader || "Unassigned")}
                            </span>
                            <span className="text-slate-700 text-xs font-semibold">
                              {p.leader || "Unassigned"}
                            </span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Pill color={projectStatusColor(p.status)}>
                        {projectStatusLabel(p.status)}
                      </Pill>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {deadlineDateStr}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs ${timeLeft.badgeClass}`}>
                        {timeLeft.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right pr-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setView("Projects");
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-900 hover:text-white transition cursor-pointer shadow-2xs"
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!sortedDeadlines.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-xs font-semibold text-slate-400"
                  >
                    No active projects found matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
