---
name: orocommerce-action-builder
description: Creates new OroCommerce piece actions from an OpenAPI specification. Use when the user asks to add a create/update/delete action to the OroCommerce piece, or provides an OpenAPI/Swagger spec for an OroCommerce resource endpoint.
---

# OroCommerce Action Builder

Build OroCommerce actions from an OpenAPI spec with minimum reading.  
**Piece root:** `packages/pieces/community/orocommerce/src/`

## Decision tree

```
Spec provided?
  YES → Step 1: Parse spec
  NO  → Ask for the OpenAPI YAML/JSON or the resource name so you can consult the spec
```

---

## Step 1 — Parse the spec (read only what you need)

From the spec extract:

| Item | Where to find it |
|---|---|
| Resource name (JSON:API `type`) | `POST /admin/api/{resource}` → `requestBody` → `data.type` |
| Create attributes | `POST` body schema → `data.attributes` properties |
| Update attributes | `PATCH /admin/api/{resource}/{id}` body → `data.attributes` |
| Relationships (create) | `POST` body → `data.relationships` keys + each `data.type` |
| Relationships (update) | `PATCH` body → `data.relationships` keys + each `data.type` |
| Required fields | `POST` body `required` array or spec description ("Example:" block is usually the minimum viable payload) |

> **Shortcut:** the spec description for `POST` and `PATCH` always contains a literal JSON example. Read that example — it shows every required field and the exact relationship type strings. Ignore all other spec noise.

---

## Step 2 — Map attributes → `Property` types

| Attribute characteristic | `Property` type |
|---|---|
| Short string (name, code, email, username, title) | `Property.ShortText` |
| Long string (description, notes, body) | `Property.LongText` |
| Date string (`YYYY-MM-DD`) | `Property.ShortText` with description `"YYYY-MM-DD format"` |
| Boolean flag (enabled, confirmed, locked) | `Property.Checkbox` |
| Numeric string passed as-is | `Property.ShortText` |
| JSON sub-object / freeform map | `Property.Json` |
| Enum with known values | `Property.StaticDropdown` listing the values |

Required on create → `required: true`. Optional → `required: false`.  
On **update** actions every attribute is `required: false` (only provided fields are patched).

---

## Step 3 — Map relationships → dropdowns + `buildRels`

Each relationship in the spec has a `type` string (e.g. `"businessunits"`, `"userroles"`). Use this table to pick the right dropdown and `buildRels` entry:

| JSON:API `type` | Dropdown to use | `buildRels` call |
|---|---|---|
| `organizations` (single) | `organizationDropdown` | `organization: ['organizations', p.organization]` |
| `organizations` (multi) | `organizationsDropdown` | `organizations: ['organizations', p.organizations, true]` |
| `businessunits` (single owner) | `businessUnitRequiredDropdown` (create) / `businessUnitDropdown` (update) | hard-coded: `owner: { data: { type: 'businessunits', id: p.owner ?? '' } }` |
| `businessunits` (multi) | `businessUnitDropdown` | `businessUnits: ['businessunits', p.businessUnits, true]` |
| `users` (owner/sales rep) | `userDropdown` | `owner: ['users', p.owner]` |
| `customers` (required) | `customerRequiredDropdown` | hard-coded: `customer: { data: { type: 'customers', id: p.customer ?? '' } }` |
| `customers` (optional) | `customerDropdown` | `customer: ['customers', p.customer]` |
| `websites` | `websiteDropdown` | `website: ['websites', p.website]` |
| `customeruserroles` | `customerUserRoleDropdown` | `userRoles: ['customeruserroles', p.userRoles, true]` |
| `userroles` | `userRoleDropdown` | `userRoles: ['userroles', p.userRoles, true]` |
| `usergroups` | `userGroupDropdown` | `groups: ['usergroups', p.groups, true]` |
| `userauthstatuses` | `userAuthStatusDropdown` | `auth_status: ['userauthstatuses', p.authStatus]` |
| `paymentterms` | `paymentTermDropdown` | `paymentTerm: ['paymentterms', p.paymentTerm]` |
| `warehouses` | `warehouseDropdown` | `warehouse: ['warehouses', p.warehouse]` |
| `products` | `productDropdown` | `product: ['products', p.product]` |
| `customergroups` | `customerGroupDropdown` | `group: ['customergroups', p.group]` |
| `customertaxcodes` | `customerTaxCodeDropdown` | `taxCode: ['customertaxcodes', p.taxCode]` |
| `orderinternalstatuses` | `orderInternalStatusDropdown` | `internalStatus: ['orderinternalstatuses', p.internalStatus]` |
| `invoiceinternalstatuses` | `invoiceInternalStatusDropdown` | `internalStatus: ['invoiceinternalstatuses', p.internalStatus]` |
| Any unknown type | Add a new `makeSearchableDropdown` / `makeEnumDropdown` in `props.ts` | Same pattern |

