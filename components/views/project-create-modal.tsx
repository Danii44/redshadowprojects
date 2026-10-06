import { Modal } from "@/components/ui/modal";
import React from "react";
import { X } from "lucide-react";
import type { User } from "@/lib/types";

export interface ProjectCreateFormState {
  name: string;
  code: string;
  client: string;
  type: string;
  projectType: "fixed_deadline" | "hourly_ongoing";
  leaderId: string;
  startDate: string;
  deadlineDate: string;
  deadlineTime: string;
  priority: string;
  description: string;
  requirements: string;
  selectedMembers: string[];
}

interface ProjectCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  projectForm: ProjectCreateFormState;
  setProjectForm: React.Dispatch<React.SetStateAction<ProjectCreateFormState>>;
  dynamicCategories: string[];
  isCustomCategory: boolean;
  setIsCustomCategory: (value: boolean) => void;
  customCategoryInput: string;
  setCustomCategoryInput: (value: string) => void;
  people: User[];
  savingProject: boolean;
}

export function ProjectCreateModal({
  open,
  onClose,
  onSubmit,
  projectForm,
  setProjectForm,
  dynamicCategories,
  isCustomCategory,
  setIsCustomCategory,
  customCategoryInput,
  setCustomCategoryInput,
  people,
  savingProject,
}: ProjectCreateModalProps) {
  if (!open) return null;

  return (
    <Modal title="Create new project" onClose={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Create New Project
            </h2>
            <p className="text-xs font-semibold text-muted-foreground">
              Add a new project to your engineering portfolio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new project"
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project Category *
              {isCustomCategory ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="Enter custom category..."
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border px-3 text-sm font-semibold outline-none focus:border-red focus:ring-4 focus:ring-red-border text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false);
                      setProjectForm((current) => ({
                        ...current,
                        type: dynamicCategories[0] || "DFM / Sheet Metal",
                      }));
                    }}
                    className="h-11 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl border border-border bg-subtle hover:bg-muted cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  value={dynamicCategories.includes(projectForm.type) ? projectForm.type : "__custom__"}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomCategory(true);
                      setCustomCategoryInput("");
                    } else {
                      setIsCustomCategory(false);
                      setProjectForm((current) => ({ ...current, type: e.target.value }));
                    }
                  }}
                  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-red focus:ring-4 focus:ring-red-border text-foreground cursor-pointer"
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

            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project Name *
              <input
                type="text"
                required
                placeholder="e.g. Enclosure Redesign"
                value={projectForm.name}
                onChange={(e) =>
                  setProjectForm((current) => ({ ...current, name: e.target.value }))
                }
                className="mt-1.5 h-11 w-full rounded-xl border border-border px-3 text-sm font-semibold outline-none focus:border-red focus:ring-4 focus:ring-red-border text-foreground"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Client Name
              <input
                type="text"
                placeholder="e.g. Acme Industries"
                value={projectForm.client}
                onChange={(e) =>
                  setProjectForm((current) => ({ ...current, client: e.target.value }))
                }
                className="mt-1.5 h-11 w-full rounded-xl border border-border px-3 text-sm font-semibold outline-none focus:border-red focus:ring-4 focus:ring-red-border text-foreground"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project Leader
              <select
                value={projectForm.leaderId}
                onChange={(e) =>
                  setProjectForm((current) => ({
                    ...current,
                    leaderId: e.target.value,
                  }))
                }
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-red focus:ring-4 focus:ring-red-border text-foreground cursor-pointer"
              >
                <option value="">Select Leader...</option>
                {people
                  .filter((p) => p.role === "admin" || p.role === "project_leader")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Priority
              <select
                value={projectForm.priority}
                onChange={(e) =>
                  setProjectForm((current) => ({
                    ...current,
                    priority: e.target.value,
                  }))
                }
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-red focus:ring-4 focus:ring-red-border text-foreground cursor-pointer"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>

            <div className="col-span-full">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1.5">
                Project Mode / Delivery Type *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setProjectForm((current) => ({
                      ...current,
                      projectType: "fixed_deadline",
                    }))
                  }
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left cursor-pointer transition ${projectForm.projectType === "fixed_deadline"
                    ? "border-red bg-red-soft text-foreground ring-2 ring-red-border"
                    : "border-border bg-card text-secondary-foreground hover:bg-subtle"
                    }`}
                >
                  <span className="text-xs font-semibold">Fixed Deadline</span>
                  <span className="text-xs text-muted-foreground font-semibold">Strict target delivery date required</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setProjectForm((current) => ({
                      ...current,
                      projectType: "hourly_ongoing",
                      deadlineDate: "",
                    }))
                  }
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left cursor-pointer transition ${projectForm.projectType === "hourly_ongoing"
                    ? "border-red bg-red-soft text-foreground ring-2 ring-red-border"
                    : "border-border bg-card text-secondary-foreground hover:bg-subtle"
                    }`}
                >
                  <span className="text-xs font-semibold">Hourly / Ongoing</span>
                  <span className="text-xs text-muted-foreground font-semibold">Continuous retainer, no fixed deadline</span>
                </button>
              </div>
            </div>

            {projectForm.projectType === "fixed_deadline" && (
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Deadline Date *
                <input
                  type="date"
                  required={projectForm.projectType === "fixed_deadline"}
                  value={projectForm.deadlineDate}
                  onChange={(e) =>
                    setProjectForm((current) => ({
                      ...current,
                      deadlineDate: e.target.value,
                    }))
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border px-3 text-sm font-semibold outline-none focus:border-red focus:ring-4 focus:ring-red-border text-foreground"
                />
              </label>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Assigned Team Members
            </label>
            <div className="grid gap-2 sm:grid-cols-2 max-h-40 overflow-y-auto rounded-xl border border-border p-3 bg-subtle">
              {people.map((person) => {
                const checked = projectForm.selectedMembers.includes(person.id);
                return (
                  <label
                    key={person.id}
                    className={`flex items-center gap-2.5 rounded-lg border p-2 text-xs font-semibold cursor-pointer transition ${checked
                      ? "border-red-border bg-red-soft text-foreground"
                      : "border-border bg-card text-secondary-foreground hover:bg-muted"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...projectForm.selectedMembers, person.id]
                          : projectForm.selectedMembers.filter((id) => id !== person.id);
                        setProjectForm((current) => ({
                          ...current,
                          selectedMembers: next,
                        }));
                      }}
                      className="h-4 w-4 rounded border-border text-red focus:ring-red cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-base font-semibold text-foreground">{person.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{person.role}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-border px-5 text-sm font-semibold text-foreground hover:bg-subtle cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingProject}
              className="h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-on-strong hover:bg-red-strong disabled:opacity-60 transition cursor-pointer"
            >
              {savingProject ? "Saving..." : "Save Project"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
