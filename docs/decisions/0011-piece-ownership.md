# 11. Give the piece maintainer ownership of the piece

Date: 2026-09-23
Status: accepted
Evidence: a message from the fork owner to the piece maintainer, 23 Sep 2026
Affects: [4](0004-two-branch-policy.md), [7](0007-piece-package-name.md), [10](0010-piece-versioning-1-0-0-and-semver.md)

## Context

Until now the fork owner held every decision about the fork, the piece included. Records 7 and 10 left
two piece-level questions with no named decider: record 7 (the package name) has been open since it was
written, waiting on an answer, and record 10 set the versioning rule without saying who applies it.
The fork owner has handed these to the person who maintains the piece.

## Decision

The piece maintainer owns everything under `packages/pieces/community/orocommerce/`:

- **The package name.** Record 7 is decided by the piece maintainer. It no longer waits on the fork owner.
- **The version.** The piece maintainer applies record 10: decides major, minor or patch for each change,
  and cuts the release (the commit, the two hashes and the attached file on the tracking ticket).
- **Quality and structure of the TypeScript code** - layout, conventions, tests, lint and i18n checks.
- **Review of every change to that code.** A pull request that touches the piece needs the piece
  maintainer's approval before it merges into `poc/orocommerce`.

Outside that folder the piece maintainer owns only the piece sections of `docs/FORK-UPDATE.md` (§2
release, §4 piece change, §5 install, §6 re-pin) and the piece's own lines in `bun.lock` that a version
bump changes. A pull request into `poc/orocommerce` may not change core files or CI workflows (record 4);
those stay with the fork owner. The fork's documentation under `docs/` is the one other exception outside
the piece folder, as record 4 already allows.

The fork owner keeps everything else: the image branch and its embedding patches, `Dockerfile.oro` and
`.env.oro.example`, upstream syncs (record 6), and merging into the image branch.

## Consequences

- Record 4's rules are unchanged: piece pull requests still target `poc/orocommerce`, and the image branch
  is still brought up to date by a pull request to its owner. Two things change in practice: who approves
  piece pull requests, and who opens the sync pull request to the image branch - record 4 gives that to
  whoever bumps the piece, which is now the piece maintainer.
- Record 7 now has an owner. Its deadline is still the one it states: before the first install on any
  instance that will keep its flows.
- An upstream sync that changes code the piece bundles (the framework packages are inlined into the piece
  at build time) can change the piece artifact without touching the piece folder. The fork owner runs the
  sync; the piece maintainer decides whether the result needs a new piece version.
- Not decided here: who reviews a pull request the piece maintainer writes. Until that is settled, such a
  pull request asks the fork owner for review as before.
- Not yet enforced by the repository. Nothing in the repository settings (a `CODEOWNERS` entry for the
  piece path, branch protection) reflects this record yet; until it does, the rule holds by agreement.
