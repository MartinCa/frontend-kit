# frontend-kit

Shared frontend conventions for personal projects. React + TypeScript +
shadcn/ui + Tailwind.

One repo, three channels of distribution, plus the OpenCode consumption target:

- **npm package** `@martinrun/frontend-config` — ESLint, tsconfig, Prettier.
  Updated by Renovate.
- **shadcn registry** — `DESIGN.md`, the API client, query defaults, theme
  tokens, the vendored skill (`agent-skill`), and the OpenCode command
  adaptations (`opencode-commands`). Updated deliberately with
  `shadcn add --overwrite`.
- **Claude Code plugin** — the conventions skill and the `new-frontend` /
  `migrate-ui` commands, so agents follow the rules without a copy of the doc
  in every repo.

OpenCode is a consumption target, not a fourth channel: it loads the same
vendored skill from `.claude/skills/` and reads the adapted commands from
`.opencode/commands/`; it does not load Claude Code plugins.

Start here: [SETUP.md](./SETUP.md). The rules themselves: [docs/DESIGN.md](./docs/DESIGN.md).

Bringing an existing repo onto this: [docs/MIGRATION.md](./docs/MIGRATION.md)
(includes ready-to-paste agent prompts for incremental adoption and full UI migration).
Ongoing upkeep once a project is on it: [docs/MAINTENANCE.md](./docs/MAINTENANCE.md).
The current maintenance review, cross-repo, with its live status:
[docs/PLAN.md](./docs/PLAN.md).

## Preset

Design system preset code: `b0`

This is the one manual step in the whole kit — the code is generated
interactively and can't be scripted. Go to `ui.shadcn.com/create` and pick:
**Base UI** primitives, **neutral** base color, **new-york** style, default
radius (0.5rem), **lucide-react** icons. That reproduces the modern shadcn
default already baked into `src/styles/theme.css` in this repo, so picking it
now doesn't change anything for projects that predate the preset — it just
gives you the short code to hand to new projects and agents. Change any of
those choices later; re-running `init --preset` on an existing app is cheap
(see SETUP.md Part 3).

```sh
pnpm dlx shadcn@latest init --preset <code>
```

## Install into a project

```sh
claude plugin marketplace add MartinCa/frontend-kit
claude plugin install frontend-conventions@martinca

pnpm dlx shadcn@latest add MartinCa/frontend-kit/conventions
pnpm dlx shadcn@latest add MartinCa/frontend-kit/api-client
pnpm dlx shadcn@latest add MartinCa/frontend-kit/query-setup
pnpm dlx shadcn@latest add MartinCa/frontend-kit/theme
pnpm dlx shadcn@latest add MartinCa/frontend-kit/theme-provider
pnpm dlx shadcn@latest add MartinCa/frontend-kit/agent-skill
pnpm dlx shadcn@latest add MartinCa/frontend-kit/opencode-commands
```

`theme-provider` needs wiring, not just installing — wrap the app in
`<ThemeProvider>` (SETUP.md Part 6) or dark mode never activates and nothing
errors to say why. `agent-skill` vendors the conventions skill into
`.claude/skills/`, which both Claude Code cloud sessions and OpenCode load
natively; the marketplace install above only covers the local Claude terminal.
OpenCode additionally needs `opencode-commands` for the adapted
`/new-frontend` and `/migrate-ui` commands. The registry installs above are
project-scoped; to make the OpenCode commands available machine-wide instead,
copy `opencode/commands/*.md` into `~/.config/opencode/commands/`. Full
walkthrough in [SETUP.md](./SETUP.md).

## Changing a convention

Change it here, not in a project. Bump the package version for lint changes,
tag, and let Renovate deliver it. For `DESIGN.md` and shared code, commit and
reinstall in projects with `--overwrite` next time you touch them.
