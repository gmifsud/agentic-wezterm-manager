// @vitest-environment node
// esbuild refuses to load under jsdom, whose TextEncoder is not a real Uint8Array.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  IMPORT_META_URL_ID,
  IMPORT_META_URL_BANNER,
  serverBuildOptions,
} from "../../scripts/server-build-config.mjs";
import { BUNDLED_SCRIPTS } from "../bundled-scripts";

// Under pkg the entry really does live on a drive-lettered path.
const WIN_FILENAME = "C:\\snapshot\\agentic-wezterm-manager\\dist-server\\index.cjs";
const POSIX_FILENAME = "/snapshot/agentic-wezterm-manager/dist-server/index.cjs";

// Runs the banner esbuild actually prepends, with __filename and the url module
// swapped for the platform under test, and returns what import.meta.url becomes.
function evaluateBanner(filename: string, windows: boolean): string {
  const urlStub = { pathToFileURL: (p: string) => pathToFileURL(p, { windows }) };
  const run = new Function(
    "require",
    "__filename",
    `${IMPORT_META_URL_BANNER}\nreturn ${IMPORT_META_URL_ID};`,
  );
  return run(() => urlStub, filename);
}

describe("server bundle import.meta.url substitution", () => {
  it("should define import.meta.url as the banner identifier", () => {
    expect(serverBuildOptions.define["import.meta.url"]).toBe(IMPORT_META_URL_ID);
    expect(serverBuildOptions.banner.js).toBe(IMPORT_META_URL_BANNER);
  });

  it("should build a file:// URL rather than substituting __filename raw", () => {
    // A bare __filename is the tempting shortcut and survives on POSIX, where
    // fileURLToPath tolerates a leading slash. It cannot work on Windows.
    expect(IMPORT_META_URL_BANNER).toContain("pathToFileURL(__filename).href");
    expect(IMPORT_META_URL_BANNER).not.toMatch(/=\s*__filename/);
  });

  it("should round-trip a Windows pkg snapshot path through fileURLToPath", () => {
    const url = evaluateBanner(WIN_FILENAME, true);
    expect(url).toBe(
      "file:///C:/snapshot/agentic-wezterm-manager/dist-server/index.cjs",
    );
    expect(fileURLToPath(url, { windows: true })).toBe(WIN_FILENAME);
    expect(path.win32.dirname(fileURLToPath(url, { windows: true }))).toBe(
      "C:\\snapshot\\agentic-wezterm-manager\\dist-server",
    );
  });

  it("should round-trip a POSIX pkg snapshot path through fileURLToPath", () => {
    const url = evaluateBanner(POSIX_FILENAME, false);
    expect(fileURLToPath(url, { windows: false })).toBe(POSIX_FILENAME);
  });

  it("should reject a raw Windows path, proving the round-trip is load-bearing", () => {
    expect(() => fileURLToPath(WIN_FILENAME, { windows: true })).toThrow();
  });
});

describe("server build script", () => {
  const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
  const script = path.join(repoRoot, "scripts", "build-server.mjs");

  it("should not gate the build behind a main-module check", () => {
    // argv[1] and import.meta.url disagree whenever the invocation path is
    // spelled differently from the loader's canonical one (junction, subst
    // drive, symlink), and the build would then be skipped with no output and
    // a zero exit code.
    const code = readFileSync(script, "utf-8").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/process\.argv\[1\][\s\S]{0,120}import\.meta\.url/);
  });

  it("should build the bundle and report its size", () => {
    const result = spawnSync(process.execPath, [script], {
      cwd: repoRoot,
      encoding: "utf-8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Built dist-server[\\/]index\.cjs \(\d+ KB\)/);
    expect(
      statSync(path.join(repoRoot, "dist-server", "index.cjs")).size,
    ).toBeGreaterThan(100 * 1024);
  }, 60_000);

  it("should exit non-zero and explain itself when the build cannot run", () => {
    // Run from elsewhere so the relative entry point cannot resolve.
    const result = spawnSync(process.execPath, [script], {
      cwd: os.tmpdir(),
      encoding: "utf-8",
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("Failed to build");
  }, 60_000);
});

describe("bundled script assets", () => {
  const scriptsRoot = path.join(
    fileURLToPath(new URL("../../", import.meta.url)),
    "scripts",
  );

  // The Node SEA build (scripts/build-sea.mjs) copies scripts/ alongside the
  // exe rather than embedding them like pkg did. The runtime contract is the
  // same: the unpacked file at release/scripts/<name> must exist for the
  // {managerDir} command in the generated Lua to work. Build pipeline
  // integrity is now verified by build-sea.mjs itself (it copies the file
  // and the verify step probes the runtime), so this test pins the contract
  // between the runtime's expected list and the actual file on disk.
  it("should mirror the profiler launcher scripts/ contains", () => {
    const onDisk = existsSync(
      path.join(scriptsRoot, "Start-ObsidianProfiler.ps1"),
    )
      ? ["Start-ObsidianProfiler.ps1"]
      : [];
    expect(BUNDLED_SCRIPTS).toEqual(onDisk);
  });

  it("should reference the profiler launcher the {managerDir} command invokes", () => {
    expect(BUNDLED_SCRIPTS).toContain("Start-ObsidianProfiler.ps1");
  });
});
