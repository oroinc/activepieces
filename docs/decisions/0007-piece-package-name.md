# 7. Choose the piece's package name

Date: 2026-09-07
Status: accepted
Evidence: the tracking ticket description and comments of 19 Aug 2026; upstream PR
activepieces/activepieces#13859; the front-end team and the fork owner, 24 Sep 2026

## Context

The piece is currently `@activepieces/piece-orocommerce`, the name it would have as an official upstream
piece. It is installed under that name on every rig and in the release tarball. In Activepieces the package
name *is* the piece identity: every flow step stores it, and a piece under a different name is a different
piece — flows built with the old name keep pointing at the old one and do not follow.

Three pressures pull in different directions:

- If upstream accepts #13859, the name must be `@activepieces/piece-orocommerce`, and anything already
  built under that name carries over. Upstream closed #13859 on 16 Jul 2026 without review, saying
  outside pull requests are paused, so this pressure is gone for now.
- If upstream does not accept it, we do not own the `@activepieces` npm scope and cannot publish under
  it; publishing would need an Oro scope (e.g. `@oroinc/…`), which is a rename.
- Until something is published, the name only matters *within an instance*, so the piece works
  under either name today — but the day a rename happens, every existing flow is orphaned and must be
  rebuilt or migrated.

## Options

1. Keep `@activepieces/piece-orocommerce`, push #13859 to a conclusion, and rename only if upstream
   declines. Cheapest now; the rename risk lands later, after more flows exist.
2. Rename to an Oro scope now, before any non-rig install. Removes the risk while it is free; forfeits the
   "official piece" path unless upstream accepts a scoped package (they do not).
3. Decide by a date: if #13859 has no movement by then, rename before the first real deployment.

## Decision

Keep `@activepieces/piece-orocommerce` (option 1, without the upstream step). The piece is not published
to npm (record 12), so no npm scope is needed, and a rename would orphan every flow already built.
Decided by the front-end team with the fork owner ([11](0011-piece-ownership.md)). Re-open only if the
piece is ever published to npm, or upstream reopens #13859 and asks for changes.

## Consequences

- The name in every published `.tgz` and in every flow stays `@activepieces/piece-orocommerce`.
- The name sits in a scope the project does not own. That is harmless while nothing is published to npm;
  if the piece is ever published there, this record has to be superseded first.
- `FORK-UPDATE.md` §2 keeps the rename warning.
