import fs from "fs";
import path from "path";
import { AgenticConfig, agenticConfigSchema } from "../shared/schema";
import { generateLuaText } from "../shared/lua-generator";
import { bootTrace } from "./boot-trace";

export { generateLuaText };

// Detect a packaged distribution. Two flavours:
//   - pkg / yao-pkg sets `process.pkg`.
//   - Node SEA (Single Executable Application) does not, but the entry's
//     `__filename` then equals `process.execPath` because the embedded JS
//     runs from the exe's own path. Either signal collapses to "the user is
//     running a binary we shipped them, not the source."
const isPackaged =
  typeof (process as { pkg?: unknown }).pkg !== "undefined" ||
  process.execPath === __filename;
const CONFIG_DIR =
  process.env.CONFIG_DIR ||
  (isPackaged ? path.dirname(process.execPath) : process.cwd());
const CONFIG_FILE = path.join(CONFIG_DIR, "agentic-wezterm.config.json");
const LUA_OUTPUT_FILE = path.join(CONFIG_DIR, "agentic-wezterm.generated.lua");

// When packaged, also write the generated lua to the user's home directory
// so the wezterm.lua can find it without a hardcoded path.
const HOME_DIR = process.env.USERPROFILE || process.env.HOME || process.cwd();
const LUA_HOME_FILE = path.join(HOME_DIR, ".agentic-wezterm.generated.lua");

// Paths only — no fs call at module init, so importing storage stays free of
// side effects. server/index.ts probes the files during boot.
bootTrace(`storage: CONFIG_DIR=${CONFIG_DIR} (isPackaged=${isPackaged})`);
bootTrace(`storage: CONFIG_FILE=${CONFIG_FILE}`);
bootTrace(`storage: LUA_OUTPUT_FILE=${LUA_OUTPUT_FILE} LUA_HOME_FILE=${LUA_HOME_FILE}`);

function normalizeConfig(config: AgenticConfig): AgenticConfig {
  return {
    ...config,
    shellType: config.shellType || "pwsh",
    customShell: config.customShell || "",
    behavior: {
      ...config.behavior,
      defaultDomain:
        config.behavior.defaultDomain === "DefaultDomain"
          ? "local"
          : config.behavior.defaultDomain,
    },
    startup: {
      ...config.startup,
      commandDelayMs: config.startup.commandDelayMs ?? 500,
    },
  };
}

export function loadConfig(): AgenticConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(data);
      return normalizeConfig(agenticConfigSchema.parse(parsed));
    } catch (err) {
      console.error("Error parsing config, returning default", err);
    }
  }
  return normalizeConfig(agenticConfigSchema.parse({}));
}

export function getMetadata() {
  return {
    isPackaged,
    configDir: CONFIG_DIR,
    configFile: CONFIG_FILE,
    luaOutputFile: LUA_OUTPUT_FILE,
    luaHomeFile: isPackaged ? LUA_HOME_FILE : null,
    environment: isPackaged
      ? "production"
      : process.env.NODE_ENV === "test"
        ? "test"
        : "dev",
  };
}

export function saveConfig(config: AgenticConfig): void {
  const normalizedConfig = normalizeConfig(config);

  try {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(normalizedConfig, null, 2),
      "utf-8",
    );
  } catch (err) {
    console.error("Failed to write config file:", err);
    throw new Error("Failed to save configuration");
  }

  try {
    const metadata = getMetadata();
    const luaContent = generateLuaText(normalizedConfig, metadata);
    fs.writeFileSync(LUA_OUTPUT_FILE, luaContent, "utf-8");

    // When packaged, also write to the user's home directory so wezterm.lua
    // can find it without a hardcoded path.
    if (isPackaged) {
      fs.writeFileSync(LUA_HOME_FILE, luaContent, "utf-8");
    }
  } catch (err) {
    console.error("Failed to write Lua file:", err);
    throw new Error("Failed to generate Lua configuration");
  }
}
