# Fork delta as a patch stack

The Oro delta over upstream Activepieces is currently carried on a long-lived branch, which costs
two merges: upstream into the branch on every Activepieces release, and the piece branch into it on
every piece release. One of those catch-ups was a 122-commit upstream sync, which is not reviewable
as a delta.

The alternative under evaluation is to pin an upstream commit and carry the delta as an ordered
patch stack applied at image build time. Upstream bumps then move the pin and re-roll the patches,
and conflicts show up as rejects against known hunks instead of as one large merge.

`fork-patch-stack.sh` generates that stack. This page records what a run on 2026-09-02 measured, so
the next run has something to compare against.

## Generating the stack

```sh
BASE=<upstream-commit> HEAD_REF=<fork-branch> ./scripts/fork-patch-stack.sh
```

`BASE` defaults to `git merge-base "$HEAD_REF" upstream/main`, `HEAD_REF` to `HEAD`, and `OUT_DIR`
to `patches/`. The script writes six patches and then checks that every file changed between the two
refs landed in exactly one of them. If a file falls outside all six groups it prints the list and
exits 1 — that is the intended CI gate, since a new fork file silently missing from the stack is the
failure mode that would make this approach lossy.

Patches are plain `git diff` output, so apply them with `git apply` (add `--3way` to get conflict
markers instead of a hard reject).

## What was measured

Base: upstream `main` at `71dd1758dc1b04a1ec0349ec23d2424d5055ae05`. There is no exact tag on it —
it sits 83 commits past the point where `0.88.1` branched off and 116 before `0.89.0`, and the first
release tag containing it is `0.89.0`. `package.json` at that commit still reads `0.88.1`.

Fork tip: an integration branch equal to `oro/b2-webhook-signature` merged with
`poc/orocommerce_prefixed-path-install`.

The delta is 79 files, +10,656 / −41, partitioned as:

| Patch | Files | Content |
| --- | --- | --- |
| `0001-orocommerce-piece` | 48 | the piece and its `bun.lock` entries |
| `0002-frontend-prefixed-path-embed` | 13 | 11 frontend source files, `vite.config.mts`, `vite-plugins/html-plugin.js` |
| `0003-server-runtime-base-href` | 2 | `server.ts` `<base href>` rewrite, `docker-entrypoint.sh` |
| `0004-oro-docker-packaging` | 6 | `Dockerfile.oro`, `docker-bake.hcl`, `docker-compose.oro.yml`, `healthcheck`, `.dockerignore`, `.env.oro.example` |
| `0005-ci` | 4 | `Jenkinsfile`, `oro-ci.yml`, a one-line `ci.yml` edit, `turbo.json` i18n tasks |
| `0006-docs-tooling` | 6 | three agent skills, `piece-hostnames.js` and its generated doc, `.nvmrc` |

Only 15 of those files are embedding proper: the 13 in `0002`, plus the two in `0003`. The other two
are eliminable if nginx serves the static build rather than the container.

## Proof from that run

On a fresh clone checked out at the base commit, all six patches passed `git apply --check` (only
cosmetic whitespace warnings, from trailing whitespace already present in the fork's own files). With
all six applied, the tree was byte-identical to the fork branch, and a frontend production build
succeeded and emitted `<base href="./" />` into `dist/packages/web/index.html` with no unreplaced
template placeholders.

That relative base is what a production build is supposed to contain: `index.html`'s placeholder is
filled by `html-plugin.js` with vite's `base`, which stays `./` outside dev, and the absolute prefix
is substituted at runtime by the patched `server.ts` from `AP_ASSETS_PREFIX`.

Apply-check against `0.89.0` to price an upstream bump: five of six clean. Only `0005-ci.patch`
failed, because upstream edited the same `npx turbo run test` line the fork appends to; `--3way`
resolved it automatically. So a bump costs one overlapping line in one CI file, with zero drift in
the frontend, server, piece, or packaging patches.

## Gotchas

- `.env.oro.example` is matched by upstream `.gitignore`'s `.env*`, so `git add -A` skips it after
  applying `0004`. Any integration that stages the patched tree has to `git add -f` that one file, or
  the image builds without it and the omission is silent.
- The repo is pinned to bun. Building the patched tree with pnpm needs a generated
  `pnpm-workspace.yaml` (the base has none, and `packages/web` uses `workspace:*`),
  `npm_config_package_manager_strict=false` to get past the `packageManager` field, a defined
  `NPM_TOKEN` for `.npmrc`, and `onlyBuiltDependencies` for the git-hosted MCP SDK the `dust` piece
  pulls. None of that touches the patches, but it costs an afternoon if you hit it cold.
- `GROUPS` is a readonly bash builtin holding the current user's group IDs. The script calls its
  list `PATCH_GROUPS` for that reason — assigning to `GROUPS` fails silently and the loop then runs
  once over a numeric GID.

## Not established

- Whether the patched tree *builds* on `0.89.0` — only apply-check was run there.
- Runtime behaviour of the built artifact. No server was booted and no HTTP request was made.
- Timings for resolving a real upstream bump each way, which is what a branch-versus-patches decision
  should actually turn on.
