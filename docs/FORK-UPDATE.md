# Updating the OroCommerce piece and the Activepieces fork

How the `orocommerce` piece is built, released, installed and upgraded, and how this fork tracks upstream
Activepieces. Written 7 Sep 2026 from a live run on stock CE 0.88.1 (the tracking ticket, run log of that date).
Anything marked **(unverified)** has not yet been executed by following this document — the first person
to do so should replace the mark with what happened.

Why things are the way they are: see [docs/decisions](decisions/README.md).

## 1. The two branches

| Branch | Contains | Rule |
| --- | --- | --- |
| `poc/orocommerce` | The piece only: `packages/pieces/community/orocommerce/` | Piece changes land here and only here |
| `poc/orocommerce_prefixed-path-install` | Everything above **plus** the embedding patches and `Dockerfile.oro` | Embedding changes land here and only here; it must always contain all of `poc/orocommerce` |

Upstream is `activepieces/activepieces`. Our piece is also proposed upstream as PR #13859.

Check the second rule before every release:

```
git fetch origin
git log origin/poc/orocommerce ^origin/poc/orocommerce_prefixed-path-install --oneline
```

Empty output is the only acceptable result. Anything listed is piece code the cloud image does not have.
(On 7 Sep this check listed 141 commits; the image branch had not moved since 10 Aug. 19 of them touched
`packages/pieces/community/orocommerce/` — PRs #4, #5 and #6 and the 0.3.0 bump — and the other 122 were
the upstream sync those were built on top of, which carried the version string from 0.87.0 to 0.88.1. An
image built that day would have shipped a pre-signing 0.2.0 piece.)

## 2. What a release is

A release of the piece is a `.tgz` built from one commit on `poc/orocommerce`, identified by three things
recorded together on the tracking ticket: the commit, the sha256 of the `.tgz`, and the sha256 of
`package/src/index.js` inside it. Activepieces stores the archive byte-for-byte (verified 7 Sep: the
archive read back from `file.data` hashed identically), so the outer sha256 is enough to identify what an
instance is running.

Current release: **1.0.0** = commit `feb45cdf70`, `head-feb45cd-1.0.0.tgz`,
sha256 `ced1e853f15717b11e8c6282d619c3e0443780c7035c4ced69fbc35915a0663c`, 67 144 bytes,
`src/index.js` `11ad8876e985a4886be58645474ff5a442eefe4317611ae33feed922faef6cff`.

Version rule: from 1.0.0 the piece follows semantic versioning, judged from the consumer's side — major
for a change that breaks an existing flow, minor for new actions, triggers or optional properties, patch
for fixes that leave the contract intact ([record 10](decisions/0010-piece-versioning-1-0-0-and-semver.md)).
Versions must still be plain `x.y.z` — Activepieces rejects prerelease suffixes at install.

Renaming the package (`@activepieces/piece-orocommerce`) creates a new piece identity and orphans every
flow built with the old name. Do not rename without a decision on the tracking ticket.

## 3. Two ways the piece reaches an instance

**Cloud lane (our image).** Two separate mechanisms, on the prefixed-path branch, often confused:

- `Dockerfile.oro` **bakes the piece in as a workspace package**. Its builder stage compiles the piece
  along with the app (`npx turbo run build --filter=… --filter=@activepieces/piece-orocommerce`), and the
  step that strips the community pieces exempts it (`! -name orocommerce`, alongside slack, square,
  facebook-leads and intercom), so `packages/pieces/community/orocommerce` survives into the runtime
  image's `./packages`. `Dockerfile.oro` does **not** mention `AP_DEV_PIECES`.
- `.env.oro.example` **sets `AP_DEV_PIECES=orocommerce`**, and that is what makes the baked-in package
  load as an in-memory dev piece — no database row; its version is whatever the branch's `package.json`
  says. The same file sets `AP_PIECES_SOURCE=CLOUD_AND_DB` and `AP_PIECES_SYNC_MODE=OFFICIAL_AUTO`.

So the image only carries the piece because of the Dockerfile, and only serves it as a dev piece because
of the env file; changing either one changes the cloud lane. Changing the piece means rebuilding the image.

**Customer lane (stock Community Edition image).** The `.tgz` is uploaded to the instance with
`POST /v1/pieces` as a `CUSTOM` / `ARCHIVE` piece. **Nothing in the Oro bundle does this.**
`oro:integration:activepieces:setup` provisions the Oro API user, OAuth application, AP user/project/
connection and the platform API key, and pins the piece version — it never installs the piece. The upload is
a separate step that the deployment runbook has to carry (§5).

