import React, { useState } from "react";
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Edit2,
  Eye,
  Grid,
  List,
  Plus,
  PlusCircle,
  Search,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { PROJECT_STATUSES } from "@/lib/constants";
import type { Project, ProjectStatus, Role, User } from "@/lib/types";
import {
  calculateTimeLeft,
  canEdit,
  deadlineTone,
  normalizeProjectStatus,
  projectStatusColor,
  projectStatusHighlight,
  projectStatusLabel,
} from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface ProjectsViewProps {
  projects: Project[];
  role: Role;
  people: User[];
  profileId: string;
  notify: (message: string) => void;
  onRefresh?: () => void;
}

export function ProjectsView({
  projects,
  role,
  people,
  profileId,
  notify,
  onRefresh,
}: ProjectsViewProps) {
  const [statusFilter, setStatusFilter] = useState<
    ProjectStatus | "active" | "all"
  >("active");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal / Drawer state
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form states
  const [projectForm, setProjectForm] = useState({
    name: "",
    code: "",
    client: "",
    type: "DFM / Sheet Metal",
    leaderId: "",
    startDate: new Date().toISOString().slice(0, 10),
    deadlineDate: "",
    deadlineTime: "17:00",
    priority: "normal",
    description: "",
    requirements: "",
  });

  const [savingProject, setSavingProject] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [savingPhase, setSavingPhase] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    client: "",
    type: "",
    deadline: "",
    priority: "normal",
    description: "",
    requirements: "",
    internal_notes: "",
  });

  const handleOpenDetail = (p: Project, edit: boolean = false) => {
    setActiveProject(p);
    setIsEditing(edit);
    setEditForm({
      name: p.name || "",
      client: p.client || "",
      type: p.type || "Product Design",
      deadline: p.deadline ? p.deadline.slice(0, 10) : "",
      priority: p.priority ? p.priority.toLowerCase() : "normal",
      description: p.description || "",
      requirements: p.requirements || "",
      internal_notes: p.internal_notes || "",
    });
  };

  const statusCounts = {
    active: projects.filter(
      (p) =>
        !["closed", "cancelled"].includes(normalizeProjectStatus(p.status)),
    ).length,
    all: projects.length,
    open: projects.filter((p) => normalizeProjectStatus(p.status) === "open")
      .length,
    in_progress: projects.filter(
      (p) => normalizeProjectStatus(p.status) === "in_progress",
    ).length,
    in_review: projects.filter(
      (p) => normalizeProjectStatus(p.status) === "in_review",
    ).length,
    revisions: projects.filter(
      (p) => normalizeProjectStatus(p.status) === "revisions",
    ).length,
    on_hold: projects.filter(
      (p) => normalizeProjectStatus(p.status) === "on_hold",
    ).length,
    delivered: projects.filter(
      (p) => normalizeProjectStatus(p.status) === "delivered",
    ).length,
    closed: projects.filter(
      (p) => normalizeProjectStatus(p.status) === "closed",
    ).length,
    cancelled: projects.filter(
      (p) => normalizeProjectStatus(p.status) === "cancelled",
    ).length,
  };

  const filteredProjects = projects.filter((p) => {
    const norm = normalizeProjectStatus(p.status);
    const matchesStatus =
      statusFilter === "active"
        ? !["closed", "cancelled"].includes(norm)
        : statusFilter === "all"
        ? true
        : norm === statusFilter;
    const matchesSearch =
      (p.name + (p.code || "") + (p.client || "") + (p.type || ""))
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const refresh = () => {
    if (onRefresh) onRefresh();
    else window.location.reload();
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSavingProject(true);

    const code =
      projectForm.code.trim() ||
      `FDI-T${Math.floor(10 + Math.random() * 90)}`;

    const deadline = projectForm.deadlineDate
      ? new Date(
          `${projectForm.deadlineDate}T${projectForm.deadlineTime || "17:00"}:00`,
        ).toISOString()
      : null;

    const { data: newProject, error } = await supabase
      .from("projects")
      .insert({
        name: projectForm.name,
        code,
        client: projectForm.client || null,
        type: projectForm.type || "DFM / Sheet Metal",
        description: projectForm.description || null,
        requirements: projectForm.requirements || null,
        leader_id: projectForm.leaderId || profileId,
        start_date: projectForm.startDate
          ? new Date(projectForm.startDate).toISOString()
          : new Date().toISOString(),
        deadline,
        priority: projectForm.priority,
        status: "open",
        created_by: profileId,
      })
      .select("id")
      .single();

    setSavingProject(false);
    if (error) return notify(`Failed to create project: ${error.message}`);

    // Create default phases
    const defaultPhases = [
      { name: "Requirements", position: 1, state: "active" },
      { name: "Concept", position: 2, state: "pending" },
      { name: "Detailed Design", position: 3, state: "pending" },
      { name: "Client Review", position: 4, state: "pending" },
      { name: "Final", position: 5, state: "pending" },
    ];

    await supabase.from("project_phases").insert(
      defaultPhases.map((phase) => ({
        project_id: newProject.id,
        ...phase,
      })),
    );

    await supabase.from("project_members").insert({
      project_id: newProject.id,
      user_id: projectForm.leaderId || profileId,
      project_role: "Leader",
    });

    setCreating(false);
    notify("Project created successfully");
    refresh();
  };

  const updateProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !activeProject) return;
    setSavingDetails(true);

    const deadline = editForm.deadline
      ? new Date(`${editForm.deadline}T17:00:00`).toISOString()
      : null;

    const { error } = await supabase
      .from("projects")
      .update({
        name: editForm.name,
        client: editForm.client || null,
        type: editForm.type || null,
        deadline,
        priority: editForm.priority,
        description: editForm.description || null,
        requirements: editForm.requirements || null,
        internal_notes: editForm.internal_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeProject.id);

    setSavingDetails(false);
    if (error) return notify(error.message);
    notify("Project details updated");
    setIsEditing(false);
    refresh();
  };

  const changeLeader = async (projectId: string, leaderId: string) => {
    if (!supabase || role !== "Admin") return;
    const { error } = await supabase
      .from("projects")
      .update({ leader_id: leaderId || null })
      .eq("id", projectId);

    if (error) return notify(error.message);

    if (leaderId) {
      await supabase.from("project_members").upsert(
        {
          project_id: projectId,
          user_id: leaderId,
          project_role: "Leader",
        },
        { onConflict: "project_id,user_id" },
      );
    }

    notify("Project leader updated");
    refresh();
  };

  const changeStatus = async (projectId: string, status: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("projects")
      .update({ status })
      .eq("id", projectId);

    if (error) return notify(error.message);
    notify(`Status changed to ${projectStatusLabel(status)}`);
    refresh();
  };

  const deleteProject = async (p: Project) => {
    if (
      !supabase ||
      role !== "Admin" ||
      !window.confirm(`Are you sure you want to delete "${p.name}"?`)
    )
      return;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", p.id);

    if (error) return notify(error.message);
    if (activeProject?.id === p.id) setActiveProject(null);
    notify("Project deleted");
    refresh();
  };

  const handleSetActivePhase = async (
    project: Project,
    phaseToActivate: { id?: string; name: string; position?: number },
  ) => {
    if (!supabase) return;
    setSavingPhase(true);

    const existingPhases = (project.project_phases ?? []).slice();
    const defaultPhaseNames = [
      "Requirements",
      "Concept",
      "Detailed Design",
      "Client Review",
      "Final",
    ];

    if (existingPhases.length === 0) {
      // Create initial phase records in DB
      const targetIndex = defaultPhaseNames.indexOf(phaseToActivate.name);
      const phasesToInsert = defaultPhaseNames.map((name, idx) => ({
        project_id: project.id,
        name,
        position: idx + 1,
        state:
          idx === (targetIndex >= 0 ? targetIndex : 0)
            ? "active"
            : idx < targetIndex
            ? "completed"
            : "pending",
      }));

      await supabase.from("project_phases").insert(phasesToInsert);
    } else {
      const targetPos =
        phaseToActivate.position ??
        existingPhases.find((p) => p.name === phaseToActivate.name)
          ?.position ??
        1;

      for (const p of existingPhases) {
        let nextState = "pending";
        if (p.id === phaseToActivate.id || p.name === phaseToActivate.name) {
          nextState = "active";
        } else if (p.position < targetPos) {
          nextState = "completed";
        }

        await supabase
          .from("project_phases")
          .update({
            state: nextState,
            started_at:
              nextState === "active" ? new Date().toISOString() : p.started_at,
            completed_at:
              nextState === "completed" ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", p.id);
      }
    }

    setSavingPhase(false);
    notify(`Active phase set to "${phaseToActivate.name}"`);
    refresh();
  };

  const handleAddPhase = async (e: React.FormEvent, project: Project) => {
    e.preventDefault();
    if (!supabase || !newPhaseName.trim() || !canEdit(role)) return;
    setSavingPhase(true);

    const existingPhases = project.project_phases ?? [];
    const maxPos = existingPhases.reduce(
      (max, p) => (p.position > max ? p.position : max),
      0,
    );

    const { error } = await supabase.from("project_phases").insert({
      project_id: project.id,
      name: newPhaseName.trim(),
      position: maxPos + 1,
      state: "pending",
    });

    setSavingPhase(false);
    if (error) return notify(error.message);

    setNewPhaseName("");
    setAddingPhase(false);
    notify(`Phase "${newPhaseName.trim()}" added to project timeline`);
    refresh();
  };

  const handleDeletePhase = async (phaseId: string, phaseName: string) => {
    if (!supabase || !canEdit(role)) return;
    if (!window.confirm(`Delete phase "${phaseName}"?`)) return;

    setSavingPhase(true);
    const { error } = await supabase
      .from("project_phases")
      .delete()
      .eq("id", phaseId);

    setSavingPhase(false);
    if (error) return notify(error.message);
    notify(`Phase "${phaseName}" removed`);
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Actions Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Projects
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {filteredProjects.length} of {projects.length} projects
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "list"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <List size={14} />
              List
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "grid"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Grid size={14} />
              Grid
            </button>
          </div>

          {/* New Project Button */}
          {canEdit(role) && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-xl bg-[#e3292f] px-4 py-2.5 text-xs font-black text-white hover:bg-red-700 transition shadow-xs"
            >
              <Plus size={16} />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Tab Pills */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200/80 pb-3 scrollbar-none">
        {[
          ["active", "Active Projects", statusCounts.active],
          ["all", "All Projects", statusCounts.all],
          ["open", "Open", statusCounts.open],
          ["in_progress", "In Progress", statusCounts.in_progress],
          ["in_review", "In Review", statusCounts.in_review],
          ["revisions", "Revisions", statusCounts.revisions],
          ["on_hold", "On Hold", statusCounts.on_hold],
          ["delivered", "Delivered", statusCounts.delivered],
          ["closed", "Closed", statusCounts.closed],
          ["cancelled", "Cancelled", statusCounts.cancelled],
        ].map(([val, label, count]) => {
          const isActive = statusFilter === val;
          return (
            <button
              key={val}
              onClick={() =>
                setStatusFilter(val as ProjectStatus | "active" | "all")
              }
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                isActive
                  ? "bg-[#e3292f] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              <span>{label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* LIST TABLE VIEW (Matching Reference Design) */}
      {viewMode === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredProjects.length > 0 &&
                        selectedIds.size === filteredProjects.length
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-[#e3292f] focus:ring-red-400"
                    />
                  </th>
                  <th className="py-3.5 px-3">ID</th>
                  <th className="py-3.5 px-3">PROJECT NAME</th>
                  <th className="py-3.5 px-3">ASSIGNED</th>
                  <th className="py-3.5 px-3">STATUS</th>
                  <th className="py-3.5 px-3">TYPE</th>
                  <th className="py-3.5 px-3">START DATE</th>
                  <th className="py-3.5 px-3">DEADLINE</th>
                  <th className="py-3.5 px-3">TIME LEFT</th>
                  <th className="py-3.5 px-3 text-right pr-4">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredProjects.map((p) => {
                  const isSelected = selectedIds.has(p.id);
                  const timeLeft = calculateTimeLeft(p.deadline);
                  const startDateStr = p.start_date
                    ? new Date(p.start_date).toLocaleDateString()
                    : p.created_at
                    ? new Date(p.created_at).toLocaleDateString()
                    : "—";
                  const deadlineStr = p.deadline
                    ? new Date(p.deadline).toLocaleDateString()
                    : "—";

                  return (
                    <tr
                      key={p.id}
                      className={`group hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-red-50/30" : ""
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(p.id)}
                          className="h-4 w-4 rounded border-slate-300 text-[#e3292f] focus:ring-red-400"
                        />
                      </td>

                      {/* Code/ID */}
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-400 group-hover:text-slate-600">
                        {p.code}
                      </td>

                      {/* Project Name & Revision */}
                      <td className="py-3.5 px-3">
                        <button
                          onClick={() => handleOpenDetail(p, false)}
                          className="text-left font-black text-slate-900 hover:text-[#e3292f] transition-colors"
                        >
                          <div>{p.name}</div>
                          {p.revision && p.revision !== "No revision" && (
                            <span className="inline-flex items-center text-[10px] font-bold text-slate-400 mt-0.5">
                              ↳ {p.revision}
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Assigned Team Avatars */}
                      <td className="py-3.5 px-3">
                        <div className="flex -space-x-2 overflow-hidden">
                          {p.team?.slice(0, 3).map((initials, idx) => (
                            <span
                              key={`${initials}-${idx}`}
                              className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-slate-800 text-[9px] font-black text-white shadow-2xs"
                              title={initials}
                            >
                              {initials}
                            </span>
                          ))}
                          {p.team && p.team.length > 3 && (
                            <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-slate-200 text-[9px] font-black text-slate-600">
                              +{p.team.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Pill */}
                      <td className="py-3.5 px-3">
                        <Pill color={projectStatusColor(p.status)}>
                          {projectStatusLabel(p.status)}
                        </Pill>
                      </td>

                      {/* Type / Category */}
                      <td className="py-3.5 px-3 font-semibold text-slate-500">
                        {p.type || "Product Design"}
                      </td>

                      {/* Start Date */}
                      <td className="py-3.5 px-3 text-slate-500">
                        {startDateStr}
                      </td>

                      {/* Deadline */}
                      <td className="py-3.5 px-3 font-semibold text-slate-800">
                        {deadlineStr}
                      </td>

                      {/* Time Left */}
                      <td className={`py-3.5 px-3 ${timeLeft.tone}`}>
                        {timeLeft.label}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(p, false)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
                            title="View details"
                          >
                            <Eye size={15} />
                          </button>

                          {canEdit(role) && (
                            <button
                              onClick={() => handleOpenDetail(p, true)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
                              title="Edit project"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}

                          {role === "Admin" && (
                            <button
                              onClick={() => deleteProject(p)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                              title="Delete project"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filteredProjects.length && (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-12 text-center text-sm font-semibold text-slate-400"
                    >
                      No projects match your filter or search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARD VIEW */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map((p) => {
            const timeLeft = calculateTimeLeft(p.deadline);
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {p.code}
                    </span>
                    <Pill color={projectStatusColor(p.status)}>
                      {projectStatusLabel(p.status)}
                    </Pill>
                  </div>
                  <h3 className="mt-3 font-black text-slate-900 text-base">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {p.type || "Product Design"}
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Deadline
                    </p>
                    <p className={`mt-0.5 font-bold ${timeLeft.tone}`}>
                      {timeLeft.label}
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenDetail(p, false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW PROJECT MODAL */}
      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                  New Record
                </p>
                <h2 className="text-2xl font-black text-slate-900">
                  Create Project
                </h2>
              </div>
              <button
                onClick={() => setCreating(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createProject} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Project Name *
                  <input
                    required
                    placeholder="e.g. DFM - Faucet"
                    value={projectForm.name}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, name: e.target.value })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                  />
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Project Code / ID
                  <input
                    placeholder="Auto (e.g. FDI-T9)"
                    value={projectForm.code}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, code: e.target.value })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                  />
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Type / Category
                  <select
                    value={projectForm.type}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, type: e.target.value })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                  >
                    <option value="DFM / Sheet Metal">DFM / Sheet Metal</option>
                    <option value="Product Design">Product Design</option>
                    <option value="3D Print Design">3D Print Design</option>
                    <option value="Concept Design">Concept Design</option>
                    <option value="Animation">Animation</option>
                  </select>
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Client
                  <input
                    placeholder="e.g. Apex Robotics"
                    value={projectForm.client}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, client: e.target.value })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                  />
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Project Leader
                  <select
                    value={projectForm.leaderId}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        leaderId: e.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                  >
                    <option value="">Select leader</option>
                    {people
                      .filter(
                        (p) => p.role === "admin" || p.role === "project_leader",
                      )
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
                      setProjectForm({
                        ...projectForm,
                        priority: e.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Start Date
                  <input
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, startDate: e.target.value })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                  />
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Deadline Date
                  <input
                    type="date"
                    value={projectForm.deadlineDate}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        deadlineDate: e.target.value,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                  />
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 md:col-span-2">
                  Description
                  <textarea
                    rows={2}
                    placeholder="Project goals and deliverables..."
                    value={projectForm.description}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        description: e.target.value,
                      })
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                  />
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 md:col-span-2">
                  Requirements & Notes
                  <textarea
                    rows={2}
                    placeholder="Key specifications, client constraints..."
                    value={projectForm.requirements}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        requirements: e.target.value,
                      })
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  disabled={savingProject}
                  className="h-11 rounded-xl bg-[#e3292f] px-6 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60 transition"
                >
                  {savingProject ? "Saving..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLIDE-OVER DETAIL / EDIT DRAWER */}
      {activeProject && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs transition-opacity"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveProject(null);
          }}
        >
          <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
              <div>
                <span className="font-mono text-xs font-bold text-red-600">
                  {activeProject.code}
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  {activeProject.name}
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Led by {activeProject.leader || "Unassigned"} ·{" "}
                  {activeProject.client || "Internal"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canEdit(role) && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <Edit2 size={14} />
                    {isEditing ? "View" : "Edit"}
                  </button>
                )}
                <button
                  onClick={() => setActiveProject(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status & Quick Change */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Current Status
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Pill color={projectStatusColor(activeProject.status)}>
                      {projectStatusLabel(activeProject.status)}
                    </Pill>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-500">
                    Change Status:
                  </label>
                  {canEdit(role) ? (
                    <select
                      value={normalizeProjectStatus(activeProject.status)}
                      onChange={(e) =>
                        changeStatus(activeProject.id, e.target.value)
                      }
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-red-400 cursor-pointer"
                    >
                      {PROJECT_STATUSES.map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 italic">
                      (Managed by Leader)
                    </span>
                  )}
                </div>
              </div>

              {/* EDIT FORM MODE */}
              {isEditing ? (
                <form onSubmit={updateProjectDetails} className="space-y-4">
                  <h3 className="font-black text-slate-900 border-b border-slate-100 pb-2">
                    Edit Details
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold text-slate-500">
                      Project Name
                      <input
                        required
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900"
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-500">
                      Client
                      <input
                        value={editForm.client}
                        onChange={(e) =>
                          setEditForm({ ...editForm, client: e.target.value })
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900"
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-500">
                      Type / Category
                      <input
                        value={editForm.type}
                        onChange={(e) =>
                          setEditForm({ ...editForm, type: e.target.value })
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900"
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-500">
                      Deadline
                      <input
                        type="date"
                        value={editForm.deadline}
                        onChange={(e) =>
                          setEditForm({ ...editForm, deadline: e.target.value })
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900"
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-500">
                      Priority
                      <select
                        value={editForm.priority}
                        onChange={(e) =>
                          setEditForm({ ...editForm, priority: e.target.value })
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </label>
                  </div>

                  <label className="block text-xs font-bold text-slate-500">
                    Description
                    <textarea
                      rows={3}
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({ ...editForm, description: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-900"
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-500">
                    Requirements
                    <textarea
                      rows={3}
                      value={editForm.requirements}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          requirements: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-900"
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-500">
                    Internal Notes
                    <textarea
                      rows={3}
                      value={editForm.internal_notes}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          internal_notes: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-900"
                    />
                  </label>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={savingDetails}
                      className="h-10 rounded-xl bg-slate-900 px-5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {savingDetails ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              ) : (
                /* READ-ONLY DETAILS VIEW */
                <div className="space-y-6">
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 p-3.5">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Category
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {activeProject.type || "Product Design"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3.5">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Priority
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {activeProject.priority || "Normal"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3.5">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Start Date
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {activeProject.start_date
                          ? new Date(activeProject.start_date).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3.5">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Deadline
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {activeProject.due || "No deadline"}
                      </p>
                    </div>
                  </div>

                  {/* Admin Leader Change */}
                  {role === "Admin" && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <label className="text-xs font-bold text-slate-500">
                        Reassign Project Leader:
                        <select
                          value={activeProject.leader_id ?? ""}
                          onChange={(e) =>
                            changeLeader(activeProject.id, e.target.value)
                          }
                          className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900"
                        >
                          <option value="">Select Leader</option>
                          {people
                            .filter(
                              (p) =>
                                p.role === "admin" || p.role === "project_leader",
                            )
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                  )}

                  {/* Description & Requirements */}
                  {activeProject.description && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Description
                      </h4>
                      <p className="text-sm leading-6 text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        {activeProject.description}
                      </p>
                    </div>
                  )}

                  {activeProject.requirements && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Requirements & Specifications
                      </h4>
                      <p className="text-sm leading-6 text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        {activeProject.requirements}
                      </p>
                    </div>
                  )}

                  {activeProject.internal_notes && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Internal Notes
                      </h4>
                      <p className="text-sm leading-6 text-slate-700 bg-amber-50/60 rounded-xl p-3 border border-amber-200/60">
                        {activeProject.internal_notes}
                      </p>
                    </div>
                  )}

                  {/* Phase Timeline Management */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Phase Timeline
                      </h4>
                      {canEdit(role) && !addingPhase && (
                        <button
                          onClick={() => setAddingPhase(true)}
                          className="flex items-center gap-1 text-xs font-bold text-[#e3292f] hover:underline cursor-pointer"
                        >
                          <PlusCircle size={14} />
                          Add Phase
                        </button>
                      )}
                    </div>

                    {/* Inline Add Phase Form */}
                    {addingPhase && (
                      <form
                        onSubmit={(e) => handleAddPhase(e, activeProject)}
                        className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/50 p-3"
                      >
                        <input
                          required
                          autoFocus
                          placeholder="New phase name (e.g. Prototyping)..."
                          value={newPhaseName}
                          onChange={(e) => setNewPhaseName(e.target.value)}
                          className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-red-400"
                        />
                        <button
                          disabled={savingPhase}
                          className="h-9 rounded-lg bg-[#e3292f] px-3.5 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-60 cursor-pointer"
                        >
                          {savingPhase ? "Adding..." : "Add"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingPhase(false);
                            setNewPhaseName("");
                          }}
                          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </form>
                    )}

                    {/* Phases List */}
                    <div className="space-y-2">
                      {(() => {
                        const rawPhases = activeProject.project_phases ?? [];
                        const displayPhases =
                          rawPhases.length > 0
                            ? [...rawPhases].sort((a, b) => a.position - b.position)
                            : [
                                "Requirements",
                                "Concept",
                                "Detailed Design",
                                "Client Review",
                                "Final",
                              ].map((name, idx) => {
                                const isCurrent = activeProject.phase === name;
                                return {
                                  name,
                                  position: idx + 1,
                                  state: isCurrent
                                    ? "active"
                                    : idx <
                                      [
                                        "Requirements",
                                        "Concept",
                                        "Detailed Design",
                                        "Client Review",
                                        "Final",
                                      ].indexOf(activeProject.phase)
                                    ? "completed"
                                    : "pending",
                                };
                              });

                        return displayPhases.map((phaseItem: any) => {
                          const isCurrent =
                            phaseItem.state === "active" ||
                            (activeProject.phase === phaseItem.name &&
                              !rawPhases.some((p) => p.state === "active"));
                          const isCompleted = phaseItem.state === "completed";

                          return (
                            <div
                              key={phaseItem.id || phaseItem.name}
                              className={`flex items-center justify-between rounded-xl p-3.5 text-xs font-bold border transition ${
                                isCurrent
                                  ? "border-red-300 bg-red-50 text-slate-900 shadow-2xs"
                                  : isCompleted
                                  ? "border-slate-200 bg-slate-50 text-slate-700"
                                  : "border-slate-200 bg-white text-slate-500"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                {isCompleted ? (
                                  <CheckCircle2
                                    size={16}
                                    className="text-emerald-600 shrink-0"
                                  />
                                ) : isCurrent ? (
                                  <span className="relative flex h-3 w-3 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#e3292f]"></span>
                                  </span>
                                ) : (
                                  <Circle
                                    size={15}
                                    className="text-slate-300 shrink-0"
                                  />
                                )}

                                <span
                                  className={`truncate ${
                                    isCurrent ? "font-black text-slate-900 text-sm" : ""
                                  }`}
                                >
                                  {phaseItem.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isCurrent ? (
                                  <span className="rounded-full bg-[#e3292f] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-2xs">
                                    Active Phase
                                  </span>
                                ) : (
                                  <button
                                    disabled={savingPhase}
                                    onClick={() =>
                                      handleSetActivePhase(
                                        activeProject,
                                        phaseItem,
                                      )
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                  >
                                    Set Active
                                  </button>
                                )}

                                {canEdit(role) && phaseItem.id && (
                                  <button
                                    onClick={() =>
                                      handleDeletePhase(
                                        phaseItem.id,
                                        phaseItem.name,
                                      )
                                    }
                                    className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                                    title="Delete phase"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            {role === "Admin" && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                <button
                  onClick={() => deleteProject(activeProject)}
                  className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Delete Project
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
