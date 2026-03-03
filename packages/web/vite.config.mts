/// <reference types='vitest' />
import path from 'path';

import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import tailwindcss from '@tailwindcss/vite';
import customHtmlPlugin from './vite-plugins/html-plugin';

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve' || mode === 'development';

  const AP_TITLE = isDev ? 'Activepieces' : '${AP_APP_TITLE}';

  const AP_FAVICON = isDev
    ? 'https://activepieces.com/favicon.ico'
    : '${AP_FAVICON_URL}';

  const AP_ASSETS_PREFIX = isDev
    ? process.env.AP_ASSETS_PREFIX ?? ''
    : '${AP_ASSETS_PREFIX}';

  const base = AP_ASSETS_PREFIX ? `/${AP_ASSETS_PREFIX}/` : '/';

  return {
    base,
    root: __dirname,
    cacheDir: '../../node_modules/.vite/packages/web',
    server: {
      allowedHosts: ['commerce-crm-ee.master.loc'],
      proxy: {
        [`${base}api`]: {
          target: 'http://127.0.0.1:3000',
          secure: false,
          changeOrigin: true,
          rewrite: (path) => path.replace(new RegExp(`^${base}api`), ''),
          headers: {
            Host: '127.0.0.1:4200',
          },
          ws: true,
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
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths(),
      customHtmlPlugin({
        title: AP_TITLE,
        icon: AP_FAVICON,
        base,
      }),
      checker({
        typescript: {
          buildMode: true,
          tsconfigPath: './tsconfig.json',
          root: __dirname,
        },
      }),
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
