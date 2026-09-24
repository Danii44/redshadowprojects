import { useCallback, useEffect, useRef, useState } from "react";
import type { Notification, Project, Role, Task, User } from "@/lib/types";
import { deadlineTone, getAppRole } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from "@/lib/notifications";

function mapProjects(
  projectRows: any[],
  peopleMap: Map<string, string>,
  profileId: string,
  currentRole: Role,
): Project[] {
  const visibleProjectRows = (projectRows ?? []).filter(
    (project: any) =>
      currentRole === "Admin" ||
      project.leader_id === profileId ||
      project.project_members?.some(
        (member: any) => member.user_id === profileId,
      ),
  );

  return visibleProjectRows.map((project: any) => {
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
      leader: peopleMap.get(project.leader_id) ?? "Unassigned",
      team: (project.project_members ?? []).map((member: any) =>
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
      priority:
        project.priority?.charAt(0).toUpperCase() +
          project.priority?.slice(1) || "Normal",
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
    };
  });
}

function mapTasks(
  taskRows: any[],
  projectById: Map<string, string>,
  peopleMap: Map<string, string>,
  visibleProjectIds: Set<string>,
  profileId: string,
  currentRole: Role,
): Task[] {
  const visibleTaskRows = (taskRows ?? []).filter(
    (task: any) =>
      currentRole !== "Team Member" || task.assignee_id === profileId,
  );

  return visibleTaskRows
    .filter(
      (task: any) =>
        !task.project_id || visibleProjectIds.has(task.project_id),
    )
    .map((task: any) => {
      const owner = peopleMap.get(task.assignee_id) ?? "Unassigned";
      return {
        ...task,
        title: task.title,
        project: projectById.get(task.project_id) ?? "General Task",
        owner,
        initials: String(owner)
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        state: task.status
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

/** Keep only the first occurrence of each notification id (newest first). */
function dedupeNotifications(rows: Notification[]): Notification[] {
  const seen = new Set<string>();
  const result: Notification[] = [];
  for (const row of rows) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
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
      projectRows: any[],
      taskRows: any[],
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
        projectRows,
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
          taskRows,
          projectById,
          peopleMap,
          visibleProjectIds,
          pid,
          currentRole,
        ),
      );
      if (notificationRows) {
        setNotifications(dedupeNotifications(notificationRows));
        // Mark already-loaded ids so reconnect does not re-push browser alerts
        for (const n of notificationRows) {
          if (n?.id) pushedNotifIdsRef.current.add(n.id);
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
    fetchData();
    requestBrowserNotificationPermission();
    return () => {
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
          if (!newNotif?.id) return;

          // Never add the same notification twice to the list
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return dedupeNotifications([newNotif, ...prev]);
          });

          // Browser desktop alert only once per notification id
          if (!pushedNotifIdsRef.current.has(newNotif.id)) {
            pushedNotifIdsRef.current.add(newNotif.id);
            sendBrowserNotification(newNotif.title || "Red Shadow Alert", {
              body: newNotif.body || "You have a new workspace notification.",
              tag: `rs-notif-${newNotif.id}`,
            });
          }
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
