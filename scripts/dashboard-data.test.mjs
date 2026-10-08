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
assert.match(html, /Led project/); // The richer portfolio includes healthy active work.
assert.match(html, /Assigned active task/);
assert.match(html, /Review task/);
assert.match(html, /My active tasks/);
assert.match(html, /Active Projects<\/span>[\s\S]*?studio-metric-value">2<\/p>/);
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
assert.match(adminHtml, /All Projects/);
assert.equal((adminHtml.match(/aria-label="Select Pagination sample /g) ?? []).length, 15);
assert.match(adminHtml, /Search dashboard projects/);
const { ProjectTable } = load(resolve(root, "components/dashboard/project-table.tsx"));
const tableHtml = renderToStaticMarkup(React.createElement(ProjectTable, { projects: manyProjects, people: [], now, onSelect() {}, onCalendar() {} }));
assert.match(tableHtml, /of 34 projects/);
assert.equal((tableHtml.match(/aria-label="Select Pagination sample /g) ?? []).length, 15);
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
assert.match(emptyHtml, /No projects/);
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

const { scopeWorkspaceToTeam } = load(resolve(root, "lib/team-scope.ts"));
const scopeTasks = [
  { id: "a", assignee_id: "member", project_id: "p1" },
  { id: "b", assignee_id: "leader", project_id: null },
  { id: "c", assignee_id: "other", project_id: "p1" },
  { id: "d", assignee_id: null },
];
const scopeProjects = [
  { id: "p1" },
  { id: "p2", project_members: [{ user_id: "member" }] },
  { id: "p3", leader_id: "other" },
];
const scopePeople = [{ id: "member" }, { id: "leader" }, { id: "other" }];
const memberships = [{ team_id: "t1", user_id: "member" }, { team_id: "t2", user_id: "other" }];
const scoped = scopeWorkspaceToTeam({ id: "t1", leader_id: "leader" }, memberships, scopeTasks, scopeProjects, scopePeople);
assert.deepEqual(scoped.tasks.map(task => task.id), ["a", "b"]);
assert.deepEqual(scoped.projects.map(project => project.id), ["p1", "p2"]);
assert.deepEqual(scoped.people.map(person => person.id), ["member", "leader"]);
assert.equal(scopeWorkspaceToTeam(undefined, memberships, scopeTasks, scopeProjects, scopePeople).tasks, scopeTasks);
assert.equal(scopeWorkspaceToTeam({ id: "empty" }, memberships, scopeTasks, scopeProjects, scopePeople).tasks.length, 0);
console.log("Team workspace scope regressions passed.");

const { TaskDeadlineEditor } = load(resolve(root, "components/tasks/task-deadline-editor.tsx"));
const deadlineProps = { task: { id: "deadline-task", title: "Sample deadline task" }, notify() {}, onRefresh() {} };
assert.match(renderToStaticMarkup(React.createElement(TaskDeadlineEditor, { ...deadlineProps, role: "Admin" })), /Change deadline/);
for (const role of ["Project Leader", "Team Member"]) {
  assert.equal(renderToStaticMarkup(React.createElement(TaskDeadlineEditor, { ...deadlineProps, role })), "");
}
console.log("Admin deadline control visibility regressions passed.");

const listProps = { ...taskPanelProps, detailOnly: false, role: "Admin", onOpenTask() {}, teams: [{ id: "dept", name: "Design" }], teamMembers: [{ team_id: "dept", user_id: "member" }], selectedTeamId: "dept", onTeamChange() {} };
const listHtml = renderToStaticMarkup(React.createElement(TasksView, listProps));
assert.match(listHtml, /Filter tasks by department team/);
assert.match(listHtml, /class="task-list-row"/);
assert.match(listHtml, /task-extra-filters[^>]*hidden/);
assert.doesNotMatch(listHtml, /Delete task|Change deadline|Assign Panel task|Status for Panel task|Task overview/);
const emptyTeamHtml = renderToStaticMarkup(React.createElement(TasksView, { ...listProps, teams: [{ id: "dept", name: "Empty department" }], teamMembers: [] }));
assert.match(emptyTeamHtml, /No tasks found/);
assert.match(emptyTeamHtml, /Reset filters/);
assert.match(managerPanelHtml, /Change deadline/);
assert.match(memberPanelHtml, /Submit for review/);
assert.match(html, /studio-greeting-mascot/);
assert.equal((html.match(/class="studio-metric"/g) ?? []).length, 6);
console.log("Simplified task UX regressions passed: department filtering, empty states, compact list, and role-specific detail actions.");

const { matchesTaskFocus } = load(resolve(root, "lib/task-focus.ts"));
const focusNow = new Date(2026, 9, 7, 12).getTime();
const overdueTask = { ...taskFixture, due_at: new Date(focusNow - 3600000).toISOString(), blocked_reason: "Waiting for client dimensions" };
assert.equal(matchesTaskFocus(overdueTask, "overdue", focusNow), true);
assert.equal(matchesTaskFocus(overdueTask, "today", focusNow), true);
assert.equal(matchesTaskFocus(overdueTask, "blocked", focusNow), true);
for (const status of ["completed", "closed", "cancelled"]) {
  for (const focus of ["overdue", "today", "blocked", "unassigned", "review"]) {
    assert.equal(matchesTaskFocus({ ...overdueTask, status, assignee_id: null }, focus, focusNow), false);
  }
}
assert.equal(matchesTaskFocus({ ...taskFixture, status: "in_revision" }, "review", focusNow), false);
assert.equal(matchesTaskFocus({ ...taskFixture, status: "in_review" }, "review", focusNow), true);
assert.equal(matchesTaskFocus({ ...taskFixture, due_at: "invalid" }, "overdue", focusNow), false);
const focusHtml = renderToStaticMarkup(React.createElement(TasksView, { ...listProps, tasks: [overdueTask], initialFocus: "review" }));
assert.match(focusHtml, /No tasks found/);
assert.match(focusHtml, /Clear work queue/);
const { ApprovalPanel } = load(resolve(root, "components/dashboard/approval-panel.tsx"));
const queueHtml = renderToStaticMarkup(React.createElement(ApprovalPanel, { tasks: [
  { ...taskFixture, id: "revision", title: "Revision work", status: "in_revision" },
  { ...taskFixture, id: "recent", title: "Recent submission", status: "in_review", submitted_at: new Date(focusNow - 3600000).toISOString() },
  { ...taskFixture, id: "old", title: "Old submission", status: "in_review", submitted_at: new Date(focusNow - 3 * 86400000).toISOString() },
], projects: [], people: [], now: focusNow, onViewAll() {} }));
assert.doesNotMatch(queueHtml, /Revision work/);
assert.ok(queueHtml.indexOf("Old submission") < queueHtml.indexOf("Recent submission"));
assert.match(queueHtml, /Waiting 3d/);
const sixReviewHtml = renderToStaticMarkup(React.createElement(ApprovalPanel, {
  tasks: Array.from({ length: 6 }, (_, index) => ({ ...taskFixture, id: `review-${index}`, title: `Review item ${index + 1}`, status: "in_review" })),
  projects: [], people: [], now: focusNow, onViewAll() {},
}));
assert.equal((sixReviewHtml.match(/aria-roledescription="slide"/g) ?? []).length, 6);
assert.match(sixReviewHtml, /6 of 6: Review item 6/);
assert.match(sixReviewHtml, /Previous review/);
assert.match(sixReviewHtml, /Next review/);
assert.doesNotMatch(sixReviewHtml, /Showing 4 of/);

const { projectAttentionReasons } = load(resolve(root, "components/dashboard/data.ts"));
assert.deepEqual(projectAttentionReasons({ id: "done", status: "closed" }, [overdueTask], focusNow), []);
assert.ok(projectAttentionReasons({ id: "work", status: "open", leader_id: "member", deadline: null }, [{ ...overdueTask, project_id: "work" }], focusNow).includes("1 blocked task"));
console.log("Dashboard action regressions passed: terminal states excluded, exact review queue, oldest-first submissions, focused navigation, and project warning reasons.");

const { ProjectPortfolio } = load(resolve(root, "components/dashboard/project-portfolio.tsx"));
const portfolioProps = { projects: [{ ...projects[0], completion_percentage: null }], tasks: [], people: [], now: focusNow, onSelect() {}, onViewAll() {} };
const unknownProgressHtml = renderToStaticMarkup(React.createElement(ProjectPortfolio, portfolioProps));
assert.match(unknownProgressHtml, /Not recorded/);
assert.doesNotMatch(unknownProgressHtml, /<progress/);
const zeroProgressHtml = renderToStaticMarkup(React.createElement(ProjectPortfolio, { ...portfolioProps, projects: [{ ...projects[0], completion_percentage: 0 }] }));
assert.match(zeroProgressHtml, /<progress value="0" max="100"/);
const { WorkDistribution, RecentUpdates } = load(resolve(root, "components/dashboard/work-insights.tsx"));
const distributionHtml = renderToStaticMarkup(React.createElement(WorkDistribution, { tasks: [{ ...taskFixture, status: "completed" }, { ...taskFixture, id: "cancelled", status: "cancelled" }] }));
assert.match(distributionHtml, /Completed: 1 of 2 tasks/);
assert.match(distributionHtml, /Cancelled: 1 of 2 tasks/);
const updatesHtml = renderToStaticMarkup(React.createElement(RecentUpdates, { projects: [], tasks: [
  { ...taskFixture, id: "older", title: "Older update", updated_at: new Date(focusNow - 86400000).toISOString() },
  { ...taskFixture, id: "newer", title: "Newer update", updated_at: new Date(focusNow).toISOString() },
  { ...taskFixture, id: "invalid", title: "Invalid update", updated_at: "not-a-date" },
], onSelectProject() {} }));
assert.ok(updatesHtml.indexOf("Newer update") < updatesHtml.indexOf("Older update"));
assert.doesNotMatch(updatesHtml, /Invalid update/);
assert.match(adminHtml, /Team overview/);
assert.doesNotMatch(html, /Team workload/);
console.log("Rich dashboard regressions passed: bounded portfolio, unknown versus zero progress, task distribution, recent update ordering, and role-specific workload.");

// Visibility is based on IDs, including projects related only by assigned tasks.
const taskLinked = mapProjects([...rows, { id: "task-only", name: "Task-linked project", project_members: [] }], people, "member", "Team Member", new Set(["task-only"]));
assert.deepEqual(taskLinked.map(project => project.id), ["assigned", "led", "task-only"]);
const { accessibleTeamDirectory } = load(resolve(root, "lib/team-scope.ts"));
const departmentRows = [{ id: "own", name: "Design", leader_id: "leader" }, { id: "led", name: "CAD", leader_id: "member" }, { id: "other", name: "Finance", leader_id: "other" }];
const membershipRows = [{ team_id: "own", user_id: "member" }, { team_id: "own", user_id: "peer" }, { team_id: "other", user_id: "other" }];
const memberDirectory = accessibleTeamDirectory("Team Member", "member", departmentRows, membershipRows);
assert.deepEqual(memberDirectory.teams.map(team => team.id), ["own", "led"]);
assert.ok(memberDirectory.personIds.has("peer"));
assert.ok(memberDirectory.personIds.has("leader"));
assert.ok(!memberDirectory.personIds.has("other"));
assert.equal(accessibleTeamDirectory("Admin", "admin", departmentRows, membershipRows).teams.length, 3);
assert.equal(accessibleTeamDirectory("Team Member", "no-team", departmentRows, membershipRows).teams.length, 0);
const duplicateNameHtml = renderToStaticMarkup(React.createElement(Dashboard, {
 projects: [], tasks: [{ ...taskFixture, id: "other-person", assignee_id: "other", owner: "Sample Member", title: "Private same-name task" }],
 role: "Team Member", profileId: "member", userName: "Sample Member", setView() {}, notify() {},
}));
assert.doesNotMatch(duplicateNameHtml, /Private same-name task/);
const { DashboardGreeting } = load(resolve(root, "components/views/dashboard-greeting.tsx"));
const todayMorning = new Date(focusNow); todayMorning.setHours(0, 0, 0, 0);
const briefingHtml = renderToStaticMarkup(React.createElement(DashboardGreeting, {
 now: focusNow, role: "Admin", projects: [{ id:"today", status:"open", deadline:todayMorning.toISOString() }],
 tasks: [{ ...taskFixture, status:"completed", state:"Open", due_at:new Date(focusNow-86400000).toISOString() }],
}));
assert.match(briefingHtml, /No active tasks/);
assert.doesNotMatch(briefingHtml, /task overdue|project past deadline/);
const { loadWorkspaceRows } = load(resolve(root, "lib/workspace-data.ts"));
const allRows = Array.from({length:1201}, (_,id) => ({id}));
const pageStarts = [];
const loaded = await loadWorkspaceRows({ range(from,to) { pageStarts.push(from); return Promise.resolve({data:allRows.slice(from,Math.min(to+1,from+200)),error:null,count:allRows.length}); } });
assert.equal(loaded.data.length, 1201);
assert.deepEqual(pageStarts, [0,200,400,600,800,1000,1200]);
const failedLoad = await loadWorkspaceRows({range() {return Promise.resolve({data:null,error:{message:"Failed query"}});}});
assert.equal(failedLoad.data, null);
assert.match(failedLoad.error.message, /Failed query/);
console.log("Accuracy and access checks passed: ID-only tasks, task-linked projects, private department scope, calendar-day project deadlines, complete pagination, and load errors.");

const crossTeamProject = {id:"cross-team",leader_id:"outsider",project_members:[{user_id:"member"}]};
const crossTeamScope = scopeWorkspaceToTeam({id:"own",leader_id:"leader"}, membershipRows, [], [crossTeamProject], [{id:"member"},{id:"leader"},{id:"outsider"}]);
assert.ok(crossTeamScope.people.some(person => person.id === "outsider"));
assert.ok(!crossTeamScope.teamPeople.some(person => person.id === "outsider"));
assert.match(html, /My Projects/);
