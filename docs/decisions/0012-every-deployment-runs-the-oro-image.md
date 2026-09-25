# 12. Run the integration on the Oro image; ship the piece alone as an archive

Date: 2026-09-24
Status: accepted
Evidence: record 8; the image branch (`AP_ASSETS_PREFIX`, the `/embed-ce` route, `AP_DEV_PIECES` in
`.env.oro.example`); the internal deployment page (the companion bundle's required settings); the tracking
ticket; the fork owner's decision, 24 Sep 2026
Affects: [1](0001-distribute-piece-as-archive-not-registry.md), [2](0002-exact-version-pinning-and-re-pin.md), [4](0004-two-branch-policy.md), [6](0006-upstream-sync-via-origin-main-or-tags.md)

## Context

The integration's main feature is the Activepieces builder embedded in the Oro back office. Record 8 sets
out why that needs the fork: stock Activepieces serves itself from the origin root and has no embed route
on Community Edition, while upstream's own embedding is Enterprise-only. The companion bundle is built for
the fork: it expects Activepieces under a path on Oro's own origin (`AP_ASSETS_PREFIX`) and reads the
Activepieces database directly.

The records and `FORK-UPDATE.md` nonetheless described two lanes: the Oro image, and a stock Community
Edition instance with the piece uploaded as an archive (record 1). The second lane was assumed, never
decided. On a stock instance the piece installs and flows run, but the embedded builder does not exist,
so that lane does not deliver the integration. Nothing has been deployed on either lane yet.

The fork owner has also set that the piece itself must stay usable without the fork, by anyone running
stock Activepieces. On a stock instance the piece installs and its actions and trigger work; what is
missing is only the embedded builder and the companion bundle's provisioning, so the connection to Oro is
created by hand and so is the platform API key the upload needs (`FORK-UPDATE.md` §5).

## Options

1. Stock Activepieces plus the archive for every deployment of the integration. No custom image, but no
   embedded builder either, and each instance needs a manual upload.
2. The Oro image for every deployment. One runtime, one way the piece arrives, embedding everywhere; the
   fork owner builds and runs the image for every deployment of the integration, including upstream
   security fixes on its own release cadence.
3. An Activepieces Enterprise licence and upstream's embed SDK (record 8, option 3). Removes the embedding
   patches; needs a licence that is not on the table.
4. Publish the piece to npm as well. Reaches registry installs on the paid editions (untested) and custom
   image builds, but no stock Community Edition instance, and needs an npm scope the project owns - a
   rename (record 7).

## Decision

Option 2 for the integration and the archive for the piece alone; option 4 is not taken. Two paths, one
per product.

- **The integration** - the embedded builder and the companion bundle - runs only on the Oro image built
  from the image branch (`poc/orocommerce_prefixed-path-install`), with the piece built in and loaded as a
  dev piece.
- **The piece alone** is shipped to stock Activepieces as the archive: the `.tgz` of each release with its
  two hashes (records 1 and 10), installed with `POST /v1/pieces` (`FORK-UPDATE.md` §5). It is not
  published to npm: a stock Community Edition instance cannot install a package it has never seen from the
  registry (record 1), so npm would reach no Community Edition user and would force a rename (record 7).

The archive is not a way to patch a running Oro image. While `AP_DEV_PIECES` names the piece, the engine
loads the piece built into the image whatever version a flow pins, so an uploaded archive of the same name
would not run (read from code, not tested).

## Consequences

- A new piece version reaches an Oro image deployment as a new image, then a re-pin of every flow
  (record 2).
- A new piece version reaches stock instances as a published `.tgz`, which each instance installs with
  `POST /v1/pieces`, then re-pins its flows. On stock instances the pin selects the code, as record 2
  says. Each release's archive and hashes are published as a GitHub Release of this repository
  (`FORK-UPDATE.md` §2), tried from 24 Sep 2026.
- The archive install depends on the Community Edition API accepting `POST /v1/pieces` with an archive,
  which the vendor documents as a paid feature and hides in the Community Edition UI (record 1's vendor
  risk). If that endpoint closes, the piece alone has no install path on Community Edition.
- The image is built and deployed by the fork owner; this record does not cover distributing it to anyone
  else.
- The invariant of record 4 and the upstream syncs of record 6 now gate every deployment.
- Results from stock rigs test the piece, not the image. The image needs its own end-to-end proof.
- The companion bundle's setup command still pins a piece version without checking it exists; a default
  that names a version the image does not carry fails silently later. That stays a risk under this record.
- Re-check if an Activepieces Enterprise licence becomes available (record 8), or if the parked
  no-custom-image option is revived.
