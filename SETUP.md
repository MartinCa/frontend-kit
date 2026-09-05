# Setting this up

Bringing an *existing* repo onto this kit (rather than starting fresh)?
Skip to [docs/MIGRATION.md](./docs/MIGRATION.md) instead — it has
ready-to-paste agent prompts for incremental adoption and full UI migration.

One repository, `MartinCa/frontend-kit`, distributing conventions through three
channels because the three kinds of rule need three kinds of enforcement:

| Layer | Channel | Updated by |
|---|---|---|
| Lint, tsconfig, Prettier | npm package `@martinrun/frontend-config`, public on npmjs | Renovate PR |
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

That settles the registry reads described above. The config package is a
separate channel and needs no token either — it is public on npmjs, not on
GitHub Packages (Part 2 explains why).

---

## Part 2 — Publish the config package

The package is `@martinrun/frontend-config`, published public to
registry.npmjs.org. The scope comes from the npm username `martinrun`; it is a
namespace, not an organization, and does not need to match the GitHub owner.

Public and on npmjs is a deliberate choice over GitHub Packages. GitHub's npm
registry authenticates *every* read, public packages included — there is no
anonymous pull — so a private-registry package drags a token into every
consumer: a `.npmrc`, a CI secret, a BuildKit secret for Docker builds, a
Renovate host rule, and a PAT expiry to remember. On npmjs a public package
needs none of that. Nothing in this repo is secret; it is lint rules and a
style guide.

### Releasing

```sh
gh release create v0.2.0 --generate-notes
```

That's the only step. The workflow fires on a published GitHub Release, reads
the version from the tag (`v0.2.0` → `0.2.0`), bumps `package.json` to match,
commits that bump to the default branch, and publishes. Marking a release as a
pre-release skips publishing. For a one-off publish with no release, run the
workflow manually (`workflow_dispatch`) and give it a version in the input.

The version lives in the release tag, not in a commit you make by hand —
`package.json`'s version is a record of the last thing published, kept in sync
automatically. Don't hand-edit it; the next release overwrites it.

The workflow pushes that bump commit to the default branch with the default
`GITHUB_TOKEN`. If branch protection ever requires PRs or status checks before
a push lands, that push fails — either add an exception for
`github-actions[bot]`, or drop the step and bump `package.json` by hand before
tagging.

### Publishing needs no token

The workflow authenticates with npm through OIDC ("trusted publishing"): npm
mints a short-lived, workflow-scoped credential from the `id-token: write`
permission. There is no npm token to store, rotate or leak, and npm attaches a
provenance attestation automatically — no `--provenance` flag.

Two things about the setup are easy to get wrong, and both fail confusingly:

**A trusted publisher cannot be attached to a package that does not exist
yet.** Unlike PyPI, npm has no pre-registration, so the very first publish must
use a token. Do it once from your machine and never again:

```sh
npm login
npm publish --access public
```

That one publishes whatever version `package.json` currently holds — it is the
single case where the version does not come from a release tag. Everything
after it goes back to the release flow above.

Then, at npmjs.com → the package → Settings → Trusted Publisher → GitHub
Actions, fill in: organization or user `MartinCa`, repository `frontend-kit`,
workflow filename `publish.yml`, environment blank. Every later release goes
through the workflow with no credential.

Order matters for the last step. "Require two-factor authentication and
disallow tokens" closes the door the bootstrap publish came through — but do it
only **after** a release has actually published through the workflow, not
straight after configuring the trusted publisher. There is no dry run for OIDC:
the first real release is the test, and until it passes, the token route is the
only way back in.

So the sequence is: bootstrap publish by hand → configure the trusted publisher
→ cut a normal release and watch it publish with no credential → then lock
tokens out.

If that first workflow release fails at the publish step, the bump commit has
already landed on the default branch. That is recoverable: re-running the
workflow finds `package.json` already at the target version, makes no second
commit, and retries the publish.

