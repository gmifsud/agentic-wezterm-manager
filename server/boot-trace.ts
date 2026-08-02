// Boot-stage tracing for the packaged exe.
//
// The existing agentic-wezterm-manager.error.log only records thrown errors, so
// a boot that hangs rather than throws leaves nothing behind. Every write here
// is synchronous: a hard hang must not lose lines still sitting in a buffer, so
// the last line in the file is the last stage that actually completed.
//
// This module must stay dependency-free (node builtins only) and must be the
// first import in server/index.ts, so that a hang while initialising express,
// zod or storage still gets a "process start" line on disk.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOG_NAME = 'agentic-wezterm-manager.boot.log';

const isPackaged = typeof (process as { pkg?: unknown }).pkg !== 'undefined';

// Truncating with an empty write doubles as the writability probe, so the
// fallback is chosen before the first stage rather than mid-boot.
function openLogFile(): string | null {
  const baseDir = isPackaged ? path.dirname(process.execPath) : process.cwd();
  for (const candidate of [
    path.join(baseDir, LOG_NAME),
    path.join(os.tmpdir(), LOG_NAME),
  ]) {
    try {
      fs.writeFileSync(candidate, '');
      return candidate;
    } catch {
      // Read-only install directory, most likely — try the temp dir next.
    }
  }
  return null;
}

let logFile = openLogFile();

export function bootTrace(message: string): void {
  const line = `${new Date().toISOString()} [boot] ${message}`;
  try {
    console.log(line);
  } catch {
    // A packaged exe launched from Explorer can have no usable stdout.
  }
  if (logFile === null) return;
  try {
    fs.appendFileSync(logFile, `${line}\n`);
  } catch {
    // Diagnostics must never be the thing that kills boot. Stop trying to
    // write; stdout still carries the remaining stages.
    logFile = null;
  }
}

// Brackets anything that could block, so a missing END names the culprit.
export function bootStage<T>(name: string, run: () => T): T {
  bootTrace(`BEGIN ${name}`);
  try {
    const result = run();
    bootTrace(`END ${name}`);
    return result;
  } catch (err) {
    bootTrace(`FAILED ${name}: ${err instanceof Error ? err.stack : String(err)}`);
    throw err;
  }
}

// server/index.ts derives every asset path from this, and on Windows the
// snapshot path is the one spelling fileURLToPath can reject. Resolving it here
// first turns a silent module-init throw into a logged line.
function thisDir(): string {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch (err) {
    return `(unresolvable: ${err instanceof Error ? err.message : String(err)})`;
  }
}

bootTrace(`process start - log file: ${logFile ?? '(none writable, stdout only)'}`);
bootTrace(`node ${process.version} on ${process.platform}/${process.arch}, pid ${process.pid}`);
bootTrace(`isPackaged=${isPackaged} execPath=${process.execPath}`);
bootTrace(`cwd=${process.cwd()}`);
bootTrace(`import.meta.url=${import.meta.url} -> dirname=${thisDir()}`);
bootTrace(`snapshot path=${thisDir().includes('snapshot')}`);
bootTrace(`argv=${JSON.stringify(process.argv)}`);
bootTrace(
  `env PORT=${process.env.PORT ?? '(unset)'} CONFIG_DIR=${process.env.CONFIG_DIR ?? '(unset)'} NO_OPEN=${process.env.NO_OPEN ?? '(unset)'}`,
);
// Paired with the END logged by the entry module once every import has
// initialised, so a hang inside express/zod/storage init leaves a dangling
// BEGIN rather than looking like a clean start.
bootTrace('BEGIN module init - loading entry module dependencies');
