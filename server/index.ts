// Must stay the first import: esbuild initialises the bundled modules in this
// order, so anything above it could hang before a single line reaches the log.
import { bootTrace, bootStage } from './boot-trace';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { routes } from './routes';
import { getMetadata } from './storage';
import { BUNDLED_SCRIPTS } from './bundled-scripts';

bootTrace('END module init - express, cors, routes, storage all loaded');

// A packaged exe launched from Explorer closes its console the instant it
// throws, so a startup failure reaches the user as "it does not open" with
// nothing to go on. Leave the reason on disk next to the exe.
process.on('uncaughtException', (err) => {
  const logFile = path.join(
    path.dirname(process.execPath),
    'agentic-wezterm-manager.error.log',
  );
  console.error(err);
  try {
    fs.writeFileSync(logFile, `${new Date().toISOString()}\n${err.stack}\n`);
    console.error(`Wrote ${logFile}`);
  } catch {
    // Nothing further to do — the stack is already on stderr.
  }
  process.exit(1);
});

// import.meta.url is real under tsx (ESM) and substituted from __filename by
// scripts/build-server.mjs in the CJS bundle.
const __thisDir = bootStage('resolve __thisDir from import.meta.url', () =>
  path.dirname(fileURLToPath(import.meta.url)),
);
bootTrace(`__thisDir=${__thisDir}`);

bootTrace('BEGIN create express app and mount middleware');
const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', routes);
bootTrace('END create express app and mount middleware');

// Locate the built Vite assets. Supports three layouts:
//   - dev:           dist-server/index.cjs -> ../dist
//   - pkg snapshot:  dist-server/index.cjs (under C:\snapshot\…\dist-server) -> ../dist
//   - Node SEA:      __filename = process.execPath, dist/ copied next to the exe
//   - tsc layout:    dist-server/server/index.js -> ../../dist
//
// The first candidate with an index.html wins. SEA is checked first because
// its __filename == exe path, so path.resolve(__thisDir, '../dist') lands
// one level above the exe — wrong for the SEA layout, where dist/ is sibling
// to the exe.
function findDistDir(): string {
  const candidates = [
    path.resolve(__thisDir, 'dist'),
    path.resolve(__thisDir, '../dist'),
    path.resolve(__thisDir, '../../dist'),
  ];
  for (const candidate of candidates) {
    bootTrace(
      `dist candidate ${candidate}: index.html ${fs.existsSync(path.join(candidate, 'index.html')) ? 'found' : 'missing'}`,
    );
  }
  return (
    candidates.find((p) => fs.existsSync(path.join(p, 'index.html'))) ??
    candidates[0]
  );
}

const distDir = bootStage('locate dist assets', findDistDir);
bootTrace(`distDir=${distDir}`);

// pkg exposes assets through a virtual snapshot filesystem that only this
// process can read, but scripts/ has to be reachable by WezTerm and PowerShell.
// Copy it next to the exe, which is where {managerDir} resolves to in packaged
// installs. In dev the real scripts/ is already on disk.
function deployBundledScripts(): void {
  const { isPackaged, configDir } = getMetadata();
  bootTrace(`unpack: isPackaged=${isPackaged} configDir=${configDir}`);
  if (!isPackaged) {
    bootTrace('unpack: skipped, scripts/ is already on disk in dev');
    return;
  }
  const source = path.resolve(__thisDir, '../scripts');
  const target = path.join(configDir, 'scripts');
  for (const name of BUNDLED_SCRIPTS) {
    const from = path.join(source, name);
    const to = path.join(target, name);
    bootTrace(`unpack BEGIN ${name}: ${from} -> ${to}`);
    // Per script, so one unwritable target does not strand the rest.
    try {
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(to, fs.readFileSync(from));
      bootTrace(`unpack END ${name}`);
    } catch (err) {
      console.warn(`Could not unpack scripts/${name}:`, err);
      bootTrace(`unpack FAILED ${name}: ${err}`);
    }
  }
}