**`actions/setup-node` must not be given `registry-url`.** With `registry-url`
set and no `NODE_AUTH_TOKEN`, it writes an empty `_authToken=` line into
`.npmrc`; npm reads that, concludes authentication is already configured, skips
the OIDC exchange entirely and fails with `ENEEDAUTH` or a 404
([actions/setup-node#1551](https://github.com/actions/setup-node/issues/1551)).
registry.npmjs.org is npm's default anyway, so the fix is to omit the option
rather than to strip the line back out afterwards.

`publishConfig.access` is set to `public` in `package.json` rather than left to
the CLI default. npm's own docs disagree with each other about whether a new
scoped package defaults to public or restricted; stating it removes the
question, and a scoped package published restricted by accident needs a paid
plan.

Trusted publishing needs npm CLI 11.5.1+ and Node 22.14+. The workflow pins
Node 24, which satisfies both, and checks the npm version explicitly so a
runner image change surfaces as a clear failure rather than an auth error.

### Consuming projects need nothing

No `.npmrc`, no token, no CI secret:

```sh
pnpm add -D @martinrun/frontend-config
```

Renovate reads it like any other public package, with no host rules.

### Migrating a project off GitHub Packages

For a project that consumed the old `@martinrun/frontend-config`, the migration
is all deletions:

1. `pnpm remove @martinrun/frontend-config && pnpm add -D @martinrun/frontend-config`
2. Update the three config files that import it — `eslint.config.js`,
   `prettier.config.js`, `tsconfig.json`.
3. Delete the project `.npmrc` (or just the `@martinca:` line, if the file has
   other scopes in it).
4. In a Dockerfile, drop the `--mount=type=secret` and the npmrc-writing
   preamble; `pnpm install --frozen-lockfile` is enough again.
5. Drop the `secrets:` block from the `docker/build-push-action` step, and
   delete the `FRONTEND_KIT_PACKAGES_TOKEN` Actions secret.
6. Remove any Renovate `hostRules` entry for `npm.pkg.github.com`.

---

## Part 3 — Build the preset

Go to `ui.shadcn.com/create`, set colours, fonts, radius, and icon library, and
preview against real components. A preset packs the entire design system config —
colours, theme, icon library, fonts, radius — into one short code.

Record the code in this repo's README. It is the single string that carries your
visual identity into any new project, any machine, and any prompt:

```sh
pnpm dlx shadcn@latest init --preset b0   # this repo's actual code — see README
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

### Renovate and the config package

Nothing to configure. `@martinrun/frontend-config` is public on npmjs, so
Renovate resolves it like any other dependency — no host rules, no secret, no
token.

This is the part that used to need the most setup, and it is worth recording
why, because the failure was silent. On GitHub Packages the package needed a
credential Renovate did not have: its automatic host rules for
`*.pkg.github.com` use the platform token, which only reaches repositories
Renovate is installed on, and the package lived in a different repo. Granting
the consuming repository Read under the package's "Manage Actions access" did
not help either — that setting is scoped to GitHub Actions workflows, and the
Mend-hosted Renovate app authenticates as a GitHub App installation instead.
The only symptom was a line on the Dependency Dashboard:

```
Failed to look up npm package @martinca/frontend-config: no-result
```

No PR, no error, just a dependency that quietly stopped being updated. If a
package ever appears in the dashboard's detected list with no `→ Updates:`
beside it, that is what to look for.

`renovate-frontend.json` automerges patch and minor bumps of the config
package, so updates land without a review step.

---

## Part 6 — Start a project

```sh
pnpm dlx shadcn@latest init --template vite --base base --preset <your-code>

pnpm dlx shadcn@latest add \
  MartinCa/frontend-kit/conventions \
  MartinCa/frontend-kit/api-client \
  MartinCa/frontend-kit/query-setup \
  MartinCa/frontend-kit/theme \
  MartinCa/frontend-kit/theme-provider

pnpm add @tanstack/react-query @tanstack/react-router zustand \
  react-hook-form zod date-fns lucide-react sonner
pnpm add -D @martinrun/frontend-config eslint prettier prettier-plugin-tailwindcss lefthook
```

Or, with the plugin installed, just `/frontend-conventions:new-frontend`.

Run those `pnpm add` commands as shown — with no version typed in — so
pnpm resolves whatever is current today. `pnpm add` still writes a range
into `package.json` (that's normal); Renovate is what keeps that range
current afterward. If an agent is doing this step, the "no version"
part matters more than usual: an agent that writes the version number
into `package.json` by hand instead of running `pnpm add` will reach for
whatever version its training data remembers, which is routinely a major
or two behind. Same warning applies everywhere else in this kit a
dependency gets added — the migration agent prompts in
[docs/MIGRATION.md](./docs/MIGRATION.md) included.

Three files in the project reference the shared config:

`theme` is in that list even though `init --preset` already writes the standard
tokens: the status tokens (`--status-ok`, `--status-warn`, `--status-error`,
`--status-unknown`) are this kit's own and are in no preset. `theme.css` also
carries the `@theme inline` block that registers them with Tailwind — without
it `bg-status-ok` is not a utility that exists, and DESIGN.md section 5 leaves
no legal way to express a status colour. Import it after the Tailwind entry
point.

**eslint.config.js**
```js
import config from "@martinrun/frontend-config/eslint";
export default config();
```

**prettier.config.js**
```js
export { default } from "@martinrun/frontend-config/prettier";
```

**tsconfig.json**
```json
{
  "extends": "@martinrun/frontend-config/tsconfig",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

**pnpm-workspace.yaml** — pnpm's supply-chain settings. pnpm 11 turns
protection on by default: `minimumReleaseAge` is `1440` minutes, up from `0` in
pnpm 10, so any lockfile entry published in the last day is rejected at install
time. That fails CI on transitive versions nobody chose deliberately, and it
arrives with a pnpm upgrade rather than with any change of yours.

```yaml
trustLockfile: true
minimumReleaseAgeExclude:
  - "@martinrun/*"
```

`trustLockfile` stops pnpm re-applying the policy to an already-committed
lockfile on every install. The policy still runs when the lockfile is
*written*, which is where it catches a suspicious release; re-running it at
install time against a reviewed lockfile is the part that breaks builds.
This one is a judgement call rather than an automatic default — pnpm's caveat
is "leave this `false` whenever outside collaborators can edit the lockfile."
True for a solo private repo, false the moment a project takes outside PRs, so
decide per project rather than copying it in reflexively.

`minimumReleaseAgeExclude` covers our own package: a release of
`@martinrun/frontend-config` is ours and reviewed before it ships, so it need
not sit in quarantine for a day before a project can adopt it.

**Do not set `minimumReleaseAge` itself.** Pinning it to `1440` looks like the
tidy "be explicit" move and is a trap: it applies under pnpm 10 too, where the
default is `0` and where `trustLockfile` does not exist (11.3+), so the policy
bites with no way to satisfy it. Let each pnpm version use its own default.

**If the project builds in Docker, the file has to be in the dependency
layer.** This is the part that is easy to miss, because the config is correct
in the repo and the build still fails:

```dockerfile
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
```

Miss it and `pnpm install` inside the image runs with pnpm's defaults and
rejects the lockfile, while the same command passes on your machine — where
the file is obviously present. Testing the settings is not the same as testing
the build; reproduce the `COPY` set in a scratch directory if in doubt.

**package.json scripts and git hooks** — DESIGN.md section 1 says lint is enforced in CI, and
that is only true with `--max-warnings 0`. Some rules in the shared config are
deliberately warnings (`no-console`, `react-refresh/only-export-components`)
because they are noisy mid-edit, and `eslint` exits 0 on warnings, so without
the flag CI stays green while they accumulate.

Add scripts to `package.json`:

```jsonc
"scripts": {
  "lint": "eslint . --max-warnings 0",
  "format-check": "prettier --check .",
  "format": "prettier --write .",
  "prepare": "lefthook install"
}
```

Git hooks run through [Lefthook](https://github.com/evilmartians/lefthook) rather than
Husky + lint-staged — Husky hasn't shipped a release since November 2024, and Lefthook
(a single Go binary, no Node process per hook) replaces both packages with one config
file. Add `lefthook.yml` at the project root:

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{ts,tsx}"
      run: pnpm eslint --fix {staged_files} && pnpm prettier --write {staged_files}
      stage_fixed: true
    format:
      glob: "*.{json,css,md,js,mjs,html}"
      run: pnpm prettier --write {staged_files}
      stage_fixed: true
```

`pnpm install` runs the `prepare` script automatically, which registers the git hook
(`lefthook install` — safe to re-run, it's idempotent).

**This only works because `prepare` is the project's own script, not lefthook's.**
Some lefthook guides wire the hook install into lefthook's own bundled
`postinstall` instead — don't do that here. pnpm 10+ ignores lifecycle scripts
belonging to *dependencies* by default (`ERR_PNPM_IGNORED_BUILDS` /
`pnpm approve-builds`), and lefthook's package ships exactly such a script. A
`pnpm install` in a fresh clone does print `Ignored build scripts:
lefthook@2.1.12` — that's expected and harmless: lefthook resolves its
platform binary from an `optionalDependencies` package (no script needed) and
this kit's own `"prepare": "lefthook install"` line is the project's script,
which pnpm always runs regardless of that setting. Verified by wiping
`node_modules` and reinstalling — the pre-commit hook fires correctly despite
the warning. If a project's `package.json` instead used `"postinstall":
"lefthook install"` (lefthook's own suggested wiring in its README), the hook
would silently not install under pnpm 10+ until `lefthook` is added to
`pnpm.onlyBuiltDependencies`.

**.github/workflows/ci.yml** — Template GitHub Actions workflow verifying every PR and branch push:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Lint
        run: pnpm run lint
      - name: Format check
        run: pnpm run format-check
      - name: Type check
        run: pnpm exec tsc --noEmit
      - name: Test
        run: pnpm test
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

**.gitignore** — Ensure `src/routeTree.gen.ts` is **not** ignored. TanStack Router
treats this file as part of application source code, and DESIGN.md establishes it
as a checked-in, vendored contract file (matching `src/lib/api-types.ts`). Committing
it ensures fresh clones have complete route types for IDEs and type-aware linting
(`projectService: true`) without requiring an upfront build. Only ignore build
output (`dist/`), `node_modules/`, and logs.

**Wire up dark mode.** `theme.css`'s dark values only apply when something adds
a `.dark` class — nothing does that automatically. Wrap the app in
`ThemeProvider` (defaults to the OS preference, with an optional persisted
override):

```tsx
// main.tsx
import { ThemeProvider } from "@/components/theme-provider";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
```

Add `MartinCa/frontend-kit/theme-toggle` too if the project wants a manual
light/dark switch in its nav — it renders nothing without `ThemeProvider`
above it in the tree.

`ThemeProvider` applies the class in a `useEffect`, which runs after first
paint — expect one frame of the wrong theme on a hard reload. If that flash
bothers you, add a blocking inline script in `index.html`, before any other
`<script>`, that reads `localStorage` the same way and sets the class before
React ever mounts:

```html
<script>
  (function () {
    var stored = null;
    // Same reason ThemeProvider guards it: localStorage throws outright in
    // Safari private browsing and in a sandboxed iframe. An uncaught throw here
    // is not fatal, but it skips the class assignment on the line below and
    // brings back the flash this script exists to prevent.
    try {
      stored = localStorage.getItem("theme");
    } catch (e) {}
    var dark = stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  })();
</script>
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

Similarly, with TanStack Router, `src/routeTree.gen.ts` is committed to Git as a
vendored contract file. The TanStack Router plugin regenerates it as routes change,
keeping route types in sync.

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

Git is authenticated through a proxy so credentials stay outside the sandbox,
but that covers git, not a shadcn registry read from a private repo.

This used to be two problems; the config package is no longer one of them —
it is public on npmjs and needs no credential anywhere (Part 2). What is left
is the registry read, and `frontend-kit` being public settles it: shadcn reads
the files anonymously and no `GH_TOKEN` is needed in the environment variables
panel at all.

If you ever make the repo private again, that is when you need a fine-grained
PAT (`Contents: Read-only`, scoped to the repo) in the environment variables,
and you accept a long-lived token sitting in a settings field. For hobby
projects, public remains the right trade.

### Summary

| Piece | Local terminal | Web / mobile |
|---|---|---|
| Conventions skill | plugin marketplace | vendored `.claude/skills/` — required |
| `DESIGN.md` / `AGENTS.md` | registry | already in the clone |
| Shared lint config | npm package | works, it is public on npmjs |
| `pnpm install` | works | works on Trusted |
| shadcn CLI | works | try Trusted first, Full if it fails |
| Component `--diff` updates | yes | avoid; do these locally |

---

## Part 9 — Authoring new registry items

Two things that broke on the first attempt, found only by actually running
`shadcn add` against the real registry. `validate.yml` now catches the first one
(`scripts/validate-manifests.mjs` rejects a self-referential
`registryDependencies` entry, and rejects an item whose `.ts`/`.tsx` files
import a `@/` path the item does not itself ship). The second is still not
mechanically checkable.

**A `registryDependencies` entry cannot point back into this same registry.**
A bare name in `registryDependencies` (e.g. `["theme-provider"]`) always
resolves against the default `ui.shadcn.com` registry, never "whichever
registry this item itself came from." There is no implicit self-reference to
`martinca`. An item that depends on another item defined in *this*
`registry.json` will fail with something like:

```
The item at https://ui.shadcn.com/r/styles/base-nova/theme-provider.json was not found.
```

Fix: don't use `registryDependencies` for same-registry references at all —
list the dependency's file(s) directly in the dependent item's own `files`
array instead (see `theme-toggle`, which bundles `theme-provider.tsx`, and
`query-setup`, which bundles `api.ts` because `query.ts` imports `ApiError`
from it).
`registryDependencies` is fine, and the right tool, for referencing an item
from the *default* registry (`button`, `dialog`, etc.) — those resolve
correctly.

**There's no clean way to test a registry change against a branch before
merging.** The `owner/repo/item` GitHub shorthand always reads from the
repo's default branch; `item@branch`-style suffixes are parsed as a literal
(and different) item name, not a ref, and fail with "not found" rather than
a helpful error. In practice: verify a new/changed item by copying its files
into a real consuming project by hand and testing that (as done for both
bugs above), and treat the actual `shadcn add owner/repo/item` invocation
against `main` as the final check once merged — not something you can fully
pre-verify in the PR itself.
