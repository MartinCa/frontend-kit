# Migrating an existing repo onto frontend-kit

This is for a project that already exists and did not start from
`shadcn init --preset`. There are two ways to use this guide:

- **Incremental adoption (default)**: Nothing is destructive: every step is
  additive or asks before touching code that already works. Legacy UI libraries
  stay in place; new screens follow the conventions.
- **Full UI migration**: Replace an existing UI library (MUI, Ant Design,
  Chakra, Bootstrap, etc.) and ad-hoc styling with the shared shadcn/ui + Base
  UI + Tailwind stack across the whole application.

Do the setup once per repo; after that, it follows the
[maintenance](./MAINTENANCE.md) routine like anything else.

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

For an incremental adoption, you do not need to fix these today — you record
them under "Deviations" in `DESIGN.md` section 9 and migrate opportunistically.
For a full UI migration, this list is your backlog: every item is scheduled for
replacement before the migration branch lands.

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
pnpm add -D @martinrun/frontend-config eslint prettier prettier-plugin-tailwindcss lefthook
```

No version typed in — let pnpm resolve current releases rather than writing
numbers into `package.json` by hand. (`pnpm add` still writes a range;
Renovate is what keeps it current from here.) An agent doing this from
memory tends to guess an old version.

Point `eslint.config.js`, `prettier.config.js`, and `tsconfig.json` at it. Ensure
`.gitignore` does not ignore `src/routeTree.gen.ts` (it must be committed as a
vendored contract file for type-aware linting). Run `pnpm lint` once and read the
count, don't fix it yet — you need to know how big the gap is before deciding
how to close it.

The package is public on npmjs, so CI needs nothing extra — no `.npmrc`, no
token, no BuildKit secret, whether the project installs in a workflow or in a
Docker build.

If this project previously consumed `@martinca/frontend-config` from GitHub
Packages, delete that machinery rather than leaving it: see "Migrating a
project off GitHub Packages" in SETUP.md Part 2 for the list.

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

**Run `init` even if `components.json` and `src/components/ui/` already
exist by hand** (a project mid-migration that vendored shadcn components
manually, without ever running the CLI, still needs this). Tailwind v4 needs
more than `theme.css`'s bare `--background`/`--popover`/etc. custom
properties to work: an `@theme inline` block registering them under
Tailwind's `--color-*`/`--radius-*` namespace (so `bg-background`,
`bg-popover`, etc. exist as utilities at all), a `@custom-variant dark
(&:is(.dark *))` declaration (Tailwind v4 dropped `darkMode: 'class'` in
favor of this — without it every `dark:` utility follows the OS's
`prefers-color-scheme` instead of the `.dark` class `ThemeProvider` toggles),
and the `tw-animate-css` package (the `animate-in`/`fade-in-0`/`zoom-in-95`/
`slide-in-from-*` classes `Dialog`/`Select`/`DropdownMenu`/`Tooltip` all use
for their open/close transitions). `init` writes all three; a hand-assembled
`components.json` + hand-copied `ui/*.tsx` files do not.

**None of this produces a build error or a lint warning if it's missing** —
Tailwind just silently omits the utility class from the compiled CSS, so the
only symptom is a UI bug: dialogs/dropdowns/the header rendering see-through,
manual dark-mode toggling doing nothing, or every popover losing its
enter/exit animation. If you inherit a project where this was skipped (or
suspect it was), diff `src/index.css` against a throwaway reference project
scaffolded with matching options
(`npm create vite@latest . -- --template react-ts`, wire up `@tailwindcss/vite`
and the `@/*` path alias, then
`npx shadcn@latest init -t vite -b base -p <preset> --pointer -y`) rather
than guessing — this is also how to find any registry-recipe-specific
plumbing a given component needs (e.g. `Accordion`'s `animate-accordion-down`/
`animate-accordion-up` keyframes read a chain of other libraries' panel-height
variable names, none of which match Base UI's own `--accordion-panel-height` —
override those two keyframes locally to point at the variable Base UI
actually sets). Two more component-specific quirks, found the same way, are
documented where they belong regardless of migration-vs-fresh-init:
`RadioGroupItem`'s indicator not self-centering, and overlay mobile clipping /
lack of built-in scroll bounds (`DialogContent`, `DialogFooter`, `AlertDialogContent`) —
see DESIGN.md section 3, "Known Base UI component quirks & overlay mobile safety."

If a conflicting UI kit is present (MUI, Ant, etc.):

- **Incremental adoption**: Do **not** rip it out in this pass. Let new
  components go through shadcn/ui and migrate old screens opportunistically,
  screen by screen, when you're touching them anyway. A big-bang UI rewrite
  should not be an accidental side effect of adopting a lint config.
- **Full UI migration**: Work screen by screen or component family by component
  family. Install shadcn/ui components (`pnpm dlx shadcn@latest add <component>`),
  swap imports and props, replace hardcoded colors with semantic theme tokens
  (`bg-background`, `text-foreground`, `status-*`), and ensure `<ThemeProvider>`
  is mounted in the root. Once every reference to the legacy UI library is
  eliminated, uninstall the legacy packages and remove their CSS bundles.

## 4. Add the shared library pieces

```sh
pnpm dlx shadcn@latest add MartinCa/frontend-kit/api-client
pnpm dlx shadcn@latest add MartinCa/frontend-kit/query-setup
pnpm dlx shadcn@latest add MartinCa/frontend-kit/theme   # only if not already on the preset
pnpm dlx shadcn@latest add MartinCa/frontend-kit/theme-provider
```

Wrap the app in `<ThemeProvider>` (see SETUP.md Part 6) right after installing
it. This is easy to skip in a migration since the app already renders fine —
it just always renders light, because `theme.css`'s `.dark` class is never
toggled without it, regardless of the system preference.

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
- For incremental adoption: separate commits for each subsequent behavior
  migration (API client swap, Zustand cleanup, screen by screen UI replacement),
  done later as normal feature work.
- For full UI migration:
  - Commit newly added shadcn components separately from handwritten screen edits.
  - One commit per screen or component family migration (e.g.
    `refactor(ui): migrate dashboard to shadcn/ui`).
  - One final cleanup commit removing the old UI library and dead styles (e.g.
    `chore: remove @mui/material and legacy styles`).

Do not squash vendored shadcn output into a commit that also has hand-written
changes — it defeats the "untouched files overwrite cleanly" property that
makes future updates cheap (DESIGN.md section 3).

---

## Agent prompts

Paste these into Claude Code (terminal or web) at the root of the repo you're
migrating. The prompts are modular:

- **Prompt 1: Base migration (foundation)** — Sets up config, conventions,
  `shadcn init`, and shared libraries. Safe and non-destructive on its own.
- **Prompt 2: Full UI migration add-on** — Appended to Prompt 1 or run
  immediately after it to convert the entire application UI to the framework.
- **Prompt 3: Combined full migration (all-in-one)** — Both phases combined
  into a single ready-to-paste prompt.
- **Prompt 4: Targeted screen migration** — Migrates a single screen or
  component family.

### Prompt 1: Base migration (foundation)

Use this for initial onboarding or incremental adoption:

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
   List every item from step 1 you are not fixing in this pass under "Deviations."
3. Add @martinrun/frontend-config and lefthook as dev dependencies
   and wire eslint.config.js, prettier.config.js, tsconfig.json, lefthook.yml,
   and package.json scripts (prepare, lint, format-check) to extend them. Ensure
   .gitignore does not ignore src/routeTree.gen.ts (it must be committed for
   type-aware linting). Run the full verification suite (pnpm run lint,
   pnpm run format-check, tsc --noEmit, pnpm test) and report any violations —
   do not silently disable rules to make it pass.
   Whenever you add a dependency in this migration, install it with the
   package manager rather than typing a version number into package.json
   from memory — that number is routinely out of date. `pnpm add` still
   writes a version range; Renovate (step 6) is what keeps it current
   from here on, not the number you'd guess by hand.
4. If components.json doesn't exist, run `shadcn init` (ask me for a preset
   code first, or use the one in this project's DESIGN.md/README if already
   recorded). Unless instructed to perform a full UI migration, do not remove
   an existing UI library in this pass — new components go through shadcn/ui,
   and old screens migrate opportunistically later.
5. Install MartinCa/frontend-kit/api-client and /query-setup. Unless instructed
   to perform a full data/UI migration, do not rewrite existing data-fetching code
   in this pass — just make the shared client available for new code and flag
   files that should eventually move over.
6. Install MartinCa/frontend-kit/agent-skill so cloud sessions see the
   conventions, and commit it.
7. Add "github>MartinCa/frontend-kit:renovate-frontend" to this repo's
   Renovate config, alongside the base "github>MartinCa/renovate-config"
   preset — not replacing it or anything else already in the extends array.
   If there's no renovate.json yet, ask me before creating one; this repo
   may already get Renovate config from elsewhere.
8. Keep changes in separate, reviewable commits: config wiring, vendored
   shadcn output (untouched, its own commit), and nothing else unless explicit
   instructions are provided to migrate UI/screens.

Report back with: the conflict list from step 1, the lint violation count
from step 3, and a short list of anything you skipped and why.
```

### Prompt 2: Full UI migration add-on

Append this block directly to **Prompt 1** (or run it as Phase 2 after Prompt 1 completes)
to instruct the agent to execute a complete UI overhaul:

```
Execute a full UI migration to the framework: do NOT leave existing UI components
or legacy UI libraries in place. Specifically:

A. Inventory: Scan the codebase for all components imported from legacy UI libraries
   (MUI, Ant Design, Chakra, Bootstrap, etc.) as well as ad-hoc custom UI widgets.
   List every screen/page and its UI component dependencies.
B. Install shadcn/ui components: For each legacy component needed across the screens
   (buttons, dialogs, dropdowns, inputs, forms, tables, cards, tabs, etc.), install
   the Base UI-based equivalent from shadcn/ui (`pnpm dlx shadcn@latest add <component>`).
   Patch any known Base UI quirks (such as RadioGroupItem centering and DialogContent/
   DialogFooter mobile constraints per DESIGN.md section 3).
   Keep freshly vendored `src/components/ui/` components untouched in their own commit.
C. Theme & Styling: Install `MartinCa/frontend-kit/theme` and `MartinCa/frontend-kit/theme-provider`.
   Ensure `main.tsx` (or the application root) wraps the tree in `<ThemeProvider>` so dark mode
   works. Convert legacy styling, styled-components, and hardcoded colors to Tailwind semantic
   tokens (`bg-background`, `text-foreground`, `border-border`, `status-*`).
D. Screen-by-Screen Replacement: Migrate each screen and component from the legacy UI library
   to the installed shadcn/ui components. Preserve existing behaviour and accessibility while
   updating to house conventions (lucide-react icons, react-hook-form + zod forms, TanStack Table,
   mobile responsiveness with `min-w-0 flex-1` truncation, `w-full sm:w-auto` dialog buttons,
   and `break-all` on monospace/path blocks).
   Commit each migrated screen or component family in a dedicated commit.
E. Decommission Legacy UI: Once all usages are replaced, remove the legacy UI packages from
   `package.json` with `pnpm remove <pkg>`, remove any obsolete CSS/theme files, and verify
   with `pnpm build` and `pnpm lint`.
F. Clean Deviations: Remove the resolved UI kit items from the "Deviations" section in `DESIGN.md`.
```

### Prompt 3: Combined full migration (all-in-one)

Paste this into Claude Code to do both foundation setup and complete UI migration in one go:

```
This repo needs a full migration onto MartinCa/frontend-kit, replacing any legacy
UI libraries with the shared frontend conventions (shadcn/ui on Base UI primitives,
Tailwind with semantic tokens, ESLint/Prettier/tsconfig, and DESIGN.md style guide).
Full details live at https://github.com/MartinCa/frontend-kit.

Execute this migration in two phases:

--- PHASE 1: FOUNDATION SETUP ---
1. Assess the current stack against DESIGN.md. Inventory all legacy UI kits (MUI, Ant,
   Chakra, Bootstrap, etc.), state management patterns, routing, form libraries, and icons.
2. Install MartinCa/frontend-kit/conventions (writes DESIGN.md, AGENTS.md). Ask me for
   DESIGN.md section 9 answers (app purpose, target users, backend, pagination) before writing.
3. Add @martinrun/frontend-config and lefthook as dev dependencies
   and wire eslint.config.js, prettier.config.js, tsconfig.json, lefthook.yml,
   and package.json scripts (prepare, lint, format-check). Ensure src/routeTree.gen.ts
   is not gitignored. Always install dependencies using `pnpm add` without typed version numbers.
4. If components.json does not exist, run `shadcn init` (ask for preset code if not recorded).
5. Install MartinCa/frontend-kit/api-client, /query-setup, /theme, and /theme-provider.
   Ensure `<ThemeProvider>` is mounted in the root provider tree (`main.tsx`).
6. Install MartinCa/frontend-kit/agent-skill and add
   "github>MartinCa/frontend-kit:renovate-frontend" to Renovate config.

--- PHASE 2: FULL UI MIGRATION ---
7. Install required shadcn/ui components (`pnpm dlx shadcn@latest add <component>`) to
   cover every UI primitive used in the app (applying Base UI quirks such as DialogContent/
   DialogFooter mobile bounds and RadioGroupItem centering per DESIGN.md section 3).
   Commit the untouched `src/components/ui/` additions.
8. Systematically migrate all screens and components from legacy UI libraries to shadcn/ui:
   - Replace legacy components with shadcn/ui equivalents.
   - Replace legacy icons with `lucide-react`.
   - Replace ad-hoc styling and hardcoded colors with Tailwind semantic tokens.
   - Respect DESIGN.md rules (a11y, focus rings, loading/empty/error states, mobile responsiveness
     with `min-w-0 flex-1` truncation, `w-full sm:w-auto` dialog buttons, and `break-all` on paths/diffs).
   - Commit each migrated screen or component group separately.
9. Decommission legacy UI libraries:
   - Uninstall legacy packages (`pnpm remove <pkg>`).
   - Remove legacy CSS/style wrappers and unused providers.
   - Confirm zero remaining imports of the old UI library.
10. Verify: Run `pnpm lint` and `pnpm build`. Fix all errors and report final status.
```

### Prompt 4: Targeted screen or component migration

Use this when migrating an existing app screen-by-screen in focused PRs:

```
Migrate the screen/component at `<path/to/target>` onto the frontend-kit stack:

1. Identify all legacy UI library components (MUI, Ant, Chakra, etc.), ad-hoc CSS,
   and non-standard icons used in this component tree.
2. Install any missing shadcn/ui components required for this screen using
   `pnpm dlx shadcn@latest add <component>`. Commit any newly vendored `src/components/ui/`
   files separately before modifying application code.
3. Refactor `<path/to/target>`:
   - Replace legacy UI primitives with shadcn/ui components.
   - Replace custom styling and raw colors with Tailwind semantic tokens (`bg-background`,
     `text-muted-foreground`, etc.).
   - Replace legacy icons with `lucide-react`.
   - Wire forms to `react-hook-form` + `zod` if applicable.
   - Verify keyboard accessibility, focus rings, and dark mode appearance.
4. Verify with `pnpm lint` and `pnpm test` (or build). Ensure no regressions in functionality.
```
