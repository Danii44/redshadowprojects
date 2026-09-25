import { useCallback, useEffect, useRef, useState } from "react";
import type { Notification, Project, Role, Task, User } from "@/lib/types";
import { deadlineTone, getAppRole } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { sendBrowserNotification } from "@/lib/notifications";

type ProjectMemberRow = { user_id: string };
type ProjectPhaseRow = { state?: string; name?: string; position: number };
type ProjectRevisionRow = { number: number };
type ProjectRow = {
  id: string;
  leader_id?: string | null;
  project_members?: ProjectMemberRow[];
  project_phases?: ProjectPhaseRow[];
  revisions?: ProjectRevisionRow[];
  name: string;
  code?: string | null;
  client?: string | null;
  type?: string | null;
  project_type?: string;
  description?: string | null;
  requirements?: string | null;
  internal_notes?: string | null;
  status?: string | null;
  priority?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  completion_percentage?: number | null;
  last_activity_at?: string | null;
  archived_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};
type TaskRowData = {
  id: string | number;
  project_id?: string | null;
  assignee_id?: string | null;
  title: string;
  status?: string | null;
  due_at?: string | null;
  priority?: string | null;
  completion_percentage?: number | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  owner?: string;
};

function mapProjects(
  projectRows: ProjectRow[],
  peopleMap: Map<string, string>,
  profileId: string,
  currentRole: Role,
): Project[] {
  const visibleProjectRows = (projectRows ?? []).filter(
    (project: ProjectRow) =>
      currentRole === "Admin" ||
      project.leader_id === profileId ||
      project.project_members?.some(
        (member: ProjectMemberRow) => member.user_id === profileId,
      ),
  );

  return visibleProjectRows.map((project: ProjectRow) => {
    const leaderId = project.leader_id ?? "";
    const sortedPhases = [...(project.project_phases ?? [])].sort(
      (a: ProjectPhaseRow, b: ProjectPhaseRow) => a.position - b.position,
    );
    const phase =
      project.project_phases?.find((item: ProjectPhaseRow) => item.state === "active") ??
      sortedPhases[0];
    const normalizedPriority = project.priority?.trim() || "normal";
    const displayPriority =
      normalizedPriority.charAt(0).toUpperCase() + normalizedPriority.slice(1);

    return {
      id: project.id,
      code: project.code ?? "",
      name: project.name,
      client: project.client ?? null,
      type: project.type ?? null,
      project_type: project.project_type ?? "fixed_deadline",
      description: project.description ?? null,
      requirements: project.requirements ?? null,
      internal_notes: project.internal_notes ?? null,
      status: project.status ?? "open",
      priority: displayPriority,
      leader_id: project.leader_id ?? null,
      start_date: project.start_date ?? null,
      deadline: project.deadline ?? null,
      completion_percentage: project.completion_percentage ?? undefined,
      last_activity_at: project.last_activity_at ?? null,
      archived_at: project.archived_at ?? null,
      created_at: project.created_at ?? undefined,
      updated_at: project.updated_at ?? undefined,
      phase: phase?.name ?? "Requirements",
      revision: project.revisions?.length
        ? `R${Math.max(...project.revisions.map((item: ProjectRevisionRow) => item.number))}`
        : "No revision",
      leader: peopleMap.get(leaderId) ?? "Unassigned",
      team: (project.project_members ?? []).map((member: ProjectMemberRow) =>
        String(peopleMap.get(member.user_id) ?? "TM")
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      ),
      due:
        project.project_type === "hourly_ongoing"
          ? "Hourly Track"
          : project.deadline
            ? new Date(project.deadline).toLocaleDateString()
            : "No deadline",
      deadlineTone: deadlineTone(project.deadline, project.project_type),
      color:
        project.priority === "critical"
          ? "#ef4444"
          : project.priority === "high"
            ? "#f59e0b"
            : "#3b82f6",
      note:
        project.requirements ??
        project.description ??
        "No requirements added",
    } as Project;
  });
}

function mapTasks(
  taskRows: TaskRowData[],
  projectById: Map<string, string>,
  peopleMap: Map<string, string>,
  visibleProjectIds: Set<string>,
  profileId: string,
  currentRole: Role,
): Task[] {
  const visibleTaskRows = (taskRows ?? []).filter(
    (task: TaskRowData) =>
      currentRole !== "Team Member" || task.assignee_id === profileId,
  );

  return visibleTaskRows
    .filter(
      (task: TaskRowData) =>
        !task.project_id || visibleProjectIds.has(task.project_id),
    )
    .map((task: TaskRowData) => {
      const owner = peopleMap.get(task.assignee_id ?? "") ?? "Unassigned";
      const projectId = task.project_id ?? "";
      const status = task.status ?? "open";

      return {
        ...task,
        id: String(task.id),
        title: task.title,
        status,
        completion_percentage: task.completion_percentage ?? undefined,
        created_by: task.created_by ?? profileId,
        project: projectById.get(projectId) ?? "General Task",
        owner,
        initials: String(owner)
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        state: status
          .split("_")
          .map(
            (part: string) => part.charAt(0).toUpperCase() + part.slice(1),
          )
          .join(" "),
        due: task.due_at
          ? new Date(task.due_at).toLocaleDateString()
          : "No deadline",
        dueTone: deadlineTone(task.due_at),
        priority: task.priority ?? "normal",
        checklist: "0/0",
      };
    });
}

/** Deduplicate notifications by id and by the intended event payload.
 * This avoids duplicate rows when the same task/project update can trigger
 * multiple realtime or refetch events in quick succession.
 */
