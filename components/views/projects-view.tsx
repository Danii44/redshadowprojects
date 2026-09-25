import React, { useEffect, useState } from "react";
import {
  ArrowUpDown,
  Grid,
  List,
  Plus,
  Search,
} from "lucide-react";
import type { Project, ProjectStatus, Role, User } from "@/lib/types";
import { canEdit, normalizeProjectStatus } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { ProjectCreateModal } from "./project-create-modal";
import { ProjectDetailDrawer, type ProjectEditFormState } from "./project-detail-drawer";
import { ProjectGridCard } from "./project-grid-card";
import { ProjectStatusTabs } from "./project-status-tabs";
import { ProjectTableRow } from "./project-table-row";

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

  type ProjectSortMode =
    | "status_workflow"
    | "deadline_asc"
    | "deadline_desc"
    | "name_asc"
    | "name_desc"
    | "priority"
    | "code";

  const [statusFilter, setStatusFilter] = useState<
    ProjectStatus | "active" | "all"
  >("active");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<ProjectSortMode>("status_workflow");
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
  const [editForm, setEditForm] = useState<ProjectEditFormState>({
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
    const projectType =
      p.project_type === "fixed_deadline" || p.project_type === "hourly_ongoing"
        ? p.project_type
        : "fixed_deadline";

    setEditForm({
      name: p.name || "",
      client: p.client || "",
      type: p.type || "Product Design",
      project_type: projectType,
      deadline: p.deadline ? p.deadline.slice(0, 10) : "",
      priority: p.priority ? p.priority.toLowerCase() : "normal",
      status: normalizeProjectStatus(p.status),
      description: p.description || "",
      requirements: p.requirements || "",
      internal_notes: p.internal_notes || "",
    });
  };

  useEffect(() => {
    if (!initialProjectId) return;

    const target = projects.find((p) => p.id === initialProjectId);
    if (!target) {
      onClearInitialProject?.();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      handleOpenDetail(target, "overview");
      onClearInitialProject?.();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialProjectId, onClearInitialProject, projects]);

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
    const normalizedStatus = normalizeProjectStatus(p.status);
    const matchesStatus =
      statusFilter === "active"
        ? !["closed", "cancelled"].includes(normalizedStatus)
        : statusFilter === "all"
          ? true
          : normalizedStatus === statusFilter;

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

    const payload: Record<string, string | number | boolean | null | undefined> = {
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

    const updatePayload: Record<string, string | number | boolean | null | undefined> = {
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
              onChange={(e) => setSortBy(e.target.value as ProjectSortMode)}
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

      <ProjectStatusTabs
        statusCounts={statusCounts}
        statusFilter={statusFilter}
        onChange={setStatusFilter}
      />

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
                  sortedProjects.map((p) => (
                    <ProjectTableRow
                      key={p.id}
                      project={p}
                      selected={selectedIds.has(p.id)}
                      canEditProject={canEdit(role)}
                      onOpenDetail={handleOpenDetail}
                      onToggleSelect={toggleSelectOne}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedProjects.map((p) => (
            <ProjectGridCard
              key={p.id}
              project={p}
              canEditProject={canEdit(role)}
              onOpenDetail={handleOpenDetail}
            />
          ))}
        </div>
      )}

      <ProjectCreateModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={createProject}
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        dynamicCategories={dynamicCategories}
        isCustomCategory={isCustomCategory}
        setIsCustomCategory={setIsCustomCategory}
        customCategoryInput={customCategoryInput}
        setCustomCategoryInput={setCustomCategoryInput}
        people={people}
        savingProject={savingProject}
      />

      {activeProject && (
        <ProjectDetailDrawer
          project={activeProject}
          role={role}
          people={people}
          drawerTab={drawerTab}
          setDrawerTab={setDrawerTab}
          onClose={() => setActiveProject(null)}
          onDelete={deleteProject}
          onMemberToggle={toggleMemberAssignment}
          editForm={editForm}
          setEditForm={setEditForm}
          savingDetails={savingDetails}
          onSubmit={updateProjectDetails}
          dynamicCategories={dynamicCategories}
          isEditCustomCategory={isEditCustomCategory}
          setIsEditCustomCategory={setIsEditCustomCategory}
          editCustomCategoryInput={editCustomCategoryInput}
          setEditCustomCategoryInput={setEditCustomCategoryInput}
        />
      )}
    </div>
  );
}
