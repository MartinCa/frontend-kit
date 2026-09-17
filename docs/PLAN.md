# Maintenance review — implementation plan & live status

The single working file for the coordinated maintenance review of frontend-kit
and the projects that consume it. Live status lives here, updated as the work
progresses — phases shift, exact timestamps get recorded, findings get filed.

The durable rules this review is checking against live in
[MAINTENANCE.md](./MAINTENANCE.md); this file is the working plan for *this*
review and is expected to change as it moves.

## Baseline

- Phases 0–2.5 baselined from `v0.2.6` (`1855b38`, 2026-09-05); original review target was `56d50b4` (2026-09-14).
- Phase 3 baselines from the Phase 2 release: frontend-kit `v0.2.10` (`f466526`, tagged 2026-09-16T19:26:20Z).
- Review started: 2026-09-16T15:36:52Z

## Relevant repositories

| Repository | Role | Preset state |
|---|---|---|
| `frontend-kit` | the kit itself | preset `b0` (README); peer range `typescript >=5.5 <7` |
| `search-books` | consumer | preset `b0` (`preset resolve` → style `nova`); `components.json` records `style: base-nova`, `baseColor: neutral`, `iconLibrary: lucide` |
| `prowlarr-watcher/frontend` | consumer | preset `b0` — same state as `search-books` |
| `audiobook-manager/client` | consumer | **aligned** — `b0`/Base UI since Phase 2.5 (PR #1452) |

## Phases

| Phase | What | Status | Last updated (UTC) |
|---|---|---|---|
| 0. Baseline | Record release-tag baseline, relevant repos, established findings | done | 2026-09-16T15:36:52Z |
| 1. frontend-kit docs | Maintenance-review methodology in MAINTENANCE.md; version-bounds rationale; this plan | done | 2026-09-16T16:16:11Z |
| 2. frontend-kit release | Merge, tag the next release, publish; consumer reviews then start from the new tag | done — `v0.2.10` shipped | 2026-09-16T19:26:20Z (tag) |
| 2.5. audiobook-manager/client preset alignment | Realign to the intended `b0`/Base UI preset — downstream, after Phase 2, before Phase 3 | done — merged upstream (audiobook-manager PR #1452) | 2026-09-17T15:15:24Z (merge) |
| 3. General consumer review | Run the Phase 1 methodology against every consumer from the Phase 2 tag | done — all three consumer PRs merged | 2026-09-17T23:35:07Z |

### Phase 1 — frontend-kit documentation (this PR)

- [x] 1.1 Maintenance-review methodology in [MAINTENANCE.md](./MAINTENANCE.md):
      checks start from the last frontend-kit release tag; a
      release-note/documentation-impact review rather than outdated-dependency
      chasing; the relevant repositories; non-destructive `shadcn` inspection;
      targeted component updates; preset alignment; exact timestamp recording.
- [x] 1.2 Version bounds documented: TypeScript is capped by typescript-eslint's
      official peer range (`>=4.8.4 <6.1.0`, v8.70.0 today), not by
      frontend-kit's declared range; ESLint 10 is supported; frontend-kit's
      `peerDependencies` stay unchanged.
- [x] 1.3 Preset drift filed: `audiobook-manager/client` is on the old default
      scaffold (`style: default`, `baseColor: slate`) instead of the intended
      `b0`/Base UI preset — queued for Phase 2.5.
- [x] 1.4 This plan kept current as the work moves.

Status: complete — drafted, checked, and committed; awaiting review.
Last updated: 2026-09-16T16:16:11Z

### Phase 2.5 — audiobook-manager/client preset alignment (downstream)

**Do not modify the consumer repo as part of the frontend-kit work.** This phase
is a separate consumer PR, after the Phase 2 frontend-kit changes land and before
the Phase 3 general consumer review.

- Goal: align `audiobook-manager/client` to the same intended `b0`/Base UI preset
  as `search-books` and `prowlarr-watcher/frontend`.
- Evidence of drift: `client/components.json` records `style: default`,
  `baseColor: slate` — the pre-preset default scaffold, from commit `bb46cb9`
  ("Migrate frontend to React 19, Tailwind CSS, and shadcn/ui"), which used no
  preset. The two aligned consumers are on preset `b0` — `shadcn preset resolve`
  reports style `nova`, and their `components.json` records `style: base-nova`,
  `baseColor: neutral`, `iconLibrary: lucide` (`search-books` `e4bcf7c`
  "Initialize shadcn/ui with preset b0"; `prowlarr-watcher` `31fb736`
  "Scaffold frontend/ with Vite + React + TS + Tailwind + shadcn (b0)").
- The client already depends on the Base UI primitives (`@base-ui/react` in
  `package.json`), so this is a preset/config realignment, not a component swap.
- How: `pnpm dlx shadcn@latest apply --preset b0` (targeted:
  `--only theme,font`); `init --preset b0` does the same where a project was
  never on a preset.
- `cn` migration is **not** needed — the client already exports `cn` from the
  `cn` package (`src/lib/utils.ts`).

Status: done — landed upstream in audiobook-manager PR #1452 ("feat(client):
align UI with shadcn b0 preset"), merged 2026-09-17T15:15:24Z. The Phase 3
baseline confirmed `client/components.json` now records `style: base-nova`.
Last updated: 2026-09-17T21:57:18Z

### Phase 3 — General consumer review (downstream)

**Status: done — all three consumer PRs merged upstream** (audiobook-manager PR #1460 at 2026-09-17T22:30:38Z, prowlarr-watcher PR #143 at 2026-09-17T22:31:22Z, search-books PR #60 at 2026-09-17T23:28:00Z). search-books's follow-up Docker matcher-type fix `acbe3cc` (2026-09-17T22:52:54Z) is the green CI head. Final outcome recorded 2026-09-17T23:35:07Z.

Baseline and scope:

- Baselines from the Phase 2 tag, frontend-kit `v0.2.10` (`f466526`), and from each consumer's **latest remote default branch** at the time, in fresh worktrees — not from stale local branches.
- Ran the Phase 1 methodology (see `MAINTENANCE.md`): `shadcn info` + `shadcn preset resolve`, release-note/documentation-impact review since the tag, targeted component updates only (never a batch sweep), `b0` preset alignment, exact UTC timestamps.

| Consumer | Remote default baseline used | Phase 3 branch (worktree) |
|---|---|---|
| `audiobook-manager` | `259c2c5` (2026-09-17T15:20:59Z) | `phase3-frontend-review-latest` |
| `search-books` | `ef3c9a3` (2026-09-17T20:47:27Z) | `phase3-frontend-review-pr` (PR head) |
| `prowlarr-watcher` | `8b7954d` (2026-09-17T03:11:34Z) | `phase3-frontend-review-latest` |

All three consumers were confirmed on the `b0` preset (`style: base-nova`, `baseColor: neutral`, `iconLibrary: lucide`) — `audiobook-manager` after Phase 2.5 PR #1452 — so no further preset alignment was needed.

#### Findings

- **audiobook-manager/client** — list loading states were spinner-only (no layout feedback; empty shell flash while fetching); vendored `components/ui/*` imported `cn` via the `@/lib/utils` shim instead of the `cn` package; `shadcn` was a runtime dependency; `pnpm-workspace.yaml` still carried bootstrap-era `minimumReleaseAgeExclude` pins (`react-hook-form@7.87.0`, `zod@4.5.4`).
- **search-books** — the frontend had no test suite and no `pnpm test` script (the shared `pre-push-ts` lefthook fragment was deliberately not adopted; CI only type-checked via `pnpm build`); re-searching wiped the current results the moment a new fetch started (empty-state flash); `AGENTS.md` still claimed "there is no frontend test suite".
- **prowlarr-watcher/frontend** — vendored base-nova UI components had drifted from the current registry output (stale blank-line style, `"use client"` placement on `checkbox`/`label`/`dialog`); the API client merged headers with object spread, which silently drops `Headers` instances and array-pair `HeadersInit` values; empty/204/205 responses (200 with a body of `""` too) threw a raw `JSON.parse` `SyntaxError` instead of returning `undefined`, breaking the single-error-type (`ApiError`) contract; the API client had no unit tests.

#### Concrete changes per PR (all merged)

- **audiobook-manager PR #1460** — "feat(client): improve list loading states", created 2026-09-17T21:43:07Z, merged 2026-09-17T22:30:38Z, branch `phase3-frontend-review-latest`, 19 files (+140/−28):
  - Vendored the shadcn `Skeleton` component (`client/src/components/ui/skeleton.tsx`, commit 19:23:12Z) and replaced spinner-only loading UI in `BookList`, `BookLibrary`, `CleanBookUrls`, and `MissingTags` with skeleton rows (`role="status"` labels) plus tests (commit 19:55:17Z).
  - Normalized vendored UI imports (`badge`, `card`, `checkbox`, `dialog`, `input`, `table`, `textarea`) to import `cn` directly (commit 19:23:35Z).
  - Moved `shadcn` to devDependencies and dropped the stale release-age excludes (commit 20:02:30Z). Validation: build, 557 frontend tests, lint, format-check, dotnet build + 1353 backend tests.
- **search-books PR #60** — "feat: retain previous search results while re-searching", created 2026-09-17T21:43:53Z, merged 2026-09-17T23:28:00Z, branch `phase3-frontend-review-pr`, 10 files (+853/−10, mostly lockfile):
  - `placeholderData: keepPreviousData` on the `/search` query so previous results stay visible during the re-search (commit 21:34:29Z).
  - Added the first frontend test suite — Vitest + Testing Library + jsdom (`vitest.config.ts`, `vitest.setup.ts`, `src/App.test.tsx` with a deferred-request regression test; commits 21:34–21:40Z).
  - Wired `pnpm test` into CI as a blocking gate and adopted the `pre-push-ts` lefthook fragment; documented the suite in `AGENTS.md` (commit 21:35:02Z).
  - Docker follow-up: `acbe3cc` "fix(build): ship jest-dom matcher types inside src for Docker" (2026-09-17T22:52:54Z) vendored the Vitest matcher types inside `src` so the Docker build type-checks; CI on `acbe3cc` (the merged head) is green.
- **prowlarr-watcher PR #143** — "chore(frontend): refresh UI components and harden API client", created 2026-09-17T21:44:32Z, merged 2026-09-17T22:31:22Z, branch `phase3-frontend-review-latest`, 13 files (+170/−21):
  - Refreshed 11 vendored base-nova UI components against the current registry while preserving the local mobile dialog behavior (commit 19:50:09Z).
  - API client hardening: `buildHeaders()` merges any `HeadersInit` through a real `Headers` (caller headers win; CSRF token added for mutating requests); `parseBody()` treats 204/205 and empty bodies as `undefined`; `ApiError` stays the only error type (commit 20:06:02Z).
  - Added `frontend/src/lib/api.test.ts` covering `HeadersInit` variants, CSRF behavior, bodiless/empty responses, and error parsing.

#### Deferred items (explicitly out of these PRs)

- **alert-dialog** — `audiobook-manager/client` `DESIGN.md` documents the same mobile clip/overflow fix for `alert-dialog.tsx` as for `dialog.tsx`, but the component is not vendored or used yet; add it and apply the mobile fix when a destructive-confirmation use case appears.
- **pagination** — `DESIGN.md` tells consumers to record a per-project pagination convention; consumers still hand-roll page state (e.g. `PAGE_SIZE` in `CleanBookUrls`) without recording the convention in DESIGN.md's project section. Standardizing pagination across consumers is deferred.
- **API-types process** — the `src/lib/api-types.ts` regeneration differs per consumer (`generate-api-types` script in audiobook-manager, `generate:api-types` in prowlarr-watcher, only a bare `openapi-typescript` dependency in search-books with no script) and frontend-kit's "regenerate from the OpenAPI spec" is not one executable process. A consistent process/convention is deferred.
- **query-key work** — TanStack Query key shapes and invalidation conventions vary between consumers (e.g. `["books", q, page, pageSize]` plus SignalR `OperationKeys` in audiobook-manager; `["search", activeQuery]` in search-books). A shared query-key strategy is deferred.

#### Issue follow-ups (future work, not Phase 3)

Findings that were filed as tracked issues rather than changed in Phase 3 stay
open as future work:

- audiobook-manager #1453 (application-owned notification wrapper), #1454
  (app-owned dialog shell and confirmation wrappers), #1455 (centralized
  TanStack Query keys and invalidation factories).
- frontend-kit #58 — OpenCode compatibility for the frontend-kit conventions
  (the Claude plugin does not extend OpenCode).

These are follow-ups; none of them is part of Phase 3.

#### Final review outcome

No actionable framework migration remains beyond the approved consumer
improvements (skeleton loading states, retained search results, refreshed
vendored UI components, hardened API client, first frontend test suites).
TypeScript 7 remains blocked by typescript-eslint's official peer range
(`>=4.8.4 <6.1.0`) and stays deferred until upstream support exists — a
documentation matter in `MAINTENANCE.md`, never a `peerDependencies` edit.
Phase 3 is complete.

## Established findings used by this review

- shadcn CLI surface: `info`, `preset resolve` (`--json`), `add --diff` /
  `--dry-run` / `--view`, `migrate cn`, `apply --preset <code>` /
  `--only theme,font`, `init --preset <code>`.
- `preset resolve` vs `components.json`: for a project on preset `b0` (Base UI),
  `shadcn preset resolve` reports style `nova` with the preset code `b0`, while
  the same preset is recorded on disk as `style: base-nova` in
  `components.json`. They describe the same preset — `nova` is the resolved
  style name, `base-nova` the stored value — and must not be compared as if
  they were equal strings.
- `cn` migration is not needed for current consumers — all three
  (`search-books`, `prowlarr-watcher/frontend`, `audiobook-manager/client`)
  already run `export { cn } from "cn"` in `lib/utils.ts`.
- typescript-eslint v8.70.0 (what this repo resolves) declares peers
  `eslint ^8.57.0 || ^9.0.0 || ^10.0.0` and `typescript >=4.8.4 <6.1.0`:
  ESLint 10 is supported; TypeScript 6.1+ and 7 are blocked by that official
  peer range, not by frontend-kit. frontend-kit's `peerDependencies`
  (`typescript >=5.5 <7`, `eslint >=9`) stay unchanged.

## Change log

- 2026-09-16T15:36:52Z — plan created; Phase 1 drafted.
- 2026-09-16T15:48:44Z — Phase 1 items done; plan, methodology, and rationale
  committed to the `frontend-kit-maintenance-review` branch.
- 2026-09-16T16:16:11Z — reviewer fixes: plugin bumped to 0.3.3 (SKILL.md
  changed); MAINTENANCE.md baseline command is now `git describe --tags
  --abbrev=0`; plan now distinguishes `preset resolve` output (style `nova`)
  from the `components.json` value (`style: base-nova`).
- 2026-09-16T19:26:20Z — Phase 2 done: frontend-kit `v0.2.10` tagged
  (`f466526`).
- 2026-09-17T15:15:24Z — Phase 2.5 done: `audiobook-manager` preset alignment
  merged upstream (PR #1452).
- 2026-09-17T21:43:07Z / 21:43:53Z / 21:44:32Z — Phase 3 implementation PRs
  opened: audiobook-manager #1460, search-books #60, prowlarr-watcher #143
  (all open, unmerged).
- 2026-09-17T21:57:18Z — Phase 3 investigation and implementation status
  recorded in this plan; consumer PRs marked open/not merged; deferred items
  (alert-dialog, pagination, API-types process, query-key work) filed.
- 2026-09-17T23:35:07Z — Phase 3 finalized: all three consumer PRs merged
  (audiobook-manager #1460 at 22:30:38Z, prowlarr-watcher #143 at 22:31:22Z,
  search-books #60 at 23:28:00Z); search-books Docker matcher-type follow-up
  `acbe3cc` shipped with green CI; Phase 3 marked done; deferred items retained
  and issue follow-ups (#1453/#1454/#1455, frontend-kit #58) recorded as future
  work, not Phase 3.
