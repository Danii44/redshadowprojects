import { Sparkles } from "lucide-react";
import type { Project, Role, Task } from "@/lib/types";
import { normalizeProjectStatus } from "@/lib/utils";

export function DashboardMascot() {
  return (
    <span className="studio-greeting-mascot" role="img" aria-label="A friendly mascot waving hello">
      <span className="studio-mascot-body" aria-hidden="true" />
      <span className="studio-mascot-head" aria-hidden="true">
        <span className="studio-mascot-eyes" />
        <span className="studio-mascot-smile" />
      </span>
      <span className="studio-mascot-wave" aria-hidden="true">
        <span className="studio-mascot-arm" />
      </span>
      {/* Add the greeting/update bubble here if we want to use it again. */}
    </span>
  );
}

export function dashboardGreeting(now: number) {
  const hour = new Date(now).getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export function DashboardGreeting({
  now,
  role,
  tasks,
  projects,
}: {
  now: number;
  role: Role;
  tasks: Task[];
  projects: Project[];
}) {
  const today = new Date(now);
  const activeTasks = tasks.filter(
    (task) => !["Completed", "Closed", "Cancelled"].includes(task.state),
  );
  const overdue = activeTasks.filter(
    (task) => task.due_at && new Date(task.due_at).getTime() < now,
  ).length;
  const dueToday = activeTasks.filter(
    (task) =>
      task.due_at &&
      new Date(task.due_at).toDateString() === today.toDateString() &&
      new Date(task.due_at).getTime() >= now,
  ).length;
  const reviews = tasks.filter((task) => task.state === "In Review").length;
  const ongoingProjects = projects.filter(
    (project) =>
      !["delivered", "closed", "cancelled"].includes(
        normalizeProjectStatus(project.status),
      ),
  );
  const overdueProjects = ongoingProjects.filter(
    (project) =>
      project.project_type !== "hourly_ongoing" &&
      project.deadline &&
      new Date(project.deadline).getTime() < now,
  ).length;
  const count = (value: number, noun: string) =>
    `${value} ${noun}${value === 1 ? "" : "s"}`;
  const updates = [
    overdue ? `${count(overdue, "task")} overdue` : null,
    dueToday ? `${count(dueToday, "task")} due today` : null,
    reviews
      ? `${count(reviews, "task")} ${role === "Team Member" ? "awaiting feedback" : "awaiting review"}`
      : null,
    overdueProjects
      ? `${count(overdueProjects, "project")} past deadline`
      : null,
  ].filter(Boolean);

  return (
    <aside className="studio-briefing" aria-label="Daily briefing">
      <div className="studio-briefing-icon">
        <Sparkles size={17} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p>
          {activeTasks.length
            ? `You have ${count(activeTasks.length, "active task")} ${role === "Team Member" ? "assigned to you" : "across your workspace"}.`
            : "No active tasks right now."}
          {ongoingProjects.length
            ? ` ${count(ongoingProjects.length, "active project")}.`
            : ""}{" "}
          {updates.length
            ? `${updates.join(" · ")}.`
            : "You're all caught up on task deadlines and reviews."}
        </p>
      </div>
    </aside>
  );
}
