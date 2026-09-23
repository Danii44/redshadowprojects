"use client";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Columns3,
  FileClock,
  LayoutDashboard,
  Command,
  ListTodo,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
type Role = "Admin" | "Project Leader" | "Team Member";
const PROJECT_STATUSES = [
  ["open", "Open"],
  ["in_progress", "In Progress"],
  ["in_review", "In Review"],
  ["revisions", "Revisions"],
  ["delivered", "Delivered"],
  ["closed", "Closed"],
  ["cancelled", "Cancelled"],
] as const;
type ProjectStatus = (typeof PROJECT_STATUSES)[number][0];
const LEGACY_PROJECT_STATUSES: Record<string, ProjectStatus> = {
  active: "open",
  waiting_client: "in_review",
  revision: "revisions",
  completed: "closed",
  on_hold: "in_progress",
};
function normalizeProjectStatus(status?: string | null): ProjectStatus {
  if (!status) return "open";
  const normalized = LEGACY_PROJECT_STATUSES[status] ?? status;
  return PROJECT_STATUSES.some(([value]) => value === normalized)
    ? (normalized as ProjectStatus)
    : "open";
}
function projectStatusLabel(status?: string | null) {
  const normalized = normalizeProjectStatus(status);
  return PROJECT_STATUSES.find(([value]) => value === normalized)?.[1] ?? "Open";
}
function projectStatusColor(status?: string | null) {
  const normalized = normalizeProjectStatus(status);
  if (normalized === "revisions") return "purple";
  if (["delivered", "closed"].includes(normalized)) return "green";
  if (normalized === "cancelled") return "red";
  return "blue";
}
function projectStatusHighlight(status?: string | null) {
  const normalized = normalizeProjectStatus(status);
  if (normalized === "open") return "border-sky-200 bg-sky-50 text-sky-800";
  if (normalized === "in_progress") return "border-blue-200 bg-blue-50 text-blue-800";
  if (normalized === "in_review") return "border-amber-200 bg-amber-50 text-amber-800";
  if (normalized === "revisions") return "border-violet-200 bg-violet-50 text-violet-800";
  if (normalized === "delivered") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (normalized === "closed") return "border-slate-300 bg-slate-100 text-slate-800";
  return "border-red-200 bg-red-50 text-red-800";
}
type View =
  | "Dashboard"
  | "Projects"
  | "Tasks"
  | "Kanban"
  | "Revisions"
  | "Calendar"
  | "Team"
  | "Notifications"
  | "Activity"
  | "Settings";
