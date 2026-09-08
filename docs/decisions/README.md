# Decisions

Architecture decision records for the Oro fork of Activepieces and the OroCommerce piece. One file per
decision; short; each names the evidence it rests on and, where relevant, when to re-check it. A record is
never edited to say something different — a changed decision gets a new record that supersedes the old one.

Start with [8](0008-why-fork-same-origin-embedding-and-ce-auth.md) — it explains why the fork exists at
all; everything else follows from it.

| # | Decision | Status |
| --- | --- | --- |
| [8](0008-why-fork-same-origin-embedding-and-ce-auth.md) | Why Oro maintains a fork: same-origin path-prefix embedding and CE embed auth | accepted; no-custom-image alternative parked |
| [1](0001-distribute-piece-as-archive-not-registry.md) | Distribute the piece as an uploaded archive, not via the npm registry | accepted |
| [2](0002-exact-version-pinning-and-re-pin.md) | Flows pin the exact piece version; every upgrade is an explicit per-flow re-pin | accepted |
| [3](0003-api-key-provisioning-by-direct-db-write.md) | On CE the platform API key is created by writing the `api_key` row directly | accepted; proper provisioning path open |
| [4](0004-two-branch-policy.md) | Two branches: piece code vs embedding/image | accepted |
| [5](0005-version-bump-rule-and-release-identity.md) | Bump only when installed outside a rig; release = commit + two hashes | **superseded by [10](0010-piece-versioning-1-0-0-and-semver.md)** |
| [6](0006-upstream-sync-via-origin-main-or-tags.md) | How the fork tracks upstream: `origin/main` or release tags | **open** |
| [7](0007-piece-package-name.md) | The piece's package name | **open** — more urgent since 10 |
| [10](0010-piece-versioning-1-0-0-and-semver.md) | 1.0.0 is the first customer release; semver from there | accepted |

Format: context → decision → consequences, with date, status and evidence at the top
(a light version of [MADR](https://adr.github.io/madr/)). Related procedure: [`../FORK-UPDATE.md`](../FORK-UPDATE.md).
