# Setting this up

Bringing an *existing* repo onto this kit (rather than starting fresh)?
Skip to [docs/MIGRATION.md](./docs/MIGRATION.md) instead — it has a
ready-to-paste agent prompt.

One repository, `MartinCa/frontend-kit`, distributing conventions through three
channels because the three kinds of rule need three kinds of enforcement:

| Layer | Channel | Updated by |
|---|---|---|
| Lint, tsconfig, Prettier | npm package `@martinca/frontend-config` on GitHub Packages | Renovate PR |
| DESIGN.md, shared code, tokens | shadcn registry (this repo, read by the CLI) | `shadcn add --overwrite`, deliberately |
| Agent behaviour | Claude Code plugin marketplace (this repo) | automatically, one copy exists |

Nothing is hosted. GitHub serves all three.

---

## Part 1 — Create the repo

```sh
gh repo create MartinCa/frontend-kit --private --clone
cd frontend-kit
# copy the contents of this artifact in
git add -A && git commit -m "Initial frontend kit"
git push
```

Private is fine. shadcn's CLI has supported private GitHub repositories since
August 2026: it tries anonymous access first and falls back to your credentials,
reading private files through the Contents API pinned to the resolved commit SHA.
If `gh` is authenticated on the machine, it just works. On a machine without it,
set a fine-grained PAT scoped to the repository with `Contents: Read-only`:

```sh
GH_TOKEN=github_pat_xxx pnpm dlx shadcn@latest add MartinCa/frontend-kit/conventions
```

The token is only ever sent to `api.github.com`.

If you would rather not deal with tokens on every machine, make this repo public.
There is nothing secret in it — it is lint rules and a style guide.

---

## Part 2 — Publish the config package

The package is scoped `@martinca` and publishes to GitHub Packages, which is
free for private packages and needs no npmjs account.

```sh
npm version 0.1.0
git push
gh release create v0.1.0 --generate-notes   # the publish workflow fires on release publish
```

The workflow triggers on a published GitHub Release, not on the tag push
itself — `npm version` creates the tag locally, but nothing publishes until
you create the release (tag pushes alone no longer trigger it). Marking a
release as a pre-release skips publishing; `workflow_dispatch` is still there
for a manual re-run if a publish needs retriggering.

Consuming projects need one line in `.npmrc`:

```
@martinca:registry=https://npm.pkg.github.com
```

and a token with `read:packages` in CI. For local dev, `gh auth token` works:

```sh
echo "//npm.pkg.github.com/:_authToken=$(gh auth token)" >> ~/.npmrc
```

**If that friction is not worth it** — and for four hobby projects it may not be —
drop the npm package entirely and distribute the three config files through the
shadcn registry as well, as `registry:file` items targeting `eslint.config.js`,
`prettier.config.js`, and `tsconfig.base.json`. You lose Renovate automation and
gain zero auth setup. Decide once; do not do both.

---

## Part 3 — Build the preset

Go to `ui.shadcn.com/create`, set colours, fonts, radius, and icon library, and
preview against real components. A preset packs the entire design system config —
colours, theme, icon library, fonts, radius — into one short code.

Record the code in this repo's README. It is the single string that carries your
visual identity into any new project, any machine, and any prompt:

```sh
pnpm dlx shadcn@latest init --preset a1Dg5eFl
```

Changing your mind later is cheap. Re-running `init --preset` in an existing app
reconfigures the project and its installed components.

Keep `src/styles/theme.css` in the registry as the fallback for projects that
predate the preset, and regenerate it whenever the preset changes so the two do
not drift.

---

## Part 4 — Add the plugin marketplace

Once, per machine:

```sh
claude plugin marketplace add MartinCa/frontend-kit
claude plugin install frontend-conventions@martinca
```

From then on, every project gets the conventions skill without a file in the
repo. Edit `plugins/frontend-conventions/skills/frontend-conventions/SKILL.md`
and the change reaches every project on the next update — this is the piece that
removes the N-repo chore.

Also run this per project so agents get accurate primitive APIs and CLI usage:

```sh
pnpm dlx skills add shadcn/ui
```

That skill covers both Radix and Base UI primitives, updated APIs, component
patterns, and registry workflows, and it knows which CLI flags to pass. It is the
single highest-leverage thing for reducing agent mistakes, because the Base UI
and Radix APIs differ and models routinely mix them.

---

## Part 5 — Wire up the Renovate preset

Add `renovate-frontend.json` to your existing `MartinCa/renovate-config` repo (or
keep it here and reference it by path). Then in each frontend project:

```json
{
  "extends": [
    "github>MartinCa/renovate-config",
    "github>MartinCa/frontend-kit:renovate-frontend"
  ]
}
```

Renovate cannot see shadcn components — they are your source files, not
dependencies. It will keep the primitives underneath them current, which is
where the actual security surface is.

---

## Part 6 — Start a project

```sh
pnpm dlx shadcn@latest init --template vite --base base --preset <your-code>

pnpm dlx shadcn@latest add \
  MartinCa/frontend-kit/conventions \
  MartinCa/frontend-kit/api-client \
  MartinCa/frontend-kit/query-setup

pnpm add @tanstack/react-query @tanstack/react-router zustand \
  react-hook-form zod date-fns lucide-react sonner
pnpm add -D @martinca/frontend-config eslint prettier prettier-plugin-tailwindcss
```

