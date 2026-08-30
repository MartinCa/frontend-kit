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

That settles the registry reads described above, and only those. The config
package on GitHub Packages needs a token whether or not it is public — see
"Making the repo public does not remove the token" in Part 5 before assuming
otherwise.

---

## Part 2 — Publish the config package

The package is scoped `@martinca` and publishes to GitHub Packages, which is
free for private packages and needs no npmjs account.

```sh
gh release create v0.1.0 --generate-notes
```

That's the only step — no local `npm version` needed. The workflow fires on
a published GitHub Release, reads the version from the tag (`v0.1.0` →
`0.1.0`), bumps `package.json` to match, commits that bump straight to the
default branch, and publishes. Marking a release as a pre-release skips
publishing. For a one-off publish with no release at all, run the workflow
manually (`workflow_dispatch`) and give it a version in the input field.

This means the version lives in the release tag, not in a commit you make by
hand — `package.json`'s version is just a record of the last thing published,
kept in sync automatically. Don't hand-edit it; the next release overwrites
whatever is there.

The workflow pushes that bump commit straight to the default branch using the
default `GITHUB_TOKEN`. If branch protection on this repo ever requires PRs
or status checks before a push lands, that push will fail — either add an
exception for `github-actions[bot]`, or drop this step and go back to bumping
`package.json` by hand before tagging.

Consuming projects need one line in the project's committed `.npmrc` — the
scope-to-registry mapping, and nothing else:

```
@martinca:registry=https://npm.pkg.github.com
```

**The token does not go in that file.** Since pnpm 11, an `_authToken` line in
a project-level `.npmrc` whose value is an environment variable is ignored, with
a warning rather than an error:

```
[WARN] Ignored project-level auth setting "//npm.pkg.github.com/:_authToken" in
"/frontend/.npmrc": environment variables are not expanded in registry
credentials that come from a project .npmrc, because that file is committed to
the repository and could leak the secret to an attacker-controlled registry.
```

The install then continues without an auth header and fails later with
`ERR_PNPM_FETCH_401 ... No authorization header was set for the request`, which
reads like a missing token rather than an ignored one. pnpm still expands the
same `${VAR}` in a *user-level* config, which is the fix everywhere below. (A
hardcoded literal token in a project `.npmrc` is still honoured — that is how
Renovate's own lockfile updates keep working — but committing one is the thing
the change exists to prevent.)

For local dev, `gh auth token` writes a literal into the user-level file:

```sh
echo "//npm.pkg.github.com/:_authToken=$(gh auth token)" >> ~/.npmrc
```

**Naming the CI secret:** GitHub Actions rejects any repository/organization
secret whose name starts with `GITHUB_` — that prefix is reserved for its own
automatic variables. Pick something else for the secret itself; name it after
what it's actually for rather than something generic like `GH_PACKAGES_TOKEN`
that invites collisions with other packages tokens a repo might need —
`FRONTEND_KIT_PACKAGES_TOKEN` is explicit and won't clash. The env var name
you reference in `.npmrc` (`GITHUB_PACKAGES_TOKEN` or whatever you called it)
is unaffected by this — that restriction only applies to the secret's name in
Actions settings, map one to the other in the workflow:

```yaml
- name: Authenticate to GitHub Packages
  run: echo "//npm.pkg.github.com/:_authToken=$GITHUB_PACKAGES_TOKEN" >> ~/.npmrc
  env:
    GITHUB_PACKAGES_TOKEN: ${{ secrets.FRONTEND_KIT_PACKAGES_TOKEN }}

- name: Build
  run: pnpm install --frozen-lockfile
```

`~/.npmrc` on the runner, not the repo's `.npmrc` — see the pnpm 11 note above.
The runner is destroyed after the job, and `$GITHUB_PACKAGES_TOKEN` is a
registered secret, so Actions masks it if it ever reaches the log.

If the project builds through Docker (multi-stage build installing the
frontend), pass the same secret into BuildKit rather than an `ARG` — an `ARG`
bakes the token into an image layer:

```dockerfile
# The auth line goes in a user-level npmrc, written and removed inside a single
# RUN so it never lands in a layer. Exporting NPM_CONFIG_USERCONFIG rather than
# writing ~/.npmrc keeps this working whatever user the base image runs as.
RUN --mount=type=secret,id=github_packages_token \
    export NPM_CONFIG_USERCONFIG=/tmp/npmrc && \
    printf '//npm.pkg.github.com/:_authToken=%s\n' \
      "$(cat /run/secrets/github_packages_token)" > "$NPM_CONFIG_USERCONFIG" && \
    pnpm install --frozen-lockfile; \
    status=$?; rm -f "$NPM_CONFIG_USERCONFIG"; exit "$status"
```

