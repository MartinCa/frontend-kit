# Maintenance: what to run in a project that uses frontend-kit

Everything a project needs to do, forever, to stay aligned. Nothing here is
required to ship — skipping it just means slower drift, and eventually a
migration that looks more like [MIGRATION.md](./MIGRATION.md) than a diff.

## Fully automatic — nothing to run

| What | How |
|---|---|
| ESLint/Prettier/tsconfig rule changes | Renovate opens a PR when `@martinrun/frontend-config` bumps. Patch/minor auto-merges (see `renovate-frontend.json`). |
| Agent behavior (the conventions skill) | Local terminal: automatic on the next `claude plugin update` / marketplace refresh. Nothing to do per project. |
| Primitive libraries under shadcn components (Base UI/Radix) | Renovate groups and bumps them; review like any dependency PR. |

If Renovate PRs for this repo stop appearing, that's the thing to check first
— not a reason to start manually bumping the config package.

## A few times a year — deliberate, five minutes

Pull the parts of the kit that are read from source, not from a package:

```sh
pnpm dlx shadcn@latest add MartinCa/frontend-kit/conventions --overwrite
pnpm dlx shadcn@latest add MartinCa/frontend-kit/query-setup --overwrite
pnpm dlx shadcn@latest add MartinCa/frontend-kit/theme --overwrite
git diff        # reconcile against project-specific edits, section 9 of DESIGN.md
```

`query-setup` bundles `lib/api.ts` as well as `lib/query.ts` (`query.ts`
imports `ApiError`, and a registry item cannot reference another item in the
same registry — SETUP.md Part 9), so it refreshes the API client too. Running
`api-client --overwrite` separately is redundant, not wrong.

If the project vendored the agent skill for cloud sessions (Part 8 of
SETUP.md), refresh it the same way and commit:

```sh
pnpm dlx shadcn@latest add MartinCa/frontend-kit/agent-skill --overwrite
```

`--overwrite` is safe here specifically because these files aren't meant to be
hand-edited (except DESIGN.md section 9, which lives at the bottom and rarely
conflicts). If `git diff` shows changes outside section 9, someone edited a
file they shouldn't have — reconcile by hand once and stop editing it going
forward.

## When you have a reason — not on a schedule

**shadcn component updates.** Never automatic, never batched with anything
else:

```sh
pnpm dlx shadcn@latest diff <component>      # see what changed upstream
pnpm dlx shadcn@latest add <component> --overwrite
git diff                                      # resolve like any merge
```

Only do this for components you're already touching or that have a known bug
fix upstream. This is cheap specifically because `src/components/ui/**` is
never hand-edited (DESIGN.md section 3) — if that invariant has been broken,
expect a real merge instead of a clean overwrite, and fix the invariant while
you're in there.

**`clsx`/`tailwind-merge` → `cn`.** Only relevant for a project that already has
`clsx`/`tailwind-merge` in `lib/utils.ts` — a fresh `shadcn init` scaffold already
generates against `cn` and has nothing to migrate. shadcn now ships its own
class-merging engine (`cn`, ~30x faster, same API as `twMerge(clsx(...))`) and added
`npx shadcn migrate cn` to adopt it in Tailwind v4 projects. Make sure the shadcn CLI
itself is current first — `pnpm dlx shadcn@latest` always resolves the latest release,
so there's nothing to bump by hand — then run the migration once per project:

```sh
pnpm dlx shadcn@latest migrate cn
git diff        # rewrites imports, replaces twMerge(clsx(...)) calls, drops the old
                # packages once nothing references them
```

Not urgent — existing `clsx`/`tailwind-merge` code keeps working — but do it the next
time you're touching `lib/utils.ts` or picking up new shadcn components, since fresh
`shadcn init`/`add` scaffolds already generate against `cn`.

**Preset changes.** If the visual identity in the frontend-kit README changes
(new preset code), re-run in each project you want to update:

```sh
pnpm dlx shadcn@latest init --preset <new-code>
```

This is a deliberate visual change, not maintenance hygiene — do it when you
mean to, not as a batch job.

**API types.** Regenerate whenever the backend's OpenAPI spec changes, and
check the diff in review — it's how a breaking backend change gets caught
before the UI does:

```sh
pnpm run api:types
git diff src/lib/api-types.ts
```

**Tokens.** None. The config package is public on npmjs and `frontend-kit` is
a public repo, so neither the package install nor a shadcn registry read needs
a credential. If a `GH_TOKEN` is still set anywhere for this kit, it is left
over from the GitHub Packages era and can go.

## Signals something has drifted

- `pnpm lint` violation count going up over time with no corresponding
  Renovate PR — someone's disabling rules instead of fixing them, or the
  config package fell behind.
- `git diff` after an `--overwrite` touching more than DESIGN.md section 9 —
  a supposedly-vendored file was hand-edited.
- A new project's DESIGN.md section 9 left blank — it was scaffolded without
  anyone answering "what is this app and who uses it."
- Two projects solving the same problem two different ways outside what
  DESIGN.md governs — that's a signal to add a new registry item or convention
  upstream, not to let it happen a third time.
- A build failing with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` on packages
  nobody deliberately updated. The message blames the lockfile — "the lockfile
  is stale, or ... someone committed a lockfile that bypassed the policy" —
  which is usually wrong. It means pnpm 11's default supply-chain policy is
  running where the project's `pnpm-workspace.yaml` settings are not reaching
  it. In a Docker build, check that file is in the `COPY` for the dependency
  layer (SETUP.md Part 6).
- `SKILL.md` changed in frontend-kit but `plugins/frontend-conventions/.claude-plugin/plugin.json`
  still shows the same version — installed plugins have nothing to compare
  against, so the update may not reach machines that already have it. Bump the
  plugin version in the same PR as any skill change.
