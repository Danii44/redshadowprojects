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
  Command,
  FileClock,
  LayoutDashboard,
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
];
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
  const [connectionError, setConnectionError] = useState("");
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const vp = liveProjects;
  const vt = tasks;
  const filtered = vp.filter((p) =>
    (p.name + p.client + p.code).toLowerCase().includes(query.toLowerCase()),
  );
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 2400);
  };
  const updateTask = async (id: string | number) => {
    const current = tasks.find((task) => task.id === id);
    const nextState = current?.state === "Review" ? "Done" : "Review";
    setTasks((v) =>
      v.map((t) =>
        t.id === id
          ? { ...t, state: nextState }
          : t,
      ),
    );
    if (supabase && typeof id === "string") {
      const databaseState =
        nextState === "Done" ? "done" : nextState === "Review" ? "review" : "in_progress";
      const { error } = await supabase
        .from("tasks")
        .update({
          status: databaseState,
          submitted_at: databaseState === "review" ? new Date().toISOString() : null,
          reviewed_at: databaseState === "done" ? new Date().toISOString() : null,
        })
        .eq("id", id);
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
    notify("Task moved to review");
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
      if (profile?.role === "project_leader") setRole("Project Leader");
      else if (profile?.role === "team_member") setRole("Team Member");
      else setRole("Admin");
      const [{ data: projectRows }, { data: taskRows }, { data: people }] =
        await Promise.all([
          client
            .from("projects")
            .select("*, project_phases(*), project_members(user_id)"),
          client.from("tasks").select("*"),
          client.from("users").select("id,name"),
        ]);
      if (!mounted) return;
      const peopleById = new Map(
        (people ?? []).map((person: any) => [person.id, person.name]),
      );
      if (projectRows?.length) {
        const projectById = new Map(
          projectRows.map((project: any) => [project.id, project.name]),
        );
        setLiveProjects(
          projectRows.map((project: any) => {
            const phase =
              project.project_phases?.find((item: any) => item.state === "active") ??
              project.project_phases?.sort(
                (a: any, b: any) => a.position - b.position,
              )[0];
            return {
              ...project,
              phase: phase?.name ?? "Requirements",
              revision: "R1",
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
        if (taskRows?.length) {
          setTasks(
            taskRows.map((task: any) => {
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
                state:
                  task.status === "in_progress"
                    ? "In Progress"
                    : task.status === "todo"
                      ? "To Do"
                      : task.status.charAt(0).toUpperCase() + task.status.slice(1),
                due: task.due_at
                  ? new Date(task.due_at).toLocaleDateString()
                  : "No deadline",
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
            {nav.map((n) => (
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
                      4
                    </span>
                  )}
                </button>
              </div>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-4 left-3 right-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-red-100 text-xs font-black text-red-700">
              DR
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{userName}</p>
              <p className="text-xs text-white/40">{role}</p>
            </div>
            <ChevronDown className="ml-auto text-white/30" size={16} />
          </div>
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
              onClick={() => setView("Tasks")}
              className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white"
              aria-label="Open tasks requiring attention"
            >
              <Bell size={19} />
              {tasks.some((task) => task.state === "Blocked" || task.state === "Review") && (
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
            <ProjectsView projects={filtered} notify={notify} />
          )}{" "}
          {(view === "Tasks" || view === "Kanban") && (
            <TasksView
              tasks={vt}
              kanban={view === "Kanban"}
              updateTask={updateTask}
            />
          )}{" "}
          {view === "Revisions" && <RevisionsView notify={notify} />}{" "}
          {view === "Notifications" && <AttentionView notify={notify} />}{" "}
          {![
            "Dashboard",
            "Projects",
            "Tasks",
            "Kanban",
            "Revisions",
            "Notifications",
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
    </div>
  );
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
  const liveAttention = tasks
    .filter((task) => task.state === "Blocked" || task.state === "Review")
    .slice(0, role === "Team Member" ? 2 : 4)
    .map((task) => ({
      level: task.state === "Blocked" ? "Critical" : "Warning",
      icon: task.state === "Blocked" ? CircleAlert : FileClock,
      title: task.title,
      detail: `${task.project} · ${task.state}`,
      action: "View task",
    }));
  const workload = Array.from(
    tasks.reduce(
      (map, task) => {
        const owner = task.owner || "Unassigned";
        const current = map.get(owner) ?? {
          name: owner,
          initials: task.initials || "TM",
          count: 0,
          blocked: false,
        };
        current.count += 1;
        if (task.state === "Blocked") current.blocked = true;
        map.set(owner, current);
        return map;
      },
      new Map<
        string,
        { name: string; initials: string; count: number; blocked: boolean }
      >(),
    ).values(),
  ).slice(0, 5);
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
            {role === "Team Member"
              ? "Your work, clearly lined up."
              : role === "Project Leader"
                ? "Your projects need attention."
                : "Company command center"}
          </h1>
          <p className="mt-2 text-slate-500">
            {role === "Admin"
              ? `${projects.length} active projects are visible across the company.`
              : role === "Project Leader"
                ? "Two projects are moving; one decision is waiting on you."
                : "Focus on the next right task. Your team can see your updates."}
          </p>
        </div>
      </section>
      <section className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          [String(projects.length), "Active projects", "blue"],
          [String(tasks.filter((task) => task.state === "Review").length), "In review", "purple"],
          [String(projects.filter((project) => project.phase === "Client Review").length), "Waiting on client", "amber"],
          [String(tasks.filter((task) => task.state === "Blocked").length), "Blocked tasks", "red"],
          [String(tasks.filter((task) => task.state !== "Done").length), "Open tasks", "green"],
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
                onClick={() => notify(a.action)}
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
            <h2 className="font-black">Active projects</h2>
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
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: p.color }}
        />
      </div>
      <h3 className="font-black">{p.name}</h3>
      <p className="mt-1 text-sm text-slate-500">{p.client}</p>
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
  notify,
}: {
  projects: any[];
  notify: (s: string) => void;
}) {
  const [selected, setSelected] = useState(projects[0]);
  return (
    <>
      <p className="text-sm font-bold text-red-600">Portfolio</p>
      <h1 className="mb-6 text-3xl font-black">Projects</h1>
      <div className="grid gap-6 xl:grid-cols-[.8fr_1.4fr]">
        <div className="space-y-3">
          {projects.map((p) => (
            <button
              key={p.name}
              onClick={() => setSelected(p)}
              className={`w-full rounded-2xl border bg-white p-4 text-left ${selected?.name === p.name ? "border-red-300 ring-4 ring-red-50" : "border-slate-200"}`}
            >
              <div className="flex justify-between">
                <span className="text-xs font-bold text-slate-400">
                  {p.code}
                </span>
                <Pill
                  color={
                    p.priority === "Critical"
                      ? "red"
                      : p.priority === "High"
                        ? "amber"
                        : "slate"
                  }
                >
                  {p.priority}
                </Pill>
              </div>
              <h3 className="mt-2 font-black">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {p.phase} · {p.revision}
              </p>
            </button>
          ))}
        </div>
        {selected && (
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <span className="text-xs font-black text-red-600">
                  {selected.code}
                </span>
                <h2 className="mt-1 text-2xl font-black">{selected.name}</h2>
                <p className="mt-1 text-slate-500">
                  {selected.client} · Led by {selected.leader}
                </p>
              </div>
              <button
                onClick={() => notify("Project status updated")}
                className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"
              >
                Update status
              </button>
            </div>
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
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}
function TasksView({
  tasks,
  kanban,
  updateTask,
}: {
  tasks: any[];
  kanban: boolean;
  updateTask: (id: string | number) => void;
}) {
  const cols = ["To Do", "In Progress", "Review", "Blocked", "Done"];
  if (kanban)
    return (
      <>
        <h1 className="mb-6 text-3xl font-black">Task board</h1>
        <div className="grid gap-4 overflow-x-auto pb-3 md:grid-cols-3 xl:grid-cols-5">
          {cols.map((c) => (
            <div key={c} className="min-w-[250px] rounded-2xl bg-slate-100 p-3">
              <div className="mb-3 flex justify-between px-1">
                <span className="text-sm font-black">{c}</span>
                <span className="text-xs font-bold text-slate-400">
                  {tasks.filter((t) => t.state === c).length}
                </span>
              </div>
              {tasks
                .filter((t) => t.state === c)
                .map((t) => (
                  <TaskCard key={t.id} t={t} updateTask={updateTask} />
                ))}
            </div>
          ))}
        </div>
      </>
    );
  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Tasks</h1>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
            >
              <button
                onClick={() => updateTask(t.id)}
                className="grid h-6 w-6 place-items-center rounded-md border-2 border-slate-300"
              >
                <Check size={13} className="text-transparent" />
              </button>
              <div className="flex-1">
                <p className="font-bold">{t.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {t.project} · {t.checklist} checklist
                </p>
              </div>
              <Pill
                color={
                  t.state === "Blocked"
                    ? "red"
                    : t.state === "Review"
                      ? "purple"
                      : t.state === "In Progress"
                        ? "blue"
                        : "slate"
                }
              >
                {t.state}
              </Pill>
              <span
                className={`text-sm font-bold ${t.due.includes("overdue") ? "text-red-600" : "text-slate-500"}`}
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
  updateTask,
}: {
  t: any;
  updateTask: (id: string | number) => void;
}) {
  return (
    <button
      onClick={() => updateTask(t.id)}
      className="mb-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm"
    >
      <p className="text-sm font-bold leading-5">{t.title}</p>
      <p className="mt-2 text-xs text-slate-400">{t.project}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500">
          ☑ {t.checklist}
        </span>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-[9px] font-black text-white">
          {t.initials}
        </span>
      </div>
    </button>
  );
}
function RevisionsView({ notify }: { notify: (s: string) => void }) {
  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Revision review</h1>
      <div className="grid gap-5 md:grid-cols-2">
        {projects.slice(0, 3).map((p, i) => (
          <div
            key={p.name}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex justify-between">
              <Pill color={i === 1 ? "amber" : "blue"}>
                {i === 1 ? "Waiting for review" : "In progress"}
              </Pill>
              <span className="text-sm font-black">{p.revision}</span>
            </div>
            <h2 className="mt-4 text-lg font-black">{p.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{p.phase}</p>
            <div className="my-5 border-l-2 border-slate-200 pl-4 text-sm leading-6 text-slate-600">
              {p.note}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => notify("Revision approved")}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              >
                Approve
              </button>
              <button
                onClick={() => notify("Change request created")}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold"
              >
                Request changes
              </button>
            </div>
          </div>
        ))}
      </div>
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

