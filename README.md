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

## Windows desktop app

The Tauri desktop client is a separate wrapper and does not replace or rebuild
the Next.js web app. It loads the deployed workspace at
`https://redshadowprojects.vercel.app/`, so web deployments appear in the
desktop app without reinstalling it. Keep the URL in
`desktop/src-tauri/src/main.rs` and the matching origin in
`desktop/src-tauri/capabilities/main-capability.json` in sync if the production
domain changes.

The desktop client uses the same hosted Supabase project, authentication,
roles, data, and Realtime subscriptions as the web app. Supabase credentials
remain in the existing web deployment; do not add them to the desktop bundle.
The WebView2 profile persists the Supabase session locally and refreshes it
through the existing Supabase client. Only the production origin is granted
access to Tauri's native notification plugin.

### Requirements and commands

- Windows 10/11 with the WebView2 Runtime
- Node.js 22 and npm
- Rust 1.90+ with the MSVC target and Microsoft C++ Build Tools
- WiX Toolset v3 for MSI packaging; NSIS is used for the EXE installer

Run `npm run desktop:dev` to start the existing Next.js development server and
the Tauri shell. Run `npm run desktop:build` to create the Windows installers
without running or changing the Next.js production build. The resulting
installers are written under
`desktop/src-tauri/target/release/bundle/` (`nsis/*.exe` and `msi/*.msi`).

The shell starts with Windows, provides Open, Notifications, Logout, and Exit
in its system-tray menu, and hides to the tray when the window is closed. Its
bundled offline screen appears when the deployed app cannot be reached; it
checks for connectivity again every 15 seconds. Native alerts use the existing
notification stream for task assignments and project creation, plus Realtime
changes for task/project deadlines, key project updates, and overdue tasks.
Allow notifications from the Notifications view to enable Windows alerts.
