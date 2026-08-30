# frontend-kit

Shared frontend conventions for personal projects. React + TypeScript +
shadcn/ui + Tailwind.

One repo, three distribution channels:

- **npm package** `@martinca/frontend-config` — ESLint, tsconfig, Prettier.
  Updated by Renovate.
- **shadcn registry** — `DESIGN.md`, the API client, query defaults, theme
  tokens. Updated deliberately with `shadcn add --overwrite`.
- **Claude Code plugin** — the conventions skill, so agents follow the rules
  without a copy of the doc in every repo.

Start here: [SETUP.md](./SETUP.md). The rules themselves: [docs/DESIGN.md](./docs/DESIGN.md).

Bringing an existing repo onto this: [docs/MIGRATION.md](./docs/MIGRATION.md)
(includes a ready-to-paste agent prompt). Ongoing upkeep once a project is on
it: [docs/MAINTENANCE.md](./docs/MAINTENANCE.md).

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
```

`theme-provider` needs wiring, not just installing — wrap the app in
`<ThemeProvider>` (SETUP.md Part 6) or dark mode never activates and nothing
errors to say why. `agent-skill` vendors the conventions skill into
`.claude/skills/` so Claude Code on web and mobile sees it; the marketplace
install above only covers the local terminal. Full walkthrough in
[SETUP.md](./SETUP.md).

## Changing a convention

Change it here, not in a project. Bump the package version for lint changes,
tag, and let Renovate deliver it. For `DESIGN.md` and shared code, commit and
reinstall in projects with `--overwrite` next time you touch them.
