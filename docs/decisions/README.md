# Decisions

Architecture decision records for the Oro fork of Activepieces and the OroCommerce piece. One file per
decision; short; each names the evidence it rests on and, where relevant, when to re-check it. A proposed
record may be edited until it is accepted; after that only its status line changes (for example
"superseded by N"), and new information is added as a dated addendum at the end. A changed decision gets
a new record that supersedes the old one.

Start with [8](0008-why-fork-same-origin-embedding-and-ce-auth.md) — it explains why the fork exists at
all; everything else follows from it.

| # | Decision | Status |
| --- | --- | --- |
| [8](0008-why-fork-same-origin-embedding-and-ce-auth.md) | Why Oro maintains a fork: same-origin path-prefix embedding and CE embed auth | accepted |
| [1](0001-distribute-piece-as-archive-not-registry.md) | Distribute the piece as an uploaded archive, not via the npm registry | accepted |
| [2](0002-exact-version-pinning-and-re-pin.md) | Flows pin the exact piece version; every upgrade is an explicit per-flow re-pin | accepted |
| [3](0003-api-key-provisioning-by-direct-db-write.md) | On CE the platform API key is created by writing the `api_key` row directly | accepted - a proper provisioning path is still open |
| [4](0004-two-branch-policy.md) | Two branches: piece code vs embedding/image | accepted |
| [5](0005-version-bump-rule-and-release-identity.md) | Bump only when installed outside a rig; release = commit + two hashes | superseded by [10](0010-piece-versioning-1-0-0-and-semver.md) |
| [6](0006-upstream-sync-via-origin-main-or-tags.md) | Phased upstream sync: `origin/main` during development, a release tag at release | accepted |
| [7](0007-piece-package-name.md) | The piece's package name | proposed - the piece maintainer decides ([11](0011-piece-ownership.md)); more urgent since 10 |
| 9 | not published in this repository | - |
| [10](0010-piece-versioning-1-0-0-and-semver.md) | 1.0.0 is the first customer release; semver from there | accepted |
| [11](0011-piece-ownership.md) | Give the piece maintainer ownership of the piece | accepted |

Format: Nygard-style Context / Decision / Consequences per the
[architecture-decision-record guide](https://github.com/architecture-decision-record/architecture-decision-record),
with date, status and evidence at the top and an Options section where there were real alternatives.
Related procedure: [`../FORK-UPDATE.md`](../FORK-UPDATE.md).

## What these records leave out

This repository is public. The records - and pull-request text about them - carry no ticket keys,
internal page ids, person names, internal deployment names, hostnames or unfixed security findings;
[`FORK-UPDATE.md` §9](../FORK-UPDATE.md) is the full rule. Evidence named as "internal" is held in the
internal tracker.

## Glossary

- **CE / EE** - Activepieces Community Edition (the edition stock images and our customers run) and
  Enterprise Edition.
- **rig** - a developer's local test instance of the integration; flows built on one are disposable.
- **cloud lane** - the piece ships baked into the Oro image as an in-memory dev piece, built from the
  image branch.
- **customer lane** - the piece's `.tgz` is uploaded to a stock CE instance with `POST /v1/pieces`.
- **piece branch** - `poc/orocommerce`: piece code only (record 4).
- **image branch** - `poc/orocommerce_prefixed-path-install`: embedding and image changes on top of
  everything on the piece branch; the Oro cloud image is built from it (record 4).
- **companion bundle** - the Oro-side bundle that provisions the integration (AP user, project,
  connection, platform API key) and pins the default piece version.
- **fork owner** - the role that owns the fork: the image branch and its embedding patches, upstream
  syncs, and merges into the image branch (record 11).
- **piece maintainer** - the role that owns everything under `packages/pieces/community/orocommerce/`:
  the package name, the version, code quality and review of piece changes (record 11).
