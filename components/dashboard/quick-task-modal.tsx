"use client";

import React, { useState } from "react";
import { X, Calendar, UserCheck, Briefcase } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { Project, User } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface QuickTaskModalProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  people: User[];
  profileId: string;
  notify: (message: string) => void;
  onRefresh?: () => void;
}

export function QuickTaskModal({
  open,
  onClose,
  projects,
  people,
  profileId,
  notify,
  onRefresh,
}: QuickTaskModalProps) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"Normal" | "High" | "Urgent">("Normal");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      notify("Please enter a task title.");
      return;
    }

    if (!supabase) {
      notify("Database connection is unavailable.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("tasks").insert([
        {
          title: title.trim(),
          project_id: projectId || null,
          assignee_id: assigneeId || null,
          created_by: profileId || null,
          due_at: deadline ? new Date(deadline).toISOString() : null,
          status: "open",
        },
      ]);

      if (error) {
        notify(`Could not create task: ${error.message}`);
        setSubmitting(false);
        return;
      }

      if (assigneeId && projectId) {
        await supabase.from("project_members").upsert(
          { project_id: projectId, user_id: assigneeId },
          { onConflict: "project_id,user_id" },
        );
      }

      notify("Task created successfully!");
      setTitle("");
      setProjectId("");
      setAssigneeId("");
      setDeadline("");
      setPriority("Normal");
      onRefresh?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create task";
      notify(`Unexpected error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Create new task" onClose={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Quick Task Capture</h2>
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
              Quickly create and assign a task to keep studio work moving.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Run thermal simulation on battery housing"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-subtle px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-red focus:ring-2 focus:ring-red-border"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
                <Briefcase size={13} className="text-muted-foreground" />
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-xl border border-border bg-subtle px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-red focus:ring-2 focus:ring-red-border"
              >
                <option value="">No Project (General Work)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
                <UserCheck size={13} className="text-muted-foreground" />
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-xl border border-border bg-subtle px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-red focus:ring-2 focus:ring-red-border"
              >
                <option value="">Unassigned</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role.replace("_", " ")})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
                <Calendar size={13} className="text-muted-foreground" />
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-border bg-subtle px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-red focus:ring-2 focus:ring-red-border"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "Normal" | "High" | "Urgent")}
                className="w-full rounded-xl border border-border bg-subtle px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-red focus:ring-2 focus:ring-red-border"
              >
                <option value="Normal">Normal Priority</option>
                <option value="High">High Priority</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-secondary-foreground hover:bg-muted transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-strong shadow-xs hover:bg-primary-hover transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
