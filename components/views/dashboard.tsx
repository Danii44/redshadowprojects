import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
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
  // ─── TEAM MEMBER DASHBOARD ───────────────────────────────────────────────
  if (role === "Team Member") {
    const myTasks = tasks.filter(
      (t) =>
        t.assignee_id === profileId ||
        (userName && t.owner?.toLowerCase() === userName.toLowerCase()),
    );

    const myProjects = projects.filter(
      (p) =>
        p.leader_id === profileId ||
        p.project_members?.some((m) => m.user_id === profileId),
    );

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
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                        t.state === "In Progress"
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
    if (status === "revisions" || status === "in_review") return true;

    if (p.deadline) {
      const diffHours =
        (new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
      return diffHours <= 48;
    }
    return false;
  });

  const sortedNeedsAttention = [...needsAttentionProjects].sort((a, b) => {
    const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return timeA - timeB;
  });

  const sortedOpenProjects = [...activeProjects].sort((a, b) => {
    const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return timeA - timeB;
  });

  const sortedDeadlines = [...projects]
    .filter((p) => {
      if (!p.deadline) return false;
      const status = normalizeProjectStatus(p.status);
      return !["delivered", "closed", "cancelled"].includes(status);
    })
    .sort(
      (a, b) =>
        new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime(),
    );

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
          <p className="mt-1 text-xs font-bold text-slate-400">
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Total
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{totalCount}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {activeCount} active
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Open
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{openCount}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            not started yet
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            In Progress
          </p>
          <p className="mt-2 text-3xl font-black text-blue-600">
            {inProgressCount}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            work happening
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            In Review
          </p>
          <p className="mt-2 text-3xl font-black text-amber-500">
            {inReviewCount}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            awaiting feedback
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Revisions
          </p>
          <p className="mt-2 text-3xl font-black text-violet-600">
            {revisionsCount}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            client changes
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Delivered
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-600">
            {deliveredCount}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            completed / sent
          </p>
        </div>
      </div>

      {/* Middle Section (3-Column Grid) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div>
                <h2 className="font-black text-slate-900 text-base">
                  Needs Attention
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500 font-semibold">
                  Overdue & due in next 2 days
                </p>
              </div>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-600">
                {sortedNeedsAttention.length} urgent
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {sortedNeedsAttention.map((p) => {
                const timeLeft = calculateTimeLeft(p.deadline);
                return (
                  <button
                    key={p.id}
                    onClick={() => setView("Projects")}
                    className="flex w-full items-center justify-between p-3.5 text-left hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-400">
                          {p.code}
                        </span>
                        <p className="font-black text-slate-900 text-xs truncate">
                          {p.name}
                        </p>
                      </div>
                      <p className={`mt-1 text-[11px] ${timeLeft.tone}`}>
                        {timeLeft.label}
                      </p>
                    </div>

                    <Pill color={projectStatusColor(p.status)}>
                      {projectStatusLabel(p.status)}
                    </Pill>
                  </button>
                );
              })}

              {!sortedNeedsAttention.length && (
                <div className="p-8 text-center text-xs font-semibold text-slate-400">
                  No urgent items or overdue deadlines right now!
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div>
                <h2 className="font-black text-slate-900 text-base">
                  Open Projects
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500 font-semibold">
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
                const timeLeft = calculateTimeLeft(p.deadline);
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
                    className="flex w-full items-center justify-between p-3.5 text-left hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-400">
                          {p.code}
                        </span>
                        <p className="font-black text-slate-900 text-xs truncate">
                          {p.name}
                        </p>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-slate-900 rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {progressPct}%
                        </span>

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

                    <span className={`text-[11px] ${timeLeft.tone}`}>
                      {timeLeft.label}
                    </span>
                  </button>
                );
              })}

              {!sortedOpenProjects.length && (
                <div className="p-8 text-center text-xs font-semibold text-slate-400">
                  No open active projects found.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div>
                <h2 className="font-black text-slate-900 text-base">
                  Revisions & Approvals
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500 font-semibold">
                  Pending review & approval queue
                </p>
              </div>
              <button
                onClick={() => setView("Revisions")}
                className="flex items-center gap-1 text-xs font-black text-[#e3292f] hover:underline cursor-pointer"
              >
                Queue <ArrowRight size={13} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {pendingRevisions.map((p) => (
                <button
                  key={`rev-proj-${p.id}`}
                  onClick={() => setView("Revisions")}
                  className="flex w-full items-center justify-between p-3.5 text-left hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <FileClock size={14} className="text-violet-500 shrink-0" />
                      <p className="font-black text-slate-900 text-xs truncate">
                        {p.name}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500 font-semibold">
                      {p.code} · {p.revision || "R1"}
                    </p>
                  </div>

                  <Pill color={projectStatusColor(p.status)}>
                    {projectStatusLabel(p.status)}
                  </Pill>
                </button>
              ))}

              {pendingTaskReviews.map((t) => (
                <button
                  key={`rev-task-${t.id}`}
                  onClick={() => setView("Revisions")}
                  className="flex w-full items-center justify-between p-3.5 text-left hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-amber-500 shrink-0" />
                      <p className="font-black text-slate-900 text-xs truncate">
                        {t.title}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500 font-semibold">
                      {t.project} · Task Review
                    </p>
                  </div>

                  <Pill
                    color={
                      t.state === "In Revision"
                        ? "red"
                        : t.state === "In Review"
                        ? "amber"
                        : "blue"
                    }
                  >
                    {t.state}
                  </Pill>
                </button>
              ))}

              {!pendingRevisions.length && !pendingTaskReviews.length && (
                <div className="p-8 text-center text-xs font-semibold text-slate-400">
                  No pending project revisions or task reviews in queue!
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Section: Upcoming Deadlines Table */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5 flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-900 text-base">
              Upcoming Deadlines
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              All active project target dates
            </p>
          </div>
          <span className="text-xs font-black text-slate-400">
            {sortedDeadlines.length} active deadlines
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">PROJECT</th>
                <th className="py-3 px-4">ASSIGNED</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">DEADLINE</th>
                <th className="py-3 px-4 text-right pr-6">REMAINING</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {sortedDeadlines.map((p) => {
                const timeLeft = calculateTimeLeft(p.deadline);
                const deadlineDateStr = p.deadline
                  ? new Date(p.deadline).toLocaleDateString()
                  : "—";

                return (
                  <tr
                    key={p.id}
                    onClick={() => setView("Projects")}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                      {p.code}
                    </td>

                    <td className="py-3.5 px-4 font-black text-slate-900">
                      {p.name}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex -space-x-2">
                        {p.team?.slice(0, 3).map((initials, idx) => (
                          <span
                            key={idx}
                            className="grid h-6 w-6 place-items-center rounded-full bg-slate-800 text-[8px] font-black text-white ring-1 ring-white"
                          >
                            {initials}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Pill color={projectStatusColor(p.status)}>
                        {projectStatusLabel(p.status)}
                      </Pill>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {deadlineDateStr}
                    </td>

                    <td className={`py-3.5 px-4 text-right pr-6 ${timeLeft.tone}`}>
                      {timeLeft.label}
                    </td>
                  </tr>
                );
              })}

              {!sortedDeadlines.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-xs font-semibold text-slate-400"
                  >
                    No active project deadlines found.
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
