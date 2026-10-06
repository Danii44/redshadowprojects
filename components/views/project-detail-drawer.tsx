import { Modal } from "@/components/ui/modal";
import React from "react";
import { Edit2, Eye, Trash2, Users, X } from "lucide-react";
import { PROJECT_STATUSES } from "@/lib/constants";
import type { Project, Role, User } from "@/lib/types";
import { canEdit, getInitials } from "@/lib/utils";

export interface ProjectEditFormState {
  name: string;
  client: string;
  type: string;
  project_type: "fixed_deadline" | "hourly_ongoing";
  deadline: string;
  priority: string;
  status: string;
  description: string;
  requirements: string;
  internal_notes: string;
}

interface ProjectDetailDrawerProps {
  project: Project;
  role: Role;
  people: User[];
  drawerTab: "overview" | "edit";
  setDrawerTab: (tab: "overview" | "edit") => void;
  onClose: () => void;
  onDelete: (project: Project) => void;
  onMemberToggle: (projectId: string, userId: string, currentlyAssigned: boolean) => void;
  editForm: ProjectEditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<ProjectEditFormState>>;
  savingDetails: boolean;
  onSubmit: (e: React.FormEvent) => void;
  dynamicCategories: string[];
  isEditCustomCategory: boolean;
  setIsEditCustomCategory: (value: boolean) => void;
  editCustomCategoryInput: string;
  setEditCustomCategoryInput: (value: string) => void;
}

