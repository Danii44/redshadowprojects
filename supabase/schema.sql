-- Red Shadow Designs — Supabase schema
-- Run once in Supabase > SQL Editor. Safe to re-run.
create extension if not exists pgcrypto;

do $$ begin create type public.app_role as enum ('admin','project_leader','team_member'); exception when duplicate_object then null; end $$;
do $$ begin create type public.task_state as enum ('todo','in_progress','review','blocked','done'); exception when duplicate_object then null; end $$;
do $$ begin alter type public.task_state add value if not exists 'open'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.task_state add value if not exists 'in_review'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.task_state add value if not exists 'in_revision'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.task_state add value if not exists 'closed'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.task_state add value if not exists 'cancelled'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.task_state add value if not exists 'completed'; exception when duplicate_object then null; end $$;
do $$ begin create type public.alert_level as enum ('critical','warning','information'); exception when duplicate_object then null; end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text unique,
  name text not null,
  role public.app_role not null default 'team_member',
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), code text unique not null, name text not null,
  client text not null, description text, requirements text, internal_notes text,
  status text not null default 'active', priority text not null default 'normal',
  leader_id uuid not null references public.users(id), deadline timestamptz,
  last_activity_at timestamptz default now(), archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade, project_role text,
  created_at timestamptz not null default now(), unique(project_id,user_id)
);
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(), name text unique not null,
  leader_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(), unique(team_id,user_id)
);
create table if not exists public.project_phases (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  name text not null, position integer not null, state text not null default 'upcoming',
  started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(project_id,position)
);
create table if not exists public.project_phase_history (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  from_phase_id uuid references public.project_phases(id), to_phase_id uuid not null references public.project_phases(id),
  requested_by uuid not null references public.users(id), approved_by uuid references public.users(id),
  state text not null default 'requested', note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  phase_id uuid references public.project_phases(id) on delete set null, title text not null, description text,
  assignee_id uuid references public.users(id), created_by uuid not null references public.users(id),
  reviewer_id uuid references public.users(id), status text not null default 'open',
  priority text not null default 'normal', due_at timestamptz, blocked_reason text, blocked_at timestamptz,
  submitted_at timestamptz, reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.task_checklists (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
  label text not null, position integer not null, completed boolean not null default false,
  completed_by uuid references public.users(id), completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.tasks alter column status drop default;
alter table public.tasks alter column status type text using status::text;
alter table public.tasks alter column status set default 'open';
update public.tasks set status = case status
  when 'todo' then 'open'
  when 'review' then 'in_review'
  when 'blocked' then 'in_revision'
  when 'done' then 'completed'
  else status
end where status in ('todo','review','blocked','done');
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.users(id), body text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.revisions (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  phase_id uuid not null references public.project_phases(id) on delete cascade, number integer not null,
  notes text, state text not null default 'open', submitted_by uuid references public.users(id), submitted_at timestamptz,
  reviewed_by uuid references public.users(id), reviewed_at timestamptz, review_outcome text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(phase_id,number)
);
create table if not exists public.revision_comments (
  id uuid primary key default gen_random_uuid(), revision_id uuid not null references public.revisions(id) on delete cascade,
  author_id uuid not null references public.users(id), body text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.daily_updates (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id),
  project_id uuid references public.projects(id) on delete set null, summary text not null, blockers text, next_steps text,
  update_date date not null default current_date, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  type text not null, severity public.alert_level not null, title text not null, body text,
  entity_type text, entity_id uuid, read_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.users(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade, action text not null, entity_type text not null,
  entity_id uuid, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

create index if not exists idx_projects_leader_status on public.projects(leader_id,status);
create index if not exists idx_project_members_user on public.project_members(user_id);
create index if not exists idx_tasks_assignee_status on public.tasks(assignee_id,status);
create index if not exists idx_tasks_project_due on public.tasks(project_id,due_at);
create index if not exists idx_notifications_user_unread on public.notifications(user_id,read_at);
create index if not exists idx_activity_project_created on public.activity_logs(project_id,created_at desc);

-- A delivered project can become active again when a client requests changes.
-- `revision` is intentionally separate from `active` and `completed` so the
-- dashboard never presents reopened work as a finished project.
create or replace function public.reopen_completed_project_for_revision()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.projects
     set status = 'revision', last_activity_at = now(), updated_at = now()
   where id = new.project_id and status = 'completed';
  return new;
end;
$$;
drop trigger if exists revisions_reopen_completed_project on public.revisions;
create trigger revisions_reopen_completed_project
after insert on public.revisions
for each row execute function public.reopen_completed_project_for_revision();

-- When an invited person accepts a Supabase Auth invitation, connect the
-- account to the member profile the Admin already created with that email.
create or replace function public.link_auth_user_to_profile()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.users
     set auth_user_id = new.id, updated_at = now()
   where lower(email) = lower(new.email) and auth_user_id is null;
  if not found then
    insert into public.users(auth_user_id,email,name,role)
    values(new.id,new.email,coalesce(new.raw_user_meta_data->>'name',split_part(new.email,'@',1)),'team_member')
    on conflict (email) do update set auth_user_id=excluded.auth_user_id, updated_at=now();
  end if;
  return new;
end;
$$;
drop trigger if exists auth_user_links_company_profile on auth.users;
create trigger auth_user_links_company_profile
after insert on auth.users
for each row execute function public.link_auth_user_to_profile();

create or replace function public.current_profile() returns public.users language sql stable security definer set search_path=public as
$$ select * from public.users where auth_user_id=auth.uid() and active limit 1 $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select coalesce((select role='admin' from public.users where auth_user_id=auth.uid() and active),false) $$;
create or replace function public.can_access_project(pid uuid) returns boolean language sql stable security definer set search_path=public as
$$ select public.is_admin() or exists(select 1 from public.projects p join public.users u on u.auth_user_id=auth.uid() where p.id=pid and p.leader_id=u.id)
   or exists(select 1 from public.project_members pm join public.users u on u.auth_user_id=auth.uid() where pm.project_id=pid and pm.user_id=u.id) $$;

alter table public.users enable row level security; alter table public.projects enable row level security;
alter table public.teams enable row level security; alter table public.team_members enable row level security;
alter table public.project_members enable row level security; alter table public.project_phases enable row level security;
alter table public.project_phase_history enable row level security; alter table public.tasks enable row level security;
alter table public.task_checklists enable row level security; alter table public.task_comments enable row level security;
alter table public.revisions enable row level security; alter table public.revision_comments enable row level security;
alter table public.daily_updates enable row level security; alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists users_read on public.users; create policy users_read on public.users for select to authenticated using (true);
drop policy if exists users_admin_write on public.users; create policy users_admin_write on public.users for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists teams_read on public.teams; create policy teams_read on public.teams for select to authenticated using (true);
drop policy if exists teams_admin_manage on public.teams; create policy teams_admin_manage on public.teams for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists team_members_read on public.team_members; create policy team_members_read on public.team_members for select to authenticated using (true);
drop policy if exists team_members_admin_manage on public.team_members; create policy team_members_admin_manage on public.team_members for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists projects_read on public.projects; create policy projects_read on public.projects for select to authenticated using (public.can_access_project(id));
drop policy if exists projects_admin_write on public.projects; create policy projects_admin_write on public.projects for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists projects_leader_update on public.projects; create policy projects_leader_update on public.projects for update to authenticated using (leader_id=(select id from public.current_profile())) with check (leader_id=(select id from public.current_profile()));
drop policy if exists members_access on public.project_members; create policy members_access on public.project_members for select to authenticated using (public.can_access_project(project_id));
drop policy if exists members_manage on public.project_members; create policy members_manage on public.project_members for all to authenticated using (public.is_admin() or exists(select 1 from public.projects p where p.id=project_id and p.leader_id=(select id from public.current_profile()))) with check (public.is_admin() or exists(select 1 from public.projects p where p.id=project_id and p.leader_id=(select id from public.current_profile())));
drop policy if exists phases_access on public.project_phases; create policy phases_access on public.project_phases for select to authenticated using (public.can_access_project(project_id));
drop policy if exists phases_manage on public.project_phases; create policy phases_manage on public.project_phases for all to authenticated using (public.is_admin() or exists(select 1 from public.projects p where p.id=project_id and p.leader_id=(select id from public.current_profile()))) with check (public.is_admin() or exists(select 1 from public.projects p where p.id=project_id and p.leader_id=(select id from public.current_profile())));
drop policy if exists tasks_read on public.tasks; create policy tasks_read on public.tasks for select to authenticated using (public.can_access_project(project_id));
drop policy if exists tasks_manage on public.tasks; create policy tasks_manage on public.tasks for all to authenticated using (public.is_admin() or exists(select 1 from public.projects p where p.id=project_id and p.leader_id=(select id from public.current_profile()))) with check (public.is_admin() or exists(select 1 from public.projects p where p.id=project_id and p.leader_id=(select id from public.current_profile())));
drop policy if exists notifications_own on public.notifications; create policy notifications_own on public.notifications for all to authenticated using (user_id=(select id from public.current_profile()) or public.is_admin()) with check (user_id=(select id from public.current_profile()) or public.is_admin());
drop policy if exists updates_access on public.daily_updates; create policy updates_access on public.daily_updates for select to authenticated using (project_id is null or public.can_access_project(project_id));
drop policy if exists updates_own_write on public.daily_updates; create policy updates_own_write on public.daily_updates for all to authenticated using (user_id=(select id from public.current_profile()) or public.is_admin()) with check (user_id=(select id from public.current_profile()) or public.is_admin());

-- Child records inherit access from their project/task/revision.
drop policy if exists checklist_access on public.task_checklists; create policy checklist_access on public.task_checklists for all to authenticated using (exists(select 1 from public.tasks t where t.id=task_id and public.can_access_project(t.project_id))) with check (exists(select 1 from public.tasks t where t.id=task_id and public.can_access_project(t.project_id)));
drop policy if exists task_comments_access on public.task_comments; create policy task_comments_access on public.task_comments for all to authenticated using (exists(select 1 from public.tasks t where t.id=task_id and public.can_access_project(t.project_id))) with check (exists(select 1 from public.tasks t where t.id=task_id and public.can_access_project(t.project_id)));
drop policy if exists revisions_read on public.revisions; create policy revisions_read on public.revisions for select to authenticated using (public.can_access_project(project_id));
drop policy if exists revisions_manage on public.revisions; create policy revisions_manage on public.revisions for all to authenticated using (public.is_admin() or exists(select 1 from public.projects p where p.id=project_id and p.leader_id=(select id from public.current_profile()))) with check (public.is_admin() or exists(select 1 from public.projects p where p.id=project_id and p.leader_id=(select id from public.current_profile())));
drop policy if exists revision_comments_access on public.revision_comments; create policy revision_comments_access on public.revision_comments for all to authenticated using (exists(select 1 from public.revisions r where r.id=revision_id and public.can_access_project(r.project_id))) with check (exists(select 1 from public.revisions r where r.id=revision_id and public.can_access_project(r.project_id)));
drop policy if exists phase_history_read on public.project_phase_history; create policy phase_history_read on public.project_phase_history for select to authenticated using (public.can_access_project(project_id));
drop policy if exists phase_history_request on public.project_phase_history; create policy phase_history_request on public.project_phase_history for insert to authenticated with check (public.is_admin() or exists(select 1 from public.projects p where p.id=project_id and p.leader_id=(select id from public.current_profile())));
drop policy if exists phase_history_approve on public.project_phase_history; create policy phase_history_approve on public.project_phase_history for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists activity_access on public.activity_logs; create policy activity_access on public.activity_logs for select to authenticated using (project_id is null or public.can_access_project(project_id));

-- Initial editable staff. Add email/auth_user_id after inviting each person in Supabase Authentication.
insert into public.users(name,role) values
 ('Daniyal Ahmad','admin'), ('Ahmad Shujaat','project_leader')
on conflict do nothing;

-- Remove the original evaluation-only placeholder profiles.
update public.tasks set assignee_id=null where assignee_id in (select id from public.users where name in ('Team Member 1','Team Member 2','Team Member 3','Team Member 4'));
update public.tasks set reviewer_id=null where reviewer_id in (select id from public.users where name in ('Team Member 1','Team Member 2','Team Member 3','Team Member 4'));
delete from public.team_members where user_id in (select id from public.users where name in ('Team Member 1','Team Member 2','Team Member 3','Team Member 4'));
delete from public.project_members where user_id in (select id from public.users where name in ('Team Member 1','Team Member 2','Team Member 3','Team Member 4'));
delete from public.users
where auth_user_id is null
  and name in ('Team Member 1','Team Member 2','Team Member 3','Team Member 4');

do $$
declare
  admin_id uuid; leader_id uuid; member_id uuid; v_project_id uuid; v_phase_id uuid;
begin
  select id into admin_id from public.users where name='Daniyal Ahmad' limit 1;
  select id into leader_id from public.users where name='Ahmad Shujaat' limit 1;
  member_id := leader_id;
  if not exists(select 1 from public.projects where code='RSD-2408') then
    insert into public.projects(code,name,client,description,requirements,internal_notes,status,priority,leader_id,deadline)
    values('RSD-2408','Atlas Tow Dolly','Northstar Mobility','Tow-dolly mechanical design and production package','Resolve chassis geometry and hitch clearance before client review.','Confirm manufacturability before releasing drawings.','active','critical',leader_id,now()+interval '7 days')
    returning id into v_project_id;
    insert into public.project_members(project_id,user_id,project_role) values(v_project_id,leader_id,'Project Leader');
    insert into public.project_phases(project_id,name,position,state,started_at) values
      (v_project_id,'Requirements',1,'completed',now()-interval '20 days'),
      (v_project_id,'Concept',2,'completed',now()-interval '14 days'),
      (v_project_id,'Detailed Design',3,'active',now()-interval '7 days'),
      (v_project_id,'Client Review',4,'upcoming',null),
      (v_project_id,'Final',5,'upcoming',null);
    select id into v_phase_id from public.project_phases where project_id=v_project_id and name='Detailed Design' limit 1;
    insert into public.tasks(project_id,phase_id,title,description,assignee_id,created_by,reviewer_id,status,priority,due_at,blocked_reason,blocked_at)
    values(v_project_id,v_phase_id,'Resolve hitch clearance conflict','Verify clearance across the full articulation range.',member_id,leader_id,leader_id,'in_revision','critical',now()+interval '1 day','Waiting for revised chassis dimensions.',now());
    insert into public.revisions(project_id,phase_id,number,notes,state,submitted_by) values(v_project_id,v_phase_id,2,'Chassis geometry refinement','open',leader_id);
  end if;
end $$;

-- Link an invited Supabase Auth account to one of the seeded profiles:
-- update public.users set auth_user_id=(select id from auth.users where email='person@company.com'), email='person@company.com' where name='Daniyal Ahmad';

