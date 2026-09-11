# 8. Why Oro maintains a fork of Activepieces: same-origin path-prefix embedding and Community-Edition embed auth

Date: 2026-09-07 (decision in place since fork PR #1, 10 Aug 2026; topology decided on the internal
deployment page, v3 26 Jun 2026)
Status: accepted; the alternative that would shrink the fork is parked (one maintainer, 2 Sep 2026)
Evidence: internal analysis of the fork's patches and of the embedding and provisioning behaviour, held
with the integration ticket; the internal deployment page;
`.agents/skills/prefixed-path-rebase/SKILL.md` in the fork

## Context

The OroCommerce piece does not need a fork: it is a self-contained package that installs on a stock image
(ADR 1). The fork exists for one reason — embedding the Activepieces builder inside the Oro back-office —
and that runs into two limits at once.

**Activepieces' own embedding is enterprise-only.** Upstream's `/embed` route, the embed SDK hand-off and
the endpoint that turns an external token into an AP session (`managed-authn`) are registered only in the
Cloud and Enterprise editions. On Community Edition there is no supported way to open the builder inside
another application as an already-signed-in user.

**The target deployment cannot allocate a separate hostname for the instance.** So the instance has to be
reachable under a path on the Oro application's own origin (the "no separate subdomain" decision, the internal
deployment page). Upstream Activepieces assumes it owns the origin root: the SPA, its API client, Socket.IO
path, locale loading, sign-in redirects and the server's SPA fallback all build URLs from `/`.

Same origin is not just a constraint here; it is what makes the CE workaround possible. Activepieces
stamps `Content-Security-Policy: frame-ancestors 'self' …` on every response, so a same-origin iframe is
allowed with no allow-list configuration at all. And a same-origin page can hand the embedded builder an
AP session through shared browser storage — the only hand-off available when the token-exchange endpoint
does not exist.

## Decision

Maintain a fork with two kinds of change, kept on one branch (`poc/orocommerce_prefixed-path-install`,
ADR 4) and shipped as a custom image (`Dockerfile.oro`):

1. **Path-prefix support.** The web app derives a base path from the document's `<base href>` and uses it
   for routing, API, Socket.IO, locales and redirects (eleven frontend files, one new helper), the Vite
   build takes a configurable base, and the API server's SPA fallback rewrites `<base href>` at runtime
   from `AP_ASSETS_PREFIX` so one image serves any prefix. Workers keep an internal, unprefixed
   `AP_FRONTEND_URL`.
2. **A CE embed route.** A new `/embed-ce` page accepts the same init message the upstream embed SDK sends,
   but instead of exchanging a token it picks up an AP session that the Oro side has already established
   for the provisioned user on the shared origin. The Oro bundle provisions that user, project and
   connection (ADR 3).

Nothing under `packages/server/worker` or `packages/engine` is patched; the only server-side change is the
SPA fallback in `server.ts`.

## Consequences

- **The fork is a maintenance liability by construction.** It must be re-synced with upstream on every
  release (ADR 6), the image branch must be kept in step with the piece branch (ADR 4 — found 141 commits
  behind on 7 Sep 2026), and every upstream change to the web app's URL handling is a potential conflict.
- **The server-side patch is eliminable; the frontend patches are not.** The 20 Aug audit found that if
  a reverse proxy served a CI-built static `dist/` with the absolute prefix baked in and reproduced five
  behaviours of the stock server (SPA fallback, cache headers, `<base href>`, prefix-stripping proxy for
  `/api` and websockets, CSP), the stock image could serve `/api/*` unchanged and `Dockerfile.oro`,
  `server.ts` and the entrypoint patch would go away. The eleven frontend files still need patching at
  build time. This "no-custom-image" architecture is **parked** (2 Sep 2026); it would also have to solve
  how the OroCommerce piece reaches a stock image (ADR 1 answers that for CE).
- **The auth half cannot be removed on CE.** The hand-off could move from shared storage to the embed
  SDK's postMessage — the transport exists in CE and the fork's route already listens for it — but that
  only changes delivery. Minting a valid AP session for an Oro user still requires either the EE
  token-exchange endpoint or the Oro side creating the session itself. Moving to postMessage would,
  however, stop the path prefix from being load-bearing for authentication; it would remain a routing
  and asset concern only.
- Review findings on the session hand-off implementation are tracked internally with the integration ticket.
- **Re-check this decision when:** the target deployment can allocate a separate hostname; upstream opens
  `managed-authn` or an equivalent to CE; or an EE licence is on the table (which would make upstream's own
  embed the obvious path and reduce the fork to the piece alone).
