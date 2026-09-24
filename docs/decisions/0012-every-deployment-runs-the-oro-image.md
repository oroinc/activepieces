# 12. Run every deployment on the Oro image

Date: 2026-09-24
Status: proposed
Evidence: record 8; the image branch (`AP_ASSETS_PREFIX`, the `/embed-ce` route, `AP_DEV_PIECES` in
`.env.oro.example`); the internal deployment page (the companion bundle's required settings); the tracking
ticket
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

## Options

1. Two lanes: the Oro image for some deployments, a stock instance plus the archive for others. Those
   deployments keep the vendor's image and update cycle, but get no embedded builder, and each one needs a
   manual piece upload that nothing in the companion bundle performs.
2. The Oro image for every deployment. One runtime, one way the piece arrives, embedding everywhere; Oro
   supplies the image to every deployment, including upstream security fixes on its own release cadence.
3. An Activepieces Enterprise licence and upstream's embed SDK (record 8, option 3). Removes the embedding
   patches; needs a licence that is not on the table.

## Decision

Option 2. Every deployment of the integration runs the Oro image built from the image branch
(`poc/orocommerce_prefixed-path-install`), with the piece built in and loaded as a dev piece.

The archive stays, for two jobs, none of which is deploying:

- **Release identity.** A release is still the `.tgz`, its commit and its two hashes (records 1 and 10).
- **Testing on stock Activepieces.** Uploading it to a stock Community Edition instance with
  `POST /v1/pieces` tests the piece on unmodified Activepieces (`FORK-UPDATE.md` §5).
- **Not a way to patch a running image.** While `AP_DEV_PIECES` names the piece, the engine loads the
  piece built into the image whatever version a flow pins, so an uploaded archive of the same name would
  not run (read from code, not tested).

## Consequences

- A new piece version reaches a deployment as a new image, then a re-pin of every flow (record 2). There is
  no per-instance upload step.
- The image has to reach every deployment. Where it is published, how it is versioned and how updates reach
  deployments is not decided here; it belongs to the fork owner and is a precondition for any deployment
  the fork owner does not run.
- The invariant of record 4 and the upstream syncs of record 6 now gate every deployment.
- Results from stock rigs test the piece, not the image. The image needs its own end-to-end proof.
- The companion bundle's setup command still pins a piece version without checking it exists; a default
  that names a version the image does not carry fails silently later. That stays a risk under this record.
- Re-check if an Activepieces Enterprise licence becomes available (record 8), or if the parked
  no-custom-image option is revived.
