# 1. Distribute the piece as an uploaded archive

Date: 2026-09-07
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
Tested on stock CE 0.88.1 with `piece-slack@0.5.0` (on npm, no metadata row) and with a test
package at two versions in both orders. Official catalog pieces are unaffected because the catalog is seeded
into `piece_metadata` at boot; `piece-slack@0.17.9` installed fine from the registry.

Enterprise and Cloud editions register the same endpoint through `platformPieceModule` and run the same
shared install service and registry-resolution code; that behaviour is untested there. The archive upload
endpoint (`POST /v1/pieces`, platform admin only) exists on every edition. The vendor documents uploading
private pieces as a paid-edition feature and hides the option in the CE UI, while the CE API still
accepts it.

Separately, the package name is undecided (upstream PR #13859 is open; renaming a piece orphans every flow
built with the old name), so publishing to npm now would lock in a name we may regret.

## Options

1. Publish to npm and install as `REGISTRY`. Blocked twice over: CE registry resolution is a closed loop
   for a package the instance has never seen, and publishing locks in a package name that is still
   undecided (record 7).
2. Upload the `.tgz` with `POST /v1/pieces` as `ARCHIVE`. Works on stock CE with no extra infrastructure;
   depends on an endpoint the vendor treats as a paid-edition feature.
3. Bake the piece into our image only. No upload step at all, but every customer would have to run our
   image - the stock-CE customer lane disappears.

## Decision

Ship the piece as a `.tgz` built from one commit on `poc/orocommerce` and install it with
`POST /v1/pieces` as `packageType=ARCHIVE`, `scope=PLATFORM`. Do not publish to npm until the name is
decided and a registry install path is shown to work on the editions we target. Do not file the CE
registry behaviour upstream: the likely outcome is "working as intended", possibly with the same gate
applied to the archive path we depend on.

## Consequences

- The customer runbook must carry the upload step; the Oro bundle's setup command does not install pieces.
- `POST /v1/pieces` exists on EE/Cloud too (through `platformPieceModule`, platform admin only), but an
  `ARCHIVE` install there is untested.
- The release identity is the tarball's sha256 plus the commit; AP stores the archive byte-for-byte.
- Every piece version bump means an explicit upload per instance and a re-pin per flow.
- The customer lane depends on the CE API accepting `POST /v1/pieces` with `ARCHIVE`, while the vendor
  documents uploading private pieces as a paid-edition feature
  ([Private pieces](https://www.activepieces.com/docs/build-pieces/sharing-pieces/private), checked
  23 Sep 2026) and already hides it in the CE UI - a future release could close the CE endpoint too,
  leaving stock CE customers with no install path other than our image. Re-test the archive install with
  one curl on every Activepieces version bump.
- If upstream ever fixes registry resolution for unknown packages, images already deployed still carry
  the old resolver, so the archive path stays the baseline regardless.

**Addendum, 24 Sep 2026.** Record 12 (proposed) makes the Oro image the only way the integration is
deployed. If it is accepted, the archive stays the release artifact and the way to test the piece on a
stock instance, but uploading it is no longer a deployment step: the "customer lane" consequences above
then describe a test path, and the vendor risk to the CE upload endpoint affects testing, not deployments.
The upstream pull request named in the Context (#13859) was closed by upstream on 16 Jul 2026 without
review.

**Addendum, 24 Sep 2026 (2).** Record 12 was accepted in a changed form: the archive is not only a test
path. It is how the piece alone is shipped to stock Activepieces, so the install consequences above apply
to anyone installing it. The first addendum's "no longer a deployment step" holds only for deployments of
the integration, which run the Oro image.
