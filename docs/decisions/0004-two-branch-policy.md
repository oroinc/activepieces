# 4. Two branches: piece code on `poc/orocommerce`, embedding and image on `poc/orocommerce_prefixed-path-install`

Date: 2026-09-07 (policy stated 27 Aug 2026 by the branch owner and 3 Sep 2026 by one maintainer, Slack)
Status: accepted
Evidence: Slack 27 Aug, 3 Sep 2026; `FORK-UPDATE.md` §1; an internal run log, 7 Sep 2026

## Context

The fork carries two kinds of change to upstream Activepieces. The piece
(`packages/pieces/community/orocommerce/`) is self-contained and is also proposed upstream (#13859). The
embedding work — running Activepieces under Oro's URL prefix, the Oro Docker image (`Dockerfile.oro`,
`.env.oro.example`) — touches core files and will never go upstream in this form.

Mixing them on one branch makes the upstream proposal impossible to keep clean, and makes every upstream
sync a fight over unrelated conflicts.

## Decision

- `poc/orocommerce`: piece code only. Every piece PR targets it. Upstream syncs land here first.
- `poc/orocommerce_prefixed-path-install`: branched from the above; embedding and image changes only. It
  must always contain everything on `poc/orocommerce`. The Oro cloud image is built from this branch and
  no other — `Dockerfile.oro` exists only here.
- The invariant is checked before every release:
  `git log origin/poc/orocommerce ^origin/poc/orocommerce_prefixed-path-install --oneline` must be empty.
- Bringing the image branch up to date is done by merging `poc/orocommerce` into it via a pull request to
  its owner. No direct pushes, no rebases of either branch.
- Documentation about the fork (`docs/`) lives on `poc/orocommerce` unless the owner asks otherwise.

## Consequences

- The invariant was found broken on 7 Sep 2026: the image branch had not moved since 10 Aug and was 141
  commits behind (an upstream sync plus 19 piece commits including webhook signing). An image built that
  day would have shipped the unsigned 0.2.0 piece. The merge was prepared
  (`merge/orocommerce-into-prefixed-path-5fbed5d`, fork PR #8, closed pending the owner's decision).
- Anything that is neither piece nor embedding — build tooling fixes, CI — has no obvious home. Default:
  upstream if it applies there, otherwise the image branch, never `poc/orocommerce`.
- Whoever bumps the piece is responsible for opening the sync PR to the image branch in the same release;
  otherwise the two lanes ship different code.
- **This repository is public.** Documentation here — including these records and pull-request text —
  carries no ticket keys, internal page ids, person names, internal deployment names, hostnames or
  unresolved security findings. Those stay in the internal tracker; the repo uses neutral wording.