function notificationSignature(row: Partial<Notification>): string {
  return [
    row.user_id ?? "",
    row.type ?? "",
    row.title ?? "",
    row.body ?? "",
    row.entity_type ?? "",
    row.entity_id ?? "",
    row.actor_id ?? "",
    row.created_at ?? "",
  ].join("|");
}

function dedupeNotifications(rows: Notification[]): Notification[] {
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: Notification[] = [];

  for (const row of rows) {
    if (!row) continue;

    const signature = notificationSignature(row);
    if (row.id && seenIds.has(row.id)) continue;
    if (!row.id && seenSignatures.has(signature)) continue;

    if (row.id) seenIds.add(row.id);
    seenSignatures.add(signature);
    result.push(row);
  }

  return result;
}

export function useWorkspace() {
  const [role, setRole] = useState<Role>("Admin");
  const [userName, setUserName] = useState("Team member");
  const [profileId, setProfileId] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [ready, setReady] = useState(false);
  const [connectionError, setConnectionError] = useState("");

  // Refs so realtime handlers always see latest values without re-subscribing
  const peopleMapRef = useRef<Map<string, string>>(new Map());
  const profileIdRef = useRef("");
  const roleRef = useRef<Role>("Admin");
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Ids already shown as browser desktop notifications this session */
  const pushedNotifIdsRef = useRef<Set<string>>(new Set());

  const applyData = useCallback(
    (
      projectRows: ProjectRow[],
      taskRows: TaskRowData[],
      peopleRows: User[],
      notificationRows?: Notification[],
    ) => {
      const peopleMap = new Map<string, string>(
        (peopleRows ?? []).map((person: User) => [person.id, person.name]),
      );
      peopleMapRef.current = peopleMap;

      const currentRole = roleRef.current;
      const pid = profileIdRef.current;

      const mappedProjects = mapProjects(
        projectRows as ProjectRow[],
        peopleMap,
        pid,
        currentRole,
      );
      const visibleProjectIds = new Set(mappedProjects.map((p) => p.id));
      const projectById = new Map(
        mappedProjects.map((p) => [p.id, p.name]),
      );

      setPeople(peopleRows ?? []);
      setProjects(mappedProjects);
      setTasks(
        mapTasks(
          taskRows as TaskRowData[],
          projectById,
          peopleMap,
          visibleProjectIds,
          pid,
          currentRole,
        ),
      );
      if (notificationRows) {
        const dedupedRows = dedupeNotifications(notificationRows);
        setNotifications(dedupedRows);
        // Mark loaded notifications as already delivered so a refresh does not
        // replay the same browser desktop alert for each row in the list.
        for (const n of dedupedRows) {
          if (n?.id) pushedNotifIdsRef.current.add(n.id);
          pushedNotifIdsRef.current.add(notificationSignature(n));
        }
      }
    },
    [],
  );

  const fetchData = useCallback(async () => {
    const client = supabase;
    if (!client) return;

    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      // Redirect back to the login page when the session has expired.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
      return;
    }

    setAuthEmail(sessionData.session.user.email ?? "");

    const { data: profile } = await client
      .from("users")
      .select("id,role,name")
      .eq("auth_user_id", sessionData.session.user.id)
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
    profileIdRef.current = profile.id;
    const currentRole = getAppRole(profile.role);
    setRole(currentRole);
    roleRef.current = currentRole;

    const [
      { data: projectRows },
      { data: taskRows },
      { data: peopleRows },
      { data: notificationRows },
    ] = await Promise.all([
      client
        .from("projects")
        .select("*, project_phases(*), project_members(user_id), revisions(*)"),
      client.from("tasks").select("*"),
      client.from("users").select("id,name,email,role,active").eq("active", true),
      client
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    applyData(
      projectRows ?? [],
      taskRows ?? [],
      peopleRows ?? [],
      notificationRows ?? [],
    );
    setReady(true);
  }, [applyData]);

  /** Debounced full refresh — batches rapid mutations into one fetch */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      fetchData();
    }, 400);
  }, [fetchData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);

    // Do NOT request notification permission here — browsers require a user click.
    return () => {
      window.clearTimeout(timer);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [fetchData]);

  // Realtime: projects + tasks + notifications
  useEffect(() => {
    if (!supabase || !profileId) return;

    const channel = supabase
      .channel(`workspace-${profileId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_members" },
        () => scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_phases" },
        () => scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "revisions" },
        () => scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          if (!newNotif?.title) return;

          const signature = notificationSignature(newNotif);
          const notificationKey = newNotif.id || signature;

          setNotifications((prev) => {
            const alreadyPresent = prev.some(
              (n) =>
                (n.id && newNotif.id && n.id === newNotif.id) ||
                notificationSignature(n) === signature,
            );

            if (alreadyPresent) return prev;
            return dedupeNotifications([newNotif, ...prev]);
          });

          const alreadyPushed =
            pushedNotifIdsRef.current.has(notificationKey) ||
            pushedNotifIdsRef.current.has(signature) ||
            pushedNotifIdsRef.current.has(newNotif.id ?? "");

          if (!alreadyPushed) {
            pushedNotifIdsRef.current.add(notificationKey);
            sendBrowserNotification(newNotif.title || "Red Shadow Alert", {
              body: newNotif.body || "You have a new workspace notification.",
              tag: `rs-notif-${notificationKey}`,
            });
          }

          scheduleRefresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          if (!updated?.id) return;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)),
          );
          scheduleRefresh();
        },
      )
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, [profileId, scheduleRefresh]);

  return {
    ready,
    role,
    userName,
    profileId,
    authEmail,
    projects,
    tasks,
    people,
    notifications,
    connectionError,
    setTasks,
    setNotifications,
    refreshData: fetchData,
    scheduleRefresh,
  };
}