function deadlineTone(value?: string | null) {
  if (!value) return "text-slate-500";
  const hours = (new Date(value).getTime() - Date.now()) / 3600000;
  if (hours < 0) return "text-red-600";
  if (hours <= 24) return "text-red-600";
  if (hours <= 48) return "text-amber-600";
  return "text-slate-500";
}
const projects = [
  {
    name: "Atlas Tow Dolly",
    code: "RSD-2408",
    client: "Northstar Mobility",
    phase: "Detailed Design",
    revision: "R2",
    leader: "Danish R.",
    team: ["AR", "SK", "UM"],
    due: "Today, 5:00 PM",
    priority: "Critical",
    color: "#ef4444",
    note: "Chassis geometry review before client handoff",
  },
  {
    name: "Vector Enclosure",
    code: "RSD-2411",
    client: "Vantage Systems",
    phase: "Client Review",
    revision: "R3",
    leader: "Ali R.",
    team: ["AR", "MH"],
    due: "Sep 24",
    priority: "High",
    color: "#f59e0b",
    note: "Client feedback received — 3 changes requested",
  },
  {
    name: "Nova Assembly",
    code: "RSD-2415",
    client: "Nova Industrial",
    phase: "Concept Design",
    revision: "R1",
    leader: "Danish R.",
    team: ["SK", "UM"],
    due: "Sep 29",
    priority: "Normal",
    color: "#3b82f6",
    note: "Concept package ready for internal review",
  },
  {
    name: "Apex Product Animation",
    code: "RSD-2417",
    client: "Apex Robotics",
    phase: "Final",
    revision: "R2",
    leader: "Maha H.",
    team: ["MH", "AR"],
    due: "Oct 03",
    priority: "Normal",
    color: "#8b5cf6",
    note: "Final render sequence in production",
  },
];
const seedTasks = [
  {
    id: 1,
    title: "Resolve hitch clearance conflict",
    project: "Atlas Tow Dolly",
    owner: "Ali Raza",
    initials: "AR",
    state: "Blocked",
    due: "2h overdue",
    priority: "Critical",
    checklist: "3/5",
  },
  {
    id: 2,
    title: "Review revised enclosure vents",
    project: "Vector Enclosure",
    owner: "Danish R.",
    initials: "DR",
    state: "Review",
    due: "Today",
    priority: "High",
    checklist: "4/4",
  },
  {
    id: 3,
    title: "Prepare concept presentation",
    project: "Nova Assembly",
    owner: "Sara Khan",
    initials: "SK",
    state: "In Progress",
    due: "Tomorrow",
    priority: "Normal",
    checklist: "2/6",
  },
  {
    id: 4,
    title: "Update exploded-view labels",
    project: "Atlas Tow Dolly",
    owner: "Usman M.",
    initials: "UM",
    state: "To Do",
    due: "Sep 24",
    priority: "Normal",
    checklist: "0/4",
  },
  {
    id: 5,
    title: "Export final animation variants",
    project: "Apex Product Animation",
    owner: "Maha H.",
    initials: "MH",
    state: "In Progress",
    due: "Sep 26",
    priority: "Normal",
    checklist: "5/8",
  },
];
const attention = [
  {
    level: "Critical",
    icon: CircleAlert,
    title: "Atlas Tow Dolly is due today",
    detail: "2 open tasks · 1 blocker",
    action: "Open project",
  },
  {
    level: "Warning",
    icon: FileClock,
    title: "Vector R3 is waiting for review",
    detail: "Submitted by Ali · 18 hours ago",
    action: "Review now",
  },
  {
    level: "Warning",
    icon: Clock3,
    title: "Nova Assembly has gone quiet",
    detail: "No activity for 4 days",
    action: "Check status",
  },
  {
    level: "Information",
    icon: MessageSquare,
    title: "Client feedback added to Vector",
    detail: "3 requested changes were logged",
    action: "View notes",
  },
];
const nav: { label: View; icon: any; group?: boolean }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Projects", icon: Command },
  { label: "Tasks", icon: ListTodo },
  { label: "Kanban", icon: Columns3 },
  { label: "Revisions", icon: FileClock },
  { label: "Notifications", icon: Bell, group: true },
  { label: "Settings", icon: Settings },
];
const visibleViewsByRole: Record<Role, View[]> = {
  Admin: ["Dashboard", "Projects", "Tasks", "Kanban", "Revisions", "Notifications", "Settings"],
  "Project Leader": ["Dashboard", "Projects", "Tasks", "Kanban", "Revisions", "Notifications"],
  "Team Member": ["Dashboard", "Tasks", "Notifications"],
};
function getAppRole(value: unknown): Role {
  const normalized = String(value ?? "").trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  if (normalized === "admin") return "Admin";
  if (normalized === "project_leader" || normalized === "leader") return "Project Leader";
  return "Team Member";
}
const tone: any = {
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
};
function Pill({
  children,
  color = "slate",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tone[color]}`}
    >
      {children}
    </span>
  );
}
export default function Home() {
  const [role, setRole] = useState<Role>("Admin");
  const [view, setView] = useState<View>("Dashboard");
  const [tasks, setTasks] = useState<any[]>([]);
  const [liveProjects, setLiveProjects] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("Team member");
  const [profileId, setProfileId] = useState("");
  const [people, setPeople] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [connectionError, setConnectionError] = useState("");
  const [menu, setMenu] = useState(false);
  const [accountMenu, setAccountMenu] = useState(false);
  const [accountPanel, setAccountPanel] = useState<"profile" | "password" | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const canEdit = () => role === "Admin" || role === "Project Leader";
  const canChangeStatus = () => canEdit() || role === "Team Member";
  const vp = liveProjects;
  const vt = tasks;
  const filtered = vp.filter((p) =>
  (p.name + (p.client ?? "") + p.code).toLowerCase().includes(query.toLowerCase()),
  );
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 2400);
  };
  const updateTask = async (id: string | number, nextState: string) => {
    const current = tasks.find((task) => task.id === id);
    setTasks((v) =>
      v.map((t) =>
        t.id === id
          ? { ...t, state: nextState }
          : t,
      ),
    );
    if (supabase && typeof id === "string") {
      const databaseState = nextState.toLowerCase().replaceAll(" ", "_");
      const result = role === "Team Member"
        ? await supabase.rpc("update_assigned_task_status", { task_id: id, new_status: databaseState })
        : await supabase
            .from("tasks")
            .update({
              status: databaseState,
              submitted_at: databaseState === "in_review" ? new Date().toISOString() : null,
              reviewed_at: databaseState === "completed" ? new Date().toISOString() : null,
            })
            .eq("id", id);
      const { error } = result;
      if (error) {
        setTasks((v) =>
          v.map((task) =>
            task.id === id ? { ...task, state: current?.state } : task,
          ),
        );
        notify("Could not save task update");
        return;
      }
    }
    notify(`Task moved to ${nextState}`);
  };
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let mounted = true;
    client.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        window.location.href = "/login";
        return;
      }
      setAuthEmail(data.session.user.email ?? "");
      const { data: profile } = await client
        .from("users")
        .select("id,role,name")
        .eq("auth_user_id", data.session.user.id)
        .single();
      if (!profile) {
        setConnectionError(
          "Your signed-in account is not linked to a company profile. Ask an administrator to link it in Supabase.",
        );
        setReady(true);
        return;
      }
      setUserName(profile.name);
      setProfileId(profile.id);
      const currentRole = getAppRole(profile.role);
      setRole(currentRole);
      const [{ data: projectRows }, { data: taskRows }, { data: people }, { data: notificationRows }] =
        await Promise.all([
          client
            .from("projects")
            .select("*, project_phases(*), project_members(user_id), revisions(*)"),
          client.from("tasks").select("*"),
          client.from("users").select("id,name,email,role,active").eq("active", true),
          client.from("notifications").select("*").order("created_at", { ascending: false }),
        ]);
      if (!mounted) return;
      const peopleById = new Map(
        (people ?? []).map((person: any) => [person.id, person.name]),
      );
      const visibleProjectRows = (projectRows ?? []).filter((project: any) =>
        currentRole === "Admin" ||
        project.leader_id === profile.id ||
        project.project_members?.some((member: any) => member.user_id === profile.id),
      );
      const visibleProjectIds = new Set(visibleProjectRows.map((project: any) => project.id));
      const visibleTaskRows = (taskRows ?? []).filter((task: any) =>
        currentRole !== "Team Member" || task.assignee_id === profile.id,
      );
      setPeople(people ?? []);
      setNotifications(notificationRows ?? []);
      if (visibleProjectRows.length) {
        const projectById = new Map(
          visibleProjectRows.map((project: any) => [project.id, project.name]),
        );
        setLiveProjects(
          visibleProjectRows.map((project: any) => {
            const phase =
              project.project_phases?.find((item: any) => item.state === "active") ??
              project.project_phases?.sort(
                (a: any, b: any) => a.position - b.position,
              )[0];
            return {
              ...project,
              phase: phase?.name ?? "Requirements",
              revision: project.revisions?.length
                ? `R${Math.max(...project.revisions.map((item: any) => item.number))}`
                : "No revision",
              leader: peopleById.get(project.leader_id) ?? "Unassigned",
              team: (project.project_members ?? []).map((member: any) =>
                String(peopleById.get(member.user_id) ?? "TM")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase(),
              ),
              due: project.deadline
                ? new Date(project.deadline).toLocaleDateString()
                : "No deadline",
              deadlineTone: deadlineTone(project.deadline),
              priority:
                project.priority?.charAt(0).toUpperCase() +
                  project.priority?.slice(1) || "Normal",
              color:
                project.priority === "critical"
                  ? "#ef4444"
                  : project.priority === "high"
                    ? "#f59e0b"
                    : "#3b82f6",
              note: project.requirements ?? project.description ?? "No requirements added",
            };
          }),
        );
        if (visibleTaskRows.length) {
          setTasks(
            visibleTaskRows.filter((task: any) => visibleProjectIds.has(task.project_id)).map((task: any) => {
              const owner = peopleById.get(task.assignee_id) ?? "Unassigned";
              return {
                ...task,
                title: task.title,
                project: projectById.get(task.project_id) ?? "Project",
                owner,
                initials: String(owner)
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase(),
                state: task.status
                  .split("_")
                  .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(" "),
                due: task.due_at
                  ? new Date(task.due_at).toLocaleDateString()
                  : "No deadline",
                dueTone: deadlineTone(task.due_at),
                checklist: "0/0",
              };
            }),
          );
        }
      }
      setReady(true);
    });
    const { data: listener } = client.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) window.location.href = "/login";
      },
    );
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  if (!supabase) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#111419] p-5 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-[#e3292f] text-xl font-black">
            R
          </div>
          <h1 className="text-2xl font-black">Supabase connection required</h1>
          <p className="mt-3 leading-7 text-white/65">
            This deployment is missing its Supabase environment variables. Add
            NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            in Vercel, then redeploy.
          </p>
        </section>
      </main>
    );
  }
  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#111419] text-white">
        <p className="text-sm font-bold">Loading your workspace…</p>
      </main>
    );
  }
  if (connectionError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#111419] p-5 text-white">
        <section className="max-w-lg rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
          <h1 className="text-xl font-black">Account setup incomplete</h1>
          <p className="mt-3 leading-7 text-white/70">{connectionError}</p>
        </section>
      </main>
    );
  }
  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#18202a]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[248px] bg-[#15181d] text-white transition-transform lg:translate-x-0 ${menu ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e3292f] font-black shadow-lg shadow-red-950/50">
            R
          </div>
          <div>
            <div className="text-sm font-black tracking-wide">RED SHADOW</div>
            <div className="text-[11px] font-semibold tracking-[.18em] text-white/40">
              DESIGNS
            </div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setMenu(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="px-3 py-5">
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[.16em] text-white/30">
            Workspace
          </p>
          <nav className="space-y-1">
            {nav.filter((n) => visibleViewsByRole[role].includes(n.label)).map((n) => (
              <div key={n.label}>
                {n.group && (
                  <p className="mb-2 mt-6 px-3 text-[11px] font-bold uppercase tracking-[.16em] text-white/30">
                    Company
                  </p>
                )}
                <button
                  onClick={() => {
                    setView(n.label);
                    setMenu(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${view === n.label ? "bg-[#e3292f] text-white" : "text-white/55 hover:bg-white/10 hover:text-white"}`}
                >
                  <n.icon size={18} />
                  {n.label}
                  {n.label === "Notifications" && (
                    <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[11px]">
                      {notifications.filter((item) => !item.read_at).length}
                    </span>
                  )}
                </button>
              </div>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-4 left-3 right-3">
          {accountMenu && (
            <div className="mb-2 overflow-hidden rounded-2xl border border-white/10 bg-[#24282f] p-1 shadow-xl">
              <button onClick={() => { setAccountPanel("profile"); setAccountMenu(false); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">View profile</button>
              <button onClick={() => { setAccountPanel("password"); setAccountMenu(false); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">Change password</button>
              <button onClick={async () => { await supabase?.auth.signOut(); window.location.href = "/login"; }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-300 hover:bg-red-500/15">Sign out</button>
            </div>
          )}
          <button onClick={() => setAccountMenu((open) => !open)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-red-100 text-xs font-black text-red-700">
              DR
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{userName}</p>
              <p className="text-xs text-white/40">{role}</p>
            </div>
            <ChevronDown className={`ml-auto text-white/30 transition ${accountMenu ? "rotate-180" : ""}`} size={16} />
          </button>
        </div>
      </aside>
      <main className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <button
            className="rounded-lg p-2 lg:hidden"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, tasks or people..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 sm:block">
              {role}
            </div>
            <button
              onClick={() => setView("Notifications")}
              className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white"
              aria-label="Open notifications"
            >
              <Bell size={19} />
              {notifications.some((item) => !item.read_at) && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] p-4 sm:p-7 lg:p-9">
          {view === "Dashboard" && (
            <Dashboard
              role={role}
              projects={vp}
              tasks={vt}
              setView={setView}
              notify={notify}
            />
          )}{" "}
          {view === "Projects" && (
            <ProjectsView
              projects={filtered}
              role={role}
              people={people}
              profileId={profileId}
              notify={notify}
            />
          )}{" "}
          {(view === "Tasks" || view === "Kanban") && (
            <TasksView
              tasks={vt}
              projects={vp}
              people={people}
              profileId={profileId}
              role={role}
              kanban={view === "Kanban"}
              updateTask={updateTask}
            />
          )}{" "}
          {view === "Revisions" && <RevisionsView projects={vp} profileId={profileId} role={role} notify={notify} />}{" "}
          {view === "Notifications" && <NotificationsView notifications={notifications} setNotifications={setNotifications} notify={notify} />}{" "}
          {view === "Settings" && role === "Admin" && <SettingsView people={people} notify={notify} />}{" "}
          {![
            "Dashboard",
            "Projects",
            "Tasks",
            "Kanban",
            "Revisions",
            "Notifications",
            "Settings",
          ].includes(view) && <GenericView view={view} notify={notify} />}
        </div>
      </main>
      {menu && (
        <button
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMenu(false)}
        />
      )}{" "}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-2xl">
          <CheckCircle2 className="text-emerald-400" size={19} />
          {toast}
        </div>
      )}
      {accountPanel && (
        <AccountPanel
          panel={accountPanel}
          name={userName}
          email={authEmail}
          role={role}
          close={() => setAccountPanel(null)}
          notify={notify}
        />
      )}
    </div>
  );
}

function AccountPanel({
  panel,
  name,
  email,
  role,
  close,
  notify,
}: {
  panel: "profile" | "password";
  name: string;
  email: string;
  role: Role;
  close: () => void;
  notify: (message: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirmation) return setError("Passwords do not match.");
    setBusy(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError(updateError.message);
    notify("Password updated");
    close();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-red-600">Account</p>
            <h2 className="mt-1 text-2xl font-black">{panel === "profile" ? "Your profile" : "Change password"}</h2>
          </div>
          <button onClick={close} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close account panel"><X size={20} /></button>
        </div>
        {panel === "profile" ? (
          <div className="space-y-3">
            <AccountField label="Name" value={name} />
            <AccountField label="Email" value={email || "Email unavailable"} />
            <AccountField label="Role" value={role} />
          </div>
        ) : (
          <form onSubmit={changePassword} className="space-y-4">
            <label className="block text-sm font-bold">New password<input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-red-400" /></label>
            <label className="block text-sm font-bold">Confirm new password<input required type="password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-red-400" /></label>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
            <button disabled={busy} className="h-11 w-full rounded-xl bg-[#e3292f] text-sm font-black text-white disabled:opacity-60">{busy ? "Updating..." : "Update password"}</button>
          </form>
        )}
      </section>
    </div>
  );
}

function AccountField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-800">{value}</p></div>;
}
function Dashboard({
  role,
  projects,
  tasks,
  setView,
  notify,
}: {
  role: Role;
  projects: any[];
  tasks: any[];
  setView: (v: View) => void;
  notify: (s: string) => void;
}) {
  const activeProjects = projects.filter(
    (project) => !["delivered", "closed", "cancelled"].includes(normalizeProjectStatus(project.status)),
  );
  const liveAttention = tasks
    .filter((task) => task.state === "In Review" || task.state === "In Revision")
    .slice(0, role === "Team Member" ? 2 : 4)
    .map((task) => ({
      level: task.state === "In Revision" ? "Critical" : "Warning",
      icon: task.state === "In Revision" ? CircleAlert : FileClock,
      title: task.title,
      detail: `${task.project} · ${task.state}`,
      action: "View task",
    }));
  type WorkloadMember = {
    name: string;
    initials: string;
    count: number;
    blocked: boolean;
  };
  const workloadByOwner = new Map<string, WorkloadMember>();
  tasks.forEach((task) => {
    const owner = task.owner || "Unassigned";
    const current = workloadByOwner.get(owner) ?? {
      name: owner,
      initials: task.initials || "TM",
      count: 0,
      blocked: false,
    };
    current.count += 1;
        if (task.state === "In Revision") current.blocked = true;
    workloadByOwner.set(owner, current);
  });
  const workload: WorkloadMember[] = [...workloadByOwner.values()].slice(0, 5);
  if (role === "Team Member") {
    const openTasks = tasks.filter((task) => !["Closed", "Cancelled", "Completed"].includes(task.state));
    return (
      <>
        <section className="mb-7 rounded-[24px] bg-[#15181d] p-6 text-white shadow-xl sm:p-8">
          <p className="text-sm font-bold text-red-400">My workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Your work, clearly lined up.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">Focus on the tasks assigned to you, their deadlines, and the next status update.</p>
          <button onClick={() => setView("Tasks")} className="mt-6 rounded-xl bg-[#e3292f] px-4 py-2.5 text-sm font-black text-white">Open my tasks</button>
        </section>
        <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Info label="Assigned tasks" value={String(tasks.length)} />
          <Info label="Open tasks" value={String(openTasks.length)} />
          <Info label="In review" value={String(tasks.filter((task) => task.state === "In Review" || task.state === "In Revision").length)} />
        </section>
        <div>
          <section className="rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-black">My tasks</h2><p className="mt-1 text-sm text-slate-500">Only tasks assigned to you are shown.</p></div><Pill color={openTasks.length ? "amber" : "green"}>{openTasks.length} open</Pill></div>
            <div className="divide-y divide-slate-100">
              {tasks.slice(0, 6).map((task) => <button key={task.id} onClick={() => setView("Tasks")} className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50"><div className="min-w-0 flex-1"><p className="truncate font-bold">{task.title}</p><p className={`mt-1 text-sm font-semibold ${task.dueTone || "text-slate-500"}`}>{task.project} · Due {task.due}</p></div><Pill color={task.state === "In Revision" ? "red" : task.state === "Completed" || task.state === "Closed" ? "green" : "slate"}>{task.state}</Pill></button>)}
              {!tasks.length && <p className="p-8 text-center text-sm font-semibold text-slate-500">No tasks assigned yet.</p>}
            </div>
          </section>
        </div>
      </>
    );
  }
  return (
    <>
      <section className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-[#e3292f]">
            <Sparkles size={16} />
            {new Intl.DateTimeFormat("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(new Date())}
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            {role === "Project Leader" ? "Your projects need attention." : "Company command center"}
          </h1>
          <p className="mt-2 text-slate-500">
            {role === "Admin"
              ? `${projects.length} total projects are visible across the company.`
              : role === "Project Leader"
                ? `${activeProjects.length} projects you lead or work on are currently active.`
                : `${activeProjects.length} assigned projects are currently active.`}
          </p>
        </div>
      </section>
      <section className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          [
            String(role === "Admin" ? projects.length : activeProjects.length),
            role === "Admin" ? "Total projects" : "My active projects",
            "blue",
          ],
          [String(tasks.filter((task) => task.state === "In Review").length), "In review", "purple"],
          [String(projects.filter((project) => project.phase === "Client Review").length), "Waiting on client", "amber"],
          [String(tasks.filter((task) => task.state === "In Revision").length), "In revision", "red"],
          [String(tasks.filter((task) => !["Closed", "Cancelled", "Completed"].includes(task.state)).length), "Open tasks", "green"],
        ].map(([n, l, c]) => (
          <div
            key={l}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="text-3xl font-black">{n}</p>
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full ${c === "red" ? "bg-red-500" : c === "amber" ? "bg-amber-400" : c === "green" ? "bg-emerald-500" : c === "purple" ? "bg-violet-500" : "bg-blue-500"}`}
              />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-500">{l}</p>
          </div>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.45fr_.8fr]">
        <section className="rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-black">Needs attention</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ordered by urgency and business impact
              </p>
            </div>
            <Pill color={liveAttention.length ? "red" : "green"}>
              {liveAttention.length} open
            </Pill>
          </div>
          <div className="divide-y divide-slate-100">
            {liveAttention.map((a) => (
              <button
                key={a.title}
                onClick={() => setView("Tasks")}
                className="flex w-full items-center gap-4 p-4 text-left hover:bg-slate-50 sm:p-5"
              >
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${a.level === "Critical" ? "bg-red-50 text-red-600" : a.level === "Warning" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}
                >
                  <a.icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{a.title}</p>
                    <Pill
                      color={
                        a.level === "Critical"
                          ? "red"
                          : a.level === "Warning"
                            ? "amber"
                            : "blue"
                      }
                    >
                      {a.level}
                    </Pill>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{a.detail}</p>
                </div>
                <span className="hidden text-xs font-black text-slate-400 sm:block">
                  {a.action} →
                </span>
              </button>
            ))}
            {!liveAttention.length && (
              <div className="p-8 text-center text-sm font-semibold text-slate-500">
                Nothing urgent right now.
              </div>
            )}
          </div>
        </section>
        <section className="rounded-[22px] bg-[#15181d] p-5 text-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-white/35">
            Team pulse
          </p>
          <h2 className="mb-5 mt-1 text-lg font-black">
            Today&apos;s workload
          </h2>
          {workload.map((member) => (
            <div
              key={member.name}
              className="mb-3 flex items-center gap-3 rounded-xl bg-white/[.06] p-3"
            >
              <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-black">
                {member.initials}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{member.name}</p>
                <p
                  className={`text-xs ${member.blocked ? "text-red-400" : "text-white/40"}`}
                >
                  {member.blocked ? "Blocked" : "Active"}
                </p>
              </div>
              <span className="text-xs font-semibold text-white/40">
                {member.count} {member.count === 1 ? "task" : "tasks"}
              </span>
            </div>
          ))}
          {!workload.length && (
            <p className="rounded-xl bg-white/[.06] p-4 text-sm text-white/45">
              Workload appears after tasks are assigned.
            </p>
          )}
        </section>
      </div>
      <section className="mt-6 rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between p-5">
          <div>
            <h2 className="font-black">
              {role === "Admin" ? "Company projects" : "My projects"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Live phase, revision and delivery health
            </p>
          </div>
          <button
            onClick={() => setView("Projects")}
            className="text-sm font-black text-[#e3292f]"
          >
            View all
          </button>
        </div>
        <div className="grid gap-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4">
          {projects.map((p) => (
            <ProjectCard
              key={p.name}
              p={p}
              onClick={() => setView("Projects")}
            />
          ))}
        </div>
      </section>
    </>
  );
}
function ProjectCard({ p, onClick }: { p: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-200 p-4 text-left hover:shadow-md"
    >
      <div className="mb-4 flex items-start justify-between">
        <span className="text-xs font-black text-slate-400">{p.code}</span>
        <Pill color={projectStatusColor(p.status)}>
          {projectStatusLabel(p.status)}
        </Pill>
      </div>
      <h3 className="font-black">{p.name}</h3>
      <p className={`mt-2 text-sm font-semibold ${p.deadlineTone || "text-slate-500"}`}>Due {p.due}</p>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div>
          <p className="text-[11px] font-bold uppercase text-slate-400">
            Current phase
          </p>
          <p className="mt-1 text-sm font-bold">
            {p.phase} · {p.revision}
          </p>
        </div>
        <div className="flex -space-x-2">
          {p.team.map((x: string) => (
            <span
              key={x}
              className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-slate-800 text-[9px] font-black text-white"
            >
              {x}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
function ProjectsView({
  projects,
  role,
  people,
  profileId,
  notify,
}: {
  projects: any[];
  role: Role;
  people: any[];
  profileId: string;
  notify: (s: string) => void;
}) {
  const [selected, setSelected] = useState(projects[0]);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [creating, setCreating] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: "",
    leaderId: "",
    deadlineDate: "",
    deadlineTime: "17:00",
    priority: "normal",
    description: "",
    requirements: "",
  });
  const [savingProject, setSavingProject] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [projectDetails, setProjectDetails] = useState({
    name: "",
    client: "",
    deadline: "",
    priority: "normal",
    description: "",
    requirements: "",
  });
  const visibleProjects = statusFilter === "all"
    ? projects
    : projects.filter((project) => normalizeProjectStatus(project.status) === statusFilter);

  useEffect(() => {
    if (!visibleProjects.length) {
      setSelected(undefined);
      return;
    }
    if (!selected || !visibleProjects.some((project) => project.id === selected.id)) {
      setSelected(visibleProjects[0]);
    }
  }, [visibleProjects, selected]);
  useEffect(() => {
    if (!selected) return;
    setProjectDetails({
      name: selected.name ?? "",
      client: selected.client ?? "",
      deadline: selected.deadline ? String(selected.deadline).slice(0, 10) : "",
      priority: String(selected.priority ?? "normal").toLowerCase(),
      description: selected.description ?? "",
      requirements: selected.requirements ?? "",
    });
  }, [selected]);
  const canManageSelected = role === "Admin" || selected?.leader_id === profileId;
  const saveProjectDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !selected || role !== "Admin") return;
    setSavingDetails(true);
    const changes = {
      name: projectDetails.name.trim(),
      client: projectDetails.client.trim() || null,
      deadline: projectDetails.deadline || null,
      priority: projectDetails.priority,
      description: projectDetails.description.trim() || null,
      requirements: projectDetails.requirements.trim() || null,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("projects").update(changes).eq("id", selected.id).select().maybeSingle();
    setSavingDetails(false);
    if (error) return notify(error.message);
    if (!data) return notify("Project changes were not saved. Check your permissions.");
    notify("Project details updated");
    window.location.reload();
  };
  const changeStatus = async (status: string) => {
    if (!supabase || !selected || !canManageSelected) return notify("Only the project leader or an admin can change this status");
    if (status === "revisions" && normalizeProjectStatus(selected.status) !== "revisions") {
      const phases = selected.project_phases ?? [];
      const phase = phases.find((item: any) => item.state === "active") ?? phases.sort((a: any, b: any) => a.position - b.position)[0];
      if (!phase?.id) return notify("This project has no phase to attach the revision to");
      const nextNumber = Math.max(0, ...(selected.revisions ?? []).map((revision: any) => revision.number)) + 1;
      const { error: revisionError } = await supabase.from("revisions").insert({
        project_id: selected.id,
        phase_id: phase.id,
        number: nextNumber,
        notes: "Revision reopened from project status",
        state: "open",
        submitted_by: profileId,
        submitted_at: new Date().toISOString(),
      });
      if (revisionError) return notify(`Could not create revision: ${revisionError.message}`);
    }
    const { data, error } = await supabase
      .from("projects")
      .update({ status, last_activity_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", selected.id)
      .select("id,status")
      .maybeSingle();
    if (error) return notify(error.message);
    if (!data) return notify("Project status was not saved. Check your project permissions.");
    setSelected((current: any) => current ? { ...current, status } : current);
    if (status === "revisions") {
      notify("Project moved to revisions and a revision was created");
      window.location.reload();
      return;
    }
    notify("Project status updated");
  };
  const changeLeader = async (leaderId: string) => {
    if (!supabase || !selected || role !== "Admin" || !leaderId) return;
    const previousLeaderId = selected.leader_id;
    const { error } = await supabase
      .from("projects")
      .update({ leader_id: leaderId, updated_at: new Date().toISOString() })
      .eq("id", selected.id);
    if (error) return notify(error.message);
    if (previousLeaderId && previousLeaderId !== leaderId) {
      await supabase.from("project_members").delete().eq("project_id", selected.id).eq("user_id", previousLeaderId);
    }
    const { error: memberError } = await supabase.from("project_members").upsert({
      project_id: selected.id,
      user_id: leaderId,
      project_role: "Project Leader",
    }, { onConflict: "project_id,user_id" });
    if (memberError) return notify(memberError.message);
    const leader = people.find((person) => person.id === leaderId);
    setSelected({ ...selected, leader_id: leaderId, leader: leader?.name ?? "Unassigned" });
    notify("Project leader reassigned");
  };
  const createProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSavingProject(true);
    const leaderId = projectForm.leaderId || profileId;
    const generatedCode = `RSD-${new Date().getFullYear().toString().slice(-2)}${String(Date.now()).slice(-6)}`;
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: projectForm.name,
        code: generatedCode,
        client: null,
        leader_id: leaderId,
        deadline: projectForm.deadlineDate
          ? new Date(`${projectForm.deadlineDate}T${projectForm.deadlineTime || "17:00"}`).toISOString()
          : null,
        priority: projectForm.priority,
        description: projectForm.description || null,
        requirements: projectForm.requirements || null,
        status: "open",
      })
      .select("id")
      .single();
    if (error) {
      setSavingProject(false);
      return notify(error.message);
    }
    const { error: memberError } = await supabase.from("project_members").insert({
      project_id: data.id,
      user_id: leaderId,
      project_role: "Project Leader",
    });
    if (memberError) {
      setSavingProject(false);
      return notify(memberError.message);
    }
    await supabase.from("project_phases").insert(
      ["Requirements", "Concept", "Detailed Design", "Client Review", "Final"].map(
        (name, index) => ({
          project_id: data.id,
          name,
          position: index + 1,
          state: index === 0 ? "active" : "upcoming",
          started_at: index === 0 ? new Date().toISOString() : null,
        }),
      ),
    );
    notify("Project created");
    window.location.reload();
  };
  const deleteProject = async () => {
    if (!supabase || !selected || role !== "Admin") return;
    if (!window.confirm(`Delete ${selected.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", selected.id);
    if (error) return notify(error.message);
    notify("Project deleted");
    window.location.reload();
  };
  return (
    <>
      <p className="text-sm font-bold text-red-600">Portfolio</p>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Projects</h1>
        {role === "Admin" && (
          <button onClick={() => setCreating(!creating)} className="rounded-xl bg-[#e3292f] px-4 py-2.5 text-sm font-bold text-white">
            {creating ? "Cancel" : "+ New project"}
          </button>
        )}
      </div>
      <div className="mb-5 flex flex-wrap gap-2" aria-label="Filter projects by status">
        <button onClick={() => setStatusFilter("all")} className={`rounded-full border px-3 py-2 text-xs font-black ${statusFilter === "all" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}>All ({projects.length})</button>
        {PROJECT_STATUSES.map(([value, label]) => {
          const count = projects.filter((project) => normalizeProjectStatus(project.status) === value).length;
          return <button key={value} onClick={() => setStatusFilter(value)} className={`rounded-full border px-3 py-2 text-xs font-black ${statusFilter === value ? projectStatusHighlight(value) : "border-slate-200 bg-white text-slate-600"}`}>{label} ({count})</button>;
        })}
      </div>
      {creating && (
        <form onSubmit={createProject} className="mb-6 rounded-2xl border border-red-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-black">Create a project</h2>
            <p className="mt-1 text-sm text-slate-500">Set the delivery details now. You can update the status and team later.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold">Project name<input required placeholder="e.g. Atlas Tow Dolly" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50" /></label>
            <label className="text-sm font-bold">Project leader<select required value={projectForm.leaderId} onChange={(e) => setProjectForm({ ...projectForm, leaderId: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"><option value="">Select leader</option>{people.filter((person) => person.role === "admin" || person.role === "project_leader").map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
            <label className="text-sm font-bold">Deadline date<input required type="date" value={projectForm.deadlineDate} onChange={(e) => setProjectForm({ ...projectForm, deadlineDate: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50" /></label>
            <label className="text-sm font-bold">Deadline time<input required type="time" value={projectForm.deadlineTime} onChange={(e) => setProjectForm({ ...projectForm, deadlineTime: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50" /></label>
            <label className="text-sm font-bold">Priority<select value={projectForm.priority} onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            <label className="text-sm font-bold md:col-span-2">Description<textarea rows={3} placeholder="What is this project delivering?" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50" /></label>
            <label className="text-sm font-bold md:col-span-2">Requirements and notes<textarea rows={3} placeholder="Key requirements, constraints, or client expectations" value={projectForm.requirements} onChange={(e) => setProjectForm({ ...projectForm, requirements: e.target.value })} className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50" /></label>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setCreating(false)} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold">Cancel</button>
            <button disabled={savingProject} className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{savingProject ? "Creating..." : "Create project"}</button>
          </div>
        </form>
      )}
      <div className="grid gap-6 xl:grid-cols-[.8fr_1.4fr]">
        <div className="space-y-3">
          {visibleProjects.map((p) => (
            <button
              key={p.name}
              onClick={() => setSelected(p)}
              className={`w-full rounded-2xl border bg-white p-4 text-left ${selected?.name === p.name ? "border-red-300 ring-4 ring-red-50" : "border-slate-200"}`}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-xs font-bold text-slate-400">
                  {p.code}
                </span>
                <div className="flex gap-2"><Pill color={projectStatusColor(p.status)}>{projectStatusLabel(p.status)}</Pill><Pill color={p.priority === "Critical" ? "red" : p.priority === "High" ? "amber" : "slate"}>{p.priority}</Pill></div>
              </div>
              <h3 className="mt-2 font-black">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {p.phase} · {p.revision}
              </p>
            </button>
          ))}
          {!visibleProjects.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">No projects match this status.</div>}
        </div>
        {selected && (
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <span className="text-xs font-black text-red-600">
                  {selected.code}
                </span>
                <h2 className="mt-1 text-2xl font-black">{selected.name}</h2>
                <p className="mt-1 text-slate-500">Led by {selected.leader}</p>
              </div>
              {canManageSelected && (
                <div className="grid w-full gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:w-auto lg:min-w-[430px]">
                  {role === "Admin" && <label className="text-xs font-black uppercase tracking-wide text-slate-400">Project leader<select aria-label="Project leader" value={selected.leader_id ?? ""} onChange={(e) => changeLeader(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"><option value="">Select leader</option>{people.filter((person) => person.role === "admin" || person.role === "project_leader").map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
                  <label className="text-xs font-black uppercase tracking-wide text-slate-400">Project status<select aria-label="Project status" value={normalizeProjectStatus(selected.status)} onChange={(e) => changeStatus(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50">
                    {PROJECT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select></label>
                  {role === "Admin" && <button onClick={deleteProject} className="h-10 self-end rounded-xl border border-red-200 px-4 text-sm font-bold text-red-600 hover:bg-red-50">Delete project</button>}
                </div>
              )}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Info
                label="Deadline"
                value={selected.deadline ? new Date(selected.deadline).toLocaleString() : "No deadline"}
                className={deadlineTone(selected.deadline)}
              />
              <Info label="Priority" value={selected.priority || "Normal"} />
              <div className={`rounded-xl border p-4 ${projectStatusHighlight(selected.status)}`}><p className="text-xs font-bold opacity-60">Status</p><p className="mt-1 font-black">{projectStatusLabel(selected.status)}</p></div>
            </div>
            {role === "Admin" && (
              <form onSubmit={saveProjectDetails} className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4"><h3 className="font-black">Admin project controls</h3><p className="mt-1 text-xs text-slate-500">Update the project details, deadline, and priority.</p></div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-black uppercase tracking-wide text-slate-400">Project name<input required value={projectDetails.name} onChange={(e) => setProjectDetails({ ...projectDetails, name: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-800" /></label>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-400">Client<input value={projectDetails.client} onChange={(e) => setProjectDetails({ ...projectDetails, client: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-800" /></label>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-400">Deadline<input type="date" value={projectDetails.deadline} onChange={(e) => setProjectDetails({ ...projectDetails, deadline: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-800" /></label>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-400">Priority<select value={projectDetails.priority} onChange={(e) => setProjectDetails({ ...projectDetails, priority: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-800"><option value="none">None</option><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-400 md:col-span-2">Description<textarea rows={3} value={projectDetails.description} onChange={(e) => setProjectDetails({ ...projectDetails, description: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800" /></label>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-400 md:col-span-2">Requirements<textarea rows={3} value={projectDetails.requirements} onChange={(e) => setProjectDetails({ ...projectDetails, requirements: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800" /></label>
                </div>
                <button disabled={savingDetails} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{savingDetails ? "Saving..." : "Save project changes"}</button>
              </form>
            )}
            {(selected.description || selected.requirements) && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {selected.description && <Info label="Description" value={selected.description} />}
                {selected.requirements && <Info label="Requirements and notes" value={selected.requirements} />}
              </div>
            )}
            <p className="mb-4 mt-7 text-xs font-black uppercase tracking-wider text-slate-400">
              Phase timeline
            </p>
            <div className="flex overflow-x-auto pb-2">
              {[
                "Requirements",
                "Concept",
                "Detailed Design",
                "Client Review",
                "Final",
              ].map((x) => {
                const active = x === selected.phase;
                const done =
                  ["Requirements", "Concept"].includes(x) &&
                  selected.phase !== x;
                return (
                  <div key={x} className="min-w-[130px] flex-1">
                    <div
                      className={`h-1.5 ${active ? "bg-red-500" : done ? "bg-slate-900" : "bg-slate-200"}`}
                    />
                    <div className="mt-3 flex items-center gap-2">
                      {done ? (
                        <Check size={14} />
                      ) : (
                        <span
                          className={`h-2 w-2 rounded-full ${active ? "bg-red-500" : "bg-slate-300"}`}
                        />
                      )}
                      <span
                        className={`text-xs font-bold ${active ? "text-red-600" : "text-slate-500"}`}
                      >
                        {x}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <Info label="Deadline" value={selected.due} />
              <Info label="Revision" value={selected.revision + " · Active"} />
              <Info label="Priority" value={selected.priority} />
            </div>
            <div className="mt-4">
              <Info
                label="Project status"
                value={projectStatusLabel(selected.status)}
              />
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Current requirement
              </p>
              <p className="mt-2 font-semibold">{selected.note}</p>
            </div>
            <h3 className="mt-5 font-black">Internal notes</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Keep the assembly within the transport envelope. Confirm
              manufacturability before the next client review; do not release
              drawings until the blocker is resolved.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
function Info({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 p-4 ${className}`}>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}
function TasksView({
  tasks,
  projects,
  people,
  profileId,
  role,
  kanban,
  updateTask,
}: {
  tasks: any[];
  projects: any[];
  people: any[];
  profileId: string;
  role: Role;
  kanban: boolean;
  updateTask: (id: string | number, state: string) => void;
}) {
  const cols = [
    "Open",
    "In Progress",
    "In Review",
    "In Revision",
    "Closed",
    "Cancelled",
    "Completed",
  ];
  const [creating, setCreating] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    projectId: "",
    assigneeId: "",
    deadline: "",
  });
  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    const { data: task, error } = await supabase.from("tasks").insert({
      title: taskForm.title,
      project_id: taskForm.projectId,
      assignee_id: taskForm.assigneeId || null,
      created_by: profileId,
      status: "open",
      priority: "normal",
      due_at: new Date(`${taskForm.deadline}T17:00:00`).toISOString(),
    }).select("id").single();
    if (error) return window.alert(error.message);
    if (taskForm.assigneeId) {
      const { error: memberError } = await supabase.from("project_members").upsert({
        project_id: taskForm.projectId,
        user_id: taskForm.assigneeId,
        project_role: "Team Member",
      }, { onConflict: "project_id,user_id" });
      if (memberError) {
        await supabase.from("tasks").delete().eq("id", task.id);
        return window.alert(`Task was not assigned: ${memberError.message}`);
      }
    }
    window.location.reload();
  };
  const canEdit = () => role === "Admin" || role === "Project Leader";
  const canChangeStatus = () => canEdit() || role === "Team Member";
  const assignTask = async (taskId: string, assigneeId: string) => {
    if (!supabase || !canEdit()) return;
    const task = tasks.find((item) => item.id === taskId);
    const { error } = await supabase.from("tasks").update({
      assignee_id: assigneeId || null,
      updated_at: new Date().toISOString(),
    }).eq("id", taskId);
    if (error) return window.alert(error.message);
    if (assigneeId && task?.project_id) {
      const { error: memberError } = await supabase.from("project_members").upsert({
        project_id: task.project_id,
        user_id: assigneeId,
        project_role: "Team Member",
      }, { onConflict: "project_id,user_id" });
      if (memberError) {
        await supabase.from("tasks").update({ assignee_id: task.assignee_id ?? null }).eq("id", taskId);
        return window.alert(`Assignment was not saved: ${memberError.message}`);
      }
    }
    window.location.reload();
  };
  const deleteTask = async (task: any) => {
    if (!supabase || !canEdit() || !window.confirm(`Delete task "${task.title}"?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) return window.alert(error.message);
    window.location.reload();
  };
  const [draggedTaskId, setDraggedTaskId] = useState<string | number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  useEffect(() => {
    if (selectedProjectId === "all" && projects.length) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);
  const boardColumns = [
    { label: "Backlog", states: ["Open"] },
    { label: "In progress", states: ["In Progress"] },
    { label: "Review", states: ["In Review", "In Revision"] },
    { label: "Done", states: ["Closed", "Completed"] },
    { label: "Cancelled", states: ["Cancelled"] },
  ];
  const boardTasks = selectedProjectId === "all"
    ? tasks
    : tasks.filter((task) => task.project_id === selectedProjectId);
  if (kanban)
    return (
      <>
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-bold text-red-600">Workflow</p>
            <h1 className="mt-1 text-3xl font-black">Task board</h1>
            <p className="mt-2 text-sm text-slate-500">Choose a project to focus the board on one piece of work.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-xs font-black uppercase tracking-wide text-slate-400" htmlFor="kanban-project">Project</label>
            <select id="kanban-project" value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} className="h-11 min-w-60 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50">
              <option value="all">All projects</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-sm font-bold text-slate-600">{selectedProjectId === "all" ? "All project tasks" : projects.find((project) => project.id === selectedProjectId)?.name}</span>
          <span className="text-xs font-black text-slate-400">{boardTasks.length} {boardTasks.length === 1 ? "task" : "tasks"}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {boardColumns.map((column) => {
            const columnTasks = boardTasks.filter((task) => column.states.includes(task.state));
            return (
            <div key={column.label} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedTaskId !== null) { updateTask(draggedTaskId, column.states[0]); setDraggedTaskId(null); } }} className="min-h-[230px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-sm font-black">{column.label}</span>
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                  {columnTasks.length}
                </span>
              </div>
              <div className="space-y-3">
                {columnTasks.map((t) => (
                  <TaskCard key={t.id} t={t} people={people} updateTask={updateTask} assignTask={assignTask} deleteTask={deleteTask} editable={canEdit()} statusEditable={canChangeStatus()} onDragStart={() => setDraggedTaskId(t.id)} />
                ))}
                {!columnTasks.length && <div className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs font-semibold text-slate-400">Drop tasks here</div>}
              </div>
            </div>
            );
          })}
        </div>
      </>
    );
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Tasks</h1>
        {role !== "Team Member" && <button onClick={() => setCreating(!creating)} className="rounded-xl bg-[#e3292f] px-4 py-2.5 text-sm font-bold text-white">{creating ? "Cancel" : "+ New task"}</button>}
      </div>
      {creating && (
        <form onSubmit={createTask} className="mb-5 grid gap-3 rounded-2xl border border-red-100 bg-white p-5 md:grid-cols-4">
          <input required placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5" />
          <select required value={taskForm.projectId} onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
          <select value={taskForm.assigneeId} onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Unassigned</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>
          <input required type="date" aria-label="Task deadline" value={taskForm.deadline} onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5" />
          <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white md:col-span-4">Create task</button>
        </form>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <p className="font-bold">{t.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {t.project} · Assigned to {t.owner}
                </p>
              </div>
              <select aria-label={`Assign ${t.title}`} disabled={!canEdit()} value={t.assignee_id ?? ""} onChange={(e) => assignTask(t.id, e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold disabled:bg-slate-100 disabled:text-slate-400">
                <option value="">Unassigned</option>
                {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
              <select disabled={!canChangeStatus()} value={t.state} onChange={(e) => updateTask(t.id, e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold disabled:bg-slate-100 disabled:text-slate-400">
                {cols.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
              {canEdit() && <button onClick={() => deleteTask(t)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600">Delete</button>}
              <span
                className={`text-sm font-bold ${t.dueTone || "text-slate-500"}`}
              >
                {t.due}
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-[10px] font-black text-white">
                {t.initials}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
function TaskCard({
  t,
  people,
  updateTask,
  assignTask,
  deleteTask,
  editable,
  statusEditable,
  onDragStart,
}: {
  t: any;
  people: any[];
  updateTask: (id: string | number, state: string) => void;
  assignTask: (id: string, assigneeId: string) => void;
  deleteTask: (task: any) => void;
  editable: boolean;
  statusEditable: boolean;
  onDragStart: () => void;
}) {
  return (
    <div
      draggable={editable}
      onDragStart={onDragStart}
      className={`w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm ${editable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold leading-5">{t.title}</p>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ${t.priority === "critical" ? "bg-red-50 text-red-700" : t.priority === "high" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
          {t.priority || "normal"}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">{t.project}</p>
      <p className={`mt-1 text-xs font-semibold ${t.dueTone || "text-slate-500"}`}>
        {t.owner} · Due {t.due}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500">
          ☑ {t.checklist}
        </span>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-[9px] font-black text-white">
          {t.initials}
        </span>
      </div>
      {(editable || statusEditable) && (
        <div className="mt-3 space-y-2">
          {editable && <select aria-label={`Assign ${t.title}`} value={t.assignee_id ?? ""} onChange={(e) => assignTask(t.id, e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold"><option value="">Unassigned</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>}
          {statusEditable && <select value={t.state} onChange={(e) => updateTask(t.id, e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold">
            {["Open", "In Progress", "In Review", "In Revision", "Closed", "Cancelled", "Completed"].map((state) => <option key={state}>{state}</option>)}
          </select>}
          {editable && <button onClick={() => deleteTask(t)} className="w-full rounded-lg border border-red-200 px-2 py-1.5 text-xs font-bold text-red-600">Delete task</button>}
        </div>
      )}
    </div>
  );
}
function RevisionsView({
  projects,
  profileId,
  role,
  notify,
}: {
  projects: any[];
  profileId: string;
  role: Role;
  notify: (s: string) => void;
}) {
  const revisions = projects.flatMap((project) =>
    (project.revisions ?? []).map((revision: any) => ({
      ...revision,
      projectName: project.name,
      projectPhase: project.phase,
    })),
  );
  const updateRevision = async (revision: any, outcome: "approved" | "changes_requested") => {
    if (!supabase || !profileId || role === "Team Member") return;
    const { error } = await supabase.from("revisions").update({
      state: outcome,
      review_outcome: outcome,
      reviewed_by: profileId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", revision.id);
    if (error) return notify(error.message);
    notify(outcome === "approved" ? "Revision approved" : "Change request sent");
    window.location.reload();
  };
  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Revision review</h1>
      <p className="mb-6 text-slate-500">Review submitted project revisions and record the decision for the team.</p>
      <div className="grid gap-5 md:grid-cols-2">
        {revisions.map((revision: any) => (
          <div
            key={revision.id}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex justify-between">
              <Pill color={revision.state === "approved" ? "green" : revision.state === "changes_requested" ? "red" : "amber"}>
                {revision.state === "changes_requested" ? "Changes requested" : revision.state === "approved" ? "Approved" : "Waiting for review"}
              </Pill>
              <span className="text-sm font-black">R{revision.number}</span>
            </div>
            <h2 className="mt-4 text-lg font-black">{revision.projectName}</h2>
            <p className="mt-1 text-sm text-slate-500">{revision.projectPhase} · Submitted {revision.submitted_at ? new Date(revision.submitted_at).toLocaleDateString() : "Date not recorded"}</p>
            <div className="my-5 border-l-2 border-slate-200 pl-4 text-sm leading-6 text-slate-600">
              {revision.notes || "No revision notes were added."}
            </div>
            {revision.review_outcome && <p className="mb-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">Decision: {revision.review_outcome.replaceAll("_", " ")}</p>}
            {role !== "Team Member" && revision.state !== "approved" && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateRevision(revision, "approved")}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              >
                Approve
              </button>
              <button
                onClick={() => updateRevision(revision, "changes_requested")}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold"
              >
                Request changes
              </button>
            </div>
            )}
          </div>
        ))}
      </div>
      {!revisions.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">No revisions have been submitted for your accessible projects.</div>}
    </>
  );
}
function AttentionView({ notify }: { notify: (s: string) => void }) {
  return (
    <>
      <h1 className="mb-2 text-3xl font-black">Notifications</h1>
      <p className="mb-6 text-slate-500">
        Important changes, sorted by urgency.
      </p>
      <div className="max-w-4xl space-y-3">
        {attention.map((a) => (
          <div
            key={a.title}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"
          >
            <a.icon
              className={
                a.level === "Critical"
                  ? "text-red-600"
                  : a.level === "Warning"
                    ? "text-amber-500"
                    : "text-blue-500"
              }
            />
            <div className="flex-1">
              <p className="font-black">{a.title}</p>
              <p className="mt-1 text-sm text-slate-500">{a.detail}</p>
            </div>
            <button
              onClick={() => notify("Notification marked read")}
              className="text-sm font-black text-slate-500"
            >
              Mark read
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
function NotificationsView({
  notifications,
  setNotifications,
  notify,
}: {
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  notify: (s: string) => void;
}) {
  const markRead = async (id: string) => {
    if (!supabase) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", id);
    if (error) return notify(error.message);
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, read_at: readAt } : item));
  };
  return (
    <>
      <h1 className="mb-2 text-3xl font-black">Notifications</h1>
      <p className="mb-6 text-slate-500">Your project alerts and required actions.</p>
      <div className="max-w-4xl space-y-3">
        {notifications.map((item) => (
          <div key={item.id} className={`flex items-center gap-4 rounded-2xl border bg-white p-5 ${item.read_at ? "border-slate-200 opacity-70" : "border-red-200"}`}>
            <CircleAlert className={item.severity === "critical" ? "text-red-600" : item.severity === "warning" ? "text-amber-500" : "text-blue-500"} />
            <div className="flex-1">
              <p className="font-black">{item.title}</p>
              {item.body && <p className="mt-1 text-sm text-slate-500">{item.body}</p>}
              <p className="mt-2 text-xs font-semibold text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
            </div>
            {!item.read_at && <button onClick={() => markRead(item.id)} className="text-sm font-black text-red-600">Mark read</button>}
          </div>
        ))}
        {!notifications.length && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">No notifications yet.</div>}
      </div>
    </>
  );
}
function SettingsView({ people, notify }: { people: any[]; notify: (s: string) => void }) {
  const [members, setMembers] = useState(people);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [memberForm, setMemberForm] = useState({ name: "", email: "", role: "team_member" });
  const [teamForm, setTeamForm] = useState({ name: "", leaderId: "" });
  const [assignment, setAssignment] = useState({ teamId: "", userId: "" });
  const [creatingMember, setCreatingMember] = useState(false);
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
  const createMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setCreatingMember(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session?.access_token}` },
      body: JSON.stringify(memberForm),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setCreatingMember(false);
      return notify(result.error || "Could not create user");
    }
    setMemberForm({ name: "", email: "", role: "team_member" });
    notify("User created with temporary password #RSD2026");
    window.location.reload();
  };
  const updateMember = async (id: string, changes: Record<string, unknown>) => {
    if (!supabase) return;
    const { error } = await supabase.from("users").update(changes).eq("id", id);
    if (error) return notify(error.message);
    setMembers((items) => items.map((item) => item.id === id ? { ...item, ...changes } : item));
    notify("Member updated");
  };
  const removeMember = async (member: any) => {
    if (!supabase || !window.confirm(`Remove ${member.name}'s login and company access?`)) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session?.access_token}` },
      body: JSON.stringify({ profileId: member.id }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) return notify(result.error || "Could not remove member");
    setMembers((items) => items.filter((item) => item.id !== member.id));
    notify("Member access removed");
  };
  const createTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    const { data, error } = await supabase.from("teams").insert({ name: teamForm.name, leader_id: teamForm.leaderId || null }).select().single();
    if (error) return notify(error.message);
    setTeams((items) => [...items, data]);
    setTeamForm({ name: "", leaderId: "" });
    notify("Team created");
  };
  const addTeamMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    const { data, error } = await supabase.from("team_members").insert({ team_id: assignment.teamId, user_id: assignment.userId }).select().single();
    if (error) return notify(error.message);
    setTeamMembers((items) => [...items, data]);
    notify("Member added to team");
  };
  const removeFromTeam = async (membership: any) => {
    if (!supabase) return;
    const { error } = await supabase.from("team_members").delete().eq("id", membership.id);
    if (error) return notify(error.message);
    setTeamMembers((items) => items.filter((item) => item.id !== membership.id));
    notify("Member removed from team");
  };
  const deleteTeam = async (team: any) => {
    if (!supabase || !window.confirm(`Delete team ${team.name}?`)) return;
    const { error } = await supabase.from("teams").delete().eq("id", team.id);
    if (error) return notify(error.message);
    setTeams((items) => items.filter((item) => item.id !== team.id));
    setTeamMembers((items) => items.filter((item) => item.team_id !== team.id));
    notify("Team deleted");
  };
  return (
    <>
      <h1 className="text-3xl font-black">Admin settings</h1>
      <p className="mb-7 mt-2 text-slate-500">Manage company members, access roles, and teams.</p>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Members and roles</h2>
          <form onSubmit={createMember} className="my-5 grid gap-3 sm:grid-cols-3">
            <input required placeholder="Full name" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5" />
            <input required type="email" placeholder="Email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5" />
            <select value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="admin">Admin</option><option value="project_leader">Project Leader</option><option value="team_member">Team Member</option></select>
            <button disabled={creatingMember} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 sm:col-span-3">{creatingMember ? "Creating user..." : "Create user"}</button>
          </form>
          <p className="mb-4 text-xs text-slate-400">New users can sign in immediately with temporary password #RSD2026. Ask them to change it after first login.</p>
          <div className="space-y-2">{members.map((member) => <div key={member.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3"><div className="min-w-40 flex-1"><p className="font-bold">{member.name}</p><p className="text-xs text-slate-500">{member.email || "Email not set"}</p></div><select value={member.role} onChange={(e) => updateMember(member.id, { role: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold"><option value="admin">Admin</option><option value="project_leader">Project Leader</option><option value="team_member">Team Member</option></select><button onClick={() => updateMember(member.id, { active: !member.active })} className={`rounded-lg px-3 py-2 text-xs font-bold ${member.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{member.active ? "Active" : "Inactive"}</button>{!["Daniyal Ahmad", "Ahmad Shujaat"].includes(member.name) && <button onClick={() => removeMember(member)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Remove</button>}</div>)}</div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Teams</h2>
          <form onSubmit={createTeam} className="my-5 grid gap-3 sm:grid-cols-2"><input required placeholder="Team name" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5" /><select value={teamForm.leaderId} onChange={(e) => setTeamForm({ ...teamForm, leaderId: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Select team leader</option>{members.filter((member) => member.role !== "team_member").map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white sm:col-span-2">Create team</button></form>
          <form onSubmit={addTeamMember} className="mb-5 grid gap-3 sm:grid-cols-2"><select required value={assignment.teamId} onChange={(e) => setAssignment({ ...assignment, teamId: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Select team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select required value={assignment.userId} onChange={(e) => setAssignment({ ...assignment, userId: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Select member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><button className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold sm:col-span-2">Add member to team</button></form>
          <div className="space-y-3">{teams.map((team) => <div key={team.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="font-black">{team.name}</p><button onClick={() => deleteTeam(team)} className="text-xs font-bold text-red-600">Delete team</button></div><p className="mt-1 text-xs text-slate-500">Leader: {members.find((member) => member.id === team.leader_id)?.name || "Not assigned"}</p><div className="mt-3 flex flex-wrap gap-2">{teamMembers.filter((item) => item.team_id === team.id).map((item) => <button key={item.id} onClick={() => removeFromTeam(item)} title="Remove from team"><Pill>{members.find((member) => member.id === item.user_id)?.name || "Member"} ×</Pill></button>)}</div></div>)}</div>
        </section>
      </div>
    </>
  );
}
function GenericView({
  view,
  notify,
}: {
  view: View;
  notify: (s: string) => void;
}) {
  const copy: any = {
    Calendar: "Milestones and deadlines across every active project.",
    Team: "Availability, workload and daily status at a glance.",
    Activity: "A complete, accountable history of project changes.",
    Settings: "Manage people, roles, phases and workspace rules.",
  };
  return (
    <>
      <h1 className="text-3xl font-black">{view}</h1>
      <p className="mt-2 text-slate-500">{copy[view]}</p>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {["Today", "This week", "Coming next"].map((x, i) => (
          <button
            key={x}
            onClick={() => notify(`${view} item opened`)}
            className="min-h-40 rounded-2xl border border-slate-200 bg-white p-5 text-left"
          >
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              {x}
            </p>
            <p className="mt-6 text-lg font-black">
              {i === 0
                ? "Design review at 3:00 PM"
                : i === 1
                  ? "5 project milestones"
                  : "Team capacity check"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Open to view details and responsible team members.
            </p>
          </button>
        ))}
      </div>
    </>
  );
}
