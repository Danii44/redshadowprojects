import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Send,
  UserCheck,
} from "lucide-react";
import { Pill } from "@/components/ui/pill";
import type { Role, Task } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface DailyProgressWidgetProps {
  role: Role;
  tasks: Task[];
  profileId: string;
  userName: string;
  notify: (message: string) => void;
  onRefresh?: () => void;
}

interface LogEntry {
  id: string;
  task_id: string;
  author_id: string;
  author_name?: string;
  task_title?: string;
  notes: string;
  completionPct: number;
  hoursSpent: number;
  blocker?: string | null;
  created_at: string;
}

export function DailyProgressWidget({
  role,
  tasks,
  profileId,
  userName,
  notify,
  onRefresh,
}: DailyProgressWidgetProps) {
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [notes, setNotes] = useState("");
  const [completionPct, setCompletionPct] = useState(50);
  const [hoursSpent, setHoursSpent] = useState("4");
  const [blocker, setBlocker] = useState("");
  const [taskState, setTaskState] = useState("In Progress");
  const [submitting, setSubmitting] = useState(false);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Filter tasks visible for logging progress
  const userTasks = tasks.filter(
    (t) =>
      (role !== "Team Member" || t.assignee_id === profileId || t.owner === userName) &&
      !["Completed", "Closed", "Cancelled"].includes(t.state),
  );

  const fetchLogs = async () => {
    if (!supabase) return;
    setLoadingLogs(true);
    const { data, error } = await supabase
      .from("task_comments")
      .select("id, task_id, author_id, body, created_at, tasks(title), users(name)")
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) {
      setLoadingLogs(false);
      return;
    }

    const parsed: LogEntry[] = (data ?? [])
      .map((item: any) => {
        let notesText = item.body;
        let comp = 50;
        let hours = 0;
        let block: string | null = null;

        try {
          if (item.body.startsWith("{")) {
            const json = JSON.parse(item.body);
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
          author_name: item.users?.name || "Team Member",
          task_title: item.tasks?.title || "Assigned Task",
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
  };

  useEffect(() => {
    fetchLogs();
  }, [profileId, role]);

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedTaskId) return;
    setSubmitting(true);

    const payload = JSON.stringify({
      type: "daily_progress",
      notes: notes.trim(),
      completionPct,
      hoursSpent: parseFloat(hoursSpent) || 0,
      blocker: blocker.trim() || null,
    });

    const targetTask = userTasks.find((t) => String(t.id) === selectedTaskId);

    // 1. Insert into daily_updates table
    await supabase.from("daily_updates").insert({
      user_id: profileId,
      project_id: targetTask?.project_id || null,
      summary: notes.trim(),
      blockers: blocker.trim() || null,
      next_steps: `Completion: ${completionPct}%, Hours spent: ${hoursSpent}h`,
      update_date: new Date().toISOString().slice(0, 10),
    });

    // 2. Insert comment log into task_comments
    const { error: commentErr } = await supabase.from("task_comments").insert({
      task_id: selectedTaskId,
      author_id: profileId,
      body: payload,
    });

    if (commentErr) {
      setSubmitting(false);
      return notify(commentErr.message);
    }

    // 2. Update task completion and status
    const databaseState = taskState.toLowerCase().replaceAll(" ", "_");
    await supabase
      .from("tasks")
      .update({
        completion_percentage: completionPct,
        status: databaseState,
        submitted_at: databaseState === "in_review" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedTaskId);

    setSubmitting(false);
    setNotes("");
    setBlocker("");
    notify("Daily task progress logged successfully!");

    fetchLogs();
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Daily Progress Entry Form Card */}
      <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-red-50 text-[#e3292f]">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              Log Daily Progress
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Record today's task work, hours, progress percentage, and roadblocks.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitLog} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Task Select */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Select Task *
              </label>
              <select
                required
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
              >
                <option value="">Choose an assigned task...</option>
                {userTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.project})
                  </option>
                ))}
              </select>
            </div>

            {/* Task State */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Current Task State
              </label>
              <select
                value={taskState}
                onChange={(e) => setTaskState(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
              >
                <option value="In Progress">In Progress</option>
                <option value="In Review">Submit for Review</option>
                <option value="In Revision">In Revision</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Hours Spent */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Hours Spent Today
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hoursSpent}
                onChange={(e) => setHoursSpent(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
              />
            </div>
          </div>

          {/* Completion Percentage Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Task Completion: <span className="text-slate-900 font-black">{completionPct}%</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={completionPct}
                onChange={(e) => setCompletionPct(parseInt(e.target.value))}
                className="h-2 flex-1 rounded-lg accent-[#e3292f] bg-slate-200 cursor-pointer"
              />
              <div className="flex gap-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setCompletionPct(pct)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                      completionPct === pct
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

          {/* Progress Notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Work Accomplished Notes *
            </label>
            <textarea
              required
              rows={2}
              placeholder="Describe work completed today, technical milestones, CAD progress..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-50"
            />
          </div>

          {/* Blockers / Roadblocks */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Blockers or Help Needed (Optional)
            </label>
            <input
              placeholder="e.g. Waiting for STEP files from client, missing hardware specs..."
              value={blocker}
              onChange={(e) => setBlocker(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-50"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              disabled={submitting || !selectedTaskId || !notes.trim()}
              className="flex items-center gap-2 rounded-xl bg-[#e3292f] px-5 py-2.5 text-xs font-black text-white hover:bg-red-700 transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Send size={14} />
              {submitting ? "Submitting..." : "Submit Progress Log"}
            </button>
          </div>
        </form>
      </section>

      {/* Progress Log History Stream */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900">
            {role === "Team Member" ? "Your Recent Daily Logs" : "Team Daily Activity Stream"}
          </h3>
          <span className="text-xs font-bold text-slate-400">
            {logs.length} logged entries
          </span>
        </div>

        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-[9px] font-black text-white">
                    {getInitials(log.author_name || "TM")}
                  </span>
                  <div>
                    <p className="font-black text-slate-900 text-xs">
                      {log.task_title}
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

                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-white border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700">
                    {log.hoursSpent}h logged
                  </span>
                  <span className="rounded-md bg-red-50 border border-red-200 px-2 py-1 text-[10px] font-black text-[#e3292f]">
                    {log.completionPct}% Complete
                  </span>
                </div>
              </div>

              <p className="text-xs font-medium text-slate-700 leading-relaxed bg-white rounded-lg p-2.5 border border-slate-100">
                {log.notes}
              </p>

              {log.blocker && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200/60 p-2 text-xs font-bold text-red-700">
                  <AlertTriangle size={14} className="shrink-0 text-red-600" />
                  <span>Blocker: {log.blocker}</span>
                </div>
              )}
            </div>
          ))}

          {!logs.length && !loadingLogs && (
            <div className="p-8 text-center text-xs font-semibold text-slate-400">
              No daily progress logs submitted yet. Log your work above!
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