export function ProjectDetailDrawer({
  project,
  role,
  people,
  drawerTab,
  setDrawerTab,
  onClose,
  onDelete,
  onMemberToggle,
  editForm,
  setEditForm,
  savingDetails,
  onSubmit,
  dynamicCategories,
  isEditCustomCategory,
  setIsEditCustomCategory,
  editCustomCategoryInput,
  setEditCustomCategoryInput,
}: ProjectDetailDrawerProps) {
  return (
    <Modal title={project.name} onClose={onClose} drawer>
      <div className="w-full max-w-xl h-full bg-card shadow-2xl flex flex-col ">
        <div className="p-6 border-b border-border bg-subtle">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold text-foreground mt-1">
                {project.name}
              </h2>
              <p className="text-xs font-semibold text-muted-foreground mt-1">
                Led by {project.leader || "Unassigned"} · {project.client || "Internal"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close project details"
              className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-1 rounded-xl bg-border p-1">
            <button
              type="button"
              aria-pressed={drawerTab === "overview"}
              onClick={() => setDrawerTab("overview")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${drawerTab === "overview"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Eye size={14} />
              Overview
            </button>
            {canEdit(role) && (
              <button
                type="button"
                aria-pressed={drawerTab === "edit"}
                onClick={() => setDrawerTab("edit")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${drawerTab === "edit"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Edit2 size={14} />
                Edit & Assign Team
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {drawerTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-border p-3.5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Priority
                  </p>
                  <p className={`mt-1 font-semibold ${project.priority?.toLowerCase() === "critical"
                    ? "text-red"
                    : project.priority?.toLowerCase() === "high"
                      ? "text-amber"
                      : "text-foreground"
                    }`}>
                    {project.priority || "Normal"}
                  </p>
                </div>

                <div className="rounded-xl border border-border p-3.5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Start Date
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {project.start_date
                      ? new Date(project.start_date).toLocaleDateString()
                      : "—"}
                  </p>
                </div>

                {canEdit(role) && (
                  <div className="rounded-xl border border-border p-3.5">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Deadline
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {project.due || "No deadline"}
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-border p-3.5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Project Leader
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {project.leader || "Unassigned"}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3.5 flex items-center justify-between">
                  <span>Assigned Team Members</span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {(project.project_members?.length ?? 0)} members
                  </span>
                </h4>

                {people.filter((person) =>
                  (project.project_members ?? []).some((m) => m.user_id === person.id) || project.leader_id === person.id,
                ).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No team members assigned yet.
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {people
                      .filter((person) =>
                        (project.project_members ?? []).some((m) => m.user_id === person.id) || project.leader_id === person.id,
                      )
                      .map((member) => {
                        const isLeader = project.leader_id === member.id;
                        return (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 rounded-xl border border-border bg-subtle p-3"
                          >
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-strong text-xs font-semibold text-on-strong shrink-0">
                              {getInitials(member.name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-semibold text-foreground break-words">
                                {member.name}
                              </p>
                              <p className="text-xs text-muted-foreground font-semibold">
                                {isLeader ? "Project Leader" : member.role || "Member"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {project.description && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Description
                  </h4>
                  <p className="text-sm leading-6 text-foreground bg-subtle rounded-xl p-3 border border-border">
                    {project.description}
                  </p>
                </div>
              )}

              {project.requirements && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Requirements & Specifications
                  </h4>
                  <p className="text-sm leading-6 text-foreground bg-subtle rounded-xl p-3 border border-border">
                    {project.requirements}
                  </p>
                </div>
              )}

              {canEdit(role) && project.internal_notes && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Internal Notes
                  </h4>
                  <p className="text-sm leading-6 text-foreground bg-amber-soft rounded-xl p-3 border border-amber-border">
                    {project.internal_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {drawerTab === "edit" && canEdit(role) && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-subtle p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-red" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Assigned Team Members
                    </h4>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Auto-syncs to database
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto rounded-xl border border-border p-2.5 bg-card">
                  {people.map((person) => {
                    const isLeader = project.leader_id === person.id;
                    const isAssigned =
                      isLeader || (project.project_members ?? []).some((m) => m.user_id === person.id);

                    return (
                      <label
                        key={person.id}
                        className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs font-semibold cursor-pointer transition ${isAssigned
                          ? "border-red-border bg-red-soft text-foreground"
                          : "border-border bg-card text-secondary-foreground hover:bg-muted"
                          }`}
                      >
                        <input
                          type="checkbox"
                          disabled={isLeader}
                          checked={isAssigned}
                          onChange={() =>
                            onMemberToggle(project.id, person.id, isAssigned)
                          }
                          className="h-4 w-4 rounded border-border text-red focus:ring-red cursor-pointer disabled:opacity-50"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-base font-semibold text-foreground">
                            {person.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-semibold">
                            {isLeader ? "Project Leader" : person.role || "Team Member"}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Project Status
                    <select
                      value={editForm.status}
                      onChange={(e) =>
                        setEditForm((current) => ({ ...current, status: e.target.value }))
                      }
                      className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-red focus:ring-4 focus:ring-red-border cursor-pointer"
                    >
                      {PROJECT_STATUSES.map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-semibold text-muted-foreground">
                    Project Name
                    <input
                      required
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((current) => ({ ...current, name: e.target.value }))
                      }
                      className="mt-1 h-10 w-full rounded-xl border border-border px-3 text-sm font-semibold text-foreground outline-none focus:border-red focus:ring-4 focus:ring-red-border"
                    />
                  </label>

                  <label className="text-xs font-semibold text-muted-foreground">
                    Client
                    <input
                      value={editForm.client}
                      onChange={(e) =>
                        setEditForm((current) => ({ ...current, client: e.target.value }))
                      }
                      className="mt-1 h-10 w-full rounded-xl border border-border px-3 text-sm font-semibold text-foreground outline-none focus:border-red focus:ring-4 focus:ring-red-border"
                    />
                  </label>

                  <label className="text-xs font-semibold text-muted-foreground">
                    Type / Category
                    {isEditCustomCategory ? (
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Enter custom category..."
                          value={editCustomCategoryInput}
                          onChange={(e) => setEditCustomCategoryInput(e.target.value)}
                          className="h-10 w-full rounded-xl border border-border px-3 text-sm font-semibold text-foreground outline-none focus:border-red focus:ring-4 focus:ring-red-border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditCustomCategory(false);
                          }}
                          className="h-10 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl border border-border bg-subtle hover:bg-muted cursor-pointer shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <select
                        value={dynamicCategories.includes(editForm.type) ? editForm.type : "__custom__"}
                        onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setIsEditCustomCategory(true);
                            setEditCustomCategoryInput("");
                          } else {
                            setIsEditCustomCategory(false);
                            setEditForm((current) => ({ ...current, type: e.target.value }));
                          }
                        }}
                        className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-red focus:ring-4 focus:ring-red-border cursor-pointer"
                      >
                        {dynamicCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        <option value="__custom__">+ Add Custom Category...</option>
                      </select>
                    )}
                  </label>

                  <label className="text-xs font-semibold text-muted-foreground">
                    Project Mode
                    <select
                      value={editForm.project_type}
                      onChange={(e) => {
                        const val = e.target.value as "fixed_deadline" | "hourly_ongoing";
                        setEditForm((current) => ({
                          ...current,
                          project_type: val,
                          deadline: val === "hourly_ongoing" ? "" : current.deadline,
                        }));
                      }}
                      className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-red focus:ring-4 focus:ring-red-border cursor-pointer"
                    >
                      <option value="fixed_deadline">Fixed Deadline</option>
                      <option value="hourly_ongoing">Hourly / Ongoing</option>
                    </select>
                  </label>

                  {editForm.project_type === "fixed_deadline" && (
                    <label className="text-xs font-semibold text-muted-foreground">
                      <span className="flex items-center justify-between">
                        <span>Deadline</span>
                        {editForm.deadline && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditForm((current) => ({ ...current, deadline: "" }))
                            }
                            className="text-xs font-semibold text-red hover:underline cursor-pointer"
                          >
                            Clear Deadline
                          </button>
                        )}
                      </span>
                      <input
                        type="date"
                        value={editForm.deadline}
                        onChange={(e) =>
                          setEditForm((current) => ({ ...current, deadline: e.target.value }))
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-border px-3 text-sm font-semibold text-foreground outline-none focus:border-red focus:ring-4 focus:ring-red-border"
                      />
                    </label>
                  )}

                  <label className="text-xs font-semibold text-muted-foreground">
                    Priority
                    <select
                      value={editForm.priority}
                      onChange={(e) =>
                        setEditForm((current) => ({ ...current, priority: e.target.value }))
                      }
                      className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-red focus:ring-4 focus:ring-red-border cursor-pointer"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </label>
                </div>

                <label className="block text-xs font-semibold text-muted-foreground">
                  Description
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((current) => ({ ...current, description: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-border p-3 text-sm font-semibold text-foreground outline-none focus:border-red focus:ring-4 focus:ring-red-border"
                  />
                </label>

                <label className="block text-xs font-semibold text-muted-foreground">
                  Requirements
                  <textarea
                    rows={3}
                    value={editForm.requirements}
                    onChange={(e) =>
                      setEditForm((current) => ({ ...current, requirements: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-border p-3 text-sm font-semibold text-foreground outline-none focus:border-red focus:ring-4 focus:ring-red-border"
                  />
                </label>

                <label className="block text-xs font-semibold text-muted-foreground">
                  Internal Notes
                  <textarea
                    rows={3}
                    value={editForm.internal_notes}
                    onChange={(e) =>
                      setEditForm((current) => ({ ...current, internal_notes: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-border p-3 text-sm font-semibold text-foreground outline-none focus:border-red focus:ring-4 focus:ring-red-border"
                  />
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDrawerTab("overview")}
                    className="h-10 rounded-xl border border-border px-4 text-xs font-semibold hover:bg-subtle cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingDetails}
                    className="h-10 rounded-xl bg-primary px-5 text-xs font-semibold text-on-strong hover:bg-red-strong disabled:opacity-60 transition cursor-pointer"
                  >
                    {savingDetails ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {role === "Admin" && (
          <div className="p-4 border-t border-border bg-subtle flex items-center">
            <button
              type="button"
              onClick={() => onDelete(project)}
              className="text-xs font-semibold text-red hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={14} />
              Delete Project
            </button>

          </div>
        )}
      </div>
    </Modal>
  );
}
