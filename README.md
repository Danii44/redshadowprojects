# Red Shadow Projects

Private internal project-management system for Red Shadow Designs.

## Features

- Admin, Project Leader, and Team Member role views
- Company command center and Needs Attention alerts
- Projects with customizable phases and revisions
- Tasks, Kanban, blockers, reviews, checklists, and daily updates
- Team workload, calendar, notifications, and activity history
- Supabase authentication and row-level security
- Responsive desktop, tablet, and mobile UI

## Setup

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Invite staff in Supabase Authentication.
3. Link each Auth user to the matching seeded profile using the SQL example at the bottom of the schema.
4. Copy `.env.example` to `.env.local` and set the Supabase values.
5. Run `pnpm install` and `pnpm dev`.

## Vercel

Import this repository into Vercel. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as environment variables. Do not expose the service-role key in the browser.

Initial profiles: Daniyal Ahmad (Admin), Ahmad Shujaat (Project Leader), and four editable team-member placeholders.