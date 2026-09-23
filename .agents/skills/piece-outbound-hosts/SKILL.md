---
name: piece-outbound-hosts
description: Use when regenerating or updating scripts/piece-outbound-hosts.md — the mapping of which hostnames each Activepieces piece connects to, used to request an outbound-connection allowlist from cloud/infra for a customer's chosen piece list. Triggers on "update the outbound hosts doc", "regenerate the piece hostname mapping", "what hosts does piece X call", or when new pieces have been added since the doc was last generated.
---

# Piece Outbound Hostnames Mapping

Produces/maintains `scripts/piece-outbound-hosts.md`: every piece classified into one of three
buckets by how its hostname is determined, so infra can be asked for the right thing per piece —
a literal host, a wildcard on a known vendor suffix, or "ask the customer for their server URL".

**Tool:** `node scripts/piece-hostnames.js --all` scans every piece under
`packages/pieces/{community,core}/*/src` for literal `https?://` URLs and splits each into valid
hostnames vs. ones containing an unresolved `${...}`/`{...}` placeholder. It is the raw-data step
for Bucket 1 and part of Bucket 2 below — it does **not** do the classification or the dropdown
resolution; that's manual, per this skill. Run `node scripts/piece-hostnames.js <name>` for a
single piece, `--file names.txt` for a specific list, `--all` for the full sweep.

## The three buckets

A piece's hostname is determined one of three ways. Get the bucket wrong and the allowlist request
is either useless (asking for a literal that's actually customer-specific) or impossible to fulfill
(asking for a wildcard on a domain the customer's server doesn't share).

| Bucket | How the host is determined | Ask infra for |
|---|---|---|
| 1. Static | Literal string in source, always the same | The literal hostname(s) |
| 2. Dynamic | Vendor-fixed domain + a runtime piece (subdomain, region, account ID) | A wildcard on the fixed suffix, or the customer's specific value substituted in |
| 3. Arbitrary / self-hosted | The customer's connection supplies the **entire** server URL — no vendor domain at all | The customer's exact URL — nothing else can be pre-computed |

### Bucket 1 — Static

Default bucket. `piece-hostnames.js --all` output for a piece that has ≥1 valid hostname and no
Bucket 3 auth field. Take the `hosts` list as-is, minus doc-link noise (see Cleanup below).

### Bucket 2 — Dynamic

Two ways a piece lands here, and the script only catches one of them:

- **Visible in source**: the literal URL contains `${var}` or `{var}` inside the hostname —
  `piece-hostnames.js` already flags these (they fail its hostname-char validation and get
  reported separately). Example: `` `https://${subdomain}.zendesk.com` ``.
- **Invisible to the script**: the host comes from a value returned by the OAuth token exchange
  itself (e.g. Zoho's `api_domain` field), or from a connection field read via `auth.props.X`
  with **no literal `https://` anywhere in source** — there is nothing for the regex to match.
  You only find these by reading the piece's `auth.ts` / `common/*.ts` for prop names like
  `location`, `region`, `site`, `pod`, `subdomain`, `account`, `environment`, `cloud`.

For every Bucket-2 piece, check whether the placeholder is driven by a
`Property.StaticDropdown` in the same auth file:

- **Dropdown found** → read every `value:` in its `options.options` array and substitute each
  into the template — you now have the complete, finite, real hostname list. Put it in Section 2A.
  (Real example: `zoho-mail`'s `location` dropdown has 6 values — `zoho.com`, `zoho.eu`, `zoho.in`,
  `zoho.com.au`, `zoho.jp`, `zohocloud.ca` — giving 6 real `accounts.<value>` hosts, not one
  unresolvable placeholder.)
- **No dropdown, free `Property.ShortText`** → the value is genuinely customer-specific, but the
  domain suffix around it is still fixed in code. Put it in Section 2B: state the pattern
  (`<value>.fixed-suffix.com`) and what to ask the customer for (usually: whatever their own
  product's UI calls that value — "workspace subdomain", "account ID", "site name" — check the
  field's `displayName`/`description` for the exact term).

**Multi-part hosts**: some vendors split OAuth login and API calls onto different hosts that both
depend on the same selector (Microsoft's cloud dropdown drives both `login.microsoftonline.com`
and `graph.microsoft.com`; Zoho's location drives both `accounts.<loc>` and a product-specific
`<product>.<loc>` or `www.zohoapis.<loc>`). Resolve and list both.

### Bucket 3 — Arbitrary / self-hosted

Grep the piece's auth definition (`auth.ts`, or inline in `index.ts`) for a prop named
`serverUrl`, `instanceUrl`, `hostUrl`, `siteUrl`, `baseUrl`, `workspaceUrl`, or `domain`, then read
how it's used. The test is **not** the field's example text or description — it's whether the
code appends any fixed suffix at all:

```ts
// Bucket 3 — value used as-is, nothing appended
url: `${auth.props.serverUrl}/oauth2-token`

// Bucket 2 — value used as-is too, but check: is there a DIFFERENT fixed-suffix host elsewhere
// in the same piece (e.g. a separate OAuth login endpoint)? If so it's a hybrid — document both.
```

A field's description hinting at a conventional domain (`service-now`'s instanceUrl example is
`dev12345.service-now.com`, `okta`'s domain example is `dev-12345.okta.com`) does **not** make it
Bucket 2 — the code accepts literally any string. Only an enforced suffix in the URL-building code
moves it to Bucket 2. When in doubt, find the line that builds the final request URL and check
whether a vendor domain literal appears next to the customer value.

Also flag self-hostable open-source integrations even when the piece ships a fixed SaaS default
(`posthog`, `umami`, `mattermost`, `mautic`, `chatwoot`, `discourse`, `matomo`, `ghostcms`,
`gitlab`, `gitea`, `nocodb`, `fountain`) — Section 1 lists their default correctly, but note in
Section 3 that a self-hosting customer's real host overrides it.

## Cleanup — known noise in the raw scan

Before trusting `piece-hostnames.js --all` output, strip these (they come up every regeneration):

- **Query-string artifacts**: a template like `` `${baseUrl}${resourceUri}` `` right after a real
  static URL literal (e.g. `` `https://api.foo.com${resourceUri}` ``) makes the regex capture
  `api.foo.com${resourceuri}` as one invalid "hostname" and drop the real static host entirely.
  Fix: if the invalid entry's prefix up to the placeholder is itself a valid host with a real TLD
  (`api.foo.com`), it's this artifact — keep the prefix as a normal Bucket-1 host, discard the rest.
- **Markdown-emphasis artifacts**: trailing `**`/`_`/`&size=64` glued onto an otherwise valid host
  from bolded/italicized description text (e.g. `demo.crm.dynamics.com**`, `lobstermail.ai**`).
  Strip trailing punctuation before judging validity.
- **Shared sample-data lists**: if several unrelated pieces list the exact same ~20-30 domains
  (`www.linkedin.com`, `www.crunchbase.com`, `angel.co`, …), that's a copy-pasted trigger
  `sampleData` object, not a real call. Drop for all of them, note it once in the doc's caveats.
- **Doc/help links from `description:` text**: hosts like `developers.hubspot.com`,
  `support.google.com`, `docs.nocodb.com` are pulled from human-readable help text, not API calls.
  They're mostly harmless to list (worst case infra allowlists an unused doc domain) — leave them
  in Section 1 rather than hand-auditing 700 pieces, but say so once in the doc's caveats so infra
  knows to sanity-check, not silently trust every entry.
- **Placeholder example domains**: filter hosts matching `example.com`, `yoursite.*`,
  `yourcompany.*`, `mycompany.*`, `acme.*`, `contoso.*` — these are illustrative text in
  descriptions, not real hosts, and would otherwise pollute Section 1.

## Regenerating incrementally

Don't redo the whole classification from scratch every time. Diff which piece directories changed
since the doc's last "Generated" date (`git log --since=<date> --name-only -- packages/pieces/`,
or just re-run `--all` and diff its output against the doc's Section 1 table) and only reclassify
the new/changed pieces. Merge their rows into the existing three sections, keep the rest untouched,
and bump the "Generated" footer date + note.

## Output shape

`scripts/piece-outbound-hosts.md`: intro + caveats, then Section 1 (table: piece | hosts), Section
2 split into 2A (resolved placeholder → real hostnames, table: piece | placeholder | real
hostnames) and 2B (piece | pattern | what to ask the customer), Section 3 (table: piece | auth
field | typical/example value, with the self-hostable-OSS callout as its own short list). Keep the
caveats paragraph at the top — it's load-bearing, not boilerplate: it's what tells whoever reads
the doc that Section 1 wasn't hand-audited entry-by-entry.

## Common mistakes

- Trusting a dropdown's **label** text instead of its `value:` — labels are human-readable
  (`'zoho.eu (Europe)'`) but the value is what actually goes in the URL (`'zoho.eu'`).
- Classifying by the auth field's **name** alone. `subdomain`/`domain`-named fields are Bucket 2
  in some pieces (fixed suffix appended) and Bucket 3 in others (used bare, e.g. `okta`) — always
  check the URL-building code, not just the prop name.
- Missing OAuth-response-derived hosts (Zoho's `api_domain`) because the script found nothing —
  absence of a script hit is not proof the piece has no dynamic host; check the auth file too.
- Re-running full classification on all ~700 pieces for a one-piece doc update. Scope the work to
  what changed.
