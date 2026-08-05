// Build a single-exe distribution using Node.js Single Executable Application
// (SEA), built into Node 20+ and fully deterministic — no bytecode cache, no
// per-build hash variation, no flaky "exe hangs and never opens" failures.
//
// Why not pkg / yao-pkg: pkg packs V8 bytecode into the snapshot, and the
// placement of that bytecode chunk varies per build. On Windows, an unlucky
// chunk boundary splits a module lookup and the entry just hangs before the
// first bootTrace — different shapes per build, so "rebuild until it works"
// is the only escape. SEA inlines the JS source as a single blob (no bytecode
// at all), so every build of the same source produces a byte-identical exe.
//
// Layout produced:
//
//   release/
//   ├── agentic-wezterm-manager.exe   (Node binary + SEA blob)
//   ├── dist/                          (Vite output, served by express.static)
//   ├── scripts/                       (PowerShell scripts surfaced by pkg pre-fix)
//   ├── agentic-wezterm-manager.started / .boot.log / .ready.json (runtime)
//
// The .exe is ~92 MB (size of the Node binary) plus the JS blob (~1.7 MB).
// Total ~94 MB — about 1.5× the pkg build, with the trade-off that it works
// every time.
//
// Build flow:
//   1. Run `node --experimental-sea-config` against the CJS bundle to
//      produce a SEA blob (sea-prep.blob).
//   2. Copy the running node.exe into release/. Skip the Authenticode
//      signature before injection: postject refuses to write through a
//      signed binary, and the original signature becomes invalid once we
//      splice the blob in anyway.
//   3. Use postject to inject the blob at the NODE_SEA_BLOB sentinel.
//   4. Copy dist/ and scripts/ alongside the exe so the runner can find them
//      with single-directory layout (no virtual snapshot filesystem).
//   5. Run the produced exe and probe that it binds its port. If it does
//      not, the build fails — fail fast, not in the field.

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const releaseDir = path.join(repoRoot, 'release');
const exePath = path.join(releaseDir, 'agentic-wezterm-manager.exe');
const blobPath = path.join(releaseDir, 'sea-prep.blob');
const configPath = path.join(releaseDir, 'sea-config.json');
const bundlePath = path.join(repoRoot, 'dist-server', 'index.cjs');
const nodeExe = process.execPath;

// The sentinel byte sequence Node looks for in the binary before injecting
// the SEA blob. The literal value varies between Node builds — newer Node
// 20+ switched from the one in the docs to a different one. We read it
// directly from the binary we are about to splice so we never go stale.
function detectSentinel(binaryPath) {
  const bytes = readFileSync(binaryPath);
  const text = new TextDecoder('latin1').decode(bytes);
  const match = text.match(/NODE_SEA_FUSE_[a-f0-9]+/);
  if (!match) {
    throw new Error(
      `Could not find NODE_SEA_FUSE sentinel in ${binaryPath}. ` +
        'This Node build does not support SEA, or the sentinel format changed.',
    );
  }
  return match[0];
}

