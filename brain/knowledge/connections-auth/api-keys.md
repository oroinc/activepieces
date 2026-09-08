---
icon: 🗝️
---

# API Keys

Long-lived platform service credentials (prefixed `sk-`) for machine-to-machine API calls on behalf of a platform. Each key is 64 chars, stored only as a SHA-256 hash — the plaintext is returned once on creation and never again. Gated by `platform.plan.apiKeysEnabled` (EE/Cloud).

### Entity
`api_key`: id, platformId (FK, CASCADE), displayName, hashedValue (SHA-256, looked up every request), truncatedValue (last 4 chars for display), lastUsedAt (updated on each authenticated request).

### How it works
- Endpoints under `/v1/api-keys`, all `platformAdminOnly`: `POST` (create, returns `ApiKeyResponseWithValue` with raw value once), `GET` (list, `SeekPage` without value), `DELETE /:id`.
- Service: `add` (generates key, stores hashed/truncated), `getByValue` (lookup by SHA-256 hash, updates `lastUsedAt` — used by auth middleware), `list`, `delete`.

### Gotchas
- Key generated with `secureApId(61)` + `sk-` prefix = 64 chars; hashed with `cryptoUtils.hashSHA256`.
- Plaintext is only ever available at creation time.
- **Only the management endpoints are EE-gated — authentication is not.** `apiKeyModule` is registered under CLOUD/ENTERPRISE only *and* gated on `apiKeysEnabled`, but `authenticateOrThrow` lives in the shared security layer and branches on the literal `Bearer sk-` prefix on every edition. So a `sk-` row written straight into `api_key` authenticates on stock CE (verified live on 0.88.1), even though CE ships no way to create one. An external provisioner can therefore mint a working credential by inserting a row byte-compatible with `generateApiKey()` — `sk-` + 61 chars, stored as its `hashSHA256` hex digest.
- **`platformAdminOnly` is not admin-only for a SERVICE principal.** `assertPlatformIsOwnedByCurrentPrincipal` (`core/security/v2/authz/authorize.ts`) opens with `if (principal.type === PrincipalType.SERVICE) return`, so an API key admitted by a route's `allowedPrincipals` skips the platform-owner check entirely — no AP user need exist. Read `platformAdminOnly([USER, SERVICE])` as "platform admins, or any key on that platform".
- **A `api_key` row that is inserted but not yet committed authenticates as 401.** The lookup runs on Activepieces' own connection at READ COMMITTED, so a row still inside the writer's transaction is invisible and comes back `{"code":"AUTHENTICATION","params":{"message":"invalid api key"}}` — nothing in the response hints that the key is valid and merely uncommitted. Anything provisioning a key inside a transaction has to commit before using it.
- **Schema validation runs before authentication.** A malformed request carrying a bad key returns `400 FST_ERR_VALIDATION`, not 401, so "not 401 ⇒ the credential works" is unsound. Probe credentials with a request that would otherwise validate. A missing `Authorization` header yields the `UNKNOWN` principal and a **403** at authorization, not a 401.

### Key files
Entry point: `apiKeyModule`, registered on the Fastify app in `packages/server/api/src/app/app.ts`.

- `packages/server/api/src/app/ee/api-keys/` — the whole backend slice: module (routes + feature gate), TypeORM entity, service
- `packages/server/api/src/app/core/security/v2/authn/` — where `getByValue` is called to authenticate an incoming key
- `packages/core/shared/src/lib/ee/api-key/` — shared `ApiKey` types and request/response contracts
- `packages/web/src/features/platform-admin/api/api-key-api.ts` — frontend API client
- `packages/web/src/features/platform-admin/hooks/api-key-hooks.ts` — React Query hooks
- `packages/web/src/app/routes/platform/security/api-keys/` — platform admin UI page and create dialog

Paths verified 2026-07-17.
