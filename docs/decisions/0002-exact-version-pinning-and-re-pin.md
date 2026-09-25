# 2. Re-pin every flow explicitly on each piece version change

Date: 2026-09-07
Status: accepted
Evidence: upgrade rehearsal 3 Sep 2026 (internal upgrade-rehearsal results); an internal run log, 7 Sep 2026

## Context

This record documents Activepieces behaviour we live with, not a choice we made. An Activepieces flow
stores the piece name *and exact version* in each trigger and action step. Installing
a newer piece version does nothing to existing flows; they keep running the version they were built with.
There is no "latest" and no automatic upgrade, for official pieces or ours.

The Oro bundle's `default_piece_version` setting only affects connections created after it changes; it does
not move existing flows either.

Our trigger registers a webhook in Oro on enable, with a secret Oro accepts only at creation time. So a
re-pin is not a metadata edit: enabling the flow at the new version deletes the old webhook row and creates
a new one with a new secret.

## Decision

Treat every piece version bump as a per-flow operation, done through the API, not the UI - the UI upgrade
resets the connection and topic inputs. The calls are in [`FORK-UPDATE.md` §6](../FORK-UPDATE.md).

Then verify in Oro that the flow's URL has exactly one webhook row and `length(secret) = 108`.

## Consequences

- A release is not done when the tarball is installed; it is done when every flow using the piece has
  been re-pinned. Both lanes (image and archive) have this step.
- Two webhook rows for one URL means an old unsigned registration is still live — the check is
  load-bearing, not cosmetic.
- The `default_piece_version` in the Oro bundle must be bumped with each release (companion change), or
  new connections point at a version that may not be installed.
- A scripted re-pin (list flows using the piece → two calls each → verify) is the natural next tool;
  today it is done by hand.
- Echoing the whole trigger object with only `pieceVersion` changed carries an explicit
  `signDeliveries: false` forward and leaves the flow unsigned, so a bulk re-pin must decide whether to
  force it rather than preserve it (see [`FORK-UPDATE.md` §6](../FORK-UPDATE.md), "The `signDeliveries`
  trap").
