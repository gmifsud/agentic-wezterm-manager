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

// The banner runs as the very first statement of the bundled CJS, before
// server/index.ts's uncaughtException handler is installed. A throw here
// (pathToFileURL rejecting an unexpected __filename spelling, e.g. an
// early-yao-pkg pkg version returning a bare /snapshot/... path on Windows)
// would otherwise kill the packaged exe silently: pkg builds a GUI-subsystem
// binary on Windows, no console window, no log file. Wrap the substitution in
// a try/catch that writes to a hardcoded log path before re-throwing so the
// failure mode is discoverable from Explorer by opening .boot.log.
//
// The success path only calls require('node:url'), so the existing packaging
// test (which stubs require to return only pathToFileURL) keeps working.
export const IMPORT_META_URL_BANNER = `
function __pkgBootFatal(label, err) {
  try {
    var __p = require('node:path');
    var __f = require('node:fs');
    var __o = require('node:os');
    var __base = typeof process.pkg !== 'undefined' ? __p.dirname(process.execPath) : process.cwd();
    var __path = __p.join(__base, 'agentic-wezterm-manager.boot.log');
    try { __f.writeFileSync(__path, ''); }
    catch (_) {
      __path = __p.join(__o.tmpdir(), 'agentic-wezterm-manager.boot.log');
      try { __f.writeFileSync(__path, ''); } catch (_) {}
    }
    if (__path) {
      __f.appendFileSync(__path, new Date().toISOString() + ' [boot] FATAL ' + label + ': ' + (err && err.stack || err) + '\\n');
    }
  } catch (_) {
    // Best-effort diagnostic. Nothing further to do; the original error
    // is re-thrown below so pkg still exits non-zero.
  }
}
// Sentinel: if a freshly-built packaged exe is launched and *no* later log
// line ever appears (because pkg's snapshot resolver failed to map a module
// and our entry died silently), this file alone proves the entry point ran
// at all. Without it, the only signal the user has is "the exe exited and
// nothing is on disk", which is indistinguishable from "the exe was never
// launched" or "an antivirus blocked it".
function __pkgBootSentinel() {
  try {
    var __p = require('node:path');
    var __f = require('node:fs');
    var __base = typeof process.pkg !== 'undefined' ? __p.dirname(process.execPath) : process.cwd();
    var __path = __p.join(__base, 'agentic-wezterm-manager.started');
    __f.writeFileSync(__path, new Date().toISOString() + ' pid=' + process.pid + ' node=' + process.version + '\\n');
  } catch (_) {
    // Same caveat as __pkgBootFatal — never let diagnostics kill boot.
  }
}
__pkgBootSentinel();
var ${IMPORT_META_URL_ID};
try {
  ${IMPORT_META_URL_ID} = require('node:url').pathToFileURL(__filename).href;
} catch (err) {
  __pkgBootFatal('banner pathToFileURL failed (boot dies before uncaughtException is installed)', err);
  throw err;
}
`;

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