**`many=true` rule:** use `true` as the third `buildRels` argument whenever the spec shows `"data": [...]` (array). Omit it (single) when spec shows `"data": {...}`.

---

## Step 4 — Add missing dropdowns (only if needed)

Check the **Existing dropdowns** table above. If the relationship type is already covered, import it — do not re-create it.

If a dropdown is missing, add it to `src/lib/common/props.ts` following the established patterns:

**Searchable (most relationships):**
```ts
export const myThingDropdown = makeSearchableDropdown({
  displayName: 'My Thing',
  description: 'Search my things by name.',
  resourceUri: '/mythings',           // JSON:API collection path
  fieldsParam: 'id,name',
  searchExpr: (q) => `name ~ "${q}"`,
  labelFn: attrLabel('name'),
});
```

**Enum (status/code lists — small static sets):**
```ts
export const myStatusDropdown = makeEnumDropdown({
  displayName: 'Status',
  description: 'Select a status.',
  resourceUri: '/mystatuses',
  labelFn: attrLabel('name', 'id'),   // fallback to id when name absent
});
```

Export the new dropdown from `src/lib/common/index.ts` via the existing `export * from './props'` — no extra line needed.

---

## Step 5 — Write the action files

### Create action template (`src/lib/actions/create-{resource}.ts`)

```ts
import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';
import {
  oroAuth, oroApiCall,
  // ...dropdowns for this action...
  additionalAttributesProp, additionalRelationsProp, additionalHeadersProp,
} from '../common';
import { OroAuth } from '../common/types';
import { jsonApiBodyUtils } from '../common/jsonapi-body-utils';

export const create{Resource}Action = createAction({
  auth: oroAuth,
  name: 'create_{resource}',           // snake_case, permanent
  displayName: 'Create {Resource}',
  description: 'Creates a new {resource} record in OroCommerce.',
  props: {
    // --- Required attributes ---
    fieldName: Property.ShortText({ displayName: 'Field Name', required: true }),

    // --- Optional attributes ---
    optField: Property.ShortText({ displayName: 'Optional Field', required: false }),

    // --- Required relationships ---
    owner: businessUnitRequiredDropdown,  // if owner is required

    // --- Optional relationships ---
    organization: organizationDropdown,

    additionalAttributes: additionalAttributesProp,
    additionalRelations: additionalRelationsProp,
    additionalHeaders: additionalHeadersProp,
  },

  async run(context) {
    const p = context.propsValue;
    const extraAttrs = jsonApiBodyUtils.parseAdditionalAttributes(p.additionalAttributes);
    const extraRels  = jsonApiBodyUtils.parseAdditionalRelations(p.additionalRelations);

    const attributes = {
      fieldName: p.fieldName,           // required → always included
      ...jsonApiBodyUtils.pickDefined({  // optional → included only when non-null
        optField: p.optField,
      }),
      ...extraAttrs,
    };

    const relationships = {
      owner: { data: { type: 'businessunits', id: p.owner ?? '' } },  // required rel
      ...jsonApiBodyUtils.buildRels({
        organization: ['organizations', p.organization],
      }),
      ...extraRels,
    };

    const response = await oroApiCall({
      method: HttpMethod.POST,
      resourceUri: '/{resources}',
      auth: context.auth as OroAuth,
      body: { data: { type: '{resources}', attributes, relationships } },
      headers: p.additionalHeaders as Record<string, string>,
    });

    return response.body;
  },
});
```

