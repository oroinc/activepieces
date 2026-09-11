# 10. The piece is versioned for its consumers: 1.0.0 is the first customer release, semver from there

Date: 2026-09-08
Status: accepted
Supersedes: [5](0005-version-bump-rule-and-release-identity.md)
Evidence: the tracking ticket; an internal run log, 7 Sep 2026 (the 0.3.0 proof)

## Context

Record 5 set the bump rule as "bump only when the current version has been installed somewhere other than
a developer rig". That rule was written to stop version inflation while the piece was being iterated on a
laptop, and it did its job: three builds shipped under 0.3.0 without a bump, and no 0.3.1 was ever created.

It stops making sense the moment the piece is offered to customers. Under record 5 the version number
tracks *our* install history, so a customer receiving the first supported build would receive something
labelled 0.3.0 — a number that says "early, unstable, expect breaking changes" about an artifact that has
been proven end to end and is about to be pinned by production flows. Consumers read the version; the rule
was written from the producer's side.

The piece is also, from a consumer's point of view, an API: flows pin an exact version, and the piece's
actions and trigger properties are a contract. That is what semantic versioning is for.

## Decision

- **1.0.0 is the first release intended for customer installation.** It is built from the same piece tree
  that was proven end to end on a stock Community Edition instance, plus the version string.
- **From 1.0.0 the piece follows semantic versioning, judged from the consumer's side:** major for a change
  that breaks an existing flow (an action or trigger removed or renamed, a required property added, a
  changed output shape), minor for new actions, triggers or optional properties, patch for fixes that leave
  the contract intact.
- **The rig exemption in record 5 is withdrawn.** A version that has been published as a release is not
  rebuilt under the same number — if the artifact changes, the version changes. Iterating on a laptop still
  needs no bump, because a laptop build is not a release.
- **Release identity is unchanged from record 5** and restated here so this record stands alone: a release
  is a `.tgz` built from one commit on the piece branch, identified by that commit plus the sha256 of the
  `.tgz` and the sha256 of `package/src/index.js` inside it, recorded together on the tracking ticket with
  the file attached. Activepieces stores the archive byte-for-byte, so the outer sha256 identifies what an
  instance is running.

## Consequences

- Every place that names the current release changes with each bump: `FORK-UPDATE.md` §2 and §5, the
  companion bundle's default version and its README line, and the deployment page. §4's dated
  reproducibility record stays as a fact about the version it was measured on.
- Existing flows pinned to 0.3.0 do not move on their own (record 2). Each one is an explicit re-pin, and
  0.3.0 stays installed and resolvable — versions are never deleted.
- **1.0.0 raises the cost of the open package-name question (record 7).** A 1.0.0 invites consumers to
  build on the piece's identity, and the identity *is* the package name: a later rename orphans every flow
  built against it, and after 1.0.0 there will be more of them. Settling record 7 before the name is
  widely pinned is now more urgent than it was at 0.3.0, not less.
- A jump from 0.3.0 straight to 1.0.0 skips no work: it is the same tree. Anyone reading the history should
  not look for 0.4.x–0.9.x releases; they do not exist.
- If the piece is ever taken upstream, the upstream project sets the version and this record no longer
  governs it.