**The upload endpoint exists only on Community Edition.** `communityPiecesModule` is registered solely in
the CE branch of `app.ts`; Enterprise and Cloud editions have no `POST /v1/pieces`. A customer on EE cannot
take the customer lane at all — they need the image.

Either way, a flow pins the **exact** piece version. After any version change every flow that uses the
piece must be re-pinned (§6); nothing upgrades automatically.

## 4. Procedure — piece change (Case 1)

1. Branch from `poc/orocommerce`. Change files under `packages/pieces/community/orocommerce/` only.
2. Bump `package.json` `version` if §2's rule says so.
3. Build and pack. Verified 7 Sep 2026 against `5fbed5df94`: these commands reproduced the released
   artifact byte-for-byte — `09194f3f…`, 67 144 bytes, `src/index.js` `11ad8876…` — twice on one machine
   (macOS 26.5.2 arm64, Node 24.13.0, bun 1.3.14, turbo 2.9.14, esbuild 0.28.1). The build is
   deterministic; the outer `.tgz` hash is stable, not just the inner `index.js`. 1.0.0 reproduced the
   same way on the same machine: two builds from clean worktrees of `feb45cdf70` were byte-identical at
   67 144 bytes.
   ```
   bun install --frozen-lockfile
   mkdir -p dist/packages/cli
   ln -sfn ../../../packages/cli/node_modules dist/packages/cli/node_modules
   npx turbo run bundle --filter=@activepieces/piece-orocommerce --force
   cd packages/pieces/community/orocommerce/dist && npm pack
   ```
   The previously documented `npx nx build pieces-orocommerce` does not work and never did on this
   commit: there is no nx in the repo — no `nx.json`, no nx dependency, no `node_modules/nx` — and the
   command dies with “The current directory isn't part of an Nx workspace.” The piece's `project.json` is
   a dead nx leftover; the build runs on turbo. The artifact is not a `tsc` emit either. `turbo run bundle`
   chains the piece's `build` (`tsc -p tsconfig.lib.json`), the CLI's `build`, and then the CLI's
   `pieces bundle`, which esbuilds `src/index.ts` into one minified self-contained `dist/src/index.js`,
   rewrites the manifest (`main: ./src/index.js`, `dependencies: {}`, and a `files` allow-list) and prunes
   `dist/` to exactly the eight files that get published. `npm pack` therefore runs in the piece's own
   `dist/`, not in `dist/packages/…`.

   Two rules follow, and neither is optional:

   - **Create the symlink `dist/packages/cli/node_modules` → `../../../packages/cli/node_modules` before
     bundling.** The `bundle` script runs `node ../../../../dist/packages/cli/src/index.js`, and bun does
     not hoist the CLI's dependencies — they install into `packages/cli/node_modules/` — so the compiled
     CLI cannot resolve `commander` from under `dist/` and the step dies with `MODULE_NOT_FOUND`. Without
     the symlink the piece never bundles at all.
   - **Pass `--force`, and check the tarball afterwards every time.** The `bundle` task declares `outputs`
     (`dist/index.bundle.js`, `dist/package.json`) that the bundler never writes, so turbo treats a
     rebuild with unchanged inputs as a cache hit, skips esbuild, and leaves the `tsc` `index.js` in
     place. `npm pack` then packs that instead of the bundle: a **~1 KB** tarball with no piece code in
     it, no warning and no error. The artifact is the only place this is visible, so confirm the `.tgz` is
     **~67 KB** (67 144 bytes for both 0.3.0 and 1.0.0) and hash both it and `package/src/index.js`
     against the release record in §2 on every build.

   If the outer `.tgz` hash differs but `package/src/index.js` matches, the difference is archive metadata,
   not code — record both hashes and say so.
4. Record commit + both hashes on the tracking ticket and attach the `.tgz`. `npm pack` names it
   `activepieces-piece-orocommerce-<version>.tgz` (from the package name and version, not from the
   commit); rename it `head-<short-sha>-<version>.tgz` so the artifact identifies the commit it came from.
5. Open a PR into `poc/orocommerce`; merge.
6. Merge `poc/orocommerce` into `poc/orocommerce_prefixed-path-install` (a PR, not a direct push — the
   embedding branch has its own owner). Re-run the §1 check; it must be empty.