### Update action template (`src/lib/actions/update-{resource}.ts`)

Key differences from create:
- First prop is `{resource}Id: Property.ShortText({ required: true })` (the record to patch)
- Every attribute is `required: false`; wrap ALL in `jsonApiBodyUtils.pickDefined`
- Every relationship is optional — put all in `buildRels`, no hard-coded required rel
- HTTP method is `HttpMethod.PATCH`, URI is `/{resources}/${p.{resource}Id}`
- Body `data` includes `id: p.{resource}Id` alongside `type`

```ts
const response = await oroApiCall({
  method: HttpMethod.PATCH,
  resourceUri: `/{resources}/${p.{resource}Id}`,
  auth: context.auth as OroAuth,
  body: {
    data: {
      type: '{resources}',
      id: p.{resource}Id,
      attributes,
      relationships,
    },
  },
  headers: p.additionalHeaders as Record<string, string>,
});
```

---

## Step 6 — Wire up

**Three files to touch (always):**

### `src/lib/actions/index.ts`
```ts
export { create{Resource}Action } from './create-{resource}';
export { update{Resource}Action } from './update-{resource}';
```

### `src/index.ts`
Add to the `import` and to the `actions: [...]` array:
```ts
import { create{Resource}Action, update{Resource}Action } from './lib/actions';

// inside createPiece actions array:
create{Resource}Action,
update{Resource}Action,
```

### Bump `package.json` version
Increment patch version (e.g. `0.3.0` → `0.3.1`) — required so live flows pick up the change.

---

## Step 7 — Verify

```bash
npx turbo run lint --filter=@activepieces/piece-orocommerce
```

Must exit with `0 errors`. Fix any lint issues before finishing.

---

## Quick-look reference

### File locations

| File | Purpose |
|---|---|
| `src/lib/actions/create-{resource}.ts` | New create action |
| `src/lib/actions/update-{resource}.ts` | New update action |
| `src/lib/actions/index.ts` | Re-exports all actions |
| `src/lib/common/props.ts` | All shared dropdowns |
| `src/lib/common/client.ts` | `oroApiCall`, `fetchCollection` |
| `src/lib/common/jsonapi-body-utils.ts` | `pickDefined`, `buildRels`, `parseAdditional*` |
| `src/index.ts` | Piece registration |

### `buildRels` signatures recap

```ts
// Single relationship (data: { type, id })
relName: ['json-api-type', p.propValue]

// Single wrapped in array (data: [{ type, id }])  — many = true
relName: ['json-api-type', p.propValue, true]
```

Values that are `null`, `undefined`, or `''` are automatically skipped by `buildRels`.

### `oroApiCall` signature recap

```ts
await oroApiCall({
  method: HttpMethod.POST | HttpMethod.PATCH | HttpMethod.GET | HttpMethod.DELETE,
  resourceUri: '/collection' | '/collection/${id}',
  auth: context.auth as OroAuth,
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>,
  headers?: Record<string, string>,
});
// returns { body: unknown, status: number }
```

---

## Critical reminders

1. **`name` is permanent** — once published, `name: 'create_xyz'` must never change; flows store it.
2. **Required rels on create** — hard-code them as `{ data: { type, id: p.x ?? '' } }` outside `buildRels`; `buildRels` skips empty strings which would silently omit a required rel.
3. **`additionalAttributes/Relations/Headers` always present** — add all three to every action for extensibility.
4. **`pickDefined` for optional attributes** — prevents sending `null`/`undefined` to the API on updates.
5. **Multi-value rels need `many: true`** — check the spec example: `"data": [...]` → `true`, `"data": {...}` → omit.
6. **Lint must pass** — unused imports are lint errors; import only the dropdowns the action actually uses.
7. **Bump `package.json` version** — patch bump for every change; without it live flows never get your fix.

