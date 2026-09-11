# 3. On Community Edition the platform API key is created by writing the `api_key` row directly

Date: 2026-09-07
Status: accepted as the only available mechanism; a proper provisioning path remains an open decision
(owner and date not set)
Evidence: an internal run log, 7 Sep 2026; `authenticate.ts`, `app.ts` in the fork at `5fbed5df94`;
the Oro bundle's provisioning command

## Context

Everything the Oro bundle does against Activepieces server-side authenticates with a platform API key
(`sk-…`). Activepieces authenticates such a key by hashing it and looking the hash up in `api_key`; the
lookup code is shared by all editions and has no edition guard. But Community Edition registers no
endpoint to *create* an API key — that route set lives in the enterprise module only. A key whose hash is
not in the table is rejected (401), so the key cannot simply be "forged".

The Oro setup command therefore writes the row itself through Doctrine:
`id` (21-char NanoId), `created`/`updated` (timestamptz), `displayName`, `platformId`, `hashedValue` (hex
SHA-256 of the full key), `truncatedValue` (last 4), `lastUsedAt` (NULL). Key format: `sk-` + 61 NanoId
characters (`A-Za-z0-9`), 64 characters total. Oro keeps the key encrypted in system config
(`oro_activepieces_integration.api_key`, AES-256-CBC keyed by `kernel.secret`). Reproduced by hand on a
clean CE 0.88.1 on 7 Sep 2026: the inserted key authenticated; a control key not in the table did not.

The same command also writes `app_connection`, `user`, `project` and `platform.pinnedPieces` directly. The
"read-only" AP database connection used for this blocks DDL only, not DML.

## Decision

Accept the direct `api_key` write as the provisioning mechanism for CE, and document the exact row shape
so it is reviewable. Record the five direct-write surfaces as the specification any future provisioning
path must replace.

## Consequences

- Provisioning is coupled to Activepieces' schema. Any AP version bump must re-check the `api_key`,
  `app_connection`, `user`, `project` and `platform` columns before the bundle is pointed at it.
- The key is readable by anyone with Oro DB read plus the app secret, or console access — same as any
  Oro-stored credential; nothing extra.
- Two follow-ups on the provisioning command are open and tracked internally with the integration ticket:
  making it safe to re-run, and handling the credentials it emits. Owner unassigned.
- On EE, an API-key endpoint exists; whether the bundle should use it there instead of the DB write is
  part of the open provisioning decision.
- Three of the five direct writes are avoidable even on CE (findings of 21 Aug 2026): CE exposes
  `POST /v1/projects`, `POST /v1/app-connections` (upsert) and `POST /v1/authentication/sign-up` — the last
  being the only way to create a user on CE. Only the API key has no endpoint. The catch is bootstrap: a
  machine caller would normally authenticate those calls with an API key, which CE cannot mint, so a
  provisioning rewrite on CE would have to run as a signed-in user rather than a service principal. That
  trade-off is the substance of the open decision.
