"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Toast } from "@/components/ui/toast";
import { AccountPanel } from "@/components/account-panel";

// Views
import { Dashboard } from "@/components/views/dashboard";
import { ProjectsView } from "@/components/views/projects-view";
import { DailyWorkView } from "@/components/views/daily-work-view";
import { TasksView } from "@/components/views/tasks-view";
import { TaskSidePanel } from "@/components/tasks/task-side-panel";
import { RevisionsView } from "@/components/views/revisions-view";
import { NotificationsView } from "@/components/views/notifications-view";
import { CalendarView } from "@/components/views/calendar-view";
import { ReportsView } from "@/components/views/reports-view";
import { SettingsView } from "@/components/views/settings-view";

// Hooks & Types
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";
import type { View, Task } from "@/lib/types";
import type { TaskFocus } from "@/lib/task-focus";
import { accessibleTeamDirectory, scopeWorkspaceToTeam } from "@/lib/team-scope";
import { supabase } from "@/lib/supabase";
import { updateTaskWithFallback } from "@/lib/utils";

export default function Home() {
  const router = useRouter();
  const {
    ready,
    role,
    userName,
    profileId,
    authEmail,
    projects,
    tasks,
    people,
    teams,
    teamMembers,
    teamError,
    notifications,
    connectionError,
    setTasks,
    setNotifications,
    refreshData,
    scheduleRefresh,
  } = useWorkspace();

  const { toast, notify } = useToast();

  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const selectedTeam = teams.find(team => team.id === selectedTeamId);
  const teamScope = scopeWorkspaceToTeam(selectedTeam, teamMembers, tasks, projects, people);
  const relatedTeamPersonIds = accessibleTeamDirectory(role, profileId, teams, teamMembers).personIds;
  const dashboardTeamPeople = role === "Admin" ? teamScope.teamPeople : teamScope.teamPeople.filter(person => relatedTeamPersonIds.has(person.id));

  const [view, setView] = useState<View>("Dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [initialCreate, setInitialCreate] = useState(false);
  const [taskFocus, setTaskFocus] = useState<TaskFocus>("active");
  const [taskSearch, setTaskSearch] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState<
    "profile" | "password" | null
  >(null);
  const loginNotificationSentRef = useRef(false);

  const navigateToView = useCallback((next: View) => {
    setTaskSearch("");
    setTaskFocus("active");
    setSelectedTaskId(null);
    setView(next);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const openNotifications = () => navigateToView("Notifications");
    const logout = () => {
      void (async () => {
        if (!supabase) {
          notify("Could not sign out: Supabase is not configured.");
          return;
        }
        try {
          const { error } = await supabase.auth.signOut();
          if (error) {
            notify(`Could not sign out: ${error.message}`);
            return;
          }
          router.replace("/login");
        } catch (error) {
          console.error("Desktop tray sign-out failed:", error);
          notify("Could not sign out. Check your connection and try again.");
        }
      })();
    };

    window.addEventListener("redshadow:open-notifications", openNotifications);
    window.addEventListener("redshadow:logout", logout);
    return () => {
      window.removeEventListener("redshadow:open-notifications", openNotifications);
      window.removeEventListener("redshadow:logout", logout);
    };
  }, [navigateToView, notify, router]);

  // Notify user upon login / initial load if unread notifications exist
  useEffect(() => {
    if (
      !ready ||
      loginNotificationSentRef.current ||
      notifications.length === 0
    ) {
      return;
    }

    const unreadCount = notifications.filter((n) => !n.read_at).length;
    if (unreadCount > 0) {
      notify(
        `📢 Welcome back, ${userName}! You have ${unreadCount} unread ${
          unreadCount === 1 ? "notification" : "notifications"
        }.`,
      );
    }

    loginNotificationSentRef.current = true;
  }, [ready, notifications, userName, notify]);

  const openProject = (id: string) => {
    setSelectedProjectId(id);
    setSelectedTeamId("all");
    navigateToView("Projects");
  };
  const openTask = (task: Task) => {
    setDrawerTaskId(String(task.id));
  };
  const ownTasks = tasks.filter((task) => task.assignee_id === profileId);

  const updateTaskStatus = async (id: string | number, nextState: string) => {
    const current = tasks.find((task) => task.id === id);
    const databaseState = nextState.toLowerCase().replaceAll(" ", "_");

    if (role === "Team Member") {
      notify(
        "Team members submit work for review from the Daily Work page. Status changes are managed by admins and leaders.",
      );
      return;
    }

    // Optimistic UI update — show change immediately
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, state: nextState, status: databaseState } : t,
      ),
    );

    if (supabase && typeof id === "string") {
      const payload: Record<string, unknown> = {
        status: databaseState,
        updated_at: new Date().toISOString(),
      };

      if (databaseState === "in_review") {
        payload.submitted_at = new Date().toISOString();
      }
      if (databaseState === "completed" || databaseState === "closed") {
        payload.reviewed_at = new Date().toISOString();
      }

      // Team members are blocked before this point, and their task updates are enforced by RLS.
      const query = supabase.from("tasks").update(payload).eq("id", id);

      const { error } = await query;

      if (error) {
        // Rollback optimistic update
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  state: current?.state || nextState,
                  status: current?.status || databaseState,
                }
              : t,
          ),
        );
        notify(`Could not save task update: ${error.message}`);
        return;
      }
    }

    notify(`Task moved to ${nextState}`);
    // Realtime will also pick this up; light schedule keeps other views in sync
    scheduleRefresh();
  };

  const handleReviewDecision = async (
    task: {
      id: string | number;
      assignee_id?: string | null;
      title: string;
      completion_percentage?: number;
      owner?: string;
      project?: string;
    },
    nextState: "Completed" | "Open",
  ) => {
    if (!task || !supabase || role === "Team Member") {
      return;
    }

    const currentTask = tasks.find((item) => item.id === task.id);
    const databaseState = nextState.toLowerCase();
    const actionLabel =
      nextState === "Completed"
        ? "approved and marked complete"
        : "sent back to Open for rework";

    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id
          ? {
              ...item,
              state: nextState,
              status: databaseState,
              completion_percentage:
                nextState === "Completed"
                  ? 100
                  : (item.completion_percentage ?? 60),
              reviewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : item,
      ),
    );

    const { error } = await updateTaskWithFallback(supabase, task.id, {
      status: databaseState,
      completion_percentage:
        nextState === "Completed" ? 100 : (task.completion_percentage ?? 60),
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id
            ? {
                ...item,
                state: currentTask?.state ?? item.state,
                status: currentTask?.status ?? item.status,
                completion_percentage:
                  currentTask?.completion_percentage ??
                  item.completion_percentage,
              }
            : item,
        ),
      );
      notify(`Could not update review: ${error.message}`);
      return;
    }

    if (task.assignee_id) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: task.assignee_id,
          type: nextState === "Open" ? "task_rework" : "task_approved",
          severity: nextState === "Open" ? "warning" : "success",
          title:
            nextState === "Open" ? "Task returned for rework" : "Task approved",
          body:
            nextState === "Open"
              ? `"${task.title}" was sent back to Open. Please update it and resubmit for review.`
              : `"${task.title}" was approved and marked complete. Great work!`,
          entity_type: "task",
          entity_id: String(task.id),
          actor_id: profileId,
        });

      if (notifError) {
        console.error(
          nextState === "Open"
            ? "Task rework notification failed:"
            : "Task approval notification failed:",
          notifError.message,
        );
      }
    }

    notify(`Task ${actionLabel}`);
    scheduleRefresh();
  };

  // Prefer debounced refresh for mutations; full refresh still available
  const onRefresh = scheduleRefresh ?? refreshData;

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red border-t-transparent" />
          <span className="text-sm font-semibold tracking-wide text-secondary-foreground">
            Loading Red Shadow workspace...
          </span>
        </div>
      </main>
    );
  }

  if (connectionError) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-5 text-foreground">
        <section className="max-w-lg rounded-3xl border border-red bg-red-strong p-8">
          <h1 className="text-xl font-semibold">Workspace unavailable</h1>
          <p className="mt-3 leading-7 text-secondary-foreground">{connectionError}</p>
          <button className="mt-4 rounded-lg bg-card px-4 py-2 text-foreground" onClick={() => void refreshData()}>Retry loading workspace</button>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#workspace-main"
        className="skip-link rounded-xl bg-card px-4 py-3 font-medium shadow-lg"
      >
        Skip to content
      </a>
      <Sidebar
        role={role}
        view={view}
        setView={navigateToView}
        userName={userName}
        avatarUrl={people.find((person) => person.id === profileId)?.avatar_url}
        notifications={notifications}
        myTaskCount={ownTasks.filter(task => !["Completed", "Closed", "Cancelled"].includes(task.state)).length}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        setAccountPanel={setAccountPanel}
      />

      <main inert={menuOpen} className="min-w-0 lg:pl-[232px]">
        <Header
          view={view}
          menuOpen={menuOpen}
          role={role}
          userName={userName}
          currentUser={people.find((person) => person.id === profileId)}
          projects={projects}
          tasks={tasks}
          people={people}
          onProject={openProject}
          onTask={openTask}
          setAccountPanel={setAccountPanel}
          setView={navigateToView}
          notifications={notifications}
          setMenuOpen={setMenuOpen}
        />

        <div
          id="workspace-main"
          tabIndex={-1}
          className="workspace-content mx-auto max-w-[1600px] p-4 pb-10 sm:p-6 lg:px-7 lg:py-7"
        >
          {!["Settings", "Team", "Notifications", "Tasks", "My Tasks"].includes(view) && (
            <section className="mb-4 flex flex-wrap items-center justify-between gap-3" aria-label="Team workspace filter">
              <div className="min-w-0">
                <label htmlFor="workspace-team" className="text-sm font-semibold text-foreground">Department team</label>
                <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
                  {teamError || (selectedTeam ? `Viewing ${selectedTeam.name}` : role === "Admin" ? "All departments" : "Your teams and assigned projects")}
                </p>
              </div>
              <select id="workspace-team" value={selectedTeam?.id ?? "all"}
                onChange={event => { setSelectedTeamId(event.target.value); setSelectedProjectId(null); setSelectedTaskId(null); setTaskSearch(""); }}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground sm:w-auto sm:max-w-xs">
                <option value="all">{role === "Admin" ? "All teams" : "My teams and projects"}</option>
                {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </section>
          )}
          <div key={view} className="workspace-view">
            {view === "Dashboard" && (
              <Dashboard
                teamName={selectedTeam?.name ?? "All departments"}
                teamPeople={dashboardTeamPeople}
                onTaskQueue={focus => { navigateToView(role === "Team Member" ? "My Tasks" : "Tasks"); setTaskFocus(focus); }}
                onOpenTask={openTask}
                role={role}
                projects={teamScope.projects}
                tasks={teamScope.tasks}
                people={teamScope.people}
                onCreateProject={() => {
                  setInitialCreate(true);
                  navigateToView("Projects");
                }}
                profileId={profileId}
                userName={userName}
                setView={navigateToView}
                notify={notify}
                onRefresh={onRefresh}
                onReviewDecision={handleReviewDecision}
                onSelectProject={(id: string) => {
                  setSelectedProjectId(id);
                  navigateToView("Projects");
                }}
              />
            )}

            {view === "Projects" && (
              <ProjectsView
                projects={teamScope.projects}
                role={role}
                people={teamScope.people}
                profileId={profileId}
                notify={notify}
                onRefresh={onRefresh}
                initialCreate={initialCreate}
                onClearInitialCreate={() => setInitialCreate(false)}
                initialProjectId={selectedProjectId}
                onClearInitialProject={() => setSelectedProjectId(null)}
              />
            )}

            {view === "Daily Work" && (
              <DailyWorkView
                onOpenTask={openTask}
                tasks={teamScope.tasks}
                projects={teamScope.projects}
                people={teamScope.people}
                profileId={profileId}
                userName={userName}
                role={role}
                notify={notify}
                onRefresh={onRefresh}
              />
            )}

            {(view === "Tasks" || view === "My Tasks") && (
              <TasksView
                onOpenTask={openTask}
                key={`${view}-${selectedTeam?.id ?? "all"}-${selectedTaskId ?? "all"}-${taskFocus}`}
                initialTaskId={view === "Tasks" ? selectedTaskId : null}
                title={view}
                initialFocus={taskFocus}
                initialSearch={view === "Tasks" ? taskSearch : ""}
                tasks={view === "My Tasks" ? ownTasks : tasks}
                teams={teams}
                teamMembers={teamMembers}
                selectedTeamId={selectedTeam?.id ?? "all"}
                onTeamChange={setSelectedTeamId}
                projects={teamScope.projects}
                people={teamScope.people}
                profileId={profileId}
                role={role}
                updateTask={updateTaskStatus}
                notify={notify}
                onRefresh={onRefresh}
              />
            )}

            {view === "Calendar" && (
              <CalendarView
                onOpenTask={openTask}
                projects={teamScope.projects}
                tasks={teamScope.tasks}
                onSelectProject={openProject}
                onTasks={() => navigateToView("Tasks")}
              />
            )}
            {view === "Reports" && (
              <ReportsView
                projects={teamScope.projects}
                tasks={teamScope.tasks}
                people={teamScope.people}
                onTeam={
                  role !== "Team Member"
                    ? () => navigateToView("Team")
                    : undefined
                }
              />
            )}

            {view === "Revisions" && (
              <RevisionsView
                projects={teamScope.projects}
                tasks={teamScope.tasks}
                profileId={profileId}
                role={role}
                notify={notify}
                onRefresh={onRefresh}
              />
            )}

            {view === "Notifications" && (
              <NotificationsView
                notifications={notifications}
                setNotifications={setNotifications}
                notify={notify}
              />
            )}

            {(view === "Settings" || view === "Team") &&
              (role === "Admin" || role === "Project Leader") && (
                <SettingsView
                  section={view === "Settings" ? "Settings" : "Team"}
                  onOpenTeam={() => navigateToView("Team")}
                  people={people}
                  projects={projects}
                  tasks={tasks}
                  role={role}
                  notify={notify}
                  onRefresh={onRefresh}
                />
              )}
          </div>
        </div>
      </main>

      {menuOpen && (
        <button
          aria-label="Close navigation"
          className="workspace-scrim fixed inset-0 z-30 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <Toast message={toast} />
      {drawerTaskId && tasks.find(task => String(task.id) === drawerTaskId) && (
        <TaskSidePanel
          task={tasks.find(task => String(task.id) === drawerTaskId)!}
          projects={projects} people={people} profileId={profileId} role={role}
          onClose={() => setDrawerTaskId(null)} updateTask={updateTaskStatus}
          notify={notify} onRefresh={onRefresh} onReviewDecision={handleReviewDecision}
        />
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