7. Cloud lane: rebuild the image from the prefixed-path branch and deploy it. Customer lane: run §5 on each
   instance.
8. Re-pin every flow (§6).
9. Update the Oro companion default (`activepieces_orocommerce_default_piece_version` in the bundle's
   `services.yml`, and its README line) and the internal deployment page's "piece default".

## 5. Installing the tarball on a stock CE instance (customer lane)

### Which path applies

Sort yourself before reading anything else:

| | Cloud lane (our image) | Customer lane (stock CE) |
| --- | --- | --- |
| How the piece gets in | baked into the image as a workspace package by `Dockerfile.oro` | uploaded as a `.tgz` via `POST /v1/pieces` |
| Served as | in-memory dev piece, no database row | `CUSTOM` / `ARCHIVE` piece, row in `piece_metadata` |
| Version comes from | the branch's `package.json` | the `pieceVersion` form field |
| To change the version | rebuild and redeploy the image | rerun this section |
| `POST /v1/pieces` | not used | Community Edition only |

Cloud lane — you are building the image from the prefixed-path branch: there is nothing to install, and
the two mechanisms behind that column are §3. Enterprise: neither column applies, because the upload
endpoint is CE-only (§3); an EE customer needs the image. Customer lane — a stock CE instance, whether a
testbed or an on-premise customer: the rest of this section.

**The Oro bundle does not upload the piece** (§3): the setup command pins the version but never installs.
This section is that separate step.

### Preconditions

In order — each one cost hours when skipped.

1. **A worker is running and connected** ("Connected to API server via Socket.IO" in its log). Without one
   the install hangs about 300 s and fails with `ENGINE_OPERATION_FAILURE`.
2. **`AP_FRONTEND_URL` is the one URL reachable both from the host and from inside the containers.** Workers
   download bundles and open Socket.IO through it, and it is the base of every webhook URL the piece
   registers in Oro.
3. **A platform API key (`sk-…`) exists.** On CE there is **no API endpoint** to create one —
   `authenticate.ts` accepts `sk-` keys via `apiKeyService` with no edition guard, but CE registers no
   `api-keys` routes. The only way to mint one is a row in `api_key`, which is exactly what the Oro setup
   command writes: `id` (21-char NanoId), `created`/`updated` (timestamptz), `displayName`, `platformId`,
   `hashedValue` = hex SHA-256 of the full key, `truncatedValue` = last 4, `lastUsedAt` NULL. Key format:
   `sk-` + 61 NanoId chars (`A-Za-z0-9`), 64 total. A key whose hash is not in the table gets 401 — and so
   does a key whose insert has not been committed, with no useful error either way. Commit before calling.
4. **A platform exists.** On a fresh 0.88.1 instance, sign-up does **not** create one. It returns an
   `ONBOARDING` token; `POST /v1/platforms {"name": …}` with that token creates platform + project and
   rotates the token.

### The install

```
curl -X POST "$AP_URL/api/v1/pieces" \
  -H "Authorization: Bearer $SK_KEY" \
  --form-string 'packageType=ARCHIVE' \
  --form-string 'scope=PLATFORM' \
  --form-string 'pieceName=@activepieces/piece-orocommerce' \
  --form-string 'pieceVersion=1.0.0' \
  -F 'pieceArchive=@head-feb45cd-1.0.0.tgz;type=application/gzip'
```

- `--form-string` for every scalar field, and **mandatory** for `pieceName`: it starts with `@`, and `-F`
  would make curl read a file named `activepieces/piece-orocommerce` and fail with `HTTP 000` before any
  request is sent.
- `scope` accepts only `PLATFORM`. `pieceVersion` is a plain `x.y.z` (§2).
- **Name and version come from the form fields, not from the tarball.** Mismatched fields install a piece
  that claims a version its code does not match, with no complaint from either side.
- 201 = installed. 409 `piece_metadata_already_exists` = this exact name+version is already there, which
  is fine for the piece — but the archive is saved before the duplicate check, so **every 409 leaves an
  orphan 67 KB `PACKAGE_ARCHIVE` row in `file`**. Check what is installed first rather than retrying blindly.
- Never `DELETE` a piece or a version. Versions cannot be removed individually and flows pin them.

### Listing what is installed

`GET /api/v1/pieces/@activepieces%2Fpiece-orocommerce` returns a **single** metadata object — the latest
version, or the one named by an optional `?version=` — not a list, and CE has no per-piece versions route.
To see every installed version, use the registry and filter by name:

