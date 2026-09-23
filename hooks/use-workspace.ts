import { useCallback, useEffect, useState } from "react";
import type { Notification, Project, Role, Task, User } from "@/lib/types";
import { deadlineTone, getAppRole } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

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
    const currentRole = getAppRole(profile.role);
    setRole(currentRole);

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
        .order("created_at", { ascending: false }),
    ]);

    const peopleMap = new Map<string, string>(
      (peopleRows ?? []).map((person: User) => [person.id, person.name]),
    );

    const visibleProjectRows = (projectRows ?? []).filter(
      (project: any) =>
        currentRole === "Admin" ||
        project.leader_id === profile.id ||
        project.project_members?.some(
          (member: any) => member.user_id === profile.id,
        ),
    );

    const visibleProjectIds = new Set(
      visibleProjectRows.map((project: any) => project.id),
    );

    const visibleTaskRows = (taskRows ?? []).filter(
      (task: any) =>
        currentRole !== "Team Member" || task.assignee_id === profile.id,
    );

    setPeople(peopleRows ?? []);
    setNotifications(notificationRows ?? []);

    if (visibleProjectRows.length) {
      const projectById = new Map<string, string>(
        visibleProjectRows.map((project: any) => [project.id, project.name]),
      );

      setProjects(
        visibleProjectRows.map((project: any) => {
          const phase =
            project.project_phases?.find(
              (item: any) => item.state === "active",
            ) ??
            project.project_phases?.sort(
              (a: any, b: any) => a.position - b.position,
            )[0];

          return {
            ...project,
            phase: phase?.name ?? "Requirements",
            revision: project.revisions?.length
              ? `R${Math.max(
                  ...project.revisions.map((item: any) => item.number),
                )}`
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
            note:
              project.requirements ??
              project.description ??
              "No requirements added",
          };
        }),
      );

      if (visibleTaskRows.length) {
        setTasks(
          visibleTaskRows
            .filter((task: any) => visibleProjectIds.has(task.project_id))
            .map((task: any) => {
              const owner = peopleMap.get(task.assignee_id) ?? "Unassigned";
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
                  .map(
                    (part: string) =>
                      part.charAt(0).toUpperCase() + part.slice(1),
                  )
                  .join(" "),
                due: task.due_at
                  ? new Date(task.due_at).toLocaleDateString()
                  : "No deadline",
                dueTone: deadlineTone(task.due_at),
                priority: task.priority ?? "normal",
                checklist: "0/0",
              };
            }),
        );
      } else {
        setTasks([]);
      }
    } else {
      setProjects([]);
      setTasks([]);
    }

    setReady(true);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
  };
}
