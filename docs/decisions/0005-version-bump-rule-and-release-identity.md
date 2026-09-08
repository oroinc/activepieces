# 5. Bump the piece version only when the current version has been installed outside a rig; a release is commit + two hashes

Date: 2026-09-07
Status: accepted
Evidence: PR #7 (0.3.1 bump) closed 7 Sep 2026; an internal run log, 7 Sep 2026

## Context

Activepieces treats `(name, version)` as the identity of an installed piece and refuses to install the same
pair twice (409) or to delete a version. During testing, two different builds were uploaded to a
developer rig under the same label `0.3.0`, which produced a local collision and a proposal to bump to
`0.3.1`. But `0.3.0` had never been installed anywhere except that laptop, so nothing outside the rig could
be confused by rebuilding it.

Separately, the version string alone does not identify what code is running, since anyone can build a
tarball labelled `0.3.0`.

## Decision

- Bump `version` in the piece's `package.json` only when the version currently at head has been installed
  on an instance other than a developer rig (a testbed, a customer, an internal deployment). Rig
  collisions are fixed by tearing down the rig.
- A release is identified by three values recorded together on the ticket: the fork commit, the sha256 of
  the `.tgz`, and the sha256 of `package/src/index.js` inside it. The build is deterministic (verified 7
  Sep 2026: rebuilding `5fbed5df94` reproduced `09194f3f…` byte-for-byte), so the outer hash is a valid
  identity, and Activepieces stores the archive unchanged, so the same hash can be checked on the instance.
- Versions are plain `x.y.z`; Activepieces rejects prerelease suffixes at install.
- Tarballs are named `head-<short-sha>-<version>.tgz`. Old or superseded builds are moved out of the
  release folder so exactly one file per version exists.

## Consequences

- Current release: 0.3.0 = `5fbed5df94`, `09194f3f087b46f96d88eb670c0d5128098c15491f6d653b0c9d631e541804b8`,
  67 144 bytes, `src/index.js` `11ad8876e985a4886be58645474ff5a442eefe4317611ae33feed922faef6cff`.
- If the branch owner prefers a bump-per-merge convention instead, this decision is superseded; the
  question was put to them on 7 Sep 2026.
- Every build must be checked for size and hash before use: the build tooling can silently produce a
  ~1 KB tarball with no code (see `FORK-UPDATE.md` §4).
