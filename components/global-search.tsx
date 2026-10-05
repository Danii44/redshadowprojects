import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Search, Folder, ListTodo, Users, X } from "lucide-react";
import type { Project, Task, User, View } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { visibleViewsByRole } from "@/lib/constants";
import type { Role } from "@/lib/types";

export function GlobalSearch({
  projects,
  tasks,
  people,
  role,
  onProject,
  onTask,
  onView,
}: {
  projects: Project[];
  tasks: Task[];
  people: User[];
  role: Role;
  onProject: (id: string) => void;
  onTask: (task: Task) => void;
  onView: (view: View) => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);
  const run = (action: () => void) => {
    setOpen(false);
    action();
  };
  return (
    <>
      <button
        className="studio-global-search"
        onClick={() => setOpen(true)}
        aria-label="Search projects, tasks or team members"
      >
        <Search size={16} />
        <span>Search projects, tasks or team members…</span>
        <kbd>⌘ / Ctrl K</kbd>
      </button>
      {open && (
        <Modal instant title="Search workspace" onClose={() => setOpen(false)}>
          <Command className="studio-command" label="Search workspace">
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search size={18} />
              <Command.Input
                autoFocus
                placeholder="Search projects, tasks or team members…"
              />
              <button
                className="studio-icon-button"
                aria-label="Close search"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <Command.List>
              <Command.Empty>No results found.</Command.Empty>
              <Command.Group heading="Projects">
                {projects.map((project) => (
                  <Command.Item
                    key={project.id}
                    value={`project ${project.name} ${project.code} ${project.client ?? ""}`}
                    onSelect={() => run(() => onProject(project.id))}
                  >
                    <Folder size={16} />
                    <span>{project.name}</span>
                    <span className="studio-meta">Project</span>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Tasks">
                {tasks.map((task) => (
                  <Command.Item
                    key={task.id}
                    value={`task ${task.title} ${task.owner} ${task.project}`}
                    onSelect={() =>
                      run(() => {
                        onTask(task);
                      })
                    }
                  >
                    <ListTodo size={16} />
                    <span>{task.title}</span>
                    <span className="studio-meta">{task.owner}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              {visibleViewsByRole[role].includes("Team") && (
                <Command.Group heading="Team">
                  {people.map((person) => (
                    <Command.Item
                      key={person.id}
                      value={`team ${person.name} ${person.role}`}
                      onSelect={() => run(() => onView("Team"))}
                    >
                      <Users size={16} />
                      <span>{person.name}</span>
                      <span className="studio-meta">{person.role}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
            <div className="studio-command-footer">
              <span>↑ ↓ Navigate</span>
              <span>↵ Open</span>
              <span>Esc Close</span>
            </div>
          </Command>
        </Modal>
      )}
    </>
  );
}
