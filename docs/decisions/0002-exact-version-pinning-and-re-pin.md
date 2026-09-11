# 2. Flows pin the exact piece version; every upgrade is an explicit per-flow re-pin

Date: 2026-09-07 (behaviour established 3 Sep 2026, confirmed 7 Sep 2026)
Status: accepted (this is Activepieces behaviour we live with, not a choice we made)
Evidence: upgrade rehearsal 3 Sep 2026 (internal upgrade-rehearsal results); an internal run log, 7 Sep 2026

## Context

An Activepieces flow stores the piece name *and exact version* in each trigger and action step. Installing
a newer piece version does nothing to existing flows; they keep running the version they were built with.
There is no "latest" and no automatic upgrade, for official pieces or ours.

The Oro bundle's `default_piece_version` setting only affects connections created after it changes; it does
not move existing flows either.

Our trigger registers a webhook in Oro on enable, with a secret Oro accepts only at creation time. So a
re-pin is not a metadata edit: enabling the flow at the new version deletes the old webhook row and creates
a new one with a new secret.

## Decision

Treat every piece version bump as a per-flow operation, done through the API, not the UI:

1. `POST /v1/flows/{id}` with `UPDATE_TRIGGER` — send the whole trigger object, changing only
   `settings.pieceVersion`.
2. `POST /v1/flows/{id}` with `LOCK_AND_PUBLISH`.

Then verify in Oro that the flow's URL has exactly one webhook row and `length(secret) = 108`.

The UI "upgrade" path is not used: it resets the connection and topic inputs.

## Consequences

- A release is not done when the tarball is installed; it is done when every flow using the piece has
  been re-pinned. Both lanes (image and archive) have this step.
- Two webhook rows for one URL means an old unsigned registration is still live — the check is
  load-bearing, not cosmetic.
- The `default_piece_version` in the Oro bundle must be bumped with each release (companion change), or
  new connections point at a version that may not be installed.
- A scripted re-pin (list flows using the piece → two calls each → verify) is the natural next tool;
  today it is done by hand.
