import { readFile } from 'node:fs/promises';
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// express/lib/application.js always pulls in view.js, whose `require(mod)`
// resolves a view engine by name at run time. pkg cannot follow that and warns
// that the require may fail. Nothing here renders templates — the server only
// uses express.static and res.sendFile — so replace it with a throw. The
// assertion below fails the build if a future express drops the line, rather
// than silently reintroducing the warning.
const DYNAMIC_ENGINE_REQUIRE = 'var fn = require(mod).__express';
const stubExpressViewEngines = {
  name: 'stub-express-view-engines',
  setup(build) {
    build.onLoad({ filter: /express[\\/]lib[\\/]view\.js$/ }, async (args) => {
      const source = await readFile(args.path, 'utf8');
      if (!source.includes(DYNAMIC_ENGINE_REQUIRE)) {
        throw new Error(
          `stub-express-view-engines: ${DYNAMIC_ENGINE_REQUIRE} not found in ${args.path}`,
        );
      }
      return {
        loader: 'js',
        contents: source.replace(
          DYNAMIC_ENGINE_REQUIRE,
          "var fn = null; throw new Error('view engines are not bundled')",
        ),
      };
    });
  },
};

// The source is ESM (tsx runs it directly in dev) but the bundle is CJS, where
// esbuild empties `import.meta`. Supply the one field the server reads.
//
// This must stay a file:// URL built by pathToFileURL, not a bare __filename.
// server/index.ts feeds it straight to fileURLToPath, which rejects a plain
// Windows path ("C:\..." parses as a URL with scheme "c:"). Under pkg on
// Windows __filename is C:\snapshot\..., so getting this wrong crashes at
// module init on Windows only — POSIX paths happen to survive the round trip.
// Covered by server/__tests__/packaging.test.ts.
export const IMPORT_META_URL_ID = '__import_meta_url';
export const IMPORT_META_URL_BANNER = `const ${IMPORT_META_URL_ID} = require('node:url').pathToFileURL(__filename).href;`;

export const SERVER_BUNDLE = 'dist-server/index.cjs';

// A truncated bundle is worse than none: pkg embeds it and the exe fails at run
// time. The real output is ~1.7 MB, so anything under this is a broken build.
export const MIN_BUNDLE_BYTES = 100 * 1024;

export const serverBuildOptions = {
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: SERVER_BUNDLE,
  define: { 'import.meta.url': IMPORT_META_URL_ID },
  banner: { js: IMPORT_META_URL_BANNER },
  plugins: [stubExpressViewEngines],
  logLevel: 'info',
};

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// Throws unless the bundle is on disk and plausibly complete. Called after the
// build and again before pkg, whose own failure mode ("Bin file does not
// exist") gives no hint about which step actually went wrong.
export function assertServerBundle() {
  const bundle = path.join(repoRoot, SERVER_BUNDLE);
  let bytes;
  try {
    bytes = statSync(bundle).size;
  } catch {
    throw new Error(`${SERVER_BUNDLE} was not produced (looked in ${bundle})`);
  }
  if (bytes < MIN_BUNDLE_BYTES) {
    throw new Error(
      `${SERVER_BUNDLE} is ${bytes} bytes, expected at least ${MIN_BUNDLE_BYTES}`,
    );
  }
  return bytes;
}
