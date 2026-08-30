# Migrating an existing repo onto frontend-kit

This is for a project that already exists and did not start from
`shadcn init --preset`. Nothing here is destructive by default: every step is
additive or asks before touching code that already works. Do this once per
repo; after that, it just follows the [maintenance](./MAINTENANCE.md) routine
like anything else.

## 0. Prerequisites

- `frontend-kit` is set up (Parts 1-5 of [SETUP.md](../SETUP.md) done at least
  once, somewhere).
- The plugin marketplace is installed locally (Part 4), or you're fine running
  the raw `shadcn`/`pnpm` commands by hand.
- The project is a React + TypeScript app. If it's something else, this kit
  doesn't apply — don't force it.

## 1. Assess before changing anything

Read `DESIGN.md` (via `pnpm dlx shadcn@latest add MartinCa/frontend-kit/conventions
--dry-run` to preview it, or just read it in this repo) and compare it against
what the project actually does. Note every real conflict:

- A UI kit other than shadcn/ui (MUI, Ant, Chakra, Bootstrap).
- Server state fetched into `useState` or a Redux/Context store instead of
  TanStack Query.
- A different router, form library, date library, or icon set.
- Both Radix and Base UI present, or neither.

You do not need to fix these today. You need a list, because step 4 is
"migrate incrementally against this list," not "rewrite the app."

## 2. Drop in the conventions doc and config

```sh
pnpm dlx shadcn@latest add MartinCa/frontend-kit/conventions
```

This writes `DESIGN.md` and `AGENTS.md` at the project root. Fill in DESIGN.md
section 9 (project-specific) immediately — what the app is, who uses it, the
backend, the pagination convention, and an explicit **Deviations** list for
anything from step 1 you're not fixing yet. An honest deviation beats a rule
nobody follows.

Wire the shared config (see SETUP.md Part 6 for the exact file contents):

```sh
pnpm add -D @martinca/frontend-config eslint prettier prettier-plugin-tailwindcss
```

No version typed in — let pnpm resolve current releases rather than writing
numbers into `package.json` by hand. (`pnpm add` still writes a range;
Renovate is what keeps it current from here.) An agent doing this from
memory tends to guess an old version.

Point `eslint.config.js`, `prettier.config.js`, and `tsconfig.json` at it. Run
`pnpm lint` once and read the count, don't fix it yet — you need to know how
big the gap is before deciding how to close it.

## 3. Bring in shadcn/ui if it isn't there yet

If the project has no `components.json`:

```sh
pnpm dlx shadcn@latest init
```

`init` is safe to run in an existing app — it does not touch existing
components, it adds `components.json`, Tailwind config, and
`src/components/ui/`. If you already picked a preset (see SETUP.md Part 3),
use `--preset <code>` here instead so the visual identity matches from day
one. If the project is not on Tailwind at all, this is the point where you
decide whether the migration is worth it — adopting Tailwind alongside an
existing CSS approach is real work, not a config change.

If a conflicting UI kit is present (MUI, Ant, etc.), do **not** rip it out in
this pass. Let new components go through shadcn/ui and migrate old screens
opportunistically, screen by screen, when you're touching them anyway. A
big-bang UI rewrite is its own project with its own review, not a side effect
of adopting a lint config.

## 4. Add the shared library pieces

```sh
pnpm dlx shadcn@latest add MartinCa/frontend-kit/api-client
pnpm dlx shadcn@latest add MartinCa/frontend-kit/query-setup
pnpm dlx shadcn@latest add MartinCa/frontend-kit/theme   # only if not already on the preset
```

Then, incrementally:

- Route new server-state code through `src/lib/api.ts` and TanStack Query.
  Leave old `fetch`/axios calls alone until you're already editing that file
  for another reason.
- Replace ad-hoc client state with Zustand only where DESIGN.md section 2
  actually calls for it. Don't introduce Zustand just to match the doc if
  `useState` was already fine.
- Swap hardcoded colors for theme tokens as you touch each component. `grep`
  for hex codes and raw Tailwind color utilities (`bg-blue-500` etc.) to find
  the backlog; it does not need to be zero on day one.

## 5. Cloud sessions (Claude Code on web/mobile)

```sh
pnpm dlx shadcn@latest add MartinCa/frontend-kit/agent-skill
```

