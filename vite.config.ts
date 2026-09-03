import { join } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin, type Rolldown } from 'vite-plus';

const ASSETS = join(import.meta.dirname, 'src/main/resources/assets'); // UI source root
const OUT = join(import.meta.dirname, 'build/resources/main/assets'); // compiled output

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  // @enonic/ui is Preact; alias React to preact/compat so everything shares one runtime.
  const js = {
    input: { 'js/main': join(ASSETS, 'js/main.ts') },
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/client': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  };

  const css = {
    // Entry name differs from output key so css/main.css has no src/ twin; lets XP dev
    // mode serve the compiled build/ copy, not the raw source (same as .ts → .js).
    input: { 'css/main': join(ASSETS, 'css/index.css') },
    plugins: [tailwindcss()],
  };

  const lint = {
    options: { typeAware: true, typeCheck: true },
    // admin/** are CJS + XP globals (outside tsconfig); build/** and bin/** are generated output
    // (bin/ is the Java language server's shadow copy of the whole resources tree).
    ignorePatterns: ['build/**', 'bin/**', 'src/main/resources/admin/**', '**/*.d.ts'],
  };

  const fmt = {
    singleQuote: true, // the only non-default style; rest matches defaults
    sortImports: true,
    sortTailwindcss: true,
    ignorePatterns: ['build/**', 'bin/**', 'src/main/resources/admin/**'],
  };

  // `vp pack` (tsdown) compiles server-side .ts (all under resources except assets/) to
  // per-file CommonJS, mirroring the tree into build/ so XP runs each file in place.
  const pack = {
    entry: [
      'src/main/resources/**/*.ts',
      '!src/main/resources/assets/**',
      '!src/main/resources/**/*.d.ts', // declarations type-check only, no emit
      '!src/main/resources/**/*.test.ts', // colocated tests must not reach the jar
    ],
    root: 'src/main/resources', // rootDir — drives the mirrored output layout
    outDir: 'build/resources/main',
    format: 'cjs' as const,
    platform: 'node' as const,
    unbundle: true, // per-file output, not one bundle
    outExtensions: () => ({ js: '.js' }), // XP wants .js, not the cjs default .cjs
    deps: { neverBundle: [/^\/lib\//] }, // XP /lib/* requires stay external
    target: 'es2023', // safe: scriptEngine=GraalJS (build.gradle) supports it
    treeshake: false, // XP calls exports.get/post at runtime — don't drop as dead
    clean: false, // must not wipe the assets output `vp build` emits here
    dts: false,
    sourcemap: false,
    report: false,
  };

  // Vitest inherits the Vite config, so `root` has to be pointed back at the repo:
  // the build root is assets/, which would hide every server-side test.
  const test = {
    root: import.meta.dirname,
    environment: 'node' as const,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
    // XP supplies these at runtime; under vitest they resolve to local doubles.
    alias: {
      // Not XP libs, same problem: externalized CJS bypasses the react → preact/compat alias, and
      // both — reached through the entity barrels — require `react`, not installed.
      'lucide-react': join(import.meta.dirname, 'src/test/mocks/lucide-react.ts'),
      '@enonic/ui': join(import.meta.dirname, 'src/test/mocks/enonic-ui.ts'),
      '/lib/mustache': join(import.meta.dirname, 'src/test/mocks/lib-mustache.ts'),
      '/lib/xp/portal': join(import.meta.dirname, 'src/test/mocks/lib-xp-portal.ts'),
      '/lib/xp/admin': join(import.meta.dirname, 'src/test/mocks/lib-xp-admin.ts'),
      '/lib/xp/auth': join(import.meta.dirname, 'src/test/mocks/lib-xp-auth.ts'),
      '/lib/xp/i18n': join(import.meta.dirname, 'src/test/mocks/lib-xp-i18n.ts'),
      '/lib/xp/event': join(import.meta.dirname, 'src/test/mocks/lib-xp-event.ts'),
      '/lib/events': join(import.meta.dirname, 'src/main/resources/lib/events/index.ts'),
      '/lib/auth': join(import.meta.dirname, 'src/main/resources/lib/auth.ts'),
      '/lib/config': join(import.meta.dirname, 'src/main/resources/lib/config.ts'),
      '/lib/i18n': join(import.meta.dirname, 'src/main/resources/lib/i18n.ts'),
    },
  };

  return {
    root: ASSETS,
    // Default would be <root>/node_modules/.vite — inside the resources tree, which
    // processResources then copies into the jar.
    cacheDir: join(import.meta.dirname, 'node_modules/.vite'),
    base: './', // relative asset URLs — served under XP's asset path, not domain root
    plugins: [...css.plugins, dropCssFacade],
    resolve: { alias: js.alias, dedupe: ['preact', 'preact/compat'] },
    build: {
      outDir: OUT,
      emptyOutDir: false, // shared with `vp pack` output — don't clear it
      target: 'es2023',
      minify: isProd,
      cssMinify: isProd,
      sourcemap: !isProd,
      rollupOptions: {
        onLog: silenceTanStackUseWarning,
        input: { ...js.input, ...css.input },
        output: {
          format: 'es',
          entryFileNames: '[name].js', // js/main → js/main.js
          chunkFileNames: 'js/chunks/[name]-[hash].js',
          assetFileNames: '[name][extname]', // css entry chunk → css/main.css
        },
      },
    },
    lint,
    fmt,
    pack,
    test,
  };
});

// *
// * Helpers
// *

// TanStack probes React 19's `use` hook, absent on our preact/compat runtime — an
// expected undefined that the bundler wrongly flags. Drop only this known false positive.
function silenceTanStackUseWarning(
  level: Rolldown.LogLevel,
  log: Rolldown.RolldownLog,
  handler: Rolldown.LogOrStringHandler,
): void {
  if (
    log.code === 'IMPORT_IS_UNDEFINED' &&
    log.id?.includes('@tanstack/react-router') &&
    log.message.includes('preact/compat')
  ) {
    return;
  }
  handler(level, log);
}

// A CSS-only rollup entry emits an empty JS facade (css/main.js); drop it.
const dropCssFacade: Plugin = {
  name: 'drop-css-js-facade',
  generateBundle(_opts, bundle) {
    for (const [file, chunk] of Object.entries(bundle)) {
      if (chunk.type === 'chunk' && chunk.facadeModuleId?.endsWith('.css')) {
        delete bundle[file];
      }
    }
  },
};
