import fs from 'fs';
import path from 'path';
import { AgenticConfig, agenticConfigSchema } from '../shared/schema';

const CONFIG_DIR = process.env.CONFIG_DIR || process.cwd();
const CONFIG_FILE = path.join(CONFIG_DIR, 'agentic-wezterm.config.json');
const LUA_OUTPUT_FILE = path.join(CONFIG_DIR, 'agentic-wezterm.generated.lua');

export function loadConfig(): AgenticConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return agenticConfigSchema.parse(parsed);
    } catch (err) {
      console.error('Error parsing config, returning default', err);
    }
  }
  return agenticConfigSchema.parse({});
}

export function saveConfig(config: AgenticConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write config file:', err);
    throw new Error('Failed to save configuration');
  }
  
  try {
    const luaContent = generateLuaText(config);
    fs.writeFileSync(LUA_OUTPUT_FILE, luaContent, 'utf-8');
  } catch (err) {
    console.error('Failed to write Lua file:', err);
    throw new Error('Failed to generate Lua configuration');
  }
}

export function generateLuaText(config: AgenticConfig): string {
  // A helper function to properly quote strings for Lua output
  const str = (val: string) => `'${val.replace(/'/g, "\\'")}'`;

  // Build the Commands Block
  const commandsLines: string[] = [];
  for (const [key, cmd] of Object.entries(config.commands)) {
    const argsStr = cmd.args.map(str).join(', ');
    commandsLines.push(`    ${key} = {
      title = ${str(cmd.title)},
      program = ${str(cmd.program)},
      args = { ${argsStr} },
      cwd = ${str(cmd.cwd)},
      includeInLaunchMenu = ${cmd.includeInLaunchMenu},
      includeHotkey = ${cmd.includeHotkey},
      hotkey = ${str(cmd.hotkey)},
    },`);
  }

  // Build the Extra Tabs Block
  const extraTabsLines: string[] = config.startup.extraTabs.map(tab => 
    `      { command = ${str(tab.command)}, title = ${str(tab.title)} },`
  );

  return `return {
  workspaceName = ${str(config.workspaceName)},
  shell = ${str(config.shell)},
  projectDir = ${str(config.projectDir)},

  appearance = {
    colorScheme = ${str(config.appearance.colorScheme)},
    font = {
      family = ${str(config.appearance.font.family)},
      size = ${config.appearance.font.size},
      lineHeight = ${config.appearance.font.lineHeight},
    },
    window = {
      decorations = ${str(config.appearance.window.decorations)},
      startMaximized = ${config.appearance.window.startMaximized},
      useFancyTabBar = ${config.appearance.window.useFancyTabBar},
      hideTabBarIfOnlyOneTab = ${config.appearance.window.hideTabBarIfOnlyOneTab},
      windowBackgroundOpacity = ${config.appearance.window.windowBackgroundOpacity},
      textBackgroundOpacity = ${config.appearance.window.textBackgroundOpacity},
      padding = {
        left = ${config.appearance.window.padding.left},
        right = ${config.appearance.window.padding.right},
        top = ${config.appearance.window.padding.top},
        bottom = ${config.appearance.window.padding.bottom},
      },
    },
    cursor = {
      style = ${str(config.appearance.cursor.style)},
      blinkRate = ${config.appearance.cursor.blinkRate},
    },
    tabBar = {
      showIndex = ${config.appearance.tabBar.showIndex},
      atBottom = ${config.appearance.tabBar.atBottom},
    },
  },

  behavior = {
    scrollbackLines = ${config.behavior.scrollbackLines},
    checkForUpdates = ${config.behavior.checkForUpdates},
    audibleBell = ${str(config.behavior.audibleBell)},
    adjustWindowSizeWhenChangingFontSize = ${config.behavior.adjustWindowSizeWhenChangingFontSize},
    defaultDomain = ${str(config.behavior.defaultDomain)},
    copyOnSelect = ${config.behavior.copyOnSelect},
  },

  startup = {
    enabled = ${config.startup.enabled},
    layout = {
      type = ${str(config.startup.layout.type)},
      leftCommand = ${str(config.startup.layout.leftCommand)},
      rightTopCommand = ${str(config.startup.layout.rightTopCommand)},
      leftBottomCommand = ${str(config.startup.layout.leftBottomCommand)},
      rightBottomCommand = ${str(config.startup.layout.rightBottomCommand)},
    },
    extraTabs = {
${extraTabsLines.join('\n')}
    },
  },

  commands = {
${commandsLines.join('\n')}
  },
}
`;
}
