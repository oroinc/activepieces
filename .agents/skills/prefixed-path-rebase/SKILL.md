# Prefixed Path (Subfolder Embedding) — Rebase Instructions

When upgrading Activepieces to a new version, apply these changes to enable
runtime-configurable subfolder embedding (e.g. `/admin/activepieces-instance/`).

## Overview

The stock Activepieces frontend bakes asset paths at build time via Vite's `base`
config. Our customization makes the prefix runtime-configurable via the
`AP_ASSETS_PREFIX` env var, so the same Docker image can serve from any path.

**How it works:**

1. Vite builds with `base: './'` → relative asset paths (`assets/index-xxx.js`)
2. Server reads `AP_ASSETS_PREFIX` at startup, rewrites `<base href>` in cached `index.html`
3. Frontend reads `<base href>` from the DOM at runtime via `basePath` module
4. Nginx strips the prefix before proxying to the container

## Files to Modify (7 files + 1 new file)

### 1. NEW: `packages/web/src/lib/base-path.ts`

Create this file. It reads `<base href>` from the DOM at runtime:

```ts
function resolveBasePath(): string {
  const href = document.querySelector('base')?.getAttribute('href');
  if (!href) return '/';
  return href.endsWith('/') ? href : `${href}/`;
}

export const basePath: string = resolveBasePath();
```

### 2. `packages/web/vite.config.mts`

Three changes, all marked with `// CUSTOMIZATION START: embedding >>`:

a. **Add dotenv import** (top of file):

```ts
import donenv from 'dotenv';
```

b. **Replace `base` default and add dev-only prefix logic** (inside `defineConfig`):

```ts
donenv.config({ path: path.resolve(__dirname, '../../.env.dev') });
let base: string = './';  // relative paths so <base href> applies at runtime
const allowedHosts: string[] = [];
if (isDev && process.env.AP_FRONTEND_URL) {
  const AP_FRONTEND_URL = new URL(process.env.AP_FRONTEND_URL);
  const AP_ASSETS_PREFIX = AP_FRONTEND_URL.pathname.replace(/^\/|\/$/, '');
  allowedHosts.push(AP_FRONTEND_URL.host);
  base = `/${AP_ASSETS_PREFIX}/`;
}
```

Key: production builds use `'./'` (relative). Dev server uses absolute prefix.

c. **Update server config**: `allowedHosts`, proxy key (`${base}api`), and rewrite:

```ts
server: {
  allowedHosts: allowedHosts,
    proxy
:
  {
    [`${base}api`]
  :
    {
      // ...existing config...
      rewrite: (path: string) => '/' + path.slice(base.length),
    }
  ,
  }
,
}
,
```

d. **Pass `base` to `customHtmlPlugin`**:

```ts
customHtmlPlugin({ title: AP_TITLE, icon: AP_FAVICON, base }),
```

e. **Checker plugin**: use `buildMode: false` with explicit tsconfig path for dev:

```ts
checker({
  typescript: {
    buildMode: false,
    tsconfigPath: './tsconfig.app.json',
    root: __dirname,
  },
}),
```

### 3. `packages/web/src/lib/api.ts`

Replace `import.meta.env.BASE_URL` with `basePath`:

```ts
import { basePath } from '@/lib/base-path';
// ...
export const API_URL = `${API_BASE_URL}${basePath}api`;
// ...
window.location.href = `${basePath}sign-in`;
```

### 4. `packages/web/src/lib/authentication-session.ts`

Replace `import.meta.env.BASE_URL`:

```ts
import { basePath } from '@/lib/base-path';
// ...
window.location.href = basePath;           // platform switch
window.location.href = `${basePath}sign-in`; // logout
```

### 5. `packages/web/src/lib/navigation-utils.tsx`

Replace `import.meta.env.BASE_URL`:

