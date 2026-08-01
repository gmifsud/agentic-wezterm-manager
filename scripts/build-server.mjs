import { build } from 'esbuild';
import {
  SERVER_BUNDLE,
  assertServerBundle,
  serverBuildOptions,
} from './server-build-config.mjs';

// No "am I the main module?" guard here: comparing process.argv[1] to
// import.meta.url silently skips the build whenever the two spellings differ
// (junction, subst drive, symlink), which is a build that prints nothing and
// exits 0. The esbuild options live in a side-effect-free module instead, so
// importing them cannot trigger a build and this file can always run one.
try {
  await build(serverBuildOptions);
  const bytes = assertServerBundle();
  console.log(`Built ${SERVER_BUNDLE} (${(bytes / 1024).toFixed(0)} KB)`);
} catch (err) {
  console.error(`Failed to build ${SERVER_BUNDLE}`);
  console.error(err);
  process.exit(1);
}
