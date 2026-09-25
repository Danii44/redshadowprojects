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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Create New Project
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Add a new project to your engineering portfolio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
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
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
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
                    className="h-11 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer shrink-0"
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
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900 cursor-pointer"
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

            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Project Name *
              <input
                type="text"
                required
                placeholder="e.g. Enclosure Redesign"
                value={projectForm.name}
                onChange={(e) =>
                  setProjectForm((current) => ({ ...current, name: e.target.value }))
                }
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
              />
            </label>

            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Client Name
              <input
                type="text"
                placeholder="e.g. Acme Industries"
                value={projectForm.client}
                onChange={(e) =>
                  setProjectForm((current) => ({ ...current, client: e.target.value }))
                }
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
              />
            </label>

            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Project Leader
              <select
                value={projectForm.leaderId}
                onChange={(e) =>
                  setProjectForm((current) => ({
                    ...current,
                    leaderId: e.target.value,
                  }))
                }
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900 cursor-pointer"
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

            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Priority
              <select
                value={projectForm.priority}
                onChange={(e) =>
                  setProjectForm((current) => ({
                    ...current,
                    priority: e.target.value,
                  }))
                }
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900 cursor-pointer"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>

            <div className="col-span-full">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500 block mb-1.5">
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
                    ? "border-red-500 bg-red-50/60 text-slate-900 ring-2 ring-red-200"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  <span className="text-xs font-black">📅 Fixed Deadline</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Strict target delivery date required</span>
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
                    ? "border-red-500 bg-red-50/60 text-slate-900 ring-2 ring-red-200"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  <span className="text-xs font-black">⏳ Hourly / Ongoing</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Continuous retainer, no fixed deadline</span>
                </button>
              </div>
            </div>

            {projectForm.projectType === "fixed_deadline" && (
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
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
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                />
              </label>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
              Assigned Team Members
            </label>
            <div className="grid gap-2 sm:grid-cols-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-3 bg-slate-50">
              {people.map((person) => {
                const checked = projectForm.selectedMembers.includes(person.id);
                return (
                  <label
                    key={person.id}
                    className={`flex items-center gap-2.5 rounded-lg border p-2 text-xs font-semibold cursor-pointer transition ${checked
                      ? "border-red-200 bg-red-50/60 text-slate-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
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
                      className="h-4 w-4 rounded border-slate-300 text-[#e3292f] focus:ring-red-400 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900">{person.name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{person.role}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingProject}
              className="h-11 rounded-xl bg-[#e3292f] px-6 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60 transition cursor-pointer"
            >
              {savingProject ? "Saving..." : "Save Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
