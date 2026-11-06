<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project

YaadGuide ("Your Digital Travel Agent") is a multi-sided marketplace and itinerary planner for Free Independent Travelers visiting Jamaica, covering STAY, MOVE and VIBE (dining is a VIBE subtype). Travelers build itineraries and book; local vendors list services through a dashboard. Current goal: v1 web app (see `PRD.md` for scope). Stack: Next.js, Supabase, shadcn/ui, WiPay, Vercel.

## Commands

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test: `npm run test` (Vitest)

## Conventions

- TypeScript `strict`, App Router, server components by default. Use the `@/*` alias for imports from `src/`.
- UI uses shadcn/ui components from `src/components/ui/`. Add new ones with the shadcn CLI or its MCP server, not by hand.
- All prices are USD. Fees, commissions and sponsored pricing come from configuration, never hard-coded.
- Commit, branch and PR rules live in the `conventions` skill.
- TODO(bootstrap): naming and file layout beyond the above are not decided.

## Boundaries

- Never commit secrets: Supabase service-role key, WiPay keys, Google API keys. Keep them in environment variables.
- Do not edit `node_modules/` or generated files.
- Do not change vendor payout or fee logic without updating `PRD.md` first.
- Do not expose vendor contact details before a booking is confirmed.
- Do not weaken row-level security on any Supabase table.
- Do not touch production data.

## Read this first

- Always read `ARCHITECTURE-ESSENTIAL.md` before starting a task.
- Open `PRD.md` only when the task adds or changes a feature or its scope.
- Open `ARCHITECTURE.md` only when the digest is not enough (data model, auth, API boundaries, past decisions).
- Open `DESIGN.md` for any UI work.

## Keeping docs in sync

- Any change to `ARCHITECTURE.md` must update `ARCHITECTURE-ESSENTIAL.md` in the same change. Keep the digest a faithful summary of `ARCHITECTURE.md`; never add a fact that is not in it.
- Decisions that change scope go to `PRD.md` first, then architecture, then the digest.

## Stack: Next.js

- Next.js App Router with TypeScript in `strict` mode. Server components by default; add `"use client"` only where state, effects or browser APIs require it.
- Scripts expected in `package.json`: `dev`, `build`, `test`, `typecheck`, `lint`. A hook runs `typecheck` and `lint` when an agent stops and shows any failure as a message to the user without blocking (80s limit per script). Another hook warns when `ARCHITECTURE.md` is edited without updating `ARCHITECTURE-ESSENTIAL.md`.
- Skills for this stack: `nextjs-app-router` (routing, data, caching, server actions), `backend-integration` (auth, BaaS or custom API behind an adapter), `web-testing` (Vitest, Testing Library, Playwright), `conventions` (git and TypeScript rules).
- Check the installed Next.js version's docs before relying on caching or routing defaults, since they have changed between major versions.

## Workflow & Action Restrictions
- Do NOT run full builds or tests unless explicitly asked.
- Do NOT re-read files that were already modified or read in the current session.
- Do NOT perform exploratory directory listings if specific file paths are given.
- Always use quiet flags for CLI commands (`--quiet`, `-q`, `--reporter=dot`).

## Token Use
- Finish the work first, then test as little as possible. One verification at the end of a job, not after every step or fix round.
- Do NOT start the dev or production server, or open a browser, unless the user asks or the change is visual and cannot be judged from code. Then use ONE server session per job: start it once, check everything, stop it, and free the port. No re-runs "to be sure".
- Default subagents to Sonnet. Use Opus only when the user asks for it. Never use Opus for routine edits, reviews of small diffs, or browser checks.
- Do not add a separate review round for small or cosmetic changes. Reserve reviewer subagents for large or risky changes, and run at most one review plus one fix pass.
- Keep subagent prompts short: the task, the file paths, the rules that apply. Do not paste the plan, spec or earlier reports into a prompt; point to the file path instead. Do not repeat the same constraint block in every prompt.
- Ask subagents to reply in about ten lines and to write long detail to a report file. Do not read report files unless a decision depends on them.
- Prefer small targeted commands: `git diff --stat`, `head`, `--short`, `--oneline`. Never dump whole files or full diffs into context when a line range or a stat will do.
- Do not hand-check things the repo tooling already checks (typecheck and lint run automatically when an agent stops).
- When a job is large, split it into batches and stop between batches to let the user restart. A very long session re-reads its whole history on every turn.