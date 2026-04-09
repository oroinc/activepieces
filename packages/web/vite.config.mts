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
        },
        '^/mcp$': {
          target: 'http://127.0.0.1:3000',
          secure: false,
          changeOrigin: true,
          rewrite: (p: string) => p,
        },
        '/.well-known/oauth-authorization-server': {
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
        // request-filtering-agent extends Node.js http.Agent and cannot run in the browser.
        // SSRF protection is server-side only, so we stub it out for the browser bundle.
        'request-filtering-agent': path.resolve(
          __dirname,
          './src/stubs/request-filtering-agent.ts',
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
              typescript: {
                buildMode: true,
                tsconfigPath: './tsconfig.json',
                root: __dirname,
              },
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
