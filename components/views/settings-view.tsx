import { Modal } from "@/components/ui/modal";
import React, { useEffect, useState } from "react";
import { Edit2, KeyRound, Plus, Trash2, Users, X } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import type { Project, Role, Task, User } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface SettingsViewProps {
  section?: "Team" | "Settings";
  onOpenTeam?: () => void;
  people: User[];
  projects?: Project[];
  tasks?: Task[];
  role?: Role;
  notify: (message: string) => void;
  onRefresh?: () => void;
}

const AVATAR_COLORS = [
  "bg-red-strong text-on-strong",
  "bg-purple-strong text-on-strong",
  "bg-blue-strong text-on-strong",
  "bg-amber-strong text-on-strong",
  "bg-green-strong text-on-strong",
  "bg-purple-strong text-on-strong",
  "bg-purple-strong text-on-strong",
  "bg-cyan-strong text-on-strong",
];

function getAvatarBg(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getAccessBadge(userRole: string) {
  const norm = userRole.toLowerCase();
  if (norm === "admin") {
    return (
      <span className="rounded-md bg-red-soft px-2 py-0.5 text-xs font-semibold uppercase text-red tracking-wide">
        ADMIN
      </span>
    );
  }
  if (norm === "project_leader" || norm === "leader" || norm === "manager") {
    return (
      <span className="rounded-md bg-purple-soft px-2 py-0.5 text-xs font-semibold uppercase text-purple tracking-wide">
        MANAGER
      </span>
    );
  }
  return (
    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold uppercase text-muted-foreground tracking-wide">
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
  section = "Team",
  onOpenTeam,
  people,
  projects = [],
  tasks = [],
  role: currentUserRole = "Admin",
  notify,
  onRefresh,
}: SettingsViewProps) {
  const members = people;
  const [teamTab, setTeamTab] = useState<"people" | "departments">("people");
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
    email: "",
    role: "team_member",
    active: true,
  });

  const [teamForm, setTeamForm] = useState({ name: "", leaderId: "" });
  const [assignment, setAssignment] = useState({ teamId: "", userId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [resettingMemberId, setResettingMemberId] = useState<string | null>(null);
  const [createdUserInfo, setCreatedUserInfo] = useState<{
    name: string;
    email: string;
    tempPassword?: string;
  } | null>(null);
  const [resetPasswordInfo, setResetPasswordInfo] = useState<{
    name: string;
    email: string | null;
    tempPassword: string;
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

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          action: "update-member",
          profileId: editingMember.id,
          ...editForm,
        }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok)
        return notify(result.error || "Could not update member");

      setEditingMember(null);
      notify("Member updated");
      refresh();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not update member",
      );
    } finally {
      setSubmitting(false);
    }
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

  const resetMemberPassword = async (member: User) => {
    if (
      !supabase ||
      !window.confirm(
        `Reset ${member.name}'s password? Their current password will stop working.`,
      )
    )
      return;

    setResettingMemberId(member.id);
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session?.access_token}`,
      },
      body: JSON.stringify({ action: "reset-password", profileId: member.id }),
    });

    const result = (await response.json()) as {
      error?: string;
      name?: string;
      email?: string | null;
      tempPassword?: string;
    };
    setResettingMemberId(null);

    if (!response.ok || !result.tempPassword)
      return notify(result.error || "Could not reset member password");

    setResetPasswordInfo({
      name: result.name || member.name,
      email: result.email ?? member.email,
      tempPassword: result.tempPassword,
    });
    notify("Password reset successfully");
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
    onRefresh?.();
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
    onRefresh?.();
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
    onRefresh?.();
  };

  const deleteTeam = async (team: { id: string; name: string }) => {
    if (!supabase || !window.confirm(`Delete team ${team.name}?`)) return;

    const { error } = await supabase.from("teams").delete().eq("id", team.id);
    if (error) return notify(error.message);

    setTeams((items) => items.filter((item) => item.id !== team.id));
    setTeamMembers((items) => items.filter((item) => item.team_id !== team.id));
    notify("Team deleted");
    onRefresh?.();
  };

  return (
    <div className="space-y-7">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {section}
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {section === "Team" ? `${members.length} team members` : "Workspace access and administration."}
          </p>
        </div>

        {section === "Settings" ? (
          <button onClick={onOpenTeam} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground"><Users size={16} />Manage people</button>
        ) : currentUserRole === "Admin" && teamTab === "people" && (
          <button
            onClick={() => setCreatingMember(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-strong hover:bg-red-strong transition shadow-xs self-start sm:self-auto"
          >
            <Plus size={16} />
            Add Member
          </button>
        )}
      </div>

      {/* Temporary Password Alert banner if recently created */}
      {createdUserInfo && (
        <div className="rounded-2xl border border-green-border bg-green-soft p-5 text-green shadow-xs flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-base">New Member Credentials Created</h3>
            <p className="mt-1 text-xs font-medium">
              Account created for <strong>{createdUserInfo.name}</strong> ({createdUserInfo.email}).
            </p>
            <div className="mt-2.5 inline-block rounded-xl bg-card px-3.5 py-1.5 border border-green-border font-mono text-xs font-semibold">
              Temporary Password: <span className="text-red">{createdUserInfo.tempPassword}</span>
            </div>
          </div>
          <button
            onClick={() => setCreatedUserInfo(null)}
            className="rounded-lg p-1 text-green hover:bg-green-soft"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {resetPasswordInfo && (
        <div className="flex items-start justify-between rounded-2xl border border-amber-border bg-amber-soft p-5 text-amber shadow-xs">
          <div>
            <h3 className="text-base font-semibold">Password Reset</h3>
            <p className="mt-1 text-xs font-medium">
              Temporary password for <strong>{resetPasswordInfo.name}</strong>{" "}
              ({resetPasswordInfo.email || "No email on file"}). Share it securely.
            </p>
            <div className="mt-2.5 inline-block rounded-xl border border-amber-border bg-card px-3.5 py-1.5 font-mono text-xs font-semibold">
              Temporary Password: <span className="text-red">{resetPasswordInfo.tempPassword}</span>
            </div>
          </div>
          <button
            onClick={() => setResetPasswordInfo(null)}
            className="rounded-lg p-1 text-amber hover:bg-amber-soft"
            title="Dismiss password notice"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {section === "Settings" && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[{label: "People in your workspace", value: members.length}, {label: "Department teams", value: teams.length}, {label: "Workspace projects", value: projects.length}].map((item) => (
            <div key={item.label} className="metric-card rounded-2xl border border-border bg-card"><p className="text-secondary-foreground">{item.label}</p><p className="mt-2 text-3xl font-semibold">{item.value}</p></div>
          ))}
        </div>
      )}
      {section === "Team" && <div className="task-status-tabs" role="group" aria-label="Team directory view">
        <button type="button" aria-pressed={teamTab === "people"} onClick={() => setTeamTab("people")}>People <span>{members.length}</span></button>
        <button type="button" aria-pressed={teamTab === "departments"} onClick={() => setTeamTab("departments")}>Department teams <span>{teams.length}</span></button>
      </div>}
      {section === "Settings" && <section className="studio-panel p-6"><h2 className="text-lg font-semibold">People & departments</h2><p className="mt-2 text-sm text-muted-foreground">Manage staff and department membership from the Team directory.</p><button type="button" className="studio-button mt-4" onClick={onOpenTeam}>Open Team directory</button></section>}
      {/* TEAM MEMBERS TABLE */}
      {section === "Team" && teamTab === "people" && <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-subtle text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
            <tbody className="divide-y divide-border text-xs font-medium text-foreground">
              {members.map((m, idx) => {
                const initials = getInitials(m.name);
                const bgClass = getAvatarBg(idx);
                const stats = getMemberStats(m.id, m.name);

                return (
                  <tr
                    key={m.id}
                    className="hover:bg-subtle transition-colors"
                  >
                    {/* NAME */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid h-8 w-8 place-items-center rounded-full font-semibold text-xs shadow-2xs ${bgClass}`}
                        >
                          {initials}
                        </span>
                        <span className="font-semibold text-foreground text-base">
                          {m.name}
                        </span>
                      </div>
                    </td>

                    {/* ROLE */}
                    <td className="py-3.5 px-4 font-semibold text-secondary-foreground">
                      {getDisplayRoleTitle(m.role)}
                    </td>

                    {/* ACCESS */}
                    <td className="py-3.5 px-4">{getAccessBadge(m.role)}</td>

                    {/* EMAIL */}
                    <td className="py-3.5 px-4 text-muted-foreground font-mono text-xs">
                      {m.email || "No email"}
                    </td>

                    {/* PROJECTS */}
                    <td className="py-3.5 px-4 font-semibold text-red text-sm">
                      {stats.projectCount}
                    </td>

                    {/* OPEN TASKS */}
                    <td className="py-3.5 px-4 font-semibold text-foreground text-base">
                      {stats.openTaskCount}
                    </td>

                    {/* ACTIONS */}
                    {currentUserRole === "Admin" && (
                      <td className="py-3.5 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => resetMemberPassword(m)}
                            disabled={resettingMemberId === m.id}
                            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-amber-soft hover:text-amber disabled:opacity-50"
                            title="Reset password"
                            aria-label={`Reset password for ${m.name}`}
                          >
                            <KeyRound size={15} />
                          </button>

                          <button
                            onClick={() => {
                              setEditingMember(m);
                              setEditForm({
                                name: m.name,
                                email: m.email ?? "",
                                role: m.role,
                                active: m.active,
                              });
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                            title="Edit member"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            onClick={() => removeMember(m)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-soft hover:text-red transition"
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
                    className="py-12 text-center text-sm font-semibold text-muted-foreground"
                  >
                    No team members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>}

      {section === "Settings" && currentUserRole !== "Admin" && <section className="rounded-2xl border border-border bg-card p-6"><h2 className="text-lg font-semibold">Workspace access</h2><p className="mt-2 text-sm text-muted-foreground">Your role is Project Leader. Department configuration and account access are managed by your workspace administrator.</p><button onClick={onOpenTeam} className="mt-4 rounded-xl border border-border px-4 text-sm">View your team</button></section>}
      {/* GROUPS / TEAMS MANAGEMENT SECTION */}
      {section === "Team" && teamTab === "departments" && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Users size={18} className="text-foreground" />
            <h2 className="text-lg font-semibold text-foreground">
              Department Teams
            </h2>
          </div>

          {currentUserRole === "Admin" && <div className="grid gap-5 md:grid-cols-2">
            {/* Create Team Form */}
            <form onSubmit={createTeam} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Create Team
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  required
                  aria-label="Department team name"
                  placeholder="Team Name (e.g. CAD Team)"
                  value={teamForm.name}
                  onChange={(e) =>
                    setTeamForm({ ...teamForm, name: e.target.value })
                  }
                  className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-red"
                />
                <select
                  aria-label="Department team leader"
                  value={teamForm.leaderId}
                  onChange={(e) =>
                    setTeamForm({ ...teamForm, leaderId: e.target.value })
                  }
                  className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-red"
                >
                  <option value="">Select Team Leader</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className="h-9 rounded-xl bg-strong px-4 text-xs font-semibold text-on-strong hover:bg-strong-hover transition">
                Create Team
              </button>
            </form>

            {/* Add Member to Team */}
            <form onSubmit={addTeamMember} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Assign Member to Team
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  required
                  aria-label="Department to assign"
                  value={assignment.teamId}
                  onChange={(e) =>
                    setAssignment({ ...assignment, teamId: e.target.value })
                  }
                  className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-red"
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
                  aria-label="Member to assign"
                  value={assignment.userId}
                  onChange={(e) =>
                    setAssignment({ ...assignment, userId: e.target.value })
                  }
                  className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-red"
                >
                  <option value="">Select Member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className="h-9 rounded-xl border border-border px-4 text-xs font-semibold text-foreground hover:bg-subtle transition">
                Assign Member
              </button>
            </form>
          </div>

          }
          {/* Teams List */}
          {teams.length === 0 && <p className="text-sm text-muted-foreground">No department teams yet. An administrator can create a team and add its members here.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-xl border border-border p-4 bg-subtle"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground text-base">
                    {team.name}
                  </p>
                  {currentUserRole === "Admin" && <button
                    onClick={() => deleteTeam(team)}
                    className="text-xs font-semibold text-red hover:underline"
                  >
                    Delete
                  </button>}
                </div>
                <p className="mt-1 text-xs text-secondary-foreground">
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
                        disabled={currentUserRole !== "Admin"}
                        onClick={() => removeFromTeam(item)}
                        title={currentUserRole === "Admin" ? "Remove from team" : "Team member"}
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
        <Modal title="Add team member" onClose={() => setCreatingMember(false)}>
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-xs font-semibold uppercase text-red">
                  New Account
                </p>
                <h2 className="text-xl font-semibold text-foreground">
                  Add Team Member
                </h2>
              </div>
              <button
                onClick={() => setCreatingMember(false)}
                aria-label="Close add member"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createMember} className="space-y-4">
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Full Name *
                <input
                  required
                  placeholder="e.g. Daniyal Ahmad"
                  value={memberForm.name}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, name: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border px-3 text-sm font-semibold outline-none focus:border-red text-foreground"
                />
              </label>

              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Email Address *
                <input
                  required
                  type="email"
                  placeholder="e.g. daniyal@redshadowdesigns.com"
                  value={memberForm.email}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, email: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border px-3 text-sm font-semibold outline-none focus:border-red text-foreground"
                />
              </label>

              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Access Level & Role *
                <select
                  value={memberForm.role}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, role: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-red text-foreground"
                >
                  <option value="admin">Admin / Studio Lead</option>
                  <option value="project_leader">
                    Project Manager / Leader
                  </option>
                  <option value="team_member">Team Member</option>
                </select>
              </label>

              <div className="flex justify-end gap-3 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setCreatingMember(false)}
                  className="h-10 rounded-xl border border-border px-4 text-xs font-semibold text-foreground"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="h-10 rounded-xl bg-primary px-5 text-xs font-semibold text-on-strong hover:bg-red-strong disabled:opacity-60 transition"
                >
                  {submitting ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* EDIT MEMBER MODAL */}
      {editingMember && (
        <Modal title="Edit team member" onClose={() => setEditingMember(null)}>
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-xs font-semibold uppercase text-red">
                  Manage Access
                </p>
                <h2 className="text-xl font-semibold text-foreground">
                  Edit Member
                </h2>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                aria-label="Close edit member"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={updateMember} className="space-y-4">
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Full Name
                <input
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border px-3 text-sm font-semibold outline-none focus:border-red text-foreground"
                />
              </label>

              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Email Address
                <input
                  required
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border px-3 text-sm font-semibold outline-none focus:border-red text-foreground"
                />
                <span className="mt-1 block text-[11px] font-medium normal-case text-muted-foreground">
                  This also changes the login email for linked accounts.
                </span>
              </label>

              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Access Level
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-red text-foreground"
                >
                  <option value="admin">Admin / Studio Lead</option>
                  <option value="project_leader">
                    Project Manager / Leader
                  </option>
                  <option value="team_member">Team Member</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={editForm.active}
                  onChange={(e) =>
                    setEditForm({ ...editForm, active: e.target.checked })
                  }
                  className="h-4 w-4 accent-primary"
                />
                Active Account Status
              </label>

              <div className="flex justify-end gap-3 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  disabled={submitting}
                  className="h-10 rounded-xl border border-border px-4 text-xs font-semibold text-foreground"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="h-10 rounded-xl bg-strong px-5 text-xs font-semibold text-on-strong hover:bg-strong-hover transition disabled:opacity-60"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
