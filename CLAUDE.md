# Project Instructions (Portfolio Tracker)

## Tech Stack
- **Language**: TypeScript, React 19, Next.js 16 (App Router)
- **Database**: PostgreSQL (NeonDB) with Drizzle ORM
- **Authentication**: Better-Auth (Custom session handling merged with OAuth)
- **Background Jobs**: Inngest (v4)
- **State Management**: Zustand (with memoizeOne for heavy PnL calculations)
- **Styling**: Tailwind CSS + Shadcn UI (Lucide React for icons)
- **Testing**: Vitest for Unit Tests
- **Package Manager**: pnpm

## Code Style & Conventions
- **Component Naming**: PascalCase for React components, camelCase for functions/variables.
- **Data Fetching**: Prefer Server Actions and React Server Components (RSC) where possible.
- **Database Migrations**: 
  - DO NOT use `drizzle-kit push`. 
  - ALWAYS use `pnpm run db:generate` followed by `pnpm run db:migrate`.
- **Background Tasks**: 
  - Heavy or long-running tasks (like fetching external APIs) MUST be queued via Inngest to avoid Vercel timeout limits (15s).
  - Use `step.run()` to batch/chunk large data operations.

## Testing & QA
- **Run tests**: `pnpm run test`
- **Typecheck & Lint**: `pnpm run check` (Runs tsc, eslint, and vitest)
- **Crosscheck rule**: Before committing any major logic changes, MUST run `pnpm run check && pnpm run build`.

## Build & Run
- Dev: `pnpm run dev`
- Build: `pnpm run build`
- Start: `pnpm run start`

## Project Structure
- `src/app/` → Next.js App Router pages and API routes
- `src/db/` → Drizzle schema, DB connections, and migration scripts
- `src/actions/` → Next.js Server Actions (e.g., auth, portfolio updates)
- `src/inngest/` → Background job definitions and step functions
- `src/store/` → Zustand global state
- `src/services/` → Core business logic (e.g., ImportService, CSV parsers)
- `src/lib/` → Utilities, Auth config (`better-auth.ts`)
- `drizzle/` → SQL migration history

## Git Workflow
- Work on feature branches (`feature/xxx`) and merge into `main` after passing crosscheck.
- Commit messages follow conventional commits: `feat(...)`, `fix(...)`, `chore(...)`, `refactor(...)`.
