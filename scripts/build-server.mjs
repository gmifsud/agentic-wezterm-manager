import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

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

export const serverBuildOptions = {
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist-server/index.cjs',
  define: { 'import.meta.url': IMPORT_META_URL_ID },
  banner: { js: IMPORT_META_URL_BANNER },
  plugins: [stubExpressViewEngines],
  logLevel: 'info',
};

const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  await build(serverBuildOptions);
}
