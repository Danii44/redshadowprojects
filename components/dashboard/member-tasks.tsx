import { ArrowUpRight, ListChecks } from "lucide-react";
import type { Task } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Panel, EmptyState } from "./panel";
import { isActiveTask, dateLabel } from "./data";

export function MemberTasks({
  tasks,
  onViewTasks,
  onOpenTask,
}: {
  tasks: Task[];
  onViewTasks: () => void;
  onOpenTask?: (task: Task) => void;
}) {
  const active = tasks.filter(isActiveTask);
  return (
    <Panel
      title="My active tasks"
      subtitle={`${active.length} assignments to focus on`}
      action={
        <button className="studio-link" onClick={onViewTasks}>
          All tasks <ArrowUpRight size={14} />
        </button>
      }
    >
      <div className="studio-panel-scroll">
        {!active.length && (
          <EmptyState>
            <ListChecks size={24} />
            <strong>You&apos;re all caught up</strong>
            <span>No active tasks assigned to you.</span>
          </EmptyState>
        )}
        {active.map((task) => (
          <button
            className="studio-list-row w-full text-left"
            key={task.id}
            onClick={() => onOpenTask ? onOpenTask(task) : onViewTasks()}
          >
            <div className="min-w-0 flex-1">
              <p className="studio-row-title">{task.title}</p>
              <p className="studio-meta">
                {task.project} ·{" "}
                {task.due_at ? dateLabel(task.due_at) : "No deadline"}
              </p>
            </div>
            <StatusBadge status={task.state} task />
          </button>
        ))}
      </div>
    </Panel>
  );
}
