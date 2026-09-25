import React, { useEffect, useState } from "react";
import { Edit2, Plus, Trash2, Users, X } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import type { Project, Role, Task, User } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface SettingsViewProps {
  people: User[];
  projects?: Project[];
  tasks?: Task[];
  role?: Role;
  notify: (message: string) => void;
  onRefresh?: () => void;
}

const AVATAR_COLORS = [
  "bg-red-500 text-white",
  "bg-violet-600 text-white",
  "bg-sky-500 text-white",
  "bg-amber-500 text-white",
  "bg-emerald-500 text-white",
  "bg-pink-500 text-white",
  "bg-indigo-600 text-white",
  "bg-teal-500 text-white",
];

function getAvatarBg(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getAccessBadge(userRole: string) {
  const norm = userRole.toLowerCase();
  if (norm === "admin") {
    return (
      <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase text-red-700 tracking-wide">
        ADMIN
      </span>
    );
  }
  if (norm === "project_leader" || norm === "leader" || norm === "manager") {
    return (
      <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase text-violet-700 tracking-wide">
        MANAGER
      </span>
    );
  }
  return (
    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500 tracking-wide">
      MEMBER
    </span>
  );
}

function getDisplayRoleTitle(userRole: string): string {
  const norm = userRole.toLowerCase();
  if (norm === "admin") return "Studio Lead / Admin";
  if (norm === "project_leader" || norm === "leader") return "Project Manager";
  return "Team Member";
}

interface TeamRecord {
  id: string;
  name: string;
  leader_id?: string | null;
}

interface TeamMemberRecord {
  id: string;
  team_id: string;
  user_id: string;
}

export function SettingsView({
  people,
  projects = [],
  tasks = [],
  role: currentUserRole = "Admin",
  notify,
  onRefresh,
}: SettingsViewProps) {
  const members = people;
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);

  // Modals
  const [creatingMember, setCreatingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);

  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    role: "team_member",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    role: "team_member",
    active: true,
  });

  const [teamForm, setTeamForm] = useState({ name: "", leaderId: "" });
  const [assignment, setAssignment] = useState({ teamId: "", userId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [createdUserInfo, setCreatedUserInfo] = useState<{
    name: string;
    email: string;
    tempPassword?: string;
  } | null>(null);

  useEffect(() => {
    if (!supabase) return;
    Promise.all([
      supabase.from("teams").select("*"),
      supabase.from("team_members").select("*"),
    ]).then(([teamResult, memberResult]) => {
      setTeams(teamResult.data ?? []);
      setTeamMembers(memberResult.data ?? []);
    });
  }, []);

  const refresh = () => {
    if (onRefresh) onRefresh();
    else window.location.reload();
  };

  // Compute Project and Task counts per member
  const getMemberStats = (memberId: string, memberName: string) => {
    const projectCount = projects.filter(
      (p) =>
        p.leader_id === memberId ||
        p.leader === memberName ||
        p.project_members?.some((m) => m.user_id === memberId),
    ).length;

    const openTaskCount = tasks.filter(
      (t) =>
        (t.assignee_id === memberId || t.owner === memberName) &&
        !["Closed", "Cancelled", "Completed"].includes(t.state),
    ).length;

    return { projectCount, openTaskCount };
  };

  const createMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setCreatedUserInfo(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session?.access_token}`,
      },
      body: JSON.stringify(memberForm),
    });

    const result = (await response.json()) as {
      error?: string;
      tempPassword?: string;
      user?: User;
    };
    setSubmitting(false);

    if (!response.ok) {
      return notify(result.error || "Could not create user");
    }

    const tempPassword =
      result.tempPassword ||
      "TempPass" + Math.floor(1000 + Math.random() * 9000);

    setCreatedUserInfo({
      name: memberForm.name,
      email: memberForm.email,
      tempPassword,
    });

    setMemberForm({ name: "", email: "", role: "team_member" });
    notify("Member added successfully");
    setCreatingMember(false);
    refresh();
  };

  const updateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !editingMember) return;

    const { error } = await supabase
      .from("users")
      .update({
        name: editForm.name,
        role: editForm.role,
        active: editForm.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingMember.id);

    if (error) return notify(error.message);
    setEditingMember(null);
    notify("Member updated");
    refresh();
  };

  const removeMember = async (member: User) => {
    if (
      !supabase ||
      !window.confirm(
        `Remove ${member.name}'s login and company access?`,
      )
    )
      return;

    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session?.access_token}`,
      },
      body: JSON.stringify({ profileId: member.id }),
    });

    const result = (await response.json()) as { error?: string };
    if (!response.ok) return notify(result.error || "Could not remove member");

    notify("Member access removed");
    refresh();
  };

  const createTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const { data, error } = await supabase
      .from("teams")
      .insert({
        name: teamForm.name,
        leader_id: teamForm.leaderId || null,
      })
      .select()
      .single();

    if (error) return notify(error.message);

    setTeams((items) => [...items, data]);
    setTeamForm({ name: "", leaderId: "" });
    notify("Team created");
  };

  const addTeamMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const { data, error } = await supabase
      .from("team_members")
      .insert({
        team_id: assignment.teamId,
        user_id: assignment.userId,
      })
      .select()
      .single();

    if (error) return notify(error.message);

    setTeamMembers((items) => [...items, data]);
    notify("Member added to team");
  };

  const removeFromTeam = async (membership: { id: string }) => {
    if (!supabase) return;

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", membership.id);

    if (error) return notify(error.message);

    setTeamMembers((items) => items.filter((item) => item.id !== membership.id));
    notify("Member removed from team");
  };

  const deleteTeam = async (team: { id: string; name: string }) => {
    if (!supabase || !window.confirm(`Delete team ${team.name}?`)) return;

    const { error } = await supabase.from("teams").delete().eq("id", team.id);
    if (error) return notify(error.message);

    setTeams((items) => items.filter((item) => item.id !== team.id));
    setTeamMembers((items) => items.filter((item) => item.team_id !== team.id));
    notify("Team deleted");
  };

  return (
    <div className="space-y-7">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Team
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {members.length} team members
          </p>
        </div>

        {currentUserRole === "Admin" && (
          <button
            onClick={() => setCreatingMember(true)}
            className="flex items-center gap-2 rounded-xl bg-[#e3292f] px-4 py-2.5 text-xs font-black text-white hover:bg-red-700 transition shadow-xs self-start sm:self-auto"
          >
            <Plus size={16} />
            Add Member
          </button>
        )}
      </div>

      {/* Temporary Password Alert banner if recently created */}
      {createdUserInfo && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-xs flex items-start justify-between">
          <div>
            <h3 className="font-black text-base">New Member Credentials Created</h3>
            <p className="mt-1 text-xs font-medium">
              Account created for <strong>{createdUserInfo.name}</strong> ({createdUserInfo.email}).
            </p>
            <div className="mt-2.5 inline-block rounded-xl bg-white px-3.5 py-1.5 border border-emerald-200 font-mono text-xs font-bold">
              Temporary Password: <span className="text-red-600">{createdUserInfo.tempPassword}</span>
            </div>
          </div>
          <button
            onClick={() => setCreatedUserInfo(null)}
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* TEAM MEMBERS TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">NAME</th>
                <th className="py-3.5 px-4">ROLE</th>
                <th className="py-3.5 px-4">ACCESS</th>
                <th className="py-3.5 px-4">EMAIL</th>
                <th className="py-3.5 px-4">PROJECTS</th>
                <th className="py-3.5 px-4">OPEN TASKS</th>
                {currentUserRole === "Admin" && (
                  <th className="py-3.5 px-4 text-right pr-6">ACTIONS</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {members.map((m, idx) => {
                const initials = getInitials(m.name);
                const bgClass = getAvatarBg(idx);
                const stats = getMemberStats(m.id, m.name);

                return (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* NAME */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid h-8 w-8 place-items-center rounded-full font-black text-[10px] shadow-2xs ${bgClass}`}
                        >
                          {initials}
                        </span>
                        <span className="font-black text-slate-900 text-sm">
                          {m.name}
                        </span>
                      </div>
                    </td>

                    {/* ROLE */}
                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {getDisplayRoleTitle(m.role)}
                    </td>

                    {/* ACCESS */}
                    <td className="py-3.5 px-4">{getAccessBadge(m.role)}</td>

                    {/* EMAIL */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {m.email || "No email"}
                    </td>

                    {/* PROJECTS */}
                    <td className="py-3.5 px-4 font-black text-red-600 text-sm">
                      {stats.projectCount}
                    </td>

                    {/* OPEN TASKS */}
                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                      {stats.openTaskCount}
                    </td>

                    {/* ACTIONS */}
                    {currentUserRole === "Admin" && (
                      <td className="py-3.5 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingMember(m);
                              setEditForm({
                                name: m.name,
                                role: m.role,
                                active: m.active,
                              });
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
                            title="Edit member"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            onClick={() => removeMember(m)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                            title="Remove member"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {!members.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-sm font-semibold text-slate-400"
                  >
                    No team members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GROUPS / TEAMS MANAGEMENT SECTION */}
      {currentUserRole === "Admin" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Users size={18} className="text-slate-700" />
            <h2 className="text-lg font-black text-slate-900">
              Department Teams
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Create Team Form */}
            <form onSubmit={createTeam} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Create Team
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  required
                  placeholder="Team Name (e.g. CAD Team)"
                  value={teamForm.name}
                  onChange={(e) =>
                    setTeamForm({ ...teamForm, name: e.target.value })
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-red-400"
                />
                <select
                  value={teamForm.leaderId}
                  onChange={(e) =>
                    setTeamForm({ ...teamForm, leaderId: e.target.value })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-red-400"
                >
                  <option value="">Select Team Leader</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className="h-9 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 transition">
                Create Team
              </button>
            </form>

            {/* Add Member to Team */}
            <form onSubmit={addTeamMember} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Assign Member to Team
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  required
                  value={assignment.teamId}
                  onChange={(e) =>
                    setAssignment({ ...assignment, teamId: e.target.value })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-red-400"
                >
                  <option value="">Select Team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={assignment.userId}
                  onChange={(e) =>
                    setAssignment({ ...assignment, userId: e.target.value })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-red-400"
                >
                  <option value="">Select Member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className="h-9 rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
                Assign Member
              </button>
            </form>
          </div>

          {/* Teams List */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-xl border border-slate-200 p-4 bg-slate-50/50"
              >
                <div className="flex items-center justify-between">
                  <p className="font-black text-slate-900 text-sm">
                    {team.name}
                  </p>
                  <button
                    onClick={() => deleteTeam(team)}
                    className="text-[11px] font-bold text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Leader:{" "}
                  {members.find((m) => m.id === team.leader_id)?.name ||
                    "Unassigned"}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {teamMembers
                    .filter((item) => item.team_id === team.id)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => removeFromTeam(item)}
                        title="Remove from team"
                      >
                        <Pill>
                          {members.find((m) => m.id === item.user_id)?.name ||
                            "Member"}{" "}
                          ×
                        </Pill>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CREATE MEMBER MODAL */}
      {creatingMember && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-bold uppercase text-red-600">
                  New Account
                </p>
                <h2 className="text-xl font-black text-slate-900">
                  Add Team Member
                </h2>
              </div>
              <button
                onClick={() => setCreatingMember(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createMember} className="space-y-4">
              <label className="block text-xs font-bold uppercase text-slate-500">
                Full Name *
                <input
                  required
                  placeholder="e.g. Daniyal Ahmad"
                  value={memberForm.name}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, name: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-red-400 text-slate-900"
                />
              </label>

              <label className="block text-xs font-bold uppercase text-slate-500">
                Email Address *
                <input
                  required
                  type="email"
                  placeholder="e.g. daniyal@redshadowdesigns.com"
                  value={memberForm.email}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, email: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-red-400 text-slate-900"
                />
              </label>

              <label className="block text-xs font-bold uppercase text-slate-500">
                Access Level & Role *
                <select
                  value={memberForm.role}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, role: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-400 text-slate-900"
                >
                  <option value="admin">Admin / Studio Lead</option>
                  <option value="project_leader">
                    Project Manager / Leader
                  </option>
                  <option value="team_member">Team Member</option>
                </select>
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setCreatingMember(false)}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="h-10 rounded-xl bg-[#e3292f] px-5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-60 transition"
                >
                  {submitting ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-bold uppercase text-red-600">
                  Manage Access
                </p>
                <h2 className="text-xl font-black text-slate-900">
                  Edit Member
                </h2>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={updateMember} className="space-y-4">
              <label className="block text-xs font-bold uppercase text-slate-500">
                Full Name
                <input
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-red-400 text-slate-900"
                />
              </label>

              <label className="block text-xs font-bold uppercase text-slate-500">
                Access Level
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-400 text-slate-900"
                >
                  <option value="admin">Admin / Studio Lead</option>
                  <option value="project_leader">
                    Project Manager / Leader
                  </option>
                  <option value="team_member">Team Member</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={editForm.active}
                  onChange={(e) =>
                    setEditForm({ ...editForm, active: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#e3292f]"
                />
                Active Account Status
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button className="h-10 rounded-xl bg-slate-900 px-5 text-xs font-bold text-white hover:bg-slate-800 transition">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
