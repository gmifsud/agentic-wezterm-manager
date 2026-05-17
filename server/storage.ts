import fs from 'fs';
import path from 'path';
import { AgenticConfig, agenticConfigSchema } from '../shared/schema';
import { generateLuaText } from '../shared/lua-generator';

export { generateLuaText };

// When packaged with pkg, `process.pkg` is defined and `process.cwd()` is the
// caller's directory, not the project. Fall back to the .exe's own directory so
// the config sits next to the executable.
const isPackaged = typeof (process as { pkg?: unknown }).pkg !== 'undefined';
const CONFIG_DIR =
  process.env.CONFIG_DIR ||
  (isPackaged ? path.dirname(process.execPath) : process.cwd());
const CONFIG_FILE = path.join(CONFIG_DIR, 'agentic-wezterm.config.json');
const LUA_OUTPUT_FILE = path.join(CONFIG_DIR, 'agentic-wezterm.generated.lua');

function normalizeConfig(config: AgenticConfig): AgenticConfig {
  return {
    ...config,
    shellType: config.shellType || 'pwsh',
    customShell: config.customShell || '',
    behavior: {
      ...config.behavior,
      defaultDomain: config.behavior.defaultDomain === 'DefaultDomain' ? 'local' : config.behavior.defaultDomain,
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
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return normalizeConfig(agenticConfigSchema.parse(parsed));
    } catch (err) {
      console.error('Error parsing config, returning default', err);
    }
  }
  return normalizeConfig(agenticConfigSchema.parse({}));
}

export function saveConfig(config: AgenticConfig): void {
  const normalizedConfig = normalizeConfig(config);

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(normalizedConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write config file:', err);
    throw new Error('Failed to save configuration');
  }

  try {
    const luaContent = generateLuaText(normalizedConfig);
    fs.writeFileSync(LUA_OUTPUT_FILE, luaContent, 'utf-8');
  } catch (err) {
    console.error('Failed to write Lua file:', err);
    throw new Error('Failed to generate Lua configuration');
  }
}
