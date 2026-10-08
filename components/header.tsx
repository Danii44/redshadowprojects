import { Bell, Menu as MenuIcon } from "lucide-react";
import type {
  Notification,
  Role,
  View,
  Project,
  Task,
  User,
} from "@/lib/types";
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  role: Role;
  view: View;
  menuOpen: boolean;
  userName: string;
  currentUser?: User;
  projects: Project[];
  tasks: Task[];
  people: User[];
  setView: (view: View) => void;
  onProject: (id: string) => void;
  onTask: (task: Task) => void;
  notifications: Notification[];
  setMenuOpen: (open: boolean) => void;
  setAccountPanel: (panel: "profile" | "password" | null) => void;
}
export function Header({
  role,
  view,
  menuOpen,
  projects,
  tasks,
  people,
  setView,
  onProject,
  onTask,
  notifications,
  setMenuOpen,
}: HeaderProps) {
  const unread = notifications.filter(
    (notification) => !notification.read_at,
  ).length;
  return (
    <header className="workspace-toolbar studio-toolbar">
      <button
        className="studio-icon-button studio-mobile-nav"
        onClick={() => setMenuOpen(true)}
        aria-label="Open navigation"
        aria-expanded={menuOpen}
        aria-controls="workspace-navigation"
      >
        <MenuIcon size={21} />
      </button>
      <span className="studio-toolbar-title">{view}</span>
      <GlobalSearch
        projects={projects}
        tasks={tasks}
        people={people}
        role={role}
        onProject={onProject}
        onTask={onTask}
        onView={setView}
      />
      <div className="studio-toolbar-actions">
        <button
          className="studio-icon-button"
          aria-label={`Open notifications${unread ? `, ${unread} unread` : ""}`}
          title="Notifications"
          onClick={() => setView("Notifications")}
        >
          <Bell size={19} />
          {unread > 0 && <span className="studio-notification-dot" />}
        </button>
        <ThemeToggle />

      </div>
    </header>
  );
}
