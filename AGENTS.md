# AGENTS.md

Instructions for AI agents working in the `MartinCa/frontend-kit` repository.

## Repository Overview

`frontend-kit` is a shared conventions repository distributed through three channels:

1. **npm package (`@martinrun/frontend-config`)**: Shared ESLint flat config (`eslint.config.js`), Prettier config (`prettier.config.js`), and TypeScript base config (`tsconfig.base.json`).
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

## Important House Rules for this Repo

- **Do NOT hand-edit `version` in `package.json`**: The npm package version is managed automatically by the `.github/workflows/publish.yml` release workflow upon creating a GitHub Release tag (`vX.Y.Z`). `package.json`'s version reflects the last published release.
- **Skill updates require plugin version bumps**: When editing `plugins/frontend-conventions/skills/frontend-conventions/SKILL.md`, always bump the version in `plugins/frontend-conventions/.claude-plugin/plugin.json` in the same PR (see `docs/MAINTENANCE.md`).
- **Registry authoring**: In `registry.json`, `registryDependencies` cannot point back into this same registry (bare names resolve against `ui.shadcn.com`). Bundle same-registry files directly in `files` (see `SETUP.md` Part 9).
- **Template docs**: `docs/AGENTS.md` and `docs/DESIGN.md` are the distributed template conventions copied into downstream projects via `shadcn add`. When modifying house conventions, update them in `docs/` as well as `SETUP.md`, `plugins/`, and `docs/MIGRATION.md`.
