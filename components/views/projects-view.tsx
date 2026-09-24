import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  Calendar,
  Check,
  Clock,
  Edit2,
  Eye,
  Grid,
  List,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { PROJECT_STATUSES } from "@/lib/constants";
import type { Project, ProjectStatus, Role, User } from "@/lib/types";
import {
  calculateTimeLeft,
  canEdit,
  getInitials,
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
  initialProjectId?: string | null;
  onClearInitialProject?: () => void;
}

const DEFAULT_CATEGORIES = [
  "DFM",
  "Feasibility Report",
  "Design Review",
  "Conceptual Design",
  "3D Printing",
  "Analysis",
  "Animation",
  "Render",
  "Technical Design",
];

export function ProjectsView({
  projects,
  role,
  people,
  profileId,
  notify,
  onRefresh,
  initialProjectId,
  onClearInitialProject,
}: ProjectsViewProps) {
  const dynamicCategories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...projects
        .map((p) => p.type)
        .filter((t): t is string => Boolean(t && t.trim())),
    ]),
  );

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  const [isEditCustomCategory, setIsEditCustomCategory] = useState(false);
  const [editCustomCategoryInput, setEditCustomCategoryInput] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    ProjectStatus | "active" | "all"
  >("active");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    | "status_workflow"
    | "deadline_asc"
    | "deadline_desc"
    | "name_asc"
    | "name_desc"
    | "priority"
    | "code"
  >("status_workflow");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal / Drawer state
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "edit">("overview");
  const [creating, setCreating] = useState(false);

  // Form states
  const [projectForm, setProjectForm] = useState({
    name: "",
    code: "",
    client: "",
    type: "DFM / Sheet Metal",
    projectType: "fixed_deadline" as "fixed_deadline" | "hourly_ongoing",
    leaderId: "",
    startDate: new Date().toISOString().slice(0, 10),
    deadlineDate: "",
    deadlineTime: "17:00",
    priority: "normal",
    description: "",
    requirements: "",
    selectedMembers: [] as string[],
  });

  const [savingProject, setSavingProject] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    client: "",
    type: "",
    project_type: "fixed_deadline",
    deadline: "",
    priority: "normal",
    status: "open",
    description: "",
    requirements: "",
    internal_notes: "",
  });

  const handleOpenDetail = (p: Project, tab: "overview" | "edit" = "overview") => {
    setActiveProject(p);
    setDrawerTab(tab);
    setIsEditCustomCategory(false);
    setEditCustomCategoryInput("");
    setEditForm({
      name: p.name || "",
      client: p.client || "",
      type: p.type || "Product Design",
      project_type: (p.project_type as any) || "fixed_deadline",
      deadline: p.deadline ? p.deadline.slice(0, 10) : "",
      priority: p.priority ? p.priority.toLowerCase() : "normal",
      status: normalizeProjectStatus(p.status),
      description: p.description || "",
      requirements: p.requirements || "",
      internal_notes: p.internal_notes || "",
    });
  };

  useEffect(() => {
    if (initialProjectId) {
      const target = projects.find((p) => p.id === initialProjectId);
      if (target) {
        handleOpenDetail(target, "overview");
      }
      onClearInitialProject?.();
    }
  }, [initialProjectId, projects]);

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

    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query) ||
      (p.client ?? "").toLowerCase().includes(query) ||
      (p.leader ?? "").toLowerCase().includes(query);

    return matchesStatus && matchesQuery;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === "status_workflow") {
      const statusOrder: Record<string, number> = {
        open: 1,
        in_progress: 2,
        in_review: 3,
        revisions: 4,
        on_hold: 5,
        delivered: 6,
        closed: 7,
        cancelled: 8,
      };
      const rankA = statusOrder[normalizeProjectStatus(a.status)] ?? 99;
      const rankB = statusOrder[normalizeProjectStatus(b.status)] ?? 99;
      if (rankA !== rankB) return rankA - rankB;

      // Secondary tie-breaker by deadline (soonest first)
      const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return timeA - timeB;
    }
    if (sortBy === "deadline_asc") {
      const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return timeA - timeB;
    }
    if (sortBy === "deadline_desc") {
      const timeA = a.deadline ? new Date(a.deadline).getTime() : -Infinity;
      const timeB = b.deadline ? new Date(b.deadline).getTime() : -Infinity;
      return timeB - timeA;
    }
    if (sortBy === "name_asc") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "name_desc") {
      return b.name.localeCompare(a.name);
    }
    if (sortBy === "priority") {
      const priorityOrder: Record<string, number> = {
        critical: 3,
        high: 2,
        normal: 1,
      };
      const rankA = priorityOrder[a.priority?.toLowerCase() ?? "normal"] ?? 1;
      const rankB = priorityOrder[b.priority?.toLowerCase() ?? "normal"] ?? 1;
      return rankB - rankA;
    }
    if (sortBy === "code") {
      return a.code.localeCompare(b.code);
    }
    return 0;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedProjects.map((p) => p.id)));
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

  const handleOpenCreateModal = () => {
    setIsCustomCategory(false);
    setCustomCategoryInput("");
    setProjectForm({
      name: "",
      code: "",
      client: "",
      type: dynamicCategories[0] || "DFM / Sheet Metal",
      projectType: "fixed_deadline",
      leaderId: "",
      startDate: new Date().toISOString().slice(0, 10),
      deadlineDate: "",
      deadlineTime: "17:00",
      priority: "normal",
      description: "",
      requirements: "",
      selectedMembers: [],
    });
    setCreating(true);
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSavingProject(true);

    const code = `FDI-T${Math.floor(100 + Math.random() * 900)}`;

    const deadline = projectForm.deadlineDate
      ? new Date(
        `${projectForm.deadlineDate}T${projectForm.deadlineTime || "17:00"}:00`,
      ).toISOString()
      : null;

    const leaderId = projectForm.leaderId || profileId;

    const finalType = isCustomCategory
      ? customCategoryInput.trim() || "DFM / Sheet Metal"
      : projectForm.type || "DFM / Sheet Metal";

    const payload: Record<string, any> = {
      name: projectForm.name,
      code,
      client: projectForm.client || null,
      type: finalType,
      project_type: projectForm.projectType,
      description: projectForm.description || null,
      requirements: projectForm.requirements || null,
      leader_id: leaderId,
      start_date: new Date().toISOString(),
      deadline,
      priority: projectForm.priority,
      status: "open",
    };

    let { data: newProject, error } = await supabase
      .from("projects")
      .insert(payload)
      .select("id")
      .single();

    // Fallback: If 'type' or 'created_by' column does not exist in Supabase schema cache, retry without unknown columns
    if (error && (error.message.includes("'type'") || error.message.includes("schema cache"))) {
      delete payload.type;
      delete payload.created_by;
      const res = await supabase
        .from("projects")
        .insert(payload)
        .select("id")
        .single();
      newProject = res.data;
      error = res.error;
    }

    setSavingProject(false);
    if (error || !newProject) return notify(`Failed to create project: ${error?.message || "Unknown error"}`);

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

    // Insert leader and selected team members into project_members
    const memberIds = Array.from(
      new Set([...projectForm.selectedMembers, leaderId]),
    ).filter(Boolean);

    if (memberIds.length) {
      await supabase.from("project_members").insert(
        memberIds.map((userId) => ({
          project_id: newProject.id,
          user_id: userId,
          project_role: userId === leaderId ? "Leader" : "Member",
        })),
      );
    }

    setCreating(false);
    setIsCustomCategory(false);
    setCustomCategoryInput("");
    setProjectForm({
      name: "",
      code: "",
      client: "",
      type: "DFM / Sheet Metal",
      projectType: "fixed_deadline",
      leaderId: "",
      startDate: new Date().toISOString().slice(0, 10),
      deadlineDate: "",
      deadlineTime: "17:00",
      priority: "normal",
      description: "",
      requirements: "",
      selectedMembers: [],
    });

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

    const finalType = isEditCustomCategory
      ? editCustomCategoryInput.trim() || editForm.type
      : editForm.type;

    const updatePayload: Record<string, any> = {
      name: editForm.name,
      client: editForm.client || null,
      type: finalType || null,
      deadline,
      priority: editForm.priority,
      status: editForm.status,
      description: editForm.description || null,
      requirements: editForm.requirements || null,
      internal_notes: editForm.internal_notes || null,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from("projects")
      .update(updatePayload)
      .eq("id", activeProject.id);

    // Fallback: If 'type' column is missing in Supabase schema cache, retry update without 'type'
    if (error && (error.message.includes("'type'") || error.message.includes("schema cache"))) {
      delete updatePayload.type;
      const res = await supabase
        .from("projects")
        .update(updatePayload)
        .eq("id", activeProject.id);
      error = res.error;
    }

    setSavingDetails(false);
    if (error) return notify(error.message);

    setActiveProject({
      ...activeProject,
      name: editForm.name,
      client: editForm.client || null,
      type: editForm.type || null,
      deadline,
      due: deadline ? new Date(deadline).toLocaleDateString() : "No deadline",
      priority: editForm.priority,
      status: editForm.status,
      description: editForm.description || null,
      requirements: editForm.requirements || null,
      internal_notes: editForm.internal_notes || null,
    });

    notify("Project details updated");
    setDrawerTab("overview");
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

  const toggleMemberAssignment = async (
    projectId: string,
    userId: string,
    currentlyAssigned: boolean,
  ) => {
    if (!supabase || !canEdit(role)) return;

    if (currentlyAssigned) {
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (error) return notify(`Failed to remove team member: ${error.message}`);
      notify("Team member removed from project");
    } else {
      const { error } = await supabase.from("project_members").insert({
        project_id: projectId,
        user_id: userId,
        project_role: "Member",
      });

      if (error) return notify(`Failed to add team member: ${error.message}`);
      notify("Team member added to project");
    }

    if (activeProject && activeProject.id === projectId) {
      const existing = activeProject.project_members ?? [];
      const updatedMembers = currentlyAssigned
        ? existing.filter((m) => m.user_id !== userId)
        : [...existing, { id: "", project_id: projectId, user_id: userId }];

      setActiveProject({
        ...activeProject,
        project_members: updatedMembers,
      });
    }

    refresh();
  };

  const changeStatus = async (projectId: string, status: string) => {
    if (!supabase || !canEdit(role)) return;
    const { error } = await supabase
      .from("projects")
      .update({ status })
      .eq("id", projectId);

    if (error) return notify(error.message);

    if (activeProject && activeProject.id === projectId) {
      setActiveProject({ ...activeProject, status });
      setEditForm((prev) => ({ ...prev, status }));
    }

    notify(`Status changed to ${projectStatusLabel(status)}`);
    refresh();
  };

  const deleteProject = async (p: Project) => {
    if (
      !supabase ||
      role !== "Admin" ||
      !window.confirm(`Delete project "${p.name}"?`)
    )
      return;

    const { error } = await supabase.from("projects").delete().eq("id", p.id);
    if (error) return notify(error.message);

    setActiveProject(null);
    notify("Project deleted");
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#e3292f]">
            Engineering Portfolio
          </p>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-black text-slate-900">
            Projects
          </h1>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {canEdit(role)
              ? `Showing ${sortedProjects.length} of ${projects.length} workspace projects`
              : `Showing ${sortedProjects.length} of ${projects.length} assigned projects`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search code, name, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
            />
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 h-10 text-xs font-bold text-slate-700 shadow-2xs">
            <ArrowUpDown size={14} className="text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="status_workflow">Status Workflow (Open → Closed)</option>
              {canEdit(role) && (
                <>
                  <option value="deadline_asc">Due Date (Soonest First)</option>
                  <option value="deadline_desc">Due Date (Furthest First)</option>
                </>
              )}
              <option value="name_asc">Name (A → Z)</option>
              <option value="name_desc">Name (Z → A)</option>
              <option value="priority">Priority (Highest First)</option>
              <option value="code">Project Code</option>
            </select>
          </div>

          {/* List/Grid View Mode */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-lg p-1.5 transition cursor-pointer ${viewMode === "list"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-900"
                }`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-lg p-1.5 transition cursor-pointer ${viewMode === "grid"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-900"
                }`}
            >
              <Grid size={16} />
            </button>
          </div>

          {/* New Project Button */}
          {canEdit(role) && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 rounded-xl bg-[#e3292f] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-red-900/20 hover:bg-red-700 transition cursor-pointer"
            >
              <Plus size={16} />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setStatusFilter("active")}
          className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${statusFilter === "active"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
        >
          Active ({statusCounts.active})
        </button>

        <button
          onClick={() => setStatusFilter("all")}
          className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${statusFilter === "all"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
        >
          All ({statusCounts.all})
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1 shrink-0" />

        {PROJECT_STATUSES.map(([val, label]) => {
          const count = statusCounts[val as keyof typeof statusCounts] ?? 0;
          const active = statusFilter === val;
          return (
            <button
              key={val}
              onClick={() => setStatusFilter(val as ProjectStatus)}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${active
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
            >
              <span className={`h-2 w-2 rounded-full ${projectStatusHighlight(val)}`} />
              {label}
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* LIST VIEW */}
      {viewMode === "list" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <tr>
                  {canEdit(role) && (
                    <th className="py-3.5 pl-4 pr-2 w-10">
                      <input
                        type="checkbox"
                        checked={
                          sortedProjects.length > 0 &&
                          selectedIds.size === sortedProjects.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-[#e3292f] focus:ring-red-400"
                      />
                    </th>
                  )}
                  <th className={`py-3.5 ${canEdit(role) ? "px-3" : "pl-4 pr-3"}`}>Project</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Phase</th>
                  <th className="py-3.5 px-3">Leader</th>
                  <th className="py-3.5 px-3">Team</th>
                  {canEdit(role) && <th className="py-3.5 px-3">Deadline</th>}
                  <th className="py-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {sortedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit(role) ? 8 : 6} className="py-12 text-center text-slate-400">
                      No projects found matching criteria.
                    </td>
                  </tr>
                ) : (
                  sortedProjects.map((p) => {
                    const norm = normalizeProjectStatus(p.status);
                    const selected = selectedIds.has(p.id);
                    const timeLeft = calculateTimeLeft(p.deadline);

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50/80 transition ${selected ? "bg-red-50/30" : ""
                          }`}
                      >
                        {canEdit(role) && (
                          <td className="py-3.5 pl-4 pr-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelectOne(p.id)}
                              className="rounded border-slate-300 text-[#e3292f] focus:ring-red-400"
                            />
                          </td>
                        )}
                        <td className={`py-3.5 ${canEdit(role) ? "px-3" : "pl-4 pr-3"}`}>
                          <button
                            onClick={() => handleOpenDetail(p, "overview")}
                            className="text-left group cursor-pointer"
                          >
                            <span className="font-mono text-[10px] font-bold text-red-600 block">
                              {p.code}
                            </span>
                            <span className="font-bold text-slate-900 group-hover:text-red-600 transition text-sm">
                              {p.name}
                            </span>
                            {p.client && (
                              <span className="text-[11px] text-slate-400 block font-medium">
                                {p.client}
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-3">
                          <Pill color={projectStatusColor(p.status)}>
                            {projectStatusLabel(p.status)}
                          </Pill>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-600">
                          {p.phase}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-900">
                          {p.leader}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex -space-x-1 overflow-hidden">
                            {p.team?.slice(0, 3).map((initials, idx) => (
                              <span
                                key={idx}
                                className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-[8.5px] font-black text-white ring-2 ring-white"
                              >
                                {initials}
                              </span>
                            ))}
                            {(p.team?.length ?? 0) > 3 && (
                              <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[8.5px] font-black text-slate-700 ring-2 ring-white">
                                +{(p.team?.length ?? 0) - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        {canEdit(role) && (
                          <td className="py-3.5 px-3">
                            <div>
                              <span className="text-slate-900 font-bold block">
                                {p.due}
                              </span>
                              <span className={`text-[10px] font-bold ${timeLeft.tone}`}>
                                {timeLeft.label}
                              </span>
                            </div>
                          </td>
                        )}
                        <td className="py-3.5 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenDetail(p, "overview")}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
                              title="View Project"
                            >
                              <Eye size={16} />
                            </button>
                            {canEdit(role) && (
                              <button
                                onClick={() => handleOpenDetail(p, "edit")}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
                                title="Edit Project & Team"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedProjects.map((p) => {
            const timeLeft = calculateTimeLeft(p.deadline);
            return (
              <div
                key={p.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-bold text-red-600">
                      {p.code}
                    </span>
                    <Pill color={projectStatusColor(p.status)}>
                      {projectStatusLabel(p.status)}
                    </Pill>
                  </div>
                  <h3
                    onClick={() => handleOpenDetail(p, "overview")}
                    className="mt-2 text-base font-black text-slate-900 group-hover:text-red-600 transition cursor-pointer"
                  >
                    {p.name}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {p.client ? `Client: ${p.client}` : "Internal Project"}
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">Leader</span>
                    <span className="text-slate-900">{p.leader}</span>
                  </div>
                  {canEdit(role) && (
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400">Deadline</span>
                      <span className={timeLeft.tone}>{p.due}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex -space-x-1">
                      {p.team?.slice(0, 4).map((initials, idx) => (
                        <span
                          key={idx}
                          className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-[8.5px] font-black text-white ring-2 ring-white"
                        >
                          {initials}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenDetail(p, "overview")}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Overview
                      </button>
                      {canEdit(role) && (
                        <button
                          onClick={() => handleOpenDetail(p, "edit")}
                          className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {creating && (
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
                onClick={() => setCreating(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createProject} className="mt-6 space-y-4">
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
                          setProjectForm({ ...projectForm, type: dynamicCategories[0] });
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
                          setProjectForm({ ...projectForm, type: e.target.value });
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
                      setProjectForm({ ...projectForm, name: e.target.value })
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
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900 cursor-pointer"
                  >
                    <option value="">Select Leader...</option>
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
                      onClick={() => setProjectForm({ ...projectForm, projectType: "fixed_deadline" })}
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
                      onClick={() => setProjectForm({ ...projectForm, projectType: "hourly_ongoing", deadlineDate: "" })}
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
                        setProjectForm({
                          ...projectForm,
                          deadlineDate: e.target.value,
                        })
                      }
                      className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 text-slate-900"
                    />
                  </label>
                )}
              </div>

              {/* Assign Team Members Checkboxes */}
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
                            setProjectForm({ ...projectForm, selectedMembers: next });
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
                  onClick={() => setCreating(false)}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={savingProject}
                  className="h-11 rounded-xl bg-[#e3292f] px-6 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60 transition cursor-pointer"
                >
                  {savingProject ? "Saving..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLIDE-OVER DETAIL DRAWER — Tabbed (Overview / Edit) */}
      {activeProject && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs transition-opacity"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveProject(null);
          }}
        >
          <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-start justify-between">
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
                <button
                  onClick={() => setActiveProject(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="mt-5 flex items-center gap-1 rounded-xl bg-slate-200/60 p-1">
                <button
                  onClick={() => setDrawerTab("overview")}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${drawerTab === "overview"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <Eye size={14} />
                  Overview
                </button>
                {canEdit(role) && (
                  <button
                    onClick={() => setDrawerTab("edit")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${drawerTab === "edit"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    <Edit2 size={14} />
                    Edit & Assign Team
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ────── OVERVIEW TAB ────── */}
              {drawerTab === "overview" && (
                <div className="space-y-6">


                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-200 p-3.5">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Priority
                      </p>
                      <p className={`mt-1 font-bold ${activeProject.priority?.toLowerCase() === "critical"
                        ? "text-red-600"
                        : activeProject.priority?.toLowerCase() === "high"
                          ? "text-amber-600"
                          : "text-slate-900"
                        }`}>
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

                    {canEdit(role) && (
                      <div className="rounded-xl border border-slate-200 p-3.5">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Deadline
                        </p>
                        <p className="mt-1 font-bold text-slate-900">
                          {activeProject.due || "No deadline"}
                        </p>
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-200 p-3.5">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Project Leader
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {activeProject.leader || "Unassigned"}
                      </p>
                    </div>
                  </div>

                  {/* Assigned Team Members Section */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center justify-between">
                      <span>Assigned Team Members</span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {(activeProject.project_members?.length ?? 0)} members
                      </span>
                    </h4>

                    {people.filter((person) =>
                      (activeProject.project_members ?? []).some(
                        (m) => m.user_id === person.id,
                      ) || activeProject.leader_id === person.id,
                    ).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                        No team members assigned yet.
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {people
                          .filter((person) =>
                            (activeProject.project_members ?? []).some(
                              (m) => m.user_id === person.id,
                            ) || activeProject.leader_id === person.id,
                          )
                          .map((member) => {
                            const isLeader = activeProject.leader_id === member.id;
                            return (
                              <div
                                key={member.id}
                                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                              >
                                <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-black text-white shrink-0">
                                  {getInitials(member.name)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-900 truncate">
                                    {member.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-semibold">
                                    {isLeader ? "Project Leader" : member.role || "Member"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

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

                  {canEdit(role) && activeProject.internal_notes && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Internal Notes
                      </h4>
                      <p className="text-sm leading-6 text-slate-700 bg-amber-50/60 rounded-xl p-3 border border-amber-200/60">
                        {activeProject.internal_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ────── EDIT TAB ────── */}
              {drawerTab === "edit" && canEdit(role) && (
                <div className="space-y-6">
                  {/* Assigned Team Members Management Card */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-[#e3292f]" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Assigned Team Members
                        </h4>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Auto-syncs to database
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 p-2.5 bg-white">
                      {people.map((person) => {
                        const isLeader = activeProject.leader_id === person.id;
                        const isAssigned =
                          isLeader ||
                          (activeProject.project_members ?? []).some(
                            (m) => m.user_id === person.id,
                          );

                        return (
                          <label
                            key={person.id}
                            className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs font-semibold cursor-pointer transition ${isAssigned
                              ? "border-red-200 bg-red-50/50 text-slate-900"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                              }`}
                          >
                            <input
                              type="checkbox"
                              disabled={isLeader}
                              checked={isAssigned}
                              onChange={() =>
                                toggleMemberAssignment(
                                  activeProject.id,
                                  person.id,
                                  isAssigned,
                                )
                              }
                              className="h-4 w-4 rounded border-slate-300 text-[#e3292f] focus:ring-red-400 cursor-pointer disabled:opacity-50"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold text-slate-900">
                                {person.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold">
                                {isLeader ? "Project Leader" : person.role || "Team Member"}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Project Details Form */}
                  <form onSubmit={updateProjectDetails} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-bold text-slate-500">
                        Project Status
                        <select
                          value={editForm.status}
                          onChange={(e) =>
                            setEditForm({ ...editForm, status: e.target.value })
                          }
                          className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 cursor-pointer"
                        >
                          {PROJECT_STATUSES.map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="text-xs font-bold text-slate-500">
                        Project Name
                        <input
                          required
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
                        />
                      </label>

                      <label className="text-xs font-bold text-slate-500">
                        Client
                        <input
                          value={editForm.client}
                          onChange={(e) =>
                            setEditForm({ ...editForm, client: e.target.value })
                          }
                          className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
                        />
                      </label>

                      <label className="text-xs font-bold text-slate-500">
                        Type / Category
                        {isEditCustomCategory ? (
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="text"
                              autoFocus
                              placeholder="Enter custom category..."
                              value={editCustomCategoryInput}
                              onChange={(e) => setEditCustomCategoryInput(e.target.value)}
                              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditCustomCategory(false);
                              }}
                              className="h-10 px-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer shrink-0"
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
                                setEditForm({ ...editForm, type: e.target.value });
                              }
                            }}
                            className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 cursor-pointer"
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

                      <label className="text-xs font-bold text-slate-500">
                        Project Mode
                        <select
                          value={editForm.project_type}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditForm({
                              ...editForm,
                              project_type: val,
                              deadline: val === "hourly_ongoing" ? "" : editForm.deadline,
                            });
                          }}
                          className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 cursor-pointer"
                        >
                          <option value="fixed_deadline">Fixed Deadline</option>
                          <option value="hourly_ongoing">Hourly / Ongoing</option>
                        </select>
                      </label>

                      {editForm.project_type === "fixed_deadline" && (
                        <label className="text-xs font-bold text-slate-500">
                          <span className="flex items-center justify-between">
                            <span>Deadline</span>
                            {editForm.deadline && (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditForm({ ...editForm, deadline: "" })
                                }
                                className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                              >
                                Clear Deadline
                              </button>
                            )}
                          </span>
                          <input
                            type="date"
                            value={editForm.deadline}
                            onChange={(e) =>
                              setEditForm({ ...editForm, deadline: e.target.value })
                            }
                            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
                          />
                        </label>
                      )}

                      <label className="text-xs font-bold text-slate-500">
                        Priority
                        <select
                          value={editForm.priority}
                          onChange={(e) =>
                            setEditForm({ ...editForm, priority: e.target.value })
                          }
                          className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 cursor-pointer"
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
                        className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
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
                        className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
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
                        className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
                      />
                    </label>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setDrawerTab("overview")}
                        className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={savingDetails}
                        className="h-10 rounded-xl bg-[#e3292f] px-5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60 transition cursor-pointer"
                      >
                        {savingDetails ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            {role === "Admin" && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                <button
                  onClick={() => deleteProject(activeProject)}
                  className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={14} />
                  Delete Project
                </button>

                <span className="text-[10px] font-mono font-semibold text-slate-400">
                  ID: {activeProject.id}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
