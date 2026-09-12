# AGENTS.md

Instructions for AI agents working in the `MartinCa/frontend-kit` repository.

## Repository Overview

`frontend-kit` is a shared conventions repository distributed through three channels:

1. **npm package (`@martinrun/frontend-config`)**: Shared ESLint flat preset (`eslint-preset.js`), Prettier config (`prettier.config.js`), and TypeScript base config (`tsconfig.base.json`).
2. **shadcn registry (`registry.json`)**: Distributes `docs/DESIGN.md`, `docs/AGENTS.md`, and shared code (`src/lib/api.ts`, `src/lib/query.ts`, `src/styles/theme.css`, `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`).
3. **Claude Code plugin (`plugins/frontend-conventions/`)**: Scaffolding command (`new-frontend.md`) and conventions skill (`SKILL.md`).

## Mandatory Verification Before Opening PRs

AI agents operating in ephemeral containers or cloud VMs must run all validation checks explicitly:

```sh
npm run format-check              # prettier --check .
npm test                          # node test runner executing test/eslint-config.test.mjs
node scripts/validate-manifests.mjs # checks registry.json, plugin manifests, and skill frontmatter
```

If any files need formatting:

```sh
npm run format                    # prettier --write .
```

## Git hooks

Local hooks are installed automatically by `npm install` (the `prepare` script runs `lefthook install` — idempotent, safe to re-run).

Hooks come from the shared `MartinCa/lefthook-configs` fragments pinned at `v1.0.0` in `lefthook.yml`. `remotes:` configs merge *over* `lefthook.yml`, so this repo's npm adaptation lives in `lefthook-local.yml` (the one layer that overrides remotes): it swaps the shared `pnpm eslint`/`pnpm prettier` invocations for `npx --no-install`.

- **pre-commit** — lint/format via ESLint `--fix` + Prettier `--write` on staged TS/JS and Prettier on JSON/CSS/MD, re-staging fixed files; `lefthook-shared.yml` secret-scans the staged diff with `betterleaks` (blocks the commit on a leak) and audits staged `.github/workflows/*` files with `zizmor` (blocks on a finding).
- **commit-msg** — `commit-msg.yml` enforces Conventional Commits, e.g. `feat: ...`, `fix(api): ...`.

These hooks are currently the **only** enforcement of the lint/format, secret-scan, and Conventional-Commits checks: CI runs format-check, tests, and manifest validation, and uploads a zizmor SARIF report to code scanning — it does not run `eslint`, `betterleaks`, or commit-msg validation themselves (and zizmor in CI is a non-blocking SARIF upload, not a merge gate). Do not bypass the hooks. The mandatory verification above still guards what the hooks skip — `format-check` verifies the whole tree and `npm test` exercises the shared config.

Two hook tools must be on `PATH`: `betterleaks` (secret scan, install per its project README) and `zizmor` (workflow audit, install from zizmor.dev). If a tool is missing, `LEFTHOOK=0 git commit` skips the hooks entirely — a pragmatic escape hatch for restricted setups, not a way to dodge the gates (see the SETUP.md hooks section for the same note and details).

`lefthook-local.yml` is **intentionally checked in** as this repo's team-wide override: in a stock lefthook setup that file is the personal, gitignored override layer, but here it is the one layer that merges *over* the shared `remotes:` fragments, and it carries the repo-wide npm adaptation (working around the pnpm assumption in the shared TS fragment — see https://github.com/MartinCa/lefthook-configs/issues/1). It is not a personal override layer in this repo; do not use it for private changes.

## Important House Rules for this Repo

- **Do NOT hand-edit `version` in `package.json`**: The npm package version is managed automatically by the `.github/workflows/publish.yml` release workflow upon creating a GitHub Release tag (`vX.Y.Z`). `package.json`'s version reflects the last published release.
- **Skill updates require plugin version bumps**: When editing `plugins/frontend-conventions/skills/frontend-conventions/SKILL.md`, always bump the version in `plugins/frontend-conventions/.claude-plugin/plugin.json` in the same PR (see `docs/MAINTENANCE.md`).
- **Registry authoring**: In `registry.json`, `registryDependencies` cannot point back into this same registry (bare names resolve against `ui.shadcn.com`). Bundle same-registry files directly in `files` (see `SETUP.md` Part 9).
- **Template docs**: `docs/AGENTS.md` and `docs/DESIGN.md` are the distributed template conventions copied into downstream projects via `shadcn add`. When modifying house conventions, update them in `docs/` as well as `SETUP.md`, `plugins/`, and `docs/MIGRATION.md`.