Commit the resulting `.claude/skills/frontend-conventions/SKILL.md`. Without
this, agents running in an ephemeral cloud sandbox never see the conventions —
`AGENTS.md`/`DESIGN.md` are enough for terminal sessions but the skill is what
web/mobile actually loads.

## 6. Renovate

Add the frontend preset to this repo's Renovate config, **alongside** the
base `renovate-config` preset — not instead of it:

```json
{
  "extends": [
    "github>MartinCa/renovate-config",
    "github>MartinCa/frontend-kit:renovate-frontend"
  ]
}
```

If the project already has a `renovate.json`/`.github/renovate.json` with its
own `extends` array (the base preset, or anything else), add the
`frontend-kit:renovate-frontend` line into that existing array. Don't
replace the file or drop what was already there.

## 7. Commit shape

Keep the migration reviewable:

- One commit for `DESIGN.md`/`AGENTS.md` + config wiring.
- One commit for `shadcn init` output (vendored `ui/` components), untouched.
- Separate commits for each incremental behavior migration (API client swap,
  Zustand cleanup, etc.), done later, as normal feature work.

Do not squash vendored shadcn output into a commit that also has hand-written
changes — it defeats the "untouched files overwrite cleanly" property that
makes future updates cheap (DESIGN.md section 3).

---

## Agent prompt

Paste this into Claude Code (terminal or web) at the root of the repo you're
migrating. It's self-contained — the agent doesn't need this file open, and it
stops to ask rather than guessing on anything destructive or ambiguous.

```
This repo needs to be migrated onto MartinCa/frontend-kit, a shared set of
frontend conventions (ESLint/Prettier/tsconfig, a DESIGN.md style guide,
shadcn/ui registry items, and a Claude Code skill). Full details, including
the design rules you must follow, live at
https://github.com/MartinCa/frontend-kit — read docs/MIGRATION.md there
first (via `pnpm dlx shadcn@latest add MartinCa/frontend-kit/conventions
--dry-run` to preview DESIGN.md, or by fetching the file directly) and follow
it. In short:

1. Assess the current stack against DESIGN.md. List every real conflict
   (different UI kit, server state not in TanStack Query, different router/
   forms/dates/icons library, mixed Radix+Base UI). Report the list before
   changing anything.
2. Install MartinCa/frontend-kit/conventions (writes DESIGN.md, AGENTS.md).
   Fill in DESIGN.md section 9 by asking me what the app is, who uses it,
   the backend, and the pagination convention — do not guess these.
   List every item from step 1 you are not fixing now under "Deviations."
3. Add @martinca/frontend-config as a dev dependency and wire eslint.config.js,
   prettier.config.js, and tsconfig.json to extend it. Run the linter and
   report the violation count — do not silently disable rules to make it pass.
   Whenever you add a dependency in this migration, install it with the
   package manager rather than typing a version number into package.json
   from memory — that number is routinely out of date. `pnpm add` still
   writes a version range; Renovate (step 6) is what keeps it current
   from here on, not the number you'd guess by hand.
4. If components.json doesn't exist, run `shadcn init` (ask me for a preset
   code first, or use the one in this project's DESIGN.md/README if already
   recorded). Do not remove an existing UI library — new components go
   through shadcn/ui, old screens migrate opportunistically later.
5. Install MartinCa/frontend-kit/api-client and /query-setup. Do not rewrite
   existing data-fetching code in this pass — just make the shared client
   available for new code and flag files that should eventually move over.
6. Install MartinCa/frontend-kit/agent-skill so cloud sessions see the
   conventions, and commit it.
7. Add "github>MartinCa/frontend-kit:renovate-frontend" to this repo's
   Renovate config, alongside the base "github>MartinCa/renovate-config"
   preset — not replacing it or anything else already in the extends array.
   If there's no renovate.json yet, ask me before creating one; this repo
   may already get Renovate config from elsewhere.
8. Keep changes in separate, reviewable commits: config wiring, vendored
   shadcn output (untouched, its own commit), and nothing else. Stop and ask
   me before touching any file outside what this list covers, and before any
   change that would alter existing UI behavior.

Report back with: the conflict list from step 1, the lint violation count
from step 3, and a short list of anything you skipped and why.
```
