"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { supabase } from "@/lib/supabase";
import type { Role, Task } from "@/lib/types";

function localDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TaskDeadlineEditor({ task, role, notify, onRefresh }: {
  task: Task; role: Role; notify: (message: string) => void; onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (role !== "Admin") return null;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || role !== "Admin") return;
    if (!supabase) { setError("Database connection is unavailable."); return; }
    const date = deadline ? new Date(deadline) : null;
    if (date && !Number.isFinite(date.getTime())) { setError("Enter a valid deadline."); return; }
    setSaving(true);
    setError("");
    try {
      const result = await supabase.from("tasks").update({ due_at: date?.toISOString() ?? null, updated_at: new Date().toISOString() }).eq("id", task.id).select("id").single();
      if (result.error) { setError(result.error.message); return; }
      notify(date ? "Task deadline updated" : "Task deadline removed");
      onRefresh();
      setOpen(false);
    } catch {
      setError("Could not save the deadline. Please try again.");
    } finally { setSaving(false); }
  };

  return <>
    <button type="button" className="studio-button" aria-label={`Change deadline for ${task.title}`}
      onClick={() => { setDeadline(localDateTime(task.due_at)); setError(""); setOpen(true); }}>Change deadline</button>
    {open && <Modal title="Change task deadline" onClose={() => { if (!saving) setOpen(false); }}>
      <form onSubmit={save} className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Change task deadline</h2>
        <p className="text-sm text-muted-foreground">{task.title}</p>
        <label className="block text-sm font-medium">Deadline
          <input type="datetime-local" value={deadline} disabled={saving} onChange={event => setDeadline(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-foreground" />
        </label>
        <p className="text-xs text-muted-foreground">Uses your local time. Clear the field to remove the deadline.</p>
        {error && <p role="alert" className="text-sm text-red">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={saving} className="studio-button" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" disabled={saving} className="studio-button studio-button--primary">{saving ? "Saving..." : "Save deadline"}</button>
        </div>
      </form>
    </Modal>}
  </>;
}
