import React, { useMemo } from "react";
import { LazyMotion, domAnimation } from "motion/react";
import {
  Layers3,
  CircleDashed,
  Activity,
  MessageSquare,
  RotateCcw,
  CheckCircle2,
  CalendarCheck,
  Plus,
  ListTodo,
} from "lucide-react";
import type { Project, Role, Task, User, View } from "@/lib/types";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ApprovalPanel } from "@/components/dashboard/approval-panel";
import { StatusOverview } from "@/components/dashboard/status-overview";
import { TeamOverview } from "@/components/dashboard/team-overview";
import {
  AttentionList,
  DeadlineList,
} from "@/components/dashboard/deadline-panels";
import { ProjectTable } from "@/components/dashboard/project-table";
import { MemberTasks } from "@/components/dashboard/member-tasks";
import {
  isActiveProject,
  isActiveTask,
  projectCounts,
} from "@/components/dashboard/data";
import { DashboardGreeting, dashboardGreeting } from "./dashboard-greeting";

interface DashboardProps {
  role: Role;
  projects: Project[];
  tasks: Task[];
  people?: User[];
  profileId?: string;
  userName?: string;
  setView: (view: View) => void;
  notify: (message: string) => void;
  onRefresh?: () => void;
  onSelectProject?: (projectId: string) => void;
  onCreateProject?: () => void;
  onOpenTask?: (task: Task) => void;
  onReviewDecision?: (
    task: Task,
    nextState: "Completed" | "Open",
  ) => void | Promise<void>;
}

export function Dashboard({
  role,
  projects,
  tasks,
  people = [],
  profileId = "",
  userName = "Team Member",
  setView,
  onSelectProject,
  onCreateProject,
  onOpenTask,
  onReviewDecision,
}: DashboardProps) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const member = role === "Team Member";
  const myTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.assignee_id === profileId ||
          task.owner?.toLowerCase() === userName.toLowerCase(),
      ),
    [tasks, profileId, userName],
  );
  const visibleTasks = member ? myTasks : tasks;
  const counts = useMemo(() => projectCounts(projects), [projects]);
  const active = useMemo(
    () => projects.filter(isActiveProject).length,
    [projects],
  );
  const select = (id: string) =>
    onSelectProject ? onSelectProject(id) : setView("Projects");
  const allMetrics = [
    {
      label: "Total Projects",
      value: projects.length,
      detail: `${active} active`,
      icon: Layers3,
      tone: "neutral",
    },
    {
      label: "Open",
      value: counts.open,
      detail: `${projects.length ? Math.round((counts.open / projects.length) * 100) : 0}% of projects`,
      icon: CircleDashed,
      tone: "blue",
    },
    {
      label: "In Progress",
      value: counts.in_progress,
      detail: "Work underway",
      icon: Activity,
      tone: "cyan",
    },
    {
      label: "In Review",
      value: counts.in_review,
      detail: "Awaiting feedback",
      icon: MessageSquare,
      tone: "amber",
    },
    {
      label: "Revisions",
      value: counts.revisions,
      detail: "Client changes",
      icon: RotateCcw,
      tone: "purple",
    },
    {
      label: "Delivered",
      value: counts.delivered + counts.closed,
      detail: "Delivered or closed",
      icon: CheckCircle2,
      tone: "green",
    },
  ];
  const memberMetrics = [
    {
      label: "Assigned Projects",
      value: projects.length,
      detail: `${active} active projects`,
      icon: Layers3,
      tone: "neutral",
    },
    {
      label: "Active Projects",
      value: active,
      detail: "Ongoing assignments",
      icon: Activity,
      tone: "cyan",
    },
    {
      label: "My Tasks",
      value: myTasks.filter(isActiveTask).length,
      detail: "Active assignments",
      icon: ListTodo,
      tone: "blue",
    },
    {
      label: "In Progress",
      value: myTasks.filter((task) => task.state === "In Progress").length,
      detail: "Work underway",
      icon: Activity,
      tone: "cyan",
    },
    {
      label: "In Review / Revision",
      value: myTasks.filter((task) =>
        ["In Review", "In Revision"].includes(task.state),
      ).length,
      detail: "Awaiting feedback",
      icon: MessageSquare,
      tone: "amber",
    },
    {
      label: "Completed",
      value: myTasks.filter((task) =>
        ["Completed", "Closed"].includes(task.state),
      ).length,
      detail: "Finished tasks",
      icon: CheckCircle2,
      tone: "green",
    },
  ];
  return (
    <LazyMotion features={domAnimation} strict>
      <div className="studio-dashboard">
        <header className="studio-page-heading">
          <div>
            <p className="studio-eyebrow">Red Shadow Designs / Studio Dashboard</p>
            <h1>{dashboardGreeting(now)}, {userName}.</h1>
            <p>Here&apos;s what&apos;s happening with your projects today.</p>
          </div>
          <div className="studio-page-actions">
            <button
              className="studio-button"
              onClick={() => setView("Daily Work")}
            >
              <CalendarCheck size={16} />
              Daily Work
              <span className="studio-button-count">
                {visibleTasks.filter(isActiveTask).length}
              </span>
            </button>
            {!member && (
              <button
                className="studio-button studio-button--primary"
                onClick={() =>
                  onCreateProject ? onCreateProject() : setView("Projects")
                }
              >
                <Plus size={16} />
                New Project
              </button>
            )}
          </div>
        </header>
        <DashboardGreeting
          now={now}
          role={role}
          tasks={visibleTasks}
          projects={projects}
        />
        <div
          className={`studio-metrics ${member ? "studio-metrics--member" : ""}`}
        >
          {(member ? memberMetrics : allMetrics).map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
        <div className="studio-insights">
          {member ? (
            <MemberTasks
              onOpenTask={onOpenTask}
              tasks={myTasks}
              onViewTasks={() => setView("My Tasks")}
            />
          ) : (
            <ApprovalPanel
              onOpenTask={onOpenTask}
              tasks={tasks}
              projects={projects}
              people={people}
              onReviewDecision={onReviewDecision}
              onViewAll={() => setView("Revisions")}
            />
          )}
          <StatusOverview projects={projects} />
          <TeamOverview
            projects={projects}
            people={people}
            onViewTeam={!member ? () => setView("Team") : undefined}
          />
        </div>
        <div className="studio-deadlines">
          <AttentionList
            projects={projects}
            people={people}
            now={now}
            onSelect={select}
          />
          <DeadlineList
            projects={projects}
            people={people}
            now={now}
            onSelect={select}
            onCalendar={() => setView("Calendar")}
          />
        </div>
        <ProjectTable
          projects={projects}
          people={people}
          now={now}
          onSelect={select}
          onCalendar={() => setView("Calendar")}
        />
      </div>
    </LazyMotion>
  );
}
