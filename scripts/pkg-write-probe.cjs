const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const logPath = path.join(os.tmpdir(), 'pkg-write-test.log');
try {
  fs.writeFileSync(logPath, `wrote at ${new Date().toISOString()}\nexec=${process.execPath}\ncwd=${process.cwd()}\n`);
  console.log('OK wrote', logPath);
} catch (e) {
  console.log('FAIL', e.message);
}