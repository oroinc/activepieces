# 7. The piece's package name

Date: 2026-09-07
Status: **open** — decision needed before upstream PR #13859 moves or anything is published to npm
Evidence: the tracking ticket description and comments of 19 Aug 2026; upstream PR
activepieces/activepieces#13859

## Context

The piece is currently `@activepieces/piece-orocommerce`, the name it would have as an official upstream
piece. It is installed under that name on every rig and in the release tarball. In Activepieces the package
name *is* the piece identity: every flow step stores it, and a piece under a different name is a different
piece — flows built with the old name keep pointing at the old one and do not follow.

Three pressures pull in different directions:

- If upstream accepts #13859, the name must be `@activepieces/piece-orocommerce`, and anything already
  built under that name carries over.
- If upstream does not accept it, we do not own the `@activepieces` npm scope and cannot publish under
  it; publishing would need an Oro scope (e.g. `@oroinc/…`), which is a rename.
- Until something is published, the name only matters *within an instance*, so the archive lane works
  under either name today — but the day a rename happens, every existing flow is orphaned and must be
  rebuilt or migrated.

## Options

1. Keep `@activepieces/piece-orocommerce`, push #13859 to a conclusion, and rename only if upstream
   declines. Cheapest now; the rename risk lands later, after more flows exist.
2. Rename to an Oro scope now, before any non-rig install. Removes the risk while it is free; forfeits the
   "official piece" path unless upstream accepts a scoped package (they do not).
3. Decide by a date: if #13859 has no movement by then, rename before the first real deployment.

## Decision

Not taken. Sits on the tracking ticket with the release record; must precede the first install on any instance
that will keep its flows (an internal deployment included).

## Consequences (of leaving it open)

- Every flow built on a rig today is disposable; that is fine for rigs and not fine for anything else.
- Publishing to npm is blocked regardless of the registry-install question (see ADR 1).
- `FORK-UPDATE.md` §2 carries the rename warning so nobody does it casually.
