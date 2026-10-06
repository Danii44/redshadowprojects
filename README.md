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

## Theme and style architecture

`app/globals.css` imports the shared style system. `app/styles/light.css` and
`app/styles/dark.css` define matching color tokens for each theme. `tokens.css`
connects those tokens to Tailwind utilities; base, workspace, dashboard, tasks,
and components styles contain layout and reusable presentation rules.

Use semantic utilities such as `bg-card`, `bg-subtle`, `text-foreground`,
`text-secondary-foreground`, `text-muted-foreground`, and `border-border`. Status treatments
use pairs such as `bg-red-soft text-red` or `bg-green-soft text-green`. Solid
actions use `bg-primary text-on-strong` or `bg-strong text-on-strong`. Avoid fixed
palette colors and inline presentation styles in components. The existing
`next-themes` provider handles system preference, persistence, and switching.

Run `node scripts/theme.test.mjs` to check the matching theme token contracts and
text contrast. Run `node scripts/dashboard-data.test.mjs` for role/data regressions.

For stale CSS after a Vercel deployment, redeploy with **Use existing Build Cache**
unchecked, then refresh the browser. Deploy source changes rather than local
generated `.next` output.

## Vercel deployment

Import this repository into Vercel. In **Project Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Production, Preview, and Development, then redeploy. Vercel does not read deployment values from `.env.example`; that file is only a template. Do not expose the service-role key in the browser.

Initial profiles: Daniyal Ahmad (Admin), Ahmad Shujaat (Project Leader), and four editable team-member placeholders.