// Windows SDK signtool removes the embedded Authenticode signature so postject
// can splice the blob without tripping the embedded signature check. We only
// need this on Windows; on macOS/Linux the Node binary is unsigned anyway.
function findSigntool() {
  if (process.platform !== 'win32') return null;
  const kitsRoot = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin';
  if (!existsSync(kitsRoot)) return null;
  const versions = require('node:fs').readdirSync(kitsRoot).sort().reverse();
  for (const v of versions) {
    const candidate = path.join(kitsRoot, v, 'x64', 'signtool.exe');
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function logHeader(title) {
  process.stdout.write(`\n=== ${title} ===\n`);
}

// Patch the PE optional header's Subsystem field from CUI (3) to GUI (2).
// The field is a 16-bit LE integer at e_lfanew + 24 + 68. We rewrite it
// in place; the change is two bytes, so the SHA of the resulting exe
// differs from a stock node.exe by exactly those two bytes plus their
// surrounding context (the rest of the PE header is unchanged).
function flipPeSubsystemToGui(exe) {
  const buf = readFileSync(exe);
  // Sanity: the file must start with the DOS "MZ" magic.
  if (buf[0] !== 0x4d || buf[1] !== 0x5a) {
    throw new Error(`${exe} is not a PE file (no MZ header)`);
  }
  // e_lfanew is a 32-bit LE integer at offset 0x3C.
  const eLfanew = buf.readUInt32LE(0x3c);
  // PE signature should be "PE\0\0".
  if (
    buf[eLfanew] !== 0x50 ||
    buf[eLfanew + 1] !== 0x45 ||
    buf[eLfanew + 2] !== 0x00 ||
    buf[eLfanew + 3] !== 0x00
  ) {
    throw new Error(`${exe} has no PE signature at e_lfanew=0x${eLfanew.toString(16)}`);
  }
  // Optional header starts right after the 20-byte COFF header.
  const subsystemOffset = eLfanew + 24 + 68;
  const before = buf.readUInt16LE(subsystemOffset);
  if (before !== 3) {
    // Anything other than CUI is unexpected for a stock node.exe — bail
    // loudly rather than silently mutating a binary we don't recognise.
    throw new Error(
      `${exe} subsystem is ${before}, expected 3 (CUI). Refusing to patch.`,
    );
  }
  buf.writeUInt16LE(2, subsystemOffset);
  // Re-write the whole file. The PE header block is small relative to the
  // 90 MB blob node.exe is, so re-writing is cheap and avoids juggling
  // disjoint buffer regions.
  writeFileSync(exe, buf);
  console.log(
    `Flipped PE subsystem CUI(3) -> GUI(2) at offset 0x${subsystemOffset.toString(16)}`,
  );
}

function killAnyRunningExe() {
  // A previous launch of the SEA exe is the most likely holder of the output
  // file when a rebuild comes in. The exe is GUI-subsystem, so it doesn't
  // own a console that the user can close. Killing it here is safe — any
  // boot-trace / ready.json writes are durable, and any port it was bound
  // to goes to TIME_WAIT for ~60 s before Windows re-issues it.
  //
  // We also kill any cmd.exe children that came from this release directory —
  // those are the status-window wrappers which can also hold the SEA blob
  // lock if they are actively reading from the snapshot.
  if (process.platform !== "win32") return;
  try {
    const { execSync } = require("node:child_process");
    execSync(
      `taskkill /F /IM agentic-wezterm-manager.exe /T 2>nul; ` +
        `taskkill /F /FI \"IMAGENAME eq cmd.exe\" /FI \"WINDOWTITLE eq Agentic WezTerm Manager\" /T 2>nul`,
      { stdio: "ignore", windowsHide: true },
    );
  } catch {
    // taskkill returns non-zero when no matching process exists, which is
    // exactly what we want when there is nothing to kill. Swallow.
  }
}

function run() {
  // Kill any running instance first so the output file isn't locked.
  // Without this, rebuild-package fails with EPERM if the exe from the
  // previous build is still alive in the background (common when launched
  // from Explorer — the user closes the window, but the taskbar entry
  // stays as a zombie holding the file open).
  killAnyRunningExe();
  if (!existsSync(bundlePath)) {
    throw new Error(
      `${bundlePath} not found. Run "npm run build:server" first.`,
    );
  }
  if (statSync(bundlePath).size < 100 * 1024) {
    throw new Error(
      `${bundlePath} is ${statSync(bundlePath).size} bytes, ` +
        'expected at least 102400. Was the build truncated?',
    );
  }

  mkdirSync(releaseDir, { recursive: true });

  // 1. SEA config + blob.
  logHeader('generating SEA blob');
  const seaConfig = {
    main: bundlePath,
    output: blobPath,
    disableExperimentalSEAWarning: true,
  };
  writeFileSync(configPath, JSON.stringify(seaConfig, null, 2));
  execFileSync(process.execPath, ['--experimental-sea-config', configPath], {
    cwd: releaseDir,
    stdio: 'inherit',
  });
  if (!existsSync(blobPath)) {
    throw new Error(
      `SEA blob was not produced at ${blobPath}. ` +
        'Check the output of `node --experimental-sea-config` above.',
    );
  }
  const blobBytes = statSync(blobPath).size;
  console.log(`SEA blob: ${blobBytes} bytes`);

  // 2. Sentinel + signtool.
  const sentinel = detectSentinel(nodeExe);
  console.log(`SEA sentinel: ${sentinel}`);
  const signtool = findSigntool();
  if (process.platform === 'win32' && !signtool) {
    throw new Error('signtool.exe not found in Windows SDK. Needed to strip the Node binary signature before injection.');
  }

  // 3. Copy node.exe into release/, strip signature, inject blob.
  logHeader('copying node.exe and injecting blob');
  if (existsSync(exePath)) rmSync(exePath);
  copyFileSync(nodeExe, exePath);
  console.log(`Copied ${nodeExe} -> ${exePath}`);

  if (signtool) {
    execFileSync(signtool, ['remove', '/s', exePath], { stdio: 'inherit' });
  }

  // postject is the official Node tool for SEA injection. We use the local
  // install (declared as a devDep) so the build is hermetic — no network
  // npx download, no path resolution issues on Windows.
  const postjectBin = path.join(
    repoRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'postject.cmd' : 'postject',
  );
  if (!existsSync(postjectBin)) {
    throw new Error(
      `postject not found at ${postjectBin}. Did devDependencies install?`,
    );
  }
  execFileSync(
    postjectBin,
    [
      exePath,
      'NODE_SEA_BLOB',
      blobPath,
      '--sentinel-fuse',
      sentinel,
    ],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );

  // 3b. Flip the PE subsystem from CUI (3) to GUI (2).
  //
  // node.exe is built as a console-subsystem application, which means Windows
  // gives it a console window but no taskbar entry — Windows reserves the
  // taskbar for GUI subsystem apps. The exe we just patched therefore has
  // no way to be closed from the taskbar / Alt+F4 / "End task". On Windows
  // a GUI subsystem exe still has stdout/stderr writeable when launched
  // from a console (the parent console is reused), so the Fix is
  // worry-free for the existing debug logging.
  //
  // Address of the subsystem field inside the PE optional header:
  //   e_lfanew (DOS header → PE offset) + 24 (COFF header) + 68 (subsystem
  //   inside IMAGE_OPTIONAL_HEADER). For 64-bit builds this is e_lfanew+92.
  if (process.platform === 'win32') {
    flipPeSubsystemToGui(exePath);
  }

  // 4. Copy dist/ and scripts/ alongside the exe.
  logHeader('copying runtime assets');
  const distSrc = path.join(repoRoot, 'dist');
  const distDest = path.join(releaseDir, 'dist');
  if (existsSync(distDest)) rmSync(distDest, { recursive: true, force: true });
  copyRecursive(distSrc, distDest);
  console.log(`Copied ${distSrc} -> ${distDest}`);

  const scriptsSrc = path.join(repoRoot, 'scripts');
  const scriptsDest = path.join(releaseDir, 'scripts');
  if (existsSync(scriptsDest)) {
    rmSync(scriptsDest, { recursive: true, force: true });
  }
  mkdirSync(scriptsDest, { recursive: true });
  copyFileSync(
    path.join(scriptsSrc, 'Start-ObsidianProfiler.ps1'),
    path.join(scriptsDest, 'Start-ObsidianProfiler.ps1'),
  );
  console.log(`Copied Start-ObsidianProfiler.ps1 -> ${scriptsDest}`);

  // 5. Clean up build intermediates that don't belong in the release.
  rmSync(configPath, { force: true });
  rmSync(blobPath, { force: true });

  // 6. Verify — launch the exe, probe the port, kill it. Only return success
  //    if the server actually binds. No more "rebuild until lucky".
  logHeader('verifying produced exe');
  if (!verifyExe(exePath)) {
    throw new Error(
      `${exePath} did not bind a port within 10s. Build rejected.`,
    );
  }

  const exeBytes = statSync(exePath).size;
  console.log(`\nDone: ${exePath} (${(exeBytes / 1024 / 1024).toFixed(1)} MB)`);
}

function copyRecursive(src, dest) {
  const stat = statSync(src);
  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const entry of require('node:fs').readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  copyFileSync(src, dest);
}

function verifyExe(exe) {
  const port = 39000 + Math.floor(Math.random() * 1000);
  const env = { ...process.env, NO_OPEN: '1', PORT: String(port) };
  const child = spawn(exe, [], {
    cwd: releaseDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const stdoutChunks = [];
  const stderrChunks = [];
  child.stdout.on('data', (b) => stdoutChunks.push(b));
  child.stderr.on('data', (b) => stderrChunks.push(b));

  let bound = false;
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `const net = require('net'); let tries = 0; const tick = () => { const s = net.connect(${port}, '127.0.0.1', () => { s.end(); process.exit(0); }); s.on('error', () => { if (++tries > 50) process.exit(1); setTimeout(tick, 200); }); }; tick();`,
    ],
    { stdio: 'inherit', timeout: 12_000 },
  );
  bound = result.status === 0;
  if (!child.killed) {
    try {
      child.kill();
    } catch {
      // already exited
    }
  }
  if (!bound) {
    const stdout = Buffer.concat(stdoutChunks).toString('utf8');
    const stderr = Buffer.concat(stderrChunks).toString('utf8');
    console.error('--- exe stdout ---');
    console.error(stdout || '(empty)');
    console.error('--- exe stderr ---');
    console.error(stderr || '(empty)');
    return false;
  }
  console.log(`Verified: ${exe} bound port ${port} within 12s`);
  return true;
}

try {
  run();
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}
