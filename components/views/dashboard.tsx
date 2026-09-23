import React from "react";
import { ArrowRight, CheckCircle2, Clock, FileClock, Plus, UserCheck } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import {
  calculateTimeLeft,
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
  // Filter active projects (excluding delivered, closed, cancelled)
  const activeProjects = projects.filter(
    (p) =>
      !["delivered", "closed", "cancelled"].includes(
        normalizeProjectStatus(p.status),
      ),
  );

  // Top Metric Counts
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
  const deliveredCount = projects.filter(
    (p) =>
      ["delivered", "closed"].includes(normalizeProjectStatus(p.status)),
  ).length;

  // 1. Needs Attention: ALL items overdue OR due in the next 2 days (48h)
  // Excludes delivered, closed, cancelled
  const needsAttentionProjects = projects.filter((p) => {
    const status = normalizeProjectStatus(p.status);
    if (["delivered", "closed", "cancelled"].includes(status)) return false;

    // Status is in revisions or in review
    if (status === "revisions" || status === "in_review") return true;

    // Deadline is overdue OR due within the next 48 hours (2 days)
    if (p.deadline) {
      const diffHours =
        (new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
      return diffHours <= 48; // Overdue (<0) or due within 48h
    }
    return false;
  });

  // Sort needs attention by urgency (most overdue first)
  const sortedNeedsAttention = [...needsAttentionProjects].sort((a, b) => {
    const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return timeA - timeB;
  });

  // 2. Open Projects: All active projects aligned by time remaining
  const sortedOpenProjects = [...activeProjects].sort((a, b) => {
    const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return timeA - timeB;
  });

  // 3. Upcoming Deadlines: ALL active projects with deadlines (excluding delivered, closed, cancelled)
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

  // 4. Pending Revisions & Approvals Queue (3rd Section)
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

        {role !== "Team Member" && (
          <button
            onClick={() => setView("Projects")}
            className="flex items-center gap-2 rounded-xl bg-[#e3292f] px-4 py-2.5 text-xs font-black text-white hover:bg-red-700 transition shadow-xs self-start sm:self-auto"
          >
            <Plus size={16} />
            New Project
          </button>
        )}
      </div>

      {/* Top Metric Cards Row (6 Cards) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {/* TOTAL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Total
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{totalCount}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {activeCount} active
          </p>
        </div>

        {/* OPEN */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Open
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{openCount}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            not started yet
          </p>
        </div>

        {/* IN PROGRESS */}
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

        {/* IN REVIEW */}
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

        {/* REVISIONS */}
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

        {/* DELIVERED */}
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
        {/* Column 1: Needs Attention (ALL overdue or due in next 48h) */}
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
                    className="flex w-full items-center justify-between p-3.5 text-left hover:bg-slate-50 transition"
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

        {/* Column 2: Open Projects (Aligned by time remaining) */}
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
                className="flex items-center gap-1 text-xs font-black text-[#e3292f] hover:underline"
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
                    className="flex w-full items-center justify-between p-3.5 text-left hover:bg-slate-50 transition"
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

        {/* Column 3: Revisions & Approvals Queue (Visual & Helpful 3rd Section) */}
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
                className="flex items-center gap-1 text-xs font-black text-[#e3292f] hover:underline"
              >
                Queue <ArrowRight size={13} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {pendingRevisions.map((p) => (
                <button
                  key={`rev-proj-${p.id}`}
                  onClick={() => setView("Revisions")}
                  className="flex w-full items-center justify-between p-3.5 text-left hover:bg-slate-50 transition"
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
                  className="flex w-full items-center justify-between p-3.5 text-left hover:bg-slate-50 transition"
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

      {/* Bottom Section: Upcoming Deadlines Table (ALL Active Projects with Deadlines) */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5 flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-900 text-base">
              Upcoming Deadlines
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              All active project target dates (completed/delivered/closed orders excluded)
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