```ts
import { basePath } from '@/lib/base-path';
// ...
const url = `${basePath}${route.replace(/^\//, '')}${...}`;
```

### 6. `packages/web/src/components/providers/socket-provider.tsx`

Replace `import.meta.env.BASE_URL`:

```ts
import { basePath } from '@/lib/base-path';
// ...
path: `${basePath}api/socket.io`,
```

### 7. `packages/web/src/i18n.ts`

Replace `import.meta.env.BASE_URL`:

```ts
import { basePath } from '@/lib/base-path';
// ...
loadPath: `${basePath}locales/{{lng}}/{{ns}}.json`,
```

### 8. `packages/web/src/features/authentication/components/third-party-logins.tsx`

Replace `import.meta.env.BASE_URL`:

```ts
import { basePath } from '@/lib/base-path';
// ...
window.location.href = `${basePath}api/v1/authn/saml/login`;
```

### 9. `packages/web/src/app/guards/index.tsx`

Replace `import.meta.env.BASE_URL` in React Router `basename`:

```ts
import { basePath } from '@/lib/base-path';
// ...
basename: basePath,
```

### 10. `packages/server/api/src/app/server.ts`

In the production static-file serving block (`environment !== ApEnvironment.DEVELOPMENT`):

a. **Add `index: false` and `redirect: false`** to `fastifyStatic` registration.

b. **Add `allowedPath`** to reject `/` and `/index.html` (forces them to fall through to notFoundHandler):

```ts
allowedPath: (_pathName, _root, request) => {
  const url = (request as { url?: string }).url ?? ''
  const cleanUrl = url.split('?')[0]
  return cleanUrl !== '/' && cleanUrl !== '/index.html'
},
```

c. **Read and patch index.html at startup** (after `fastifyStatic` registration):

```ts
const rawIndexHtml = fs.readFileSync(path.join(frontendPath, 'index.html'), 'utf-8')
const assetsPrefix = process.env.AP_ASSETS_PREFIX
const runtimeBaseHref = assetsPrefix ? `/${assetsPrefix.replace(/^\/|\/$/g, '')}/` : '/'
const indexHtml = rawIndexHtml.replace(
  /<base\s+href="[^"]*"\s*\/?>/,
  `<base href="${runtimeBaseHref}" />`,
)
```

d. **Serve patched HTML in `setNotFoundHandler`**:

```ts
app.setNotFoundHandler(async (request, reply) => {
  if (request.url.startsWith('/api/')) {
    return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: 'Route not found' })
  }
  if (hasStaticFileExtension(request.url)) {
    return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: 'Asset not found' })
  }
  return reply.header('Cache-Control', 'no-cache').type('text/html').send(indexHtml)
})
```

## Upgrade Checklist

When rebasing onto a new Activepieces version:

1. **Search for new `import.meta.env.BASE_URL` usages**:
   ```bash
   grep -rn 'import\.meta\.env\.BASE_URL' packages/web/src/
   ```
   Replace each with `basePath` from `@/lib/base-path`.

2. **Check `server.ts` for changes** to the `fastifyStatic` registration or
   `setNotFoundHandler`. Re-apply `index: false`, `redirect: false`,
   `allowedPath`, and the `index.html` patching logic.

3. **Check `vite.config.mts`** for changes to `base`, `server.proxy`, or
   `customHtmlPlugin`. Re-apply the `'./'` default and dev-only prefix block.

4. **Verify `.env.dev`** has `AP_ENVIRONMENT="dev"` (not `"prod"`) for local
   development — otherwise the API server tries to serve built frontend files
   that don't exist in dev mode.

## Runtime Configuration

| Env Var            | Where                        | Example                                          |
|--------------------|------------------------------|--------------------------------------------------|
| `AP_ASSETS_PREFIX` | App container                | `admin/activepieces-instance`                    |
| `AP_FRONTEND_URL`  | Worker container, `.env.dev` | `https://myhost.com/admin/activepieces-instance` |

## Nginx Config for local development

```nginx
location /admin/activepieces-instance/api/ {
    proxy_pass http://activepieces-app:4200?request_uri;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_cache off;
}

location /admin/activepieces-instance/ {
    proxy_pass http://activepieces-app:4200?request_uri;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Nginx Config for docker

```nginx
location /admin/activepieces-instance/ {
    proxy_pass http://127.0.0.1:4200/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Trailing `/` on `proxy_pass` strips the prefix. The server receives root-relative paths.

