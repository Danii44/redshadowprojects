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
import { RevisionsView } from "@/components/views/revisions-view";
import { NotificationsView } from "@/components/views/notifications-view";
import { SettingsView } from "@/components/views/settings-view";

// Hooks & Types
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";
import type { View } from "@/lib/types";
import { supabase } from "@/lib/supabase";

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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState<"profile" | "password" | null>(
    null,
  );
  const loginNotificationSentRef = useRef(false);

  // Notify user upon login / initial load if unread notifications exist
  useEffect(() => {
    if (!ready || loginNotificationSentRef.current || notifications.length === 0) {
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

  const filteredProjects = projects.filter((p) =>
    (p.name + (p.client ?? "") + p.code)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const updateTaskStatus = async (id: string | number, nextState: string) => {
    const current = tasks.find((task) => task.id === id);
    const databaseState = nextState.toLowerCase().replaceAll(" ", "_");

    if (role === "Team Member") {
      notify("Team members submit work for review from the Daily Work page. Status changes are managed by admins and leaders.");
      return;
    }

    // Optimistic UI update — show change immediately
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, state: nextState, status: databaseState }
          : t,
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
    task: { id: string | number; assignee_id?: string | null; title: string; completion_percentage?: number; owner?: string; project?: string },
    nextState: "Completed" | "Open",
  ) => {
    if (!task || !supabase || role === "Team Member") {
      return;
    }

    const currentTask = tasks.find((item) => item.id === task.id);
    const databaseState = nextState.toLowerCase();
    const actionLabel = nextState === "Completed" ? "approved and marked complete" : "sent back to Open for rework";

    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id
          ? {
              ...item,
              state: nextState,
              status: databaseState,
              completion_percentage:
                nextState === "Completed" ? 100 : item.completion_percentage ?? 60,
              reviewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : item,
      ),
    );

    const { error } = await supabase
      .from("tasks")
      .update({
        status: databaseState,
        completion_percentage:
          nextState === "Completed" ? 100 : task.completion_percentage ?? 60,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (error) {
      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id
            ? {
                ...item,
                state: currentTask?.state ?? item.state,
                status: currentTask?.status ?? item.status,
                completion_percentage:
                  currentTask?.completion_percentage ?? item.completion_percentage,
              }
            : item,
        ),
      );
      notify(`Could not update review: ${error.message}`);
      return;
    }

    if (nextState === "Open" && task.assignee_id) {
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: task.assignee_id,
        type: "task_rework",
        severity: "warning",
        title: "Task returned for rework",
        body: `"${task.title}" was sent back to Open. Please update it and resubmit for review.`,
        entity_type: "task",
        entity_id: String(task.id),
        actor_id: profileId,
      });

      if (notifError) {
        console.error("Task rework notification failed:", notifError.message);
      }
    }

    notify(`Task ${actionLabel}`);
    scheduleRefresh();
  };

  // Prefer debounced refresh for mutations; full refresh still available
  const onRefresh = scheduleRefresh ?? refreshData;

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#111419] text-white">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          <span className="text-sm font-semibold tracking-wide text-white/70">
            Loading Red Shadow workspace...
          </span>
        </div>
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
      <Sidebar
        role={role}
        view={view}
        setView={setView}
        userName={userName}
        notifications={notifications}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        setAccountPanel={setAccountPanel}
      />

      <main className="lg:pl-[248px]">
        <Header
          role={role}
          query={query}
          setQuery={setQuery}
          setView={setView}
          notifications={notifications}
          setMenuOpen={setMenuOpen}
        />

        <div className="mx-auto max-w-[1500px] p-4 sm:p-7 lg:p-9">
          {view === "Dashboard" && (
            <Dashboard
              role={role}
              projects={projects}
              tasks={tasks}
              profileId={profileId}
              userName={userName}
              setView={setView}
              notify={notify}
              onRefresh={onRefresh}
              onReviewDecision={handleReviewDecision}
              onSelectProject={(id: string) => {
                setSelectedProjectId(id);
                setView("Projects");
              }}
            />
          )}

          {view === "Projects" && (
            <ProjectsView
              projects={filteredProjects}
              role={role}
              people={people}
              profileId={profileId}
              notify={notify}
              onRefresh={onRefresh}
              initialProjectId={selectedProjectId}
              onClearInitialProject={() => setSelectedProjectId(null)}
            />
          )}

          {view === "Daily Work" && (
            <DailyWorkView
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

          {view === "Tasks" && (
            <TasksView
              tasks={tasks}
              projects={projects}
              people={people}
              profileId={profileId}
              role={role}
              updateTask={updateTaskStatus}
              notify={notify}
              onRefresh={onRefresh}
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
                people={people}
                projects={projects}
                tasks={tasks}
                role={role}
                notify={notify}
                onRefresh={onRefresh}
              />
            )}
        </div>
      </main>

      {menuOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <Toast message={toast} />

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
