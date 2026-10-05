"use client";

import { useEffect, useRef, useState } from "react";
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
import { supabase } from "@/lib/supabase";
import { updateTaskWithFallback } from "@/lib/utils";

export default function Home() {
  const {
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
    refreshData,
    scheduleRefresh,
  } = useWorkspace();

  const { toast, notify } = useToast();

  const [view, setView] = useState<View>("Dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [initialCreate, setInitialCreate] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState<
    "profile" | "password" | null
  >(null);
  const loginNotificationSentRef = useRef(false);

  const navigateToView = (next: View) => {
    setTaskSearch("");
    setSelectedTaskId(null);
    setView(next);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

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
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          <span className="text-sm font-semibold tracking-wide text-slate-600">
            Loading Red Shadow workspace...
          </span>
        </div>
      </main>
    );
  }

  if (connectionError) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-5 text-foreground">
        <section className="max-w-lg rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
          <h1 className="text-xl font-semibold">Account setup incomplete</h1>
          <p className="mt-3 leading-7 text-slate-600">{connectionError}</p>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#workspace-main"
        className="skip-link rounded-xl bg-white px-4 py-3 font-medium shadow-lg"
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
          <div key={view} className="workspace-view">
            {view === "Dashboard" && (
              <Dashboard
                onOpenTask={openTask}
                role={role}
                projects={projects}
                tasks={tasks}
                people={people}
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
                projects={projects}
                role={role}
                people={people}
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
                tasks={tasks}
                projects={projects}
                people={people}
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
                key={`${view}-${selectedTaskId ?? "all"}`}
                initialTaskId={view === "Tasks" ? selectedTaskId : null}
                title={view}
                initialSearch={view === "Tasks" ? taskSearch : ""}
                tasks={view === "My Tasks" ? ownTasks : tasks}
                projects={projects}
                people={people}
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
                projects={projects}
                tasks={tasks}
                onSelectProject={openProject}
                onTasks={() => navigateToView("Tasks")}
              />
            )}
            {view === "Reports" && (
              <ReportsView
                projects={projects}
                tasks={tasks}
                people={people}
                onTeam={
                  role !== "Team Member"
                    ? () => navigateToView("Team")
                    : undefined
                }
              />
            )}

            {view === "Revisions" && (
              <RevisionsView
                projects={projects}
                tasks={tasks}
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
