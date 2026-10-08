import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import type { Project, User } from "@/lib/types";
import { PROJECT_STATUSES } from "@/lib/constants";
import { AvatarGroup } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  dateLabel,
  daysLeft,
  filterProjects,
  projectCounts,
  projectProgress,
} from "./data";

const PAGE_SIZE = 15;
export function ProjectTable({
  projects,
  people,
  now,
  onSelect,
  onCalendar,
  personal = false,
}: {
  projects: Project[];
  people: User[];
  now: number;
  onSelect: (id: string) => void;
  onCalendar: () => void;
  personal?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [track, setTrack] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<"name" | "deadline" | null>(null);
  const filtered = useMemo(() => {
    const rows = filterProjects(projects, query, status).filter(project =>
      track === "all" || (track === "fixed" ? project.project_type !== "hourly_ongoing" && Boolean(project.deadline) : project.project_type === "hourly_ongoing" || !project.deadline),
    );
    if (sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "deadline")
      rows.sort(
        (a, b) =>
          (a.deadline ? new Date(a.deadline).getTime() : Infinity) -
          (b.deadline ? new Date(b.deadline).getTime() : Infinity),
      );
    return rows;
  }, [projects, query, status, track, sort]);
  const counts = useMemo(() => projectCounts(projects), [projects]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);
  const selectedProjects = projects.filter((project) =>
    selected.has(project.id),
  );
  const toggle = (id: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <section
      className="studio-panel studio-project-table"
      aria-label={personal ? "My projects" : "All projects"}
    >
      <div className="studio-panel-heading flex-wrap gap-3">
        <div>
          <h2>{personal ? "My Projects" : "All Projects"}</h2>
          <p>{personal ? "Your assigned projects, phases and deadlines." : "Projects, phases and deadlines in this workspace view."}</p>
        </div>
        <div className="studio-table-controls"><select aria-label="Filter project tracking" value={track} onChange={event => { setTrack(event.target.value); setPage(1); }}><option value="all">All tracks</option><option value="fixed">Fixed deadline</option><option value="ongoing">Hourly / Ongoing</option></select><div className="studio-table-search">
          <Search size={16} />
          <input
            aria-label="Search dashboard projects"
            placeholder="Search projects…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div></div>
      </div>
      <div className="studio-filters" aria-label="Filter projects by status">
        <button
          aria-pressed={status === "all"}
          onClick={() => {
                    setStatus("all");
                    setTrack("all");
            setPage(1);
          }}
        >
          All <span>{projects.length}</span>
        </button>
        {PROJECT_STATUSES.map(([key, label]) => (
          <button
            key={key}
            aria-pressed={status === key}
            onClick={() => {
              setStatus(key);
              setPage(1);
            }}
          >
            {label}
            <span>{counts[key]}</span>
          </button>
        ))}
      </div>
      {selectedProjects.length > 0 && (
        <div className="studio-selection">
          <span>{selectedProjects.length} selected</span>
          <button
            className="studio-link"
            onClick={() => {
              const header = [
                "Project",
                "Status",
                "Phase",
                "Start Date",
                "Deadline",
                "Progress",
              ];
              const data = selectedProjects.map((project) => [
                project.name,
                project.status,
                project.phase,
                project.start_date ?? "",
                project.deadline ?? "",
                projectProgress(project) ?? "",
              ]);
              const quote = (value: unknown) => {
                const text = String(value);
                return `"${(/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
              };
              const csv = [header, ...data]
                .map((row) => row.map(quote).join(","))
                .join("\r\n");
              const url = URL.createObjectURL(
                new Blob([csv], { type: "text/csv;charset=utf-8" }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = "red-shadow-projects.csv";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export selected
          </button>
          <button
            className="studio-link"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}
      <div className="studio-table-scroll">
        <table>
          <caption className="sr-only">
            Studio projects with assignments, status, dates and recorded
            progress
          </caption>
          <thead>
            <tr>
              <th className="studio-checkbox-cell">
                <input
                  type="checkbox"
                  aria-label="Select all projects on this page"
                  aria-checked={
                    rows.some((project) => selected.has(project.id)) &&
                    !rows.every((project) => selected.has(project.id))
                      ? "mixed"
                      : rows.length > 0 &&
                        rows.every((project) => selected.has(project.id))
                  }
                  checked={
                    rows.length > 0 &&
                    rows.every((project) => selected.has(project.id))
                  }
                  onChange={(event) =>
                    setSelected((previous) => {
                      const next = new Set(previous);
                      rows.forEach((project) =>
                        event.target.checked
                          ? next.add(project.id)
                          : next.delete(project.id),
                      );
                      return next;
                    })
                  }
                />
              </th>
              <th scope="col">#</th>
              <th
                scope="col"
                aria-sort={sort === "name" ? "ascending" : "none"}
              >
                <button
                  className="studio-sort"
                  onClick={() => setSort(sort === "name" ? null : "name")}
                >
                  Project name <ArrowUpDown size={12} />
                </button>
              </th>
              <th scope="col">Assigned</th>
              <th scope="col">Phase / Status</th>
              <th scope="col">Start date</th>
              <th
                scope="col"
                aria-sort={sort === "deadline" ? "ascending" : "none"}
              >
                <button
                  className="studio-sort"
                  onClick={() =>
                    setSort(sort === "deadline" ? null : "deadline")
                  }
                >
                  Deadline <ArrowUpDown size={12} />
                </button>
              </th>
              <th scope="col">Days left</th>
              <th scope="col">Progress</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((project, index) => {
              const progress = projectProgress(project),
                due = daysLeft(project, now);
              return (
                <tr key={project.id} data-selected={selected.has(project.id)}>
                  <td className="studio-checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selected.has(project.id)}
                      aria-label={`Select ${project.name}`}
                      onChange={() => toggle(project.id)}
                    />
                  </td>
                  <td className="studio-meta">{start + index + 1}</td>
                  <td>
                    <button
                      className="studio-project-name"
                      onClick={() => onSelect(project.id)}
                    >
                      {project.name}
                    </button>
                    {project.code && (
                      <p className="studio-meta">{project.code}</p>
                    )}
                  </td>
                  <td>
                    <AvatarGroup project={project} people={people} />
                  </td>
                  <td>
                    <StatusBadge status={project.status} />
                    <p className="studio-meta mt-1">{project.phase}</p>
                  </td>
                  <td className="studio-table-date">
                    {dateLabel(project.start_date)}
                  </td>
                  <td className="studio-table-date">
                    {dateLabel(project.deadline)}
                  </td>
                  <td>
                    <span
                      className={`studio-deadline-label ${due.urgent ? "is-overdue" : ""}`}
                    >
                      {due.label}
                    </span>
                  </td>
                  <td>
                    {progress === null ? (
                      <span className="studio-meta">Not recorded</span>
                    ) : (
                      <div className="studio-progress">
                        <span>{progress}%</span>
                        <progress
                          aria-label={`${project.name} completion`}
                          max={100}
                          value={progress}
                        />
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        className="studio-table-view"
                        onClick={() => onSelect(project.id)}
                      >
                        View
                      </button>
                      <Menu.Root>
                        <Menu.Trigger
                          className="studio-icon-button"
                          aria-label={`More actions for ${project.name}`}
                          title={`More actions for ${project.name}`}
                        >
                          <MoreHorizontal size={17} />
                        </Menu.Trigger>
                        <Menu.Portal>
                          <Menu.Positioner
                            sideOffset={6}
                            align="end"
                            className="z-50"
                          >
                            <Menu.Popup className="studio-menu">
                              <Menu.Item
                                className="studio-menu-item"
                                onClick={() => onSelect(project.id)}
                              >
                                <ExternalLink size={15} />
                                Open project details
                              </Menu.Item>
                              <Menu.Item
                                className="studio-menu-item"
                                onClick={onCalendar}
                              >
                                <CalendarDays size={15} />
                                View calendar
                              </Menu.Item>
                            </Menu.Popup>
                          </Menu.Positioner>
                        </Menu.Portal>
                      </Menu.Root>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={10}>
                  <div className="studio-empty">
                    No projects match these filters.
                    <button
                      className="studio-link"
                      onClick={() => {
                        setQuery("");
                        setStatus("all");
                        setPage(1);
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="studio-pagination">
        <span>
          Showing {filtered.length ? start + 1 : 0}–
          {Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
          projects
        </span>
        <nav aria-label="Project pagination">
          <button
            disabled={currentPage === 1}
            aria-label="Previous project page"
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: pages }, (_, index) => index + 1)
            .filter(
              (number) =>
                number === 1 ||
                number === pages ||
                Math.abs(number - currentPage) <= 1,
            )
            .map((number, index, list) => (
              <span key={number} className="flex items-center">
                {index > 0 && number - list[index - 1] > 1 && (
                  <span className="px-1">…</span>
                )}
                <button
                  aria-current={number === currentPage ? "page" : undefined}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              </span>
            ))}
          <button
            disabled={currentPage === pages}
            aria-label="Next project page"
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      </div>
    </section>
  );
}
