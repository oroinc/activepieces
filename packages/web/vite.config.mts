/// <reference types='vitest' />
import path from 'path';
// CUSTOMIZATION START: embedding >>
import donenv from 'dotenv';
// << CUSTOMIZATION END: embedding

import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import tailwindcss from '@tailwindcss/vite';
import customHtmlPlugin from './vite-plugins/html-plugin';

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve' || mode === 'development';

  const AP_TITLE = 'Activepieces';
  const AP_FAVICON = 'https://activepieces.com/favicon.ico';

  // CUSTOMIZATION START: embedding >>
  // TODO: we will need to support real .env files loading?
  donenv.config({ path: path.resolve(__dirname, '../../.env.dev') });
  let base = '/';
  const allowedHosts = [];
  if (process.env.AP_FRONTEND_URL) {
    const AP_FRONTEND_URL = new URL(process.env.AP_FRONTEND_URL);
    const AP_ASSETS_PREFIX = AP_FRONTEND_URL.pathname.replace(/^\/|\/$/, '');
    allowedHosts.push(AP_FRONTEND_URL.host);
    base = `/${AP_ASSETS_PREFIX}/`;
  }
  // << CUSTOMIZATION END: embedding

  return {
    base,
    root: __dirname,
    cacheDir: '../../node_modules/.vite/packages/web',
    server: {
      // CUSTOMIZATION START: embedding >>
      allowedHosts: allowedHosts,
      // << CUSTOMIZATION END: embedding
      proxy: {
        // CUSTOMIZATION START: embedding >>
        [`${base}api`]: {
          // << CUSTOMIZATION END: embedding
          target: 'http://127.0.0.1:3000',
          secure: false,
          changeOrigin: true,
          headers: {
            Host: '127.0.0.1:4200',
          },
          ws: true,
          // CUSTOMIZATION: strip the frontend base prefix before forwarding to
          // the backend (which only knows /api/..., not /<base>/api/...).
          // Works for base='/' (identity) and base='/prefix/' (strips prefix).
          rewrite: (path: string) => '/' + path.slice(base.length),
          // << CUSTOMIZATION END
        },
        '^/mcp(/|$)': {
          target: 'http://127.0.0.1:3000',
          secure: false,
          changeOrigin: true,
          rewrite: (p: string) => p,
        },
        '/.well-known': {
          target: 'http://127.0.0.1:3000',
          secure: false,
          changeOrigin: true,
        },
        '/register': {
          target: 'http://127.0.0.1:3000',
          secure: false,
          changeOrigin: true,
        },
        '/authorize': {
          target: 'http://127.0.0.1:3000',
          secure: false,
          changeOrigin: true,
        },
        '/token': {
          target: 'http://127.0.0.1:3000',
          secure: false,
          changeOrigin: true,
        },
        '/revoke': {
          target: 'http://127.0.0.1:3000',
          secure: false,
          changeOrigin: true,
        },
      },
      port: 4200,
      host: '0.0.0.0',
    },

    preview: {
      port: 4300,
      host: 'localhost',
    },
    resolve: {
      dedupe: [
        '@codemirror/state',
        '@codemirror/view',
        '@codemirror/language',
        '@codemirror/commands',
      ],
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@activepieces/shared': path.resolve(
          __dirname,
          '../../packages/shared/src',
        ),
        'ee-embed-sdk': path.resolve(
          __dirname,
          '../../packages/ee/embed-sdk/src',
        ),
        '@activepieces/pieces-framework': path.resolve(
          __dirname,
          '../../packages/pieces/framework/src',
        ),
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths(),
      customHtmlPlugin({
        title: AP_TITLE,
        icon: AP_FAVICON,
        // CUSTOMIZATION START: embedding >>
        base,
        // << CUSTOMIZATION END: embedding
      }),
      ...(isDev
        ? [
            checker({
              // CUSTOMIZATION START: embedding >>
              // Use tsconfig.app.json directly (buildMode: false) to avoid
              // tsconfig.spec.json (module: commonjs, no @/* paths) being
              // checked during dev serve. The upstream test suite
              // dynamically imports source files that use import.meta.env
              // and @/ aliases, both of which are incompatible with the
              // spec tsconfig's commonjs module setting.
              typescript: {
                buildMode: false,
                tsconfigPath: './tsconfig.app.json',
                root: __dirname,
              },
              // << CUSTOMIZATION END: embedding
            }),
          ]
        : []),
    ],

    build: {
      outDir: '../../dist/packages/web',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        onLog(level, log, handler) {
          if (
            log.cause &&
            log.message.includes(`Can't resolve original location of error.`)
          ) {
            return;
          }
          handler(level, log);
        },
      },
    },
  };
});
