# Maintenance review — implementation plan & live status

The single working file for the coordinated maintenance review of frontend-kit
and the projects that consume it. Live status lives here, updated as the work
progresses — phases shift, exact timestamps get recorded, findings get filed.

The durable rules this review is checking against live in
[MAINTENANCE.md](./MAINTENANCE.md); this file is the working plan for *this*
review and is expected to change as it moves.

## Baseline

- Last frontend-kit release tag: `v0.2.6` (`1855b38`, 2026-09-05)
- Review target: `56d50b4` (2026-09-14) — 37 commits after the tag
- Review started: 2026-09-16T15:36:52Z

## Relevant repositories

| Repository | Role | Preset state |
|---|---|---|
| `frontend-kit` | the kit itself | preset `b0` (README); peer range `typescript >=5.5 <7` |
| `search-books` | consumer | preset `b0` (`preset resolve` → style `nova`); `components.json` records `style: base-nova`, `baseColor: neutral`, `iconLibrary: lucide` |
| `prowlarr-watcher/frontend` | consumer | preset `b0` — same state as `search-books` |
| `audiobook-manager/client` | consumer | **drifted** — see Phase 2.5 |

## Phases

| Phase | What | Status | Last updated (UTC) |
|---|---|---|---|
| 0. Baseline | Record release-tag baseline, relevant repos, established findings | done | 2026-09-16T15:36:52Z |
| 1. frontend-kit docs | Maintenance-review methodology in MAINTENANCE.md; version-bounds rationale; this plan | done | 2026-09-16T16:16:11Z |
| 2. frontend-kit release | Merge, tag the next release, publish; consumer reviews then start from the new tag | not started | |
| 2.5. audiobook-manager/client preset alignment | Realign to the intended `b0`/Base UI preset — downstream, after Phase 2, before Phase 3 | not started | |
| 3. General consumer review | Run the Phase 1 methodology against every consumer from the Phase 2 tag | not started | |

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

### Phase 3 — General consumer review (downstream)

Run the Phase 1 methodology against every consumer, starting from the Phase 2
frontend-kit release tag:

- `shadcn info` + `shadcn preset resolve` in each repo — what is installed,
  which base, which preset the project is really on.
- Release-note/documentation-impact review since the tag (new CLI commands,
  changed defaults, new preset codes, new peer constraints).
- Targeted component updates only — never a batch sweep.
- Preset alignment to `b0` for every consumer.
- Record every check's exact UTC timestamp.

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
