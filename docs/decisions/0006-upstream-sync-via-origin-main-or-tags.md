# 6. Upstream sync is phased by stage: `origin/main` during development, a release tag at release, `main` checked before each sync

Date: 2026-09-21 (opened 7 Sep 2026)
Status: accepted
Evidence: an internal run log, 7 Sep 2026; `git log --merges` on `origin/poc/orocommerce`; `git ls-remote`
on upstream, 21 Sep 2026; the fork owner's decision, 21 Sep 2026

## Context

The fork's `main` mirrors upstream. Between 29 Jan and 21 Sep 2026 there were 47 syncs into
`poc/orocommerce`, all by one maintainer, all merging `origin/main` at whatever commit it was on — never an
upstream release tag. The 20 Aug sync (`cd36237260`) put the branch at
`0.86.3-rc.2-451-g71dd1758dc`: near 0.88.1 but not equal to it (83 commits present that the tag lacks, 4
missing that it has).

Meanwhile the piece was proven on *stock* CE 0.88.1 images, which are built from the tag. So "the fork is
on 0.88.1" is approximate, and the image built from the fork is not the same code as the stock image the
customer lane was tested against.

`FORK-UPDATE.md` §7 described a tag-based sync (`git fetch upstream --tags`, merge the tag). It had never
been run in this fork.

Upstream offers two candidate refs per release and they are not interchangeable. A survey of upstream's
refs on 21 Sep 2026 found 394 tags, none `v`-prefixed, and 221 `release/*` branches, of which 165 carry a
plain `x.y.z` — 112 as `release/v<x.y.z>`, 53 as the older `release/<x.y.z>`. Compared against the
same-numbered tag, those 165 break down as **103 that differ, 55 that are equal, and 7 with no tag at
all**: divergence is the normal case, not the exception.

## Options

1. Keep syncing from `origin/main` (current practice). Cheap, frequent, always close to upstream head;
   but the fork never corresponds to a version customers run, and bugs fixed between head and the next tag
   may be present.
2. Sync from upstream release tags only. The fork's version string means what it says, the image matches
   the stock image the customer lane is tested on, and `FORK-UPDATE.md` §7 becomes the procedure; but syncs
   are larger and less frequent, and the piece branch may lag upstream fixes.
3. Both: tags on the image branch (what ships), `origin/main` on the piece branch (what goes upstream).
   Most precise, most bookkeeping.
4. Phased by project stage: `origin/main` while the integration is under development, switching to the
   upstream release line when preparing a release. Upstream problems arrive early, while there is still
   time to absorb them, and the version string means what it says by the time it matters; but the switch
   is a one-off step somebody has to remember, and until it happens the fork's distance from any named
   release is unbounded.

## Decision

Option 4, phased by project stage. Decided by the fork's owner, 21 Sep 2026.

While the integration is under development, sync from `origin/main`, so that upstream's changes and the
problems they bring surface here as early as possible. **Check that upstream `main` is healthy before each
sync.** What counts as healthy is not defined yet — no check is named and no pass condition is stated — so
for now this is a judgement the person syncing makes and records, not a command they run. The requirement
is not theoretical: upstream `main` was broken during the week of 14 Sep 2026, and two syncs were taken
from it that week regardless (`c932f4addd`, 14 Sep; `f3f39a6284`, 15 Sep).

When the integration is ready for release, sync from the upstream release tag `<x.y.z>`.

Upstream also publishes a `release/v<x.y.z>` branch per release, and it is a different commit from the
same-numbered tag more often than not — the tag is the ref this record chooses, not the one it fell back
to.

## Consequences

- During development the fork stays close to upstream head and upstream regressions surface here early,
  which is the point — but the fork still corresponds to no version a customer runs. Two artefacts both
  called "0.88.1" — our image and the stock image — differ by ~87 commits. Any discrepancy between
  cloud-lane and customer-lane behaviour must be checked against this first.
- Every development-phase sync now carries a precondition, and it is the weakest part of this record: a
  required step with no named check behind it. Whoever defines one should amend this record or supersede
  it. Until then a sync is not complete unless the judgement that `main` was healthy is written down.
- Syncing at release from the tag puts the fork on the same commit the stock CE image is built from, which
  is what makes the customer lane's results transferable. The `release/v<x.y.z>` branch would not give
  that, and picking it up by habit would quietly undo the reason for the switch.
- The move to the release tag is a single dated event, not a drift. Until it happens the release-phase
  half of `FORK-UPDATE.md` §7 stays unexecuted; whoever runs it first should record what happened.
- Re-check when the integration approaches release.
