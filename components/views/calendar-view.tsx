import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import type { Project, Task } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { dateLabel } from "@/components/dashboard/data";

export function CalendarView({
  projects,
  tasks,
  onSelectProject,
  onTasks,
  onOpenTask,
}: {
  projects: Project[];
  tasks: Task[];
  onSelectProject: (id: string) => void;
  onTasks: () => void;
  onOpenTask?: (task: Task) => void;
}) {
  const [month, setMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const events = [
    ...projects
      .filter(
        (project) =>
          project.deadline && project.project_type !== "hourly_ongoing",
      )
      .map((project) => ({
        id: project.id,
        name: project.name,
        date: project.deadline!,
        status: project.status,
        type: "project",
      })),
    ...tasks
      .filter((task) => task.due_at)
      .map((task) => ({
        id: String(task.id),
        name: task.title,
        date: task.due_at!,
        status: task.state,
        type: "task",
      })),
  ].filter((event) => Number.isFinite(new Date(event.date).getTime()));
  const monthEvents = events
    .filter(
      (event) =>
        new Date(event.date).getMonth() === month.getMonth() &&
        new Date(event.date).getFullYear() === month.getFullYear(),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (month.getDay() + 6) % 7;
  const act = (event: (typeof events)[number]) => {
    if (event.type === "project") return onSelectProject(event.id);
    const task = tasks.find(task => String(task.id) === event.id);
    if (task && onOpenTask) onOpenTask(task); else onTasks();
  };
  return (
    <div className="studio-dashboard">
      <header className="studio-page-heading">
        <div>
          <p className="studio-eyebrow">Planning</p>
          <h1>Calendar</h1>
          <p>Project deadlines and task due dates, in one place.</p>
        </div>
        <button
          className="studio-button"
          onClick={() => {
            const today = new Date();
            setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
          }}
        >
          Today
        </button>
      </header>
      <section className="studio-panel">
        <div className="studio-panel-heading">
          <h2>
            {month.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="flex gap-2">
            <button
              className="studio-icon-button"
              aria-label="Previous month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="studio-icon-button"
              aria-label="Next month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="studio-calendar">
          <div className="studio-calendar-grid studio-calendar-week">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="studio-calendar-grid">
            {Array.from(
              { length: Math.ceil((days + offset) / 7) * 7 },
              (_, index) => {
                const day = index - offset + 1,
                  valid = day > 0 && day <= days;
                const date = new Date(
                  month.getFullYear(),
                  month.getMonth(),
                  day,
                );
                const daily = valid
                  ? monthEvents.filter(
                      (event) => new Date(event.date).getDate() === day,
                    )
                  : [];
                return (
                  <div
                    className="studio-calendar-cell"
                    key={index}
                    data-today={
                      valid && date.toDateString() === new Date().toDateString()
                    }
                  >
                    {valid && (
                      <>
                        <time
                          dateTime={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`}
                        >
                          {day}
                        </time>
                        {daily.slice(0, 3).map((event) => (
                          <button
                            key={`${event.type}-${event.id}`}
                            onClick={() => act(event)}
                            title={event.name}
                            className={`studio-calendar-event ${event.type === "task" ? "is-task" : ""}`}
                          >
                            {event.name}
                          </button>
                        ))}
                        {daily.length > 3 && (
                          <span className="studio-meta">
                            +{daily.length - 3} more below
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>
        <div className="studio-panel-heading">
          <h2>Deadlines this month</h2>
          <span className="studio-meta">{monthEvents.length} dates</span>
        </div>
        {!monthEvents.length && (
          <div className="studio-empty">
            <CalendarDays size={24} />
            No deadlines this month.
          </div>
        )}
        {monthEvents.map((event) => (
          <button
            key={`${event.type}-${event.id}`}
            className="studio-list-row w-full text-left"
            onClick={() => act(event)}
          >
            <span className="studio-meta min-w-24">
              {dateLabel(event.date)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="studio-row-title">{event.name}</p>
              <p className="studio-meta capitalize">{event.type}</p>
            </div>
            <StatusBadge status={event.status} task={event.type === "task"} />
          </button>
        ))}
      </section>
    </div>
  );
}
