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
import { RecentUpdates } from "@/components/dashboard/work-insights";
import { QuickTaskModal } from "@/components/dashboard/quick-task-modal";
import {
  isActiveProject,
  isActiveTask,
  projectCounts,
} from "@/components/dashboard/data";
import {
  DashboardGreeting,
  DashboardMascot,
  dashboardGreeting,
} from "./dashboard-greeting";

import { taskStatus } from "@/lib/task-focus";
import type { TaskFocus } from "@/lib/task-focus";

interface DashboardProps {
  role: Role;
  projects: Project[];
  tasks: Task[];
  people?: User[];
  teamPeople?: User[];
  profileId?: string;
  userName?: string;
  teamName?: string;
  onTaskQueue?: (focus: TaskFocus) => void;
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
  teamPeople = people,
  profileId = "",
  userName = "Team Member",
  setView,
  onSelectProject,
  onCreateProject,
  onOpenTask,
  onTaskQueue,
  teamName = "All departments",
  onReviewDecision,
  notify = () => {},
  onRefresh,
}: DashboardProps) {
  const [now, setNow] = React.useState(() => Date.now());
  const [tableStatus, setTableStatus] = React.useState<string>("all");
  const [quickTaskOpen, setQuickTaskOpen] = React.useState(false);

  const filterTableTo = (status: string) => {
    setTableStatus(status);
    if (typeof document !== "undefined") {
      const tableEl = document.getElementById("studio-project-table");
      if (tableEl) {
        tableEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const member = role === "Team Member";
  const myTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.assignee_id === profileId,
      ),
    [tasks, profileId],
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
      onClick: () => filterTableTo("all"),
    },
    {
      label: "Open",
      value: counts.open,
      detail: `${projects.length ? Math.round((counts.open / projects.length) * 100) : 0}% of projects`,
      icon: CircleDashed,
      tone: "blue",
      onClick: () => filterTableTo("open"),
    },
    {
      label: "In Progress",
      value: counts.in_progress,
      detail: "Work underway",
      icon: Activity,
      tone: "cyan",
      onClick: () => filterTableTo("in_progress"),
    },
    {
      label: "In Review",
      value: counts.in_review,
      detail: "Awaiting feedback",
      icon: MessageSquare,
      tone: "amber",
      onClick: () => onTaskQueue ? onTaskQueue("review") : filterTableTo("in_review"),
    },
    {
      label: "Revisions",
      value: counts.revisions,
      detail: "Client changes",
      icon: RotateCcw,
      tone: "purple",
      onClick: () => setView("Revisions"),
    },
    {
      label: "Delivered",
      value: counts.delivered + counts.closed,
      detail: "Delivered or closed",
      icon: CheckCircle2,
      tone: "green",
      onClick: () => filterTableTo("delivered"),
    },
  ];
  const memberMetrics = [
    {
      label: "Assigned Projects",
      value: projects.length,
      detail: `${active} active projects`,
      icon: Layers3,
      tone: "neutral",
      onClick: () => filterTableTo("all"),
    },
    {
      label: "Active Projects",
      value: active,
      detail: "Ongoing assignments",
      icon: Activity,
      tone: "cyan",
      onClick: () => filterTableTo("in_progress"),
    },
    {
      label: "My Tasks",
      value: myTasks.filter(isActiveTask).length,
      detail: "Active assignments",
      icon: ListTodo,
      tone: "blue",
      onClick: () => setView("My Tasks"),
    },
    {
      label: "In Progress",
      value: myTasks.filter((task) => taskStatus(task) === "in_progress").length,
      detail: "Work underway",
      icon: Activity,
      tone: "cyan",
      onClick: () => setView("My Tasks"),
    },
    {
      label: "In Review / Revision",
      value: myTasks.filter((task) =>
        ["in_review", "in_revision"].includes(taskStatus(task)),
      ).length,
      detail: "Awaiting feedback",
      icon: MessageSquare,
      tone: "amber",
      onClick: () => onTaskQueue ? onTaskQueue("review") : setView("My Tasks"),
    },
    {
      label: "Completed",
      value: myTasks.filter((task) =>
        ["completed", "closed"].includes(taskStatus(task)),
      ).length,
      detail: "Finished tasks",
      icon: CheckCircle2,
      tone: "green",
      onClick: () => setView("My Tasks"),
    },
  ];
  return (
    <LazyMotion features={domAnimation} strict>
      <div className="studio-dashboard">
        <header className="studio-page-heading">
          <div>
            <p className="studio-eyebrow">Red Shadow Designs / Studio Dashboard{teamName !== "All departments" && ` / ${teamName}`}</p>
            <div className="studio-greeting-title">
              <h1>{dashboardGreeting(now)}, {userName}.</h1>
              <DashboardMascot />
            </div>
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
              <>
                <button
                  className="studio-button"
                  onClick={() => setQuickTaskOpen(true)}
                >
                  <Plus size={16} />
                  New Task
                </button>
                <button
                  className="studio-button studio-button--primary"
                  onClick={() =>
                    onCreateProject ? onCreateProject() : setView("Projects")
                  }
                >
                  <Plus size={16} />
                  New Project
                </button>
              </>
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
              now={now}
              tasks={tasks}
              projects={projects}
              people={people}
              onReviewDecision={onReviewDecision}
              onViewAll={() => onTaskQueue ? onTaskQueue("review") : setView("Tasks")}
            />
          )}
          <StatusOverview projects={projects} onSelectStatus={filterTableTo} />
          <TeamOverview
            partial={member}
            projects={projects}
            people={teamPeople}
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
            tasks={visibleTasks}
            onOpenTask={onOpenTask}
            projects={projects}
            people={people}
            now={now}
            onSelect={select}
            onCalendar={() => setView("Calendar")}
          />
          <RecentUpdates
            tasks={visibleTasks}
            projects={projects}
            onOpenTask={onOpenTask}
            onSelectProject={select}
          />
        </div>
        <ProjectTable
          personal={role !== "Admin"}
          projects={projects}
          people={people}
          now={now}
          onSelect={select}
          onCalendar={() => setView("Calendar")}
          statusFilter={tableStatus}
          onStatusFilterChange={setTableStatus}
        />
        <QuickTaskModal
          open={quickTaskOpen}
          onClose={() => setQuickTaskOpen(false)}
          projects={projects}
          people={people}
          profileId={profileId}
          notify={notify}
          onRefresh={onRefresh}
        />
      </div>
    </LazyMotion>
  );
}