Or, with the plugin installed, just `/frontend-conventions:new-frontend`.

Three files in the project reference the shared config:

**eslint.config.js**
```js
import config from "@martinca/frontend-config/eslint";
export default config();
```

**prettier.config.js**
```js
export { default } from "@martinca/frontend-config/prettier";
```

**tsconfig.json**
```json
{
  "extends": "@martinca/frontend-config/tsconfig",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

**vite.config.ts** — the `/api` proxy that makes the backend interchangeable:
```ts
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000", // ASP.NET Core; 8000 for FastAPI
        changeOrigin: true,
      },
    },
  },
});
```

Finally, fill in section 9 of `DESIGN.md`. That section is the only part the
project owns.

---

## Part 7 — Generate API types

Per project, add a script and check the output in:

```jsonc
// ASP.NET Core
"api:types": "openapi-typescript http://localhost:5000/openapi/v1.json -o src/lib/api-types.ts"

// FastAPI
"api:types": "openapi-typescript http://localhost:8000/openapi.json -o src/lib/api-types.ts"
```

Commit the generated file. The diff on regeneration is how you notice a breaking
backend change before the UI does.

Both frameworks emit the spec themselves — FastAPI from its Pydantic models,
ASP.NET Core from its built-in OpenAPI support — so there is no schema to
maintain by hand on either side.

---

## Keeping it aligned afterwards

Full detail, including drift signals to watch for, lives in
[docs/MAINTENANCE.md](./docs/MAINTENANCE.md). Short version:

**Automatic:** lint and tsconfig (Renovate), agent behaviour (plugin).

**Deliberate, a few times a year:**

```sh
pnpm dlx shadcn@latest add MartinCa/frontend-kit/conventions --overwrite
pnpm dlx shadcn@latest add MartinCa/frontend-kit/api-client --overwrite
git diff        # reconcile against the project-specific section
```

**Never automatic:** shadcn component updates. Run `shadcn add <name> --diff` when
you have a reason, review, then `--overwrite` and merge with git. This is why
`src/components/ui/**` must stay unedited — untouched files overwrite cleanly and
the whole update becomes a five-minute job instead of an afternoon.

## What to do first

If you only do one part, do Part 4. The plugin costs ten minutes, needs no auth,
no publishing, and no per-project files, and it is the layer that actually
changes what gets written. The npm package and the registry are worth adding once
you have a second project that has already drifted.

---

## Part 8 — Claude Code on web and mobile

Cloud sessions run in an isolated, ephemeral VM. The same environments apply to
the web, `claude --cloud`, routines, and the mobile app, so configure once.

### What you must do: check the skill into each project

`/plugin` is a terminal-only command and is not available in cloud sessions, so a
machine-scope marketplace install never reaches web or mobile. Anything an agent
should know has to be in the repository.

```sh
pnpm dlx shadcn@latest add MartinCa/frontend-kit/agent-skill
```

That writes `.claude/skills/frontend-conventions/SKILL.md`. Commit it. There is
still one upstream source; re-run with `--overwrite` to refresh. `DESIGN.md` and
`AGENTS.md` are already in the clone, so they need nothing extra.

Keep the marketplace install for the local terminal — it is nicer there and means
one less committed file when you are working locally.

### What you probably do not need: network changes

The Default environment carries no configuration of its own and uses **Trusted**
network access: sessions reach package registries and other allowlisted domains
and nothing else. `pnpm install` works untouched.

If a `shadcn` command fails, network access level is the first thing to check.
Switch the environment to **Full**, confirm that was the cause, then decide
whether to stay there. Full removes the restrictions — for a private repo whose
inputs you control the practical risk is low, but Trusted is what would block an
exfiltration attempt if an agent were ever tricked by something it read.

### Optional: a setup script

```sh
#!/usr/bin/env bash
set -euo pipefail
corepack enable
pnpm install --frozen-lockfile
```

**Known gotcha:** variables set in the environment's Environment variables panel
are empty inside the setup script — they are injected only once the session is
running, and it fails silently with no error. Do not put a `GH_TOKEN`-dependent
command in the setup script. It works fine when Claude runs it mid-session.

### The private-repo question, again

Git is authenticated through a proxy so credentials stay outside the sandbox, but
that covers git, not an authenticated npm install from GitHub Packages or a
private shadcn registry read. Both need a token in the environment variables panel.

Two ways out, in order of preference:

1. **Make `frontend-kit` public.** Publish the config to npm, or skip the package
   and ship the config files through the registry as `registry:file` items.
   Nothing in this repo is secret — it is lint rules and a style guide.
2. Keep it private, set `GH_TOKEN` (fine-grained, `Contents: Read-only`, scoped to
   the repo) in the environment variables. shadcn only ever sends it to
   `api.github.com`. Accept a long-lived token sitting in a settings field.

For hobby projects, option 1 is the right trade.

### Summary

| Piece | Local terminal | Web / mobile |
|---|---|---|
| Conventions skill | plugin marketplace | vendored `.claude/skills/` — required |
| `DESIGN.md` / `AGENTS.md` | registry | already in the clone |
| Shared lint config | npm package | fine if the package is public |
| `pnpm install` | works | works on Trusted |
| shadcn CLI | works | try Trusted first, Full if it fails |
| Component `--diff` updates | yes | avoid; do these locally |
