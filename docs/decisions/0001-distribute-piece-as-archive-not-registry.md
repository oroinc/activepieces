# 1. Distribute the OroCommerce piece as an uploaded archive, not via the npm registry

Date: 2026-09-07 (decision taken 2026-08-19, confirmed 2026-09-01 and 2026-09-07)
Status: accepted
Evidence: the tracking ticket comments of 19 Aug, 20 Aug, 1 Sep 2026; an internal run log, 7 Sep 2026

## Context

Activepieces can install a piece two ways: `REGISTRY` (give it an npm package name and version, it
downloads from npm) or `ARCHIVE` (upload the packed `.tgz` in the request). Flows pin the exact piece
version, so every version has to be installed explicitly either way.

On Community Edition (the edition stock images and our customers run), installs go through
`communityPiecesModule`. Its `REGISTRY` path resolves the download URL by looking the package up in
`piece_metadata` — the same table the install is meant to populate. For a package the instance has never
seen this is a closed loop: no row → 404 before npm is contacted; create the row by hand → 409 duplicate.
Tested 1 Sep 2026 on stock CE 0.88.1 with `piece-slack@0.5.0` (on npm, no metadata row) and with a test
package at two versions in both orders. Official catalog pieces are unaffected because the catalog is seeded
into `piece_metadata` at boot; `piece-slack@0.17.9` installed fine from the registry.

Enterprise and Cloud editions use a different module (`pieceSetModule`); their behaviour for unknown
packages is untested. The vendor documents piece management as an enterprise feature and hides the archive
option in the CE UI while leaving it open in the CE API (`POST /v1/pieces`).

Separately, the package name is undecided (upstream PR #13859 is open; renaming a piece orphans every flow
built with the old name), so publishing to npm now would lock in a name we may regret.

## Decision

Ship the piece as a `.tgz` built from a tagged commit on `poc/orocommerce` and install it with
`POST /v1/pieces` as `packageType=ARCHIVE`, `scope=PLATFORM`. Do not publish to npm until the name is
decided and a registry install path is shown to work on the editions we target. Do not file the CE
registry behaviour upstream: the likely outcome is "working as intended", possibly with the same gate
applied to the archive path we depend on.

## Consequences

- The customer runbook must carry the upload step; the Oro bundle's setup command does not install pieces.
- `POST /v1/pieces` exists only on CE. Customers on EE/Cloud cannot take this path and need our image
  (which bakes the piece in as a dev piece). Whether EE offers an equivalent install route is open.
- The release identity is the tarball's sha256 plus the commit; AP stores the archive byte-for-byte.
- Every piece version bump means an explicit upload per instance and a re-pin per flow.
- Re-check this decision at every Activepieces version bump: one curl re-testing the archive install on
  the new CE version, in case the archive path gains the enterprise gate.
- If upstream ever fixes registry resolution for unknown packages, images already deployed still carry
  the old resolver, so the archive path stays the baseline regardless.