bootStage('probe config files', () => {
  const { configDir, configFile, luaOutputFile } = getMetadata();
  bootTrace(
    `config dir ${configDir}: ${fs.existsSync(configDir) ? 'exists' : 'MISSING'}`,
  );
  bootTrace(
    `config file ${configFile}: ${fs.existsSync(configFile) ? 'found' : 'absent, defaults will be used'}`,
  );
  // Nothing regenerates the lua at boot — it is written on save — so its
  // absence here is expected on a first run, not a stalled stage.
  bootTrace(
    `generated lua ${luaOutputFile}: ${fs.existsSync(luaOutputFile) ? 'present' : 'absent, written on first save'}`,
  );
});

// Tangible artifact for the Explorer-double-click case: pkg builds a GUI
// subsystem exe on Windows, so console.log output is invisible and the
// auto-open can silently fail. Drop a small JSON file next to the exe
// (or next to the bundle in dev) containing the URL the user should hit,
// plus the listen timestamp. If the file is missing after launch, boot
// never reached listen — check agentic-wezterm-manager.boot.log.
function writeReadyFile(url: string, port: number): void {
  const { isPackaged } = getMetadata();
  const readyDir = isPackaged ? path.dirname(process.execPath) : __thisDir;
  const readyPath = path.join(readyDir, 'agentic-wezterm-manager.ready.json');
  try {
    fs.writeFileSync(
      readyPath,
      JSON.stringify(
        { url, port, startedAt: new Date().toISOString() },
        null,
        2,
      ),
    );
    bootTrace(`ready file written to ${readyPath}`);
  } catch (err) {
    bootTrace(`ready file write FAILED ${readyPath}: ${err}`);
  }
}