Passing the secret as an env var on the `pnpm install` line itself — the
obvious shape, and what this file recommended before pnpm 11 — silently does
nothing, because the only thing that would have read that variable is the
project `.npmrc` line pnpm now ignores.

```yaml
- uses: docker/build-push-action@...
  with:
    secrets: |
      github_packages_token=${{ secrets.FRONTEND_KIT_PACKAGES_TOKEN }}
```

Note PRs from forks never see this secret (GitHub withholds all secrets from
fork-triggered workflow runs) — a Docker build step will fail there. That's
expected for a private-package dependency, not a bug to chase.

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

### Renovate and the private package

A private package on GitHub Packages does not stop Renovate from updating it,
and in the common case there is nothing to configure: Renovate automatically
provisions host rules for `*.pkg.github.com` using its own platform token. That
covers version lookups *and* the `pnpm install` it runs to refresh
`pnpm-lock.yaml` — Renovate writes a literal token into the npmrc it generates
at that moment, which is not what pnpm 11 rejects (it only refuses to expand
environment variables in a *committed* project `.npmrc`).

The catch is reach, not mechanism. That platform token only sees repositories
Renovate is installed on, and `@martinca/frontend-config` lives in a different
repo from the project consuming it. Two ways to close the gap, in order of
preference:

1. **Grant the consuming repo read access to the package.** In the package's
   settings, under "Manage Actions access", add the repository. This lets that
   repo's own `GITHUB_TOKEN` read the package, so its CI and Docker build need
   no PAT secret at all and the whole Part 2 secret dance goes away.

   "Manage Actions access" is its own list and works alongside "Inherit access
   from source repository" — leave the inherit box checked. GitHub's docs say
   inherited permissions must be removed "to access the package's granular
   permissions settings", but that is about the member list further down the
   page, not this one. Nothing needs detaching, and `publish.yml` keeps working.

   Whether this also covers Renovate is not documented. The setting is
   described in terms of "GitHub Actions workflows in the linked repository";
   a bot authenticating as a GitHub App installation is a different thing, and
   the docs do not say either way. Treat Renovate as needing option 2 until you
   have seen it open a PR for this package.
2. **Give Renovate its own token**, if you would rather not manage per-package
   access. A classic PAT with `read:packages` (fine-grained tokens are not the
   documented path for the npm registry), stored encrypted:

   ```json
   {
     "hostRules": [
       {
         "matchHost": "https://npm.pkg.github.com/",
         "hostType": "npm",
         "encrypted": { "token": "<encrypted PAT>" }
       }
     ]
   }
   ```

   Keep the trailing slash on `matchHost`. To override Renovate's automatic
   rule your rule has to be at least as specific as the one it generates.

`renovate-frontend.json` already automerges patch and minor bumps of
`@martinca/frontend-config`, so once it can read the package the config updates
land without a review step. Before configuring anything, check whether it is
already working — if Renovate has opened a PR for this package, its platform
token can already read it and there is nothing to do.

### Making the repo public does not remove the token

Worth stating plainly, because it is the opposite of how every other registry
behaves and it is easy to assume otherwise. GitHub's npm registry requires
authentication for **every** read: "You need an access token to publish,
install, and delete private, internal, and public packages." Unlike the
Container registry, there is no anonymous pull. A public `frontend-kit` and a
public `@martinca/frontend-config` still answer an unauthenticated request with
`401 Unauthorized`.

Public visibility does help the *other* channel — the shadcn registry reads in
Part 1 are plain file reads and work anonymously against a public repo. It just
does nothing for the package.

So there are only two ways to genuinely stop passing a token around for the
config package, both already described in Part 2:

- Publish it to `registry.npmjs.org` instead, which does serve public packages
  anonymously. Keep Renovate, lose GitHub Packages.
- Drop the package and ship `eslint.config.js`, `prettier.config.js` and
  `tsconfig.base.json` through the shadcn registry as `registry:file` items.
  Zero auth, no Renovate automation for them.

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
pnpm add -D @martinca/frontend-config eslint prettier prettier-plugin-tailwindcss
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
dependency gets added — the migration agent prompt in
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

**package.json scripts** — DESIGN.md section 1 says lint is enforced in CI, and
that is only true with `--max-warnings 0`. Some rules in the shared config are
deliberately warnings (`no-console`, `react-refresh/only-export-components`)
because they are noisy mid-edit, and `eslint` exits 0 on warnings, so without
the flag CI stays green while they accumulate:

```jsonc
"lint": "eslint .",
"lint:ci": "eslint . --max-warnings 0",
"format:check": "prettier --check ."
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
