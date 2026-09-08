# 6. How the fork tracks upstream Activepieces: `origin/main` or release tags

Date: 2026-09-07
Status: **open** — decision needed from the fork's owner
Evidence: an internal run log, 7 Sep 2026; `git log --merges` on `origin/poc/orocommerce`

## Context

The fork's `main` mirrors upstream. Between 29 Jan and 20 Aug 2026 there were 44 syncs into
`poc/orocommerce`, all by one maintainer, all merging `origin/main` at whatever commit it was on — never an
upstream release tag. The most recent (`cd36237260`, 20 Aug) put the branch at
`0.86.3-rc.2-451-g71dd1758dc`: near 0.88.1 but not equal to it (83 commits present that the tag lacks, 4
missing that it has).

Meanwhile the piece was proven on *stock* CE 0.88.1 images, which are built from the tag. So "the fork is
on 0.88.1" is approximate, and the image built from the fork is not the same code as the stock image the
customer lane was tested against.

`FORK-UPDATE.md` §7 describes a tag-based sync (`git fetch upstream --tags`, merge the tag). That is a
proposal; it has never been done in this fork.

## Options

1. Keep syncing from `origin/main` (current practice). Cheap, frequent, always close to upstream head;
   but the fork never corresponds to a version customers run, and bugs fixed between head and the next tag
   may be present.
2. Sync from upstream release tags only. The fork's version string means what it says, the image matches
   the stock image the customer lane is tested on, and `FORK-UPDATE.md` §7 becomes the procedure; but syncs
   are larger and less frequent, and the piece branch may lag upstream fixes.
3. Both: tags on the image branch (what ships), `origin/main` on the piece branch (what goes upstream).
   Most precise, most bookkeeping.

## Decision

Not taken. Asked of the fork's owner on 7 Sep 2026.

## Consequences (of leaving it open)

- Two artefacts both called "0.88.1" — our image and the stock image — differ by ~87 commits. Any
  discrepancy between cloud-lane and customer-lane behaviour must be checked against this first.
- `FORK-UPDATE.md` §7 stays marked as unverified until an option is chosen and run once.
