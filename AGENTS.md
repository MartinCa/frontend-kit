# AGENTS.md

Instructions for AI agents working in the `MartinCa/frontend-kit` repository.

## Repository Overview

`frontend-kit` is a shared conventions repository distributed through these channels:

1. **npm package (`@martinrun/frontend-config`)**: Shared ESLint flat preset (`eslint-preset.js`), Prettier config (`prettier.config.js`), and TypeScript base config (`tsconfig.base.json`).
2. **shadcn registry (`registry.json`)**: Distributes `docs/DESIGN.md`, `docs/AGENTS.md`, shared code (`src/lib/api.ts`, `src/lib/query.ts`, `src/styles/theme.css`, `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`), the vendored skill (`agent-skill`), and the OpenCode command files (`opencode-commands` — the top-level `opencode/` directory, OpenCode's adaptations of the plugin commands).
3. **Claude Code plugin (`plugins/frontend-conventions/`)**: Scaffolding and migration commands (`commands/new-frontend.md`, `commands/migrate-ui.md`) and conventions skill (`SKILL.md`). OpenCode does not load this plugin; it reuses the skill from the consuming project's `.claude/skills/` (written by `agent-skill`) and reads adapted commands from the consuming project's `.opencode/commands/` (written by `opencode-commands`, or `~/.config/opencode/commands/` for a machine-wide copy).

## Mandatory Verification Before Opening PRs

AI agents operating in ephemeral containers or cloud VMs must run all validation checks explicitly:

```sh
pnpm format:check                  # prettier --check .
pnpm test                          # node test runner executing test/eslint-config.test.mjs
node scripts/validate-manifests.mjs # checks registry.json, plugin manifests, and skill frontmatter
```

If any files need formatting:

```sh
pnpm format                        # prettier --write .
```

## Git hooks

Local hooks are installed automatically by `pnpm install` (the `prepare` script runs `lefthook install` — idempotent, safe to re-run).

**AI agents**: do not install the lefthook binary yourself — it is included in the OpenCode image. If `lefthook` is not on PATH, report this to the user and ask whether to install it.

Hooks come from the shared `MartinCa/lefthook-configs` fragments pinned at `v2.1.0` in `lefthook.yml`. `remotes:` configs merge *over* `lefthook.yml`, so this repo's explicit override lives in `lefthook-local.yml` (the one layer that overrides remotes): it pins the clone-local binaries via `pnpm exec` (the pnpm equivalent of the `npx --no-install` form used before this repo was on pnpm) and excludes `test/fixtures/**` from the pre-commit lint so deliberate rule-violation samples are never auto-fixed.

- **pre-commit** — lint/format via ESLint `--fix` + Prettier `--write` on staged TS/JS and Prettier on JSON/CSS/MD, re-staging fixed files; `lefthook-shared.yml` secret-scans the staged diff with `betterleaks` (blocks the commit on a leak) and audits staged `.github/workflows/*` files with `zizmor` (blocks on a finding).
- **pre-push** — `test-ts` runs `pnpm test` (`node --test` across `test/**/*.test.mjs`) on every push; a failing suite blocks the push.
- **commit-msg** — `commit-msg.yml` enforces Conventional Commits, e.g. `feat: ...`, `fix(api): ...`.

These hooks are currently the **only** enforcement of the lint/format, secret-scan, and Conventional-Commits checks: CI runs format-check, tests, and manifest validation, and uploads a zizmor SARIF report to code scanning — it does not run `eslint`, `betterleaks`, or commit-msg validation themselves (and zizmor in CI is a non-blocking SARIF upload, not a merge gate). Do not bypass the hooks. The mandatory verification above still guards what the hooks skip — `format-check` verifies the whole tree and `pnpm test` exercises the shared config.

Two hook tools must be on `PATH`: `betterleaks` (secret scan, install per its project README) and `zizmor` (workflow audit, install from zizmor.sh). If a tool is missing, `LEFTHOOK=0 git commit` skips the hooks entirely — a pragmatic escape hatch for restricted setups, not a way to dodge the gates (see the SETUP.md hooks section for the same note and details).

`lefthook-local.yml` is **intentionally checked in** as this repo's team-wide override: in a stock lefthook setup that file is the personal, gitignored override layer, but here it is the one layer that merges *over* the shared `remotes:` fragments. This repo used to be the npm exception in a pnpm ecosystem and the override carried that adaptation (see https://github.com/MartinCa/lefthook-configs/issues/1); since the pnpm migration it pins the same commands through `pnpm exec` and keeps the fixture `exclude` that the shared fragment cannot express. It is not a personal override layer in this repo; do not use it for private changes.

## Important House Rules for this Repo

- **Do NOT hand-edit `version` in `package.json`**: The npm package version is managed automatically by the `.github/workflows/publish.yml` release workflow upon creating a GitHub Release tag (`vX.Y.Z`). `package.json`'s version reflects the last published release.
- **Skill updates require plugin version bumps**: When editing `plugins/frontend-conventions/skills/frontend-conventions/SKILL.md`, always bump the version in `plugins/frontend-conventions/.claude-plugin/plugin.json` in the same PR (see `docs/MAINTENANCE.md`).
- **Registry authoring**: In `registry.json`, `registryDependencies` cannot point back into this same registry (bare names resolve against `ui.shadcn.com`). Bundle same-registry files directly in `files` (see `SETUP.md` Part 9).
- **Template docs**: `docs/AGENTS.md` and `docs/DESIGN.md` are the distributed template conventions copied into downstream projects via `shadcn add`. When modifying house conventions, update them in `docs/` as well as `SETUP.md`, `plugins/`, and `docs/MIGRATION.md`.
- **OpenCode command lockstep**: `opencode/commands/*.md` are adaptations of `plugins/frontend-conventions/commands/*.md` — change both together in one PR. `scripts/validate-manifests.mjs` fails if a shipped OpenCode command has no plugin sibling, and the same check keeps the `$PRESET` env-var placeholder out of OpenCode commands (OpenCode passes the preset as the command argument instead).
- **Maintenance reviews keep a live plan**: while doing maintenance or consumer-alignment work, update `docs/PLAN.md` — phases, status, and exact UTC timestamps — as the work progresses. Reviews baseline from the last release tag (`git tag -l --sort=-version:refname`), not from what looks outdated.
- **Do not widen the TypeScript peer range**: TypeScript is capped by typescript-eslint's official peer range (`>=4.8.4 <6.1.0`), not by this repo's declared `typescript >=5.5 <7`. ESLint 10 is supported. A blocked upgrade is a documentation change (`docs/MAINTENANCE.md`), never an edit to `peerDependencies` in `package.json`.
- **Consumers align to the b0 preset**: the intended preset is `b0` (Base UI — `style: base-nova`, `baseColor: neutral`, `iconLibrary: lucide`). A consumer whose `components.json` records something else has drifted; `audiobook-manager/client` currently does and is queued in `docs/PLAN.md` Phase 2.5.