```
GET /api/v1/pieces/registry?release=<ap version>&edition=ce
```

Both query parameters are mandatory (the schema marks neither optional); the response is `{name, version}`
entries for the whole registry, so filter it by `@activepieces/piece-orocommerce` yourself.
Source-read at CE 0.88.1, **not yet run live**.

### Verify

The `piece_metadata` row has `pieceType=CUSTOM` and `packageType=ARCHIVE`, under the unique key
`(name, version, platformId)`, and the piece detail endpoint shows **11 actions and 1 trigger**
(`oro-webhook-event`).

## 6. Re-pinning flows after a version change

Flows pin the exact version and nothing upgrades automatically, so every flow using the piece needs this
after any version change. Per flow, two calls to `POST /api/v1/flows/{id}`:

1. `{"type":"UPDATE_TRIGGER","request":{ …the whole trigger object… }}` — the schema requires the full
   trigger (`name`, `type: PIECE_TRIGGER`, `displayName`, `valid`, `lastUpdatedDate`, `settings` with
   `pieceName`, `pieceVersion`, `triggerName`, `propertySettings`, `input`). Only `pieceVersion` changes;
   everything else is echoed back unchanged. `pieceType`, `packageType`, `inputUiInfo` are not part of the
   schema and are dropped.
2. `{"type":"LOCK_AND_PUBLISH","request":{}}`.

Prefer this API path over upgrading in the UI: the UI upgrade resets the connection and topic inputs.

### The `signDeliveries` trap

Echoing the whole trigger object back with only `pieceVersion` changed is exactly the operation that carries
an old explicit `signDeliveries: false` forward — and leaves that flow unsigned after the re-pin.

The prop is a checkbox with `defaultValue: true`, but `onEnable` suppresses the secret only on a strict
`=== false`. **A missing key signs; only an explicit `false` does not.** So a flow whose stored `input`
still carries `signDeliveries: false` gets re-pinned to the new version and silently stays unsigned: the new
registration is created without a secret, and because `run()` keys off the secret in the flow's store rather
than off the prop, it finds none and passes every delivery through unverified. Echoing the trigger object
back faithfully preserves exactly that.

A migration that re-pins flows in bulk therefore has to **decide** whether to force `signDeliveries` rather
than preserve it. Echoing it back is the wrong default for any flow that is meant to end up signed; the
decision has to be made deliberately and recorded, not inherited from whatever the flow happened to store.

### Checking the registration in Oro

