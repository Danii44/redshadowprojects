import { Bell, Menu as MenuIcon, ChevronDown } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { useTheme } from "next-themes";
import type {
  Notification,
  Role,
  View,
  Project,
  Task,
  User,
} from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
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
  userName,
  currentUser,
  projects,
  tasks,
  people,
  setView,
  onProject,
  onTask,
  notifications,
  setMenuOpen,
  setAccountPanel,
}: HeaderProps) {
  const unread = notifications.filter(
    (notification) => !notification.read_at,
  ).length;
  const { setTheme } = useTheme();
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
        <time
          className="studio-toolbar-date"
          dateTime={new Date().toISOString().slice(0, 10)}
        >
          {new Date().toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </time>
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
        <Menu.Root>
          <Menu.Trigger
            className="studio-profile-trigger"
            aria-label={`Profile: ${userName}`}
          >
            <Avatar name={userName} src={currentUser?.avatar_url} size="sm" />
            <ChevronDown size={13} />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={8} align="end" className="z-50">
              <Menu.Popup className="studio-menu">
                <div className="studio-profile-menu-label">
                  <strong>{userName}</strong>
                  <span>{role}</span>
                </div>
                <Menu.Item
                  className="studio-menu-item"
                  onClick={() => setAccountPanel("profile")}
                >
                  View profile
                </Menu.Item>
                <Menu.Item
                  className="studio-menu-item"
                  onClick={() => setAccountPanel("password")}
                >
                  Change password
                </Menu.Item>
                <Menu.Separator className="studio-menu-separator" />
                <Menu.Item
                  className="studio-menu-item"
                  onClick={() => setTheme("system")}
                >
                  Use system appearance
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </header>
  );
}
