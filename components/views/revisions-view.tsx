import React, { useState } from "react";
import { CheckCircle2, CircleAlert, FileClock, RefreshCw } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import type { Project, Revision, Role, Task } from "@/lib/types";
import { normalizeProjectStatus, projectStatusColor, projectStatusLabel } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface RevisionsViewProps {
  projects: Project[];
  tasks: Task[];
  profileId: string;
  role: Role;
  notify: (message: string) => void;
  onRefresh?: () => void;
}

export function RevisionsView({
  projects,
  tasks,
  profileId,
  role,
  notify,
  onRefresh,
}: RevisionsViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "projects" | "tasks">(
    "all",
  );

  const refresh = () => {
    if (onRefresh) onRefresh();
    else window.location.reload();
  };

  // 1. Gather all active project revisions
  // A project is in revision/review if:
  // - its status normalizes to 'revisions' or 'in_review' (or legacy values 'revision', 'waiting_client')
  // - OR it has explicit child entries in project.revisions where state is not 'approved'/'closed'
  const projectRevisions = projects
    .filter((project) => {
      const normStatus = normalizeProjectStatus(project.status);
      const rawStatus = (project.status || "").toLowerCase();

      const isRevisionStatus =
        normStatus === "revisions" ||
        normStatus === "in_review" ||
        rawStatus.includes("revision") ||
        rawStatus.includes("review") ||
        rawStatus === "waiting_client";

      const hasActiveChildRevision = (project.revisions ?? []).some(
        (rev: Revision) =>
          rev.state !== "approved" &&
          rev.state !== "closed" &&
          rev.state !== "completed",
      );

      return isRevisionStatus || hasActiveChildRevision;
    })
    .map((project) => {
      // Find the latest pending/active revision child record if it exists
      const activeChild = (project.revisions ?? []).find(
        (rev: Revision) =>
          rev.state !== "approved" &&
          rev.state !== "closed" &&
          rev.state !== "completed",
      );

      return {
        id: activeChild?.id ?? project.id,
        projectId: project.id,
        number: activeChild?.number ?? (project.revisions?.length ?? 0) + 1,
        state: activeChild?.state || project.status || "revisions",
        notes:
          activeChild?.notes ||
          project.requirements ||
          project.description ||
          project.note ||
          "Revision requested for project phase.",
        review_outcome: activeChild?.review_outcome ?? null,
        submitted_at:
          activeChild?.submitted_at || project.updated_at || project.created_at,
        type: "project" as const,
        projectName: project.name,
        projectCode: project.code,
        projectPhase: project.phase || "Detailed Design",
        status: project.status,
      };
    });

  // 2. Gather task revisions (tasks in "In Revision", "In Review", or status containing revision/review)
  const taskRevisions = tasks
    .filter((task) => {
      const s = (task.state || task.status || "").toLowerCase().replace(/_/g, " ");
      const isReviewOrRevision =
        s.includes("revision") || s.includes("review");
      const isNotDone = !["completed", "closed", "cancelled"].includes(s);
      return isReviewOrRevision && isNotDone;
    })
    .map((task) => ({
      ...task,
      type: "task" as const,
    }));

  const updateProjectRevision = async (
    item: { id: string; projectId: string },
    outcome: "approved" | "changes_requested",
  ) => {
    if (!supabase || !profileId || role === "Team Member") return;

    // Update project status in Supabase
    const nextStatus = outcome === "approved" ? "in_progress" : "revisions";
    await supabase
      .from("projects")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", item.projectId);

    // Update revisions child table row if explicit child revision row exists
    if (item.id && item.id !== item.projectId) {
      await supabase
        .from("revisions")
        .update({
          state: outcome,
          review_outcome: outcome,
          reviewed_by: profileId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
    } else {
      // If no explicit child row, insert one for history log
      await supabase.from("revisions").insert({
        project_id: item.projectId,
        number: 1,
        state: outcome,
        review_outcome: outcome,
        reviewed_by: profileId,
        reviewed_at: new Date().toISOString(),
        notes:
          outcome === "approved"
            ? "Revision approved"
            : "Changes requested by reviewer",
      });
    }

    notify(
      outcome === "approved"
        ? "Project revision approved and moved to In Progress"
        : "Change request recorded for project",
    );
    refresh();
  };

  const updateTaskRevision = async (
    taskId: string | number,
    nextStatus: "completed" | "in_progress",
  ) => {
    if (!supabase || role === "Team Member") return;

    const { error } = await supabase
      .from("tasks")
      .update({
        status: nextStatus,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) return notify(error.message);
    notify(
      nextStatus === "completed"
        ? "Task approved & marked completed"
        : "Task returned to In Progress for changes",
    );
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Revisions & Reviews
        </h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Review submitted project revisions and task review requests requiring feedback.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
            activeTab === "all"
              ? "bg-[#e3292f] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          All Items ({projectRevisions.length + taskRevisions.length})
        </button>

        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
            activeTab === "projects"
              ? "bg-[#e3292f] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Project Revisions ({projectRevisions.length})
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
            activeTab === "tasks"
              ? "bg-[#e3292f] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Task Reviews ({taskRevisions.length})
        </button>
      </div>

      {/* Items Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* PROJECT REVISIONS */}
        {(activeTab === "all" || activeTab === "projects") &&
          projectRevisions.map((rev) => (
            <div
              key={`proj-rev-${rev.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-400">
                    <FileClock size={15} className="text-violet-500" />
                    {rev.projectCode}
                  </span>
                  <Pill color={projectStatusColor(rev.status)}>
                    {projectStatusLabel(rev.status)}
                  </Pill>
                </div>

                <h3 className="mt-3 text-lg font-black text-slate-900">
                  {rev.projectName}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Phase: {rev.projectPhase} · Submitted{" "}
                  {rev.submitted_at
                    ? new Date(rev.submitted_at).toLocaleDateString()
                    : "Recently"}
                </p>

                <div className="my-4 rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
                  {rev.notes || "No revision notes provided for this submission."}
                </div>
              </div>

              {role !== "Team Member" && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => updateProjectRevision(rev, "approved")}
                    className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition text-center shadow-xs cursor-pointer"
                  >
                    Approve Revision
                  </button>
                  <button
                    onClick={() =>
                      updateProjectRevision(rev, "changes_requested")
                    }
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition text-center cursor-pointer"
                  >
                    Request Changes
                  </button>
                </div>
              )}
            </div>
          ))}

        {/* TASK REVISIONS */}
        {(activeTab === "all" || activeTab === "tasks") &&
          taskRevisions.map((t) => (
            <div
              key={`task-rev-${t.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <RefreshCw size={15} className="text-amber-500" />
                    Task Review · {t.project}
                  </span>
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
                </div>

                <h3 className="mt-3 text-lg font-black text-slate-900">
                  {t.title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Assigned to: {t.owner} · Priority:{" "}
                  <span className="font-bold capitalize text-slate-800">
                    {t.priority}
                  </span>
                </p>

                <div className="my-4 rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium flex items-center justify-between">
                  <span>Target Due: {t.due}</span>
                  <span className="font-bold text-slate-500">
                    Checklist: {t.checklist}
                  </span>
                </div>
              </div>

              {role !== "Team Member" && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => updateTaskRevision(t.id, "completed")}
                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition text-center shadow-xs cursor-pointer"
                  >
                    Approve & Complete
                  </button>
                  <button
                    onClick={() => updateTaskRevision(t.id, "in_progress")}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition text-center cursor-pointer"
                  >
                    Request Further Work
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>

      {projectRevisions.length === 0 && taskRevisions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs font-semibold text-slate-400">
          No project revisions or task reviews are pending at this time.
        </div>
      )}
    </div>
  );
}
