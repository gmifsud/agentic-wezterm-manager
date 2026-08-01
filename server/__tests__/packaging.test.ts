// @vitest-environment node
// esbuild refuses to load under jsdom, whose TextEncoder is not a real Uint8Array.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  IMPORT_META_URL_ID,
  IMPORT_META_URL_BANNER,
  serverBuildOptions,
} from "../../scripts/build-server.mjs";
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

describe("bundled script assets", () => {
  const pkgJson = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
  );

  it("should unpack every scripts/ asset pkg embeds", () => {
    const embedded = (pkgJson.pkg.assets as string[])
      .filter((asset) => asset.startsWith("scripts/"))
      .map((asset) => asset.slice("scripts/".length));
    expect(embedded).not.toHaveLength(0);
    expect(BUNDLED_SCRIPTS).toEqual(embedded);
  });

  it("should reference the profiler launcher the {managerDir} command invokes", () => {
    expect(BUNDLED_SCRIPTS).toContain("Start-ObsidianProfiler.ps1");
  });
});
