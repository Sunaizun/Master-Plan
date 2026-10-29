# Master's Application OS

A personal operating system for getting from AITU (BSc Computer Science, June 2027) to a master's offer abroad and a possible Bolashak scholarship.

It tracks six shortlisted programmes, a requirements checklist per programme, tasks with dependencies, a unified calendar, IELTS preparation, documents and versions, SOP/CV drafts, recommendation letters, Bolashak rules, and the application budget.

## Stack

| Layer | Choice | Why |
|---|---|---|
| UI | React 18 + TypeScript, plain CSS with design tokens (light/dark) | No server needed; one file to publish |
| Charts | Recharts | IELTS trend, practice hours, budget |
| Validation | Zod | Every create/update is schema-checked; errors shown per field |
| Build | Vite → one IIFE bundle, inlined into a single HTML file | Publishes as a claude.ai Artifact or opens locally |
| Storage | claude.ai Artifact `db` (private per-user area) **or** browser `localStorage` | No backend to host, no secrets |

The spec suggested Next.js + Supabase. That stack needs hosting, a database project and auth keys before you can use it. This version gives the same features with zero setup; `docs/schema.md` describes the data model and `docs/postgres-schema.sql` is a ready migration (with row-level security) if you later move to Supabase.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173 (saves to this browser)
npm run build        # dist/masters-os.html (Artifact) + dist/masters-os-standalone.html
npm test             # unit tests: readiness, IELTS rounding, money, alerts, seed integrity
npm run e2e          # browser tests (needs: pip install playwright && playwright install chromium)
```

Open `dist/masters-os-standalone.html` directly in a browser to use it offline. On first open, choose **Load my starter workspace**.

## Where data is stored

- **Published on claude.ai** (signed in): saved to `data/users/<your id>/…` in the page's database. Only you can read that area, even if you share the page. Syncs across your devices.
- **Standalone file / dev server**: saved in that browser's `localStorage`. Use **Settings → Export backup** regularly.
- Each collection is its own document (requirements are split per programme) so a save never rewrites everything. SOP/CV text is stored per version.
- File attachments (PDF/images up to 20 MB) are only available on claude.ai, stored privately with the page. Passport numbers are never requested; the document form blocks notes that look like ID numbers.

## Rules the app enforces

- A requirement counts toward readiness only when it is **Complete and Verified**. "Optional" and "Not required" rows are excluded.
- Marking a row or Bolashak rule verified requires an official source URL; the date is recorded.
- Overdue is derived from deadlines; tasks with unfinished dependencies show as **Blocked**.
- Completing a task linked to a requirement can mark that requirement complete or verified.
- Currency conversion uses only rates you enter. Missing rates are shown as "not converted", never guessed.
- No admission probabilities. Each programme is classified as *Stronger fit*, *Competitive/ambitious* or *Unclear pending verification*, with written evidence.
- Status is never colour-only: every status has a glyph and a text label.

## Notifications

In-app only: the Alerts panel, dashboard and weekly review. Nothing is emailed or pushed. To get phone reminders, use **Tasks & Calendar → Export to calendar (.ics)** and import into Google/Apple/Outlook Calendar (key deadlines carry a 7-day reminder). Re-export after changing dates.

## Project layout

```
src/lib/types.ts      Zod schemas + types for every entity
src/lib/seed.ts       Starter data with sources (checked 29 Oct 2026)
src/lib/calc.ts       Pure logic: readiness, alerts, events, IELTS, money, ICS
src/lib/storage.ts    Cloud (Artifact db) and localStorage backends
src/lib/store.tsx     State, CRUD with cascading deletes, debounced saves
src/pages/*           One file per screen
tests/                Unit + end-to-end tests
```
