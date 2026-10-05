import { normalizeProjectStatus } from "@/lib/utils";
import { PROJECT_STATUSES } from "@/lib/constants";

export function StatusBadge({
  status = "open",
  task = false,
}: {
  status?: string;
  task?: boolean;
}) {
  const key = status.toLowerCase().replaceAll(" ", "_");
  const normalized = normalizeProjectStatus(
    key === "in_revision"
      ? "revisions"
      : key === "completed"
        ? "delivered"
        : key,
  );
  const label = key === "overdue" ? "Overdue" : task
    ? status
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : (PROJECT_STATUSES.find(([value]) => value === normalized)?.[1] ?? status);
  return (
    <span
      className={`studio-status studio-status--${key === "overdue" ? "overdue" : normalized}`}
    >
      <span aria-hidden="true" />
      {label}
    </span>
  );
}