The trigger's `onEnable` deletes the flow's existing webhook row and creates a new one with a new secret
(Oro's webhook secret can only be set on create). Check afterwards in
`oro_integration_webhook_producer_settings`, filtering on the **flow id**, not on the full URL:

```sql
SELECT id, notification_url, length(secret)
FROM oro_integration_webhook_producer_settings
WHERE notification_url LIKE '%<flowId>%';
```

Filter by flow id because `notification_url` is built on `AP_FRONTEND_URL`. If that base has changed, a
surviving old registration sits under the *old* URL, and a query scoped to the current full URL returns
exactly one row whether or not the stale registration is still live — a false pass. The flow id is stable
across base-URL changes; the URL around it is not.

Expect **exactly one row**, with `length(secret) = 108`.

- Two rows means an old registration is still live alongside the new one — and if it predates 0.3.0, it is
  unsigned.
- `length(secret) = 108` is the signing case: the encrypted form of the 64-hex-char secret the piece
  generates. `length(secret) = 24` is the encrypted form of an *empty* secret, i.e. no signing.
- `secret` is nullable, but a signing piece never writes NULL, so `IS NULL` is the wrong test — compare the
  length.

### What the piece checks on delivery

Oro sends two headers, captured live on 3 Sep 2026: `Webhook-Signature`, a 64-hex-character HMAC-SHA256
digest of the body, and `Webhook-Signature-Algorithm: HMAC-SHA256`.

The piece reads **only** `webhook-signature`, and compares it against a bare hex HMAC-SHA256 of the raw body
— no `sha256=` prefix. It never reads the algorithm header: the string `algorithm` does not occur anywhere
in the package, so the algorithm Oro declares is neither checked nor honoured and SHA-256 is simply assumed.
If Oro ever changes it, the piece will not notice; it will just start rejecting every delivery.

A missing or mismatched signature produces HTTP 200, no run, and a single `discarded` warning line in the
log — so a flow that is discarding every delivery looks healthy from the outside.

### Failure modes (§5 and §6)

| Symptom | Cause |
| --- | --- |
| install hangs ~300 s, then `ENGINE_OPERATION_FAILURE` | no worker connected (§5) |
| `HTTP 000`, nothing sent on the wire | `-F` used for `pieceName` instead of `--form-string` |
| 401, no useful error | key hash not in `api_key`, or the insert was never committed |
| 409 `piece_metadata_already_exists` | that name+version is already installed; each attempt leaves an orphan `PACKAGE_ARCHIVE` row in `file` |
| installs cleanly, but runs cannot find the piece code | ~1 KB tarball from a cached build — rebuild with `--force` (§4) |
| flow still behaves as it did before | flow not re-pinned |
| two rows in `oro_integration_webhook_producer_settings` for one flow | stale registration still live; a pre-0.3.0 one is unsigned |
| `length(secret) = 24` | empty secret — the registration is not signed |
| re-pinned flow still unsigned, deliveries unverified | an explicit `signDeliveries: false` echoed back by the re-pin |

## 7. Procedure — new upstream Activepieces release (Case 2) **(unverified as a whole)**

1. `git remote add upstream https://github.com/activepieces/activepieces` if absent; `git fetch upstream --tags`.
2. On `poc/orocommerce`: `git merge <tag>`. Expect zero conflicts. A conflict outside
   `packages/pieces/community/orocommerce/` means piece-only policy was broken; fix the policy.

   Note: steps 1–2 are not how this fork has actually synced. Every sync so far — **44** merges between
   29 Jan and 20 Aug 2026, all by one maintainer — merged the fork's own `origin/main` at an **untagged**
   tip, and not one landed on a release tag. `git describe` on each merged commit gives an offset; the most
   recent, `cd36237260` of 20 Aug 2026, gives `0.86.3-rc.2-451-g71dd1758dc`, and tag `0.88.1` is not in
   that history at all (4 commits in the tag are missing from it, 83 extra are present). Whether syncs
   should go through `origin/main` or upstream tags is an open question for the branch owner; until it is
   answered, treat steps 1–2 as a proposal rather than the procedure.
3. On `poc/orocommerce_prefixed-path-install`: `git merge poc/orocommerce`. Conflicts are possible in the
   embedding patches and `Dockerfile.oro` — they are the only files the fork changes outside the piece, so
   they are the only ones that can conflict — but they are not to be expected as a matter of course. The
   7 Sep merge, which carried the upstream 0.87.0 → 0.88.1 sync, had exactly one conflict: `bun.lock`, two
   hunks (the piece's `version`, and an added `vitest` devDependency), both resolved to the incoming side.
   Every embedding file and `Dockerfile.oro` merged clean.
4. Bring up a stock CE instance on the new tag and repeat the 7 Sep proof (the tracking ticket results table).
   Re-check first the facts everything else rests on: `sk-` keys still authenticate on CE without an endpoint;
   `POST /v1/pieces` still exists on CE; `PieceScope` still only `PLATFORM`; the trigger signs unless
   `signDeliveries === false`; sign-up still returns `ONBOARDING`.
5. Do not bump the piece unless the piece changed. Rebuild the image regardless.
6. Update the internal deployment page's "tested against" version.

## 8. If the piece merges upstream (Case 3)

The cloud lane's two mechanisms (§3) both become redundant — in the same PR that takes the upstream tag
containing the piece, remove `AP_DEV_PIECES=orocommerce` from **`.env.oro.example`** (not from
`Dockerfile.oro`, which never set it), and drop the piece's build filter and its `! -name orocommerce`
prune exemption from `Dockerfile.oro`, so the image picks the piece up from upstream like any other. The
customer lane then installs from the registry like any official piece and §5 is no longer needed. The
package name must be settled before this happens (§2).

## 9. Do not put in this file

This repository is public. Keep out of it:

- Hostnames, IP addresses or ports of any instance, and any identifier of a test rig.
- Keys, secrets, tokens or connection strings, redacted or otherwise.
- Issue-tracker keys, wiki page ids and internal deployment names — refer to "the tracking ticket", "the
  deployment page", "an internal deployment".
- The names of individual people — refer to the role: "the branch owner", "the maintainer".
- Unfixed defects and security findings, and unannounced commercial or packaging decisions. Those live on
  the tracking ticket, not here.
