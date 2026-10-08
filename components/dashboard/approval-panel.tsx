import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight, Check, RotateCcw, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Project, Task, User } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Panel, EmptyState } from "./panel";
import { matchesTaskFocus } from "@/lib/task-focus";

export function ApprovalPanel({
  tasks,
  projects,
  people,
  onReviewDecision,
  onViewAll,
  onOpenTask,
  now,
}: {
  now: number;
  tasks: Task[];
  projects: Project[];
  people: User[];
  onReviewDecision?: (
    task: Task,
    state: "Completed" | "Open",
  ) => void | Promise<void>;
  onViewAll: () => void;
  onOpenTask?: (task: Task) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [carouselRef, carousel] = useEmblaCarousel({ align: "start", loop: false, watchFocus: false, duration: reducedMotion ? 0 : undefined });
  const [position, setPosition] = useState({ index: 0, previous: false, next: false });
  const syncPosition = useCallback(() => {
    if (carousel) setPosition({ index: carousel.selectedScrollSnap(), previous: carousel.canScrollPrev(), next: carousel.canScrollNext() });
  }, [carousel]);
  useEffect(() => {
    if (!carousel) return;
    carousel.on("select", syncPosition).on("reInit", syncPosition);
    carousel.reInit();
    return () => { carousel.off("select", syncPosition).off("reInit", syncPosition); };
  }, [carousel, syncPosition]);
  const [pending, setPending] = useState<string | null>(null);
  const submissionTime = (task: Task) => task.submitted_at && Number.isFinite(new Date(task.submitted_at!).getTime()) ? new Date(task.submitted_at!).getTime() : Infinity;
  const queue = tasks.filter(task => matchesTaskFocus(task, "review", now)).sort((a, b) =>
    submissionTime(a) - submissionTime(b) || a.title.localeCompare(b.title));
  const act = async (task: Task, state: "Completed" | "Open") => {
    setPending(String(task.id));
    try {
      await onReviewDecision?.(task, state);
    } finally {
      setPending(null);
    }
  };
  return (
    <Panel
      title="Awaiting approval"
      className="approval-carousel-panel"
      subtitle={`${queue.length} submitted ${queue.length === 1 ? "task" : "tasks"} / oldest submissions first`}
      action={
        <button className="studio-link" onClick={onViewAll}>
          View all <ArrowUpRight size={14} />
        </button>
      }
    >
      <div>
        {!queue.length && (
          <EmptyState>
            <CheckCircle2 size={24} />
            <strong>All caught up</strong>
            <span>No submissions need your review.</span>
          </EmptyState>
        )}
        {queue.length > 0 && <div className="approval-carousel" role="region" aria-roledescription="carousel" aria-label="Submissions awaiting approval">
          <div className="approval-carousel-viewport" ref={carouselRef} onFocusCapture={event => {
            const slide = (event.target as HTMLElement).closest<HTMLElement>("[data-review-index]");
            if (slide) carousel?.scrollTo(Number(slide.dataset.reviewIndex), true);
          }} onKeyDown={event => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            if (event.key === "ArrowLeft") carousel?.scrollPrev(true);
            else carousel?.scrollNext(true);
          }} tabIndex={0} aria-label="Review cards. Use left and right arrows to navigate.">
            <div className="approval-carousel-track">
        {queue.map((task, index) => {
          const person = people.find(
            (person) => person.id === task.assignee_id,
          );
          return (
            <div className="studio-approval-row approval-review-card" key={task.id} data-review-index={index} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${queue.length}: ${task.title}`}>
              <div className="flex items-start gap-3">
                <Avatar name={task.owner} src={person?.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="studio-row-title">{onOpenTask ? <button className="text-left hover:text-red" onClick={() => onOpenTask(task)}>{task.title}</button> : task.title}</p>
                  <p className="studio-person-name">{task.owner}</p>
                  <p className="studio-meta">
                    {task.project} ·{" "}
                    {projects.find((project) => project.id === task.project_id)
                      ?.phase ?? "Task"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <StatusBadge status={task.state} task />
                {Number.isFinite(submissionTime(task)) && (
                  <time className="studio-meta" dateTime={task.submitted_at!}>
                    Waiting {Math.max(0, Math.floor((now - new Date(task.submitted_at!).getTime()) / 86400000))}d / submitted {new Date(task.submitted_at!).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                )}
              </div>
              {!Number.isFinite(submissionTime(task)) && <p className="studio-meta mt-2">Submission time not recorded</p>}
              <div className="mt-3 flex gap-2">
                <button
                  className="studio-action studio-action--approve"
                  disabled={pending !== null || !onReviewDecision}
                  onClick={() => act(task, "Completed")}
                >
                  <Check size={14} />
                  {pending === String(task.id) ? "Saving…" : "Approve"}
                </button>
                <button
                  className="studio-action"
                  disabled={pending !== null || !onReviewDecision}
                  onClick={() => act(task, "Open")}
                >
                  <RotateCcw size={13} />
                  Request Changes
                </button>
              </div>
            </div>
          );
        })}
            </div>
          </div>
          <div className="approval-carousel-footer">
            <span className="studio-meta" aria-live="polite" aria-atomic="true">{Math.min(position.index + 1, queue.length)} of {queue.length} submissions</span>
            <div className="approval-carousel-controls">
              <button type="button" aria-label="Previous review" disabled={!position.previous} onClick={event => carousel?.scrollPrev(Boolean(reducedMotion) || event.detail === 0)}><ChevronLeft size={18}/></button>
              <button type="button" aria-label="Next review" disabled={!position.next} onClick={event => carousel?.scrollNext(Boolean(reducedMotion) || event.detail === 0)}><ChevronRight size={18}/></button>
            </div>
          </div>
        </div>}

      </div>
    </Panel>
  );
}