// Spawns a small console window that displays the URL/port and acts as the
// kill switch: closing this window shuts the server down. Two processes
// are involved:
//   1. `cmd.exe /c start "title" /WAIT cmd.exe /K bat` — the wrapper. We
//      keep this process's PID.
//   2. The inner `cmd.exe /K bat` — the visible window. `start` allocates
//      it a fresh console because the SEA GUI-subsystem parent has none
//      to hand down. `/WAIT` blocks the wrapper until the inner cmd exits.
// The bat ends in `timeout /t <big number> /nobreak >nul` rather than
// `pause` — `pause` reads console input, and on some hosts the inner
// cmd's stdin is not wired the way `start` expects, causing it to read
// EOF and exit within ~1 s. `timeout` does not depend on stdin at all, so
// it holds the window open regardless of how the console was allocated.
// When the user closes the window, the inner cmd dies, `/WAIT` releases,
// the wrapper exits, our poll (on the wrapper's PID) notices, and
// shutdown() runs.
function openStatusWindow(url: string, port: number): void {
  if (process.platform !== 'win32') return;
  if (process.env.NO_OPEN === '1') return;
  const banner = [
    '@echo off',
    'chcp 65001 >nul',
    'title Agentic WezTerm Manager',
    'echo.',
    'echo   Agentic WezTerm Manager is running',
    'echo.',
    `echo       URL:    ${url}`,
    `echo       Port:   ${port}`,
    'echo.',
    'echo   The browser should have opened automatically.',
    'echo.',
    'echo   Close this window to stop the server.',
    'echo.',
    // timeout's /T only accepts -1..99999 seconds (~27.7h). /nobreak means
    // it ignores keypresses and only stops on Ctrl+C or the window
    // closing, so it doesn't depend on stdin being wired correctly.
    'timeout /t 99999 /nobreak >nul',
  ].join('\r\n');
  let tmp: string;
  try {
    tmp = path.join(os.tmpdir(), 'agentic-wezterm-manager-status.bat');
    fs.writeFileSync(tmp, banner, 'utf-8');
  } catch (err) {
    bootTrace(`status window script write FAILED: ${err}`);
    return;
  }
  bootTrace(`status window script written to ${tmp}`);
  let child;
  try {
    child = spawn(
      'cmd.exe',
      ['/c', 'start', 'Agentic WezTerm Manager', '/WAIT', 'cmd.exe', '/K', tmp],
      { detached: true, stdio: 'ignore' },
    );
  } catch (err) {
    bootTrace(`status window spawn threw ${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  if (!child.pid) {
    bootTrace('status window spawn returned no pid');
    return;
  }
  bootTrace(`status window spawned, wrapper pid=${child.pid}`);
  child.on('error', (err) => {
    bootTrace(`status window child error ${err.message}`);
  });
  child.unref();

  const wrapperPid = child.pid;
  const poll = setInterval(() => {
    // tasklist.exe ALWAYS exits 0, even on no match — it just prints
    // "INFO: No tasks are running which match the specified criteria."
    // to stdout instead of a process line. r.status is therefore useless
    // as a liveness check; the process line itself (containing the pid
    // as a distinct token) is the only reliable signal.
    const r = spawnSync('tasklist.exe', ['/FI', `PID eq ${wrapperPid}`, '/NH'], {
      encoding: 'utf-8',
      windowsHide: true,
    });
    const stdout = r.stdout ?? '';
    const stillRunning = new RegExp(`\\b${wrapperPid}\\b`).test(stdout);
    if (!stillRunning) {
      bootTrace(`status window wrapper pid=${wrapperPid} exited (tasklist: ${stdout.trim()}), shutting down`);
      clearInterval(poll);
      shutdown('status-window-closed');
    }
  }, 750);
  poll.unref();
}

// Close the visible status window by killing any process whose main window
// has the title "Agentic WezTerm Manager". Used by shutdown() so the cmd
// window closes whenever the exe exits — whether because the user closed
// the window (which we already handled via polling the wrapper PID), or
// because the server died, or because something else ran shutdown().
//
// We can't track the inner cmd's PID directly because it is spawned by
// `start`, not by the wrapper cmd, so it is a grandchild of our wrapper.
// Filtering by window title is the reliable signal — there is exactly one
// window with that title for the lifetime of this process.
function closeStatusWindow(): void {
  if (process.platform !== 'win32') return;
  // /F = force. /FI applies the filter. /IM matches by image name; we
  // combine with the title filter to be precise.
  const r = spawnSync(
    'taskkill.exe',
    ['/F', '/FI', 'WINDOWTITLE eq Agentic WezTerm Manager'],
    { encoding: 'utf-8', windowsHide: true },
  );
  bootTrace(
    'closeStatusWindow taskkill exit=' +
      String(r.status) +
      ' stdout=' +
      String(r.stdout || '').trim() +
      ' stderr=' +
      String(r.stderr || '').trim(),
  );
}

bootStage('unpack bundled scripts from snapshot', deployBundledScripts);

bootTrace('BEGIN mount static assets and SPA fallback');
app.use(express.static(distDir));
// SPA fallback: any non-/api path returns index.html
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});
bootTrace('END mount static assets and SPA fallback');

function openBrowser(url: string): void {
  // pkg builds the Windows exe as a GUI subsystem binary, so the inherited
  // stdio is missing/closed and `child_process.exec` (which goes through a
  // shell) is unreliable from there. `spawn` with detached + stdio: 'ignore'
  // gives the child its own handles and severs it from the parent, which is
  // what makes the auto-open work from an Explorer double-click.
  let cmd: string;
  let args: string[];
  if (process.platform === 'win32') {
    cmd = 'cmd';
    // `start "" URL` — first "" is the window title, kept empty.
    args = ['/c', 'start', '""', url];
  } else if (process.platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }
  bootTrace(`openBrowser: spawning ${cmd} ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`);
  let child;
  try {
    child = spawn(cmd, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
      shell: false,
    });
  } catch (err) {
    bootTrace(`openBrowser: spawn threw ${err instanceof Error ? err.message : String(err)}`);
    console.warn('Could not open browser automatically:', err);
    return;
  }
  child.on('error', (err) => {
    // The most common failure here is no default-browser association, which
    // would otherwise leave the user staring at nothing. Surface it via the
    // boot log so it is discoverable on disk, not just in the missing console.
    bootTrace(`openBrowser: child error ${err.message}`);
    console.warn('Could not open browser automatically:', err.message);
  });
  child.unref();
}

function listen(port: number, attempt = 0): void {
  bootTrace(`about to listen on port ${port} (attempt ${attempt})`);
  // Reset on every retry attempt — we only want 'close' to mean
  // "we WERE listening and now we are not" for the CURRENT attempt.
  wasListening = false;
  const server = app.listen(port, () => {
    const url = `http://localhost:${port}`;
    bootTrace(`listening on port ${port} at ${url}`);
    console.log(`Agentic WezTerm Manager running at ${url}`);
    httpServer = server;
    bootStage('write ready file', () => writeReadyFile(url, port));
    bootStage('open status window', () => openStatusWindow(url, port));
    if (process.env.NO_OPEN !== '1') {
      bootTrace('BEGIN open browser');
      openBrowser(url);
      bootTrace('END open browser (spawn dispatched)');
    }
    bootTrace('boot complete');
    wasListening = true;
  });
  // 'close' fires when the listening socket is closed — whether by us via
  // httpServer.close() on shutdown, or because the server failed. That is
  // the right signal that the server is no longer accepting connections,
  // so the exe and the status window should follow it down (otherwise the
  // cmd window outlives the thing it was describing, which is the
  // "decoupled" state we are fixing). Note: 'error' on EADDRINUSE also
  // emits 'close' before our retry in the error handler runs — so we
  // gate this on wasListening to ensure we only react to "we WERE listening
  // and now we are not", not to "we never listened, try the next port".
  // httpServer.close()'s own callback also fires 'close' on graceful
  // shutdown — shutdown() is idempotent so this is safe.
  server.on('close', () => {
    bootTrace('http server closed (was port=' + port + ', wasListening=' + wasListening + ')');
    if (wasListening) shutdown('server-closed');
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    bootTrace(`listen error on port ${port}: ${err.code ?? err.message}`);
    if (err.code === 'EADDRINUSE' && attempt < 10) {
      console.warn(`Port ${port} in use, trying ${port + 1}...`);
      listen(port + 1, attempt + 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
}

listen(DEFAULT_PORT);

// === Shutdown ============================================================
// Idempotent. Called from four places:
//   1. SIGINT — Ctrl+C in a parent console, or `kill -INT <pid>`.
//   2. SIGTERM — `taskkill /pid <pid>` (graceful) or any signal that
//      Windows can translate. Note: closing the taskbar entry or
//      `taskkill /F` use TerminateProcess which cannot be caught — those
//      paths leave the port in TIME_WAIT (~60 s) until Windows releases it.
//   3. SIGHUP — some Windows builds deliver this on taskbar Close.
//   4. httpServer 'close' event — the server stopped accepting connections,
//      which means it is no longer useful and the exe should follow.
//
// Closes the HTTP server (releases the port), kills the visible status
// window so it doesn't outlive the server, removes ready.json so a
// subsequent launch doesn't get confused, and exits with 0.
let httpServer: ReturnType<typeof app.listen> | null = null;
// True once the listening socket has actually accepted at least one
// connection setup. Used to distinguish "the server crashed after it was
// listening" (which should shut the exe down) from "listen() failed
// before it ever started" (which is the EADDRINUSE retry case and must
// NOT trigger shutdown). Reset to false on each listen() call so retries
// after EADDRINUSE don't accumulate stale "we were listening" state.
let wasListening = false;
let shuttingDown = false;
function shutdown(reason: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  bootTrace(`shutdown BEGIN reason=${reason}`);
  // Close the status window FIRST so the user sees it disappear at the
  // same moment they (or we) decided to shut down. This is what binds the
  // window to the server's lifecycle: any path that runs shutdown()
  // closes the window.
  closeStatusWindow();
  try {
    if (httpServer) httpServer.close(() => bootTrace('http server closed'));
  } catch (err) {
    bootTrace(`http server close threw ${err}`);
  }
  try {
    const { isPackaged } = getMetadata();
    const readyDir = isPackaged ? path.dirname(process.execPath) : __thisDir;
    const readyPath = path.join(readyDir, 'agentic-wezterm-manager.ready.json');
    if (fs.existsSync(readyPath)) fs.unlinkSync(readyPath);
    bootTrace(`ready file removed: ${readyPath}`);
  } catch (err) {
    bootTrace(`ready file removal FAILED: ${err}`);
  }
  bootTrace(`shutdown END reason=${reason}`);
  // Give the boot-trace appendFile a tick to flush before we exit.
  setTimeout(() => process.exit(0), 50).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
if (process.platform === 'win32') {
  process.on('SIGHUP', () => shutdown('SIGHUP'));
}
process.on('exit', (code) => {
  // Last-resort cleanup. If shutdown() already ran we have nothing to do.
  bootTrace(`process exit code=${code}`);
});
