import { SERVER_BUNDLE, assertServerBundle } from './server-build-config.mjs';

try {
  const bytes = assertServerBundle();
  console.log(`${SERVER_BUNDLE} present (${(bytes / 1024).toFixed(0)} KB)`);
} catch (err) {
  console.error(`${err.message} — run "npm run build:server" first.`);
  process.exit(1);
}
