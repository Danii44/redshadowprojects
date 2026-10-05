"use client";
import "./task-side-panel.css";
import { useEffect, useState } from "react";
import { X, MessageSquare } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { TasksView } from "@/components/views/tasks-view";
import { supabase } from "@/lib/supabase";
import type { Task, Project, Role, User } from "@/lib/types";

interface Activity { id: string; author_id: string; body: string; created_at: string }

export function TaskSidePanel({ task, projects, people, profileId, role, onClose, updateTask, notify, onRefresh, onReviewDecision }: {
  task: Task; projects: Project[]; people: User[]; profileId: string; role: Role;
  onClose: () => void; updateTask: (id: string | number, state: string) => void;
  notify: (message: string) => void; onRefresh: () => void;
  onReviewDecision: (task: Task, state: "Completed" | "Open") => Promise<void>;
}) {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) { setLoading(false); setError(true); return; }
      setLoading(true);
      setError(false);
      const result = await supabase.from("task_comments").select("id, author_id, body, created_at").eq("task_id", task.id).order("created_at", { ascending: false }).limit(20);
      if (cancelled) return;
      setActivity(result.data || []);
      setError(!!result.error);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [task.id, task.updated_at, task.state, retry]);
  const review = async (state: "Completed" | "Open") => {
    setReviewing(true);
    try { await onReviewDecision(task, state); } finally { setReviewing(false); }
  };
  return <Modal title={`Task details: ${task.title}`} drawer onClose={onClose}>
    <div className="task-side-panel">
      <header className="task-side-header"><div><p className="studio-eyebrow">Task details</p><h2>{task.title}</h2><p className="studio-meta">{task.project || "General work"}</p></div>
        <button className="studio-icon-button" aria-label="Close task details" onClick={onClose}><X size={20}/></button></header>
      <div className="task-side-body">
        <section aria-label="Recorded progress"><h3>Recorded progress</h3>
          {typeof task.completion_percentage === "number" && Number.isFinite(task.completion_percentage) ? <div className="task-side-progress"><strong>{Math.max(0, Math.min(100, task.completion_percentage))}%</strong><progress aria-label="Recorded task completion" value={Math.max(0, Math.min(100, task.completion_percentage))} max={100}/></div> : <p className="studio-meta">No progress recorded yet.</p>}
          {task.submitted_at && <p className="studio-meta mt-2">Submitted {new Date(task.submitted_at).toLocaleString()}</p>}
          {task.reviewed_at && <p className="studio-meta mt-2">Reviewed {new Date(task.reviewed_at).toLocaleString()}</p>}
        </section>
        {task.description && <section><h3>Description</h3><p className="task-description">{task.description}</p></section>}
        {task.blocked_reason && <section><h3>Blocker</h3><p className="task-description">{task.blocked_reason}</p></section>}
        <section aria-label="Task actions"><h3>Assignment & progress</h3>
          <TasksView key={task.id} detailOnly tasks={[task]} projects={projects} people={people} profileId={profileId} role={role} updateTask={updateTask} notify={notify} onRefresh={onRefresh}/>
          {role !== "Team Member" && task.state === "In Review" && <div className="task-side-review">
            <button className="studio-button studio-button--primary" disabled={reviewing} onClick={() => void review("Completed")}>Approve</button>
            <button className="studio-button" disabled={reviewing} onClick={() => void review("Open")}>Request changes</button>
          </div>}
          {task.state === "In Review" && role === "Team Member" && <p className="studio-meta mt-3">Submitted for review. You’ll be notified when it is reviewed.</p>}
        </section>
        <section aria-label="Recent task activity"><h3><MessageSquare size={16}/>Recent activity</h3>
          {loading ? <p role="status" className="studio-meta">Loading activity…</p> : error ? <div><p role="alert" className="studio-meta">Could not load task activity.</p><button className="studio-button mt-3" onClick={() => setRetry(value => value + 1)}>Try again</button></div> : !activity.length ? <p className="studio-meta">No updates recorded yet.</p> : <ol className="task-activity-list">{activity.map(item => {
            let notes = item.body;
            let detail = "";
            try { const entry = JSON.parse(item.body); notes = typeof entry.notes === "string" ? entry.notes : item.body; detail = [typeof entry.completionPct === "number" ? `${entry.completionPct}% completion` : null, typeof entry.hoursSpent === "number" ? `${entry.hoursSpent}h logged` : null, typeof entry.blocker === "string" && entry.blocker ? `Blocker: ${entry.blocker}` : null].filter(Boolean).join(" · "); } catch { /* Plain-text comment. */ }
            return <li key={item.id}><div><strong>{people.find(person => person.id === item.author_id)?.name || "Team member"}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</time></div><p>{notes}</p>{detail && <p className="studio-meta">{detail}</p>}</li>;
          })}</ol>}
        </section>
      </div>
    </div>
  </Modal>;
}
