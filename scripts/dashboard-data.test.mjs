import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = resolve(import.meta.dirname, "..");
const requirePackage = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  let source = readFileSync(file, "utf8");
  if (file.endsWith("use-workspace.ts"))
    source += "\nexport { mapProjects, mapTasks };";
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  cache.set(file, compiledModule.exports);
  const localRequire = (name) => {
    if (name === "@/lib/supabase") return { supabase: null };
    if (name === "@/lib/notifications") return { sendBrowserNotification() {} };
    if (!name.startsWith(".") && !name.startsWith("@/"))
      return requirePackage(name);
    const base = name.startsWith("@/")
      ? resolve(root, name.slice(2))
      : resolve(dirname(file), name);
    return load([base, `${base}.ts`, `${base}.tsx`].find(existsSync));
  };
  new Function("require", "module", "exports", output)(
    localRequire,
    compiledModule,
    compiledModule.exports,
  );
  cache.set(file, compiledModule.exports);
  return compiledModule.exports;
}

const { mapProjects, mapTasks } = load(resolve(root, "hooks/use-workspace.ts"));
const { Dashboard } = load(resolve(root, "components/views/dashboard.tsx"));
const people = new Map([
  ["member", "Sample Member"],
  ["leader", "Sample Leader"],
]);
const rows = [
  {
    id: "assigned",
    name: "Assigned membership project",
    leader_id: "leader",
    status: "in_progress",
    project_members: [{ user_id: "member" }],
  },
  {
    id: "led",
    name: "Led project",
    leader_id: "member",
    status: "open",
    project_members: [],
  },
  {
    id: "private",
    name: "Other person's project",
    leader_id: "other",
    project_members: [],
  },
];
const projects = mapProjects(rows, people, "member", "Team Member");
assert.deepEqual(
  projects.map((project) => project.id),
  ["assigned", "led"],
);
assert.deepEqual(projects[0].project_members, [{ user_id: "member" }]);
const tasks = mapTasks(
  [
    {
      id: "active",
      title: "Assigned active task",
      project_id: "assigned",
      assignee_id: "member",
      status: "in_progress",
    },
    {
      id: "done",
      title: "Finished task",
      assignee_id: "member",
      status: "completed",
    },
    {
      id: "review",
      title: "Review task",
      assignee_id: "member",
      status: "in_review",
    },
    {
      id: "other",
      title: "Another member's task",
      assignee_id: "other",
      status: "open",
    },
  ],
  new Map(projects.map((project) => [project.id, project.name])),
  people,
  new Set(projects.map((project) => project.id)),
  "member",
  "Team Member",
);
assert.deepEqual(
  tasks.map((task) => task.id),
  ["active", "done", "review"],
);
const html = renderToStaticMarkup(
  React.createElement(Dashboard, {
    projects,
    tasks,
    role: "Team Member",
    profileId: "member",
    userName: "Sample Member",
    setView() {},
    notify() {},
  }),
);
assert.match(html, /Assigned membership project/);
assert.match(html, /Led project/);
assert.match(html, /Assigned active task/);
assert.match(html, /Review task/);
assert.match(html, /2 active tasks/);
assert.match(html, /2 active projects/);
assert.doesNotMatch(
  html,
  /Another member&#x27;s task|Other person&#x27;s project|No active tasks assigned|not assigned to any projects/,
);
assert.equal(mapProjects(rows, people, "member", "Admin").length, 3);
assert.equal(mapProjects(rows, people, "member", "Project Leader").length, 2);
const {
  projectCounts,
  filterProjects,
  daysLeft,
  upcomingProjects,
  attentionProjects,
  projectProgress,
} = load(resolve(root, "components/dashboard/data.ts"));
const now = new Date(2026, 9, 5, 12).getTime();
const dated = (id, status, day) => ({
  ...projects[0],
  id,
  status,
  deadline: new Date(2026, 9, day, 17).toISOString(),
});
const deadlineProjects = [
  dated("closed-late", "closed", 1),
  dated("late", "open", 3),
  dated("today", "in_review", 5),
  dated("soon", "revisions", 7),
  dated("next-week", "open", 12),
  dated("later", "open", 13),
];
assert.deepEqual(
  attentionProjects(deadlineProjects, now).map((project) => project.id),
  ["late", "today", "soon"],
);
assert.deepEqual(
  upcomingProjects(deadlineProjects, now).map((project) => project.id),
  ["today", "soon", "next-week"],
);
assert.equal(daysLeft(deadlineProjects[0], now).urgent, false);
assert.equal(daysLeft(deadlineProjects[1], now).label, "2d overdue");
assert.equal(
  projectProgress({ ...projects[0], completion_percentage: undefined }),
  null,
);
assert.equal(projectProgress({ ...projects[0], completion_percentage: 0 }), 0);
assert.equal(
  projectProgress({ ...projects[0], completion_percentage: 73 }),
  73,
);
assert.equal(projectCounts(deadlineProjects).closed, 1);
assert.equal(filterProjects(deadlineProjects, "membership", "open").length, 3);
const manyProjects = Array.from({ length: 34 }, (_, index) => ({
  ...projects[0],
  id: `test-${index}`,
  name: `Pagination sample ${index + 1}`,
}));
const adminHtml = renderToStaticMarkup(
  React.createElement(Dashboard, {
    projects: manyProjects,
    tasks,
    people: [],
    role: "Admin",
    profileId: "leader",
    userName: "Sample Admin",
    setView() {},
    notify() {},
  }),
);
assert.match(adminHtml, /Showing 1–15 of 34 projects/);
assert.equal(
  (adminHtml.match(/aria-label="Select Pagination sample /g) ?? []).length,
  15,
);
assert.match(adminHtml, /Request Changes/);
assert.match(adminHtml, /New Project/);
assert.doesNotMatch(html, /Request Changes|New Project/);
const leaderHtml = renderToStaticMarkup(React.createElement(Dashboard, {
  projects, tasks, role: "Project Leader", profileId: "member", userName: "Sample Leader", setView() {}, notify() {},
}));
assert.match(leaderHtml, /Request Changes/);
assert.match(leaderHtml, /New Project/);
const emptyHtml = renderToStaticMarkup(React.createElement(Dashboard, {
  projects: [], tasks: [], role: "Team Member", profileId: "member", userName: "Sample Member", setView() {}, notify() {},
}));
assert.match(emptyHtml, /No projects to display/);
assert.match(emptyHtml, /Showing 0–0 of 0 projects/);
console.log(
  "Dashboard regression passed: role visibility, membership, task counts, real progress, urgency ordering, 7-day window, and 15-row pagination.",
);

const { TasksView } = load(resolve(root, "components/views/tasks-view.tsx"));
const taskFixture = { id: "panel-task", title: "Panel task", state: "Open", status: "open", owner: "Sample Member", assignee_id: "member", project: "Assigned project", initials: "SM", due: "No deadline", created_by: "leader" };
const taskPanelProps = { detailOnly: true, tasks: [taskFixture], projects: [], people: [{id:"member", name:"Sample Member", role:"team_member"}], profileId:"member", updateTask() {}, notify() {} };
const memberPanelHtml = renderToStaticMarkup(React.createElement(TasksView, {...taskPanelProps, role:"Team Member"}));
assert.match(memberPanelHtml, /Log Work/);
assert.doesNotMatch(memberPanelHtml, /Delete task|Status for Panel task|Assign Panel task|Task filters/);
const managerPanelHtml = renderToStaticMarkup(React.createElement(TasksView, {...taskPanelProps, role:"Admin"}));
assert.match(managerPanelHtml, /Status for Panel task/);
assert.match(managerPanelHtml, /Assign Panel task/);
assert.doesNotMatch(managerPanelHtml, /Log Work/);
const finishedPanelHtml = renderToStaticMarkup(React.createElement(TasksView, {...taskPanelProps, tasks:[{...taskFixture, state:"Completed", status:"completed"}], role:"Team Member"}));
assert.match(finishedPanelHtml, /Panel task/);
assert.doesNotMatch(finishedPanelHtml, /Log Work|No tasks found/);
console.log("Task panel regression passed: member/manager controls, finished task visibility, and compact presentation.");
