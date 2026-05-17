import { z } from 'zod';

const MAX_STRING_LENGTH = 1000;
const MAX_ARRAY_LENGTH = 100;

const stringField = () => z.string().max(MAX_STRING_LENGTH, `Max ${MAX_STRING_LENGTH} characters`);

export const CLI_PRESETS: Record<string, { shell: string }> = {
  pwsh: { shell: 'pwsh.exe' },
  powershell: { shell: 'powershell.exe' },
  cmd: { shell: 'cmd.exe' },
  clink: { shell: 'cmd.exe' },
  wsl: { shell: 'wsl.exe' },
  gitbash: { shell: 'bash.exe' },
  custom: { shell: '' },
};

const defaultAppearance = {
  colorScheme: 'Builtin Solarized Dark',
  font: {
    family: 'Cascadia Code',
    size: 12.0,
    lineHeight: 1.0,
  },
  window: {
    decorations: 'INTEGRATED_BUTTONS|RESIZE',
    startMaximized: true,
    useFancyTabBar: false,
    hideTabBarIfOnlyOneTab: false,
    windowBackgroundOpacity: 0.96,
    textBackgroundOpacity: 1.0,
    padding: { left: 8, right: 8, top: 6, bottom: 6 },
  },
  cursor: { style: 'BlinkingBlock', blinkRate: 800 },
  tabBar: { showIndex: true, atBottom: false },
};

const defaultBehavior = {
  scrollbackLines: 100000,
  checkForUpdates: true,
  audibleBell: 'Disabled',
  adjustWindowSizeWhenChangingFontSize: false,
  defaultDomain: 'local',
  copyOnSelect: false,
};

function defaultPane(command: string) {
  return { command, shellType: 'inherit' as const, customShell: '' };
}

const defaultStartup = {
  enabled: true,
  commandDelayMs: 500,
  layout: {
    type: 'quad',
    leftCommand: defaultPane('powershell'),
    rightTopCommand: defaultPane('claude'),
    leftBottomCommand: defaultPane('codex'),
    rightBottomCommand: defaultPane('gemini'),
  },
  extraTabs: [],
};

const defaultAnsiColors = [
  '#1e1e1e', '#f48771', '#a1cd5e', '#e4c877',
  '#6ab0f3', '#f47590', '#00bcd4', '#d4d4d4',
];

const defaultBrightColors = [
  '#8b8b8b', '#f48771', '#a1cd5e', '#e4c877',
  '#6ab0f3', '#f47590', '#00bcd4', '#ffffff',
];

// A startup pane: text command + optional per-pane shell override.
// Accepts a bare string (legacy format) and rewrites it on the fly so existing
// agentic-wezterm.config.json files keep loading without migration.
export const PANE_SHELL_TYPES = [
  'inherit', 'pwsh', 'powershell', 'cmd', 'clink', 'wsl', 'gitbash', 'custom',
] as const;
export const paneSchema = z.preprocess(
  (val) =>
    typeof val === 'string'
      ? { command: val, shellType: 'inherit', customShell: '' }
      : val,
  z.object({
    command: stringField().default(''),
    shellType: z.enum(PANE_SHELL_TYPES).default('inherit'),
    customShell: stringField().default(''),
  }),
);
export type PaneConfig = z.infer<typeof paneSchema>;

// Extra startup tab. Same per-tab shell override pattern as paneSchema, but
// also carries a `title` for the tab label. Legacy entries (no shellType)
// auto-upgrade in place.
export const extraTabSchema = z.preprocess(
  (val) => {
    if (val && typeof val === 'object' && !('shellType' in (val as object))) {
      return { ...(val as object), shellType: 'inherit', customShell: '' };
    }
    return val;
  },
  z.object({
    command: stringField().default(''),
    title: stringField().default(''),
    shellType: z.enum(PANE_SHELL_TYPES).default('inherit'),
    customShell: stringField().default(''),
  }),
);
export type ExtraTabConfig = z.infer<typeof extraTabSchema>;

const colorPaletteSchema = z.object({
  foreground: stringField().default('#d4d4d4'),
  background: stringField().default('#1e1e1e'),
  cursor_bg: stringField().default('#52ad70'),
  cursor_fg: stringField().default('#1e1e1e'),
  cursor_border: stringField().default('#52ad70'),
  selection_fg: stringField().default('#1e1e1e'),
  selection_bg: stringField().default('#3a3d41'),
  scrollbar_thumb: stringField().default('#3a3d41'),
  split: stringField().default('#444444'),
  compose_cursor: stringField().default('#fbd38d'),
  ansi: z.array(stringField()).length(8).default(defaultAnsiColors),
  brights: z.array(stringField()).length(8).default(defaultBrightColors),
  indexed: z.record(z.string(), z.string()).default({}),
});

const keybindingActionSchema = z.object({
  type: z.string().default('ReloadConfiguration'),
  params: z.record(z.string(), z.unknown()).default({}),
});

const keybindingSchema = z.object({
  key: stringField(),
  mods: stringField().default('CTRL'),
  action: keybindingActionSchema,
  enabled: z.boolean().default(true),
  description: stringField().default(''),
  disableDefault: z.boolean().default(false),
});

export const BUILTIN_COLOR_SCHEMES = [
  'Builtin Solarized Dark',
  'Builtin Solarized Light',
  'Dracula',
  'Gruvbox Dark',
  'Gruvbox Light',
  'Nord',
  'One Dark',
  'Tokyo Night',
  'Catppuccin Mocha',
  'Catppuccin Latte',
  'Monokai',
  'Monokai Pro',
  'Batman',
  'Afterglow',
  'Argonaut',
  'Aurora',
  'ayu Dark',
  'ayu Light',
  'ayu Mirage',
  'Belafonte Day',
  'Brogrammer',
  'Campbell',
  'Catppuccin Frappe',
  'Catppuccin Macchiato',
  'Challenger Deep',
  'Cobalt Neon',
  'Cyberpunk',
  'Dark Pastel',
  'Dark+',
  'Debian',
  'Doom One',
  'Espresso',
  'Everforest Dark',
  'Everforest Light',
  'Falcon',
  'Flat',
  'Foxnightly',
  'GitHub Dark',
  'GitHub Light',
  'Gotham',
  'Gruvbox Material Dark',
  'Gruvbox Material Light',
  'Hardcore',
  'Horizon',
  'Hyper',
  'Invisibone',
  'Iterm Dark',
  'Iterm Light',
  'Kanagawa',
  'Kibble',
  'lowcontrast',
  'Material Ocean',
  'Material Theme',
  'Material Theme Lighter',
  'Material Theme Palenight',
  'Misterioso',
  'Molokai',
  'Night Owlish Light',
  'Nightfox',
  'Noctis Winter',
  'Novel',
  'Ocean',
  'Oceanic Material',
  'Ollie',
  'One Light',
  'Panda',
  'PaperColor Dark',
  'PaperColor Light',
  'Paraiso Dark',
  'PaulMillr',
  'Pencil Dark',
  'Pencil Light',
  'Piatto Light',
  'Powershell',
  'Pro',
  'Red Alert',
  'Red Planet',
  'Remedy Dark',
  'Rippedcasts',
  'Shel',
  'Snazzy',
  'SoftServer',
  'Solarized Darcula',
  'SpaceGray',
  'SpaceGray Eighties',
  'SpaceGray Eighties Dull',
  'Spiderman',
  'Sublette',
  'Sublime',
  'Sundried',
  'Symfonic',
  'Tango Dark',
  'Tango Light',
  'Tender',
  'Terminal Basic',
  'Terminix Dark',
  'Thelovelace',
  'Tomorrow',
  'Tomorrow Night',
  'Tomorrow Night Blue',
  'Tomorrow Night Bright',
  'Tomorrow Night Eighties',
  'ToyChest',
  'Treehouse',
  'Twilight',
  'Ubuntu',
  'Velvet',
  'VibrantInk',
  'Visual Studio Dark',
  'Visual Studio Light',
  'WarmNeon',
  'Wez',
  'WildCherry',
  'Wombat',
  'Wryan',
  'zenbones',
  'zenburn',
] as const;

export const KEYBINDING_ACTIONS: Record<string, { label: string; category: string; params?: Record<string, { type: string; default?: string }> }> = {
  ReloadConfiguration: { label: 'Reload Configuration', category: 'Config' },
  ToggleFullScreen: { label: 'Toggle Full Screen', category: 'Window' },
  SpawnWindow: { label: 'Spawn Window', category: 'Window' },
  SpawnTab: { label: 'Spawn Tab', category: 'Tab', params: { domain: { type: 'string', default: 'CurrentPaneDomain' } } },
  ActivateTab: { label: 'Activate Tab', category: 'Tab', params: { tabIndex: { type: 'number' } } },
  ActivateTabRelative: { label: 'Activate Tab Relative', category: 'Tab', params: { offset: { type: 'number' } } },
  CloseCurrentTab: { label: 'Close Current Tab', category: 'Tab', params: { confirm: { type: 'boolean', default: 'true' } } },
  SplitHorizontal: { label: 'Split Horizontal', category: 'Pane', params: { domain: { type: 'string', default: 'CurrentPaneDomain' } } },
  SplitVertical: { label: 'Split Vertical', category: 'Pane', params: { domain: { type: 'string', default: 'CurrentPaneDomain' } } },
  ActivatePaneDirection: { label: 'Activate Pane Direction', category: 'Pane', params: { direction: { type: 'string' } } },
  AdjustPaneSize: { label: 'Adjust Pane Size', category: 'Pane', params: { direction: { type: 'string' }, amount: { type: 'number' } } },
  TogglePaneZoom: { label: 'Toggle Pane Zoom', category: 'Pane' },
  IncreaseFontSize: { label: 'Increase Font Size', category: 'Font' },
  DecreaseFontSize: { label: 'Decrease Font Size', category: 'Font' },
  ResetFontSize: { label: 'Reset Font Size', category: 'Font' },
  CopyTo: { label: 'Copy To', category: 'Clipboard', params: { target: { type: 'string', default: 'Clipboard' } } },
  PasteFrom: { label: 'Paste From', category: 'Clipboard', params: { target: { type: 'string', default: 'Clipboard' } } },
  ScrollByPage: { label: 'Scroll By Page', category: 'Scroll', params: { amount: { type: 'number' } } },
  ScrollByLine: { label: 'Scroll By Line', category: 'Scroll', params: { amount: { type: 'number' } } },
  ScrollToTop: { label: 'Scroll To Top', category: 'Scroll' },
  ScrollToBottom: { label: 'Scroll To Bottom', category: 'Scroll' },
  ActivateCopyMode: { label: 'Activate Copy Mode', category: 'Mode' },
  QuickSelect: { label: 'Quick Select', category: 'Mode' },
  ShowLauncher: { label: 'Show Launcher', category: 'Mode' },
  DisableDefaultAssignment: { label: 'Disable Default', category: 'Other' },
  EmitEvent: { label: 'Emit Event', category: 'Other', params: { name: { type: 'string' } } },
};

export const agenticConfigSchema = z.object({
  workspaceName: stringField().default('agentic'),
  shell: stringField().default('pwsh.exe'),
  shellType: z.enum(['pwsh', 'powershell', 'cmd', 'clink', 'wsl', 'gitbash', 'custom']).default('pwsh'),
  customShell: stringField().default(''),
  projectDir: stringField().default('C:\\path\\to\\your\\repo'),
  appearance: z.object({
    colorScheme: stringField().default(defaultAppearance.colorScheme),
    font: z.object({
      family: stringField().default(defaultAppearance.font.family),
      size: z.number().default(defaultAppearance.font.size),
      lineHeight: z.number().default(defaultAppearance.font.lineHeight),
    }),
    window: z.object({
      decorations: stringField().default(defaultAppearance.window.decorations),
      startMaximized: z.boolean().default(defaultAppearance.window.startMaximized),
      useFancyTabBar: z.boolean().default(defaultAppearance.window.useFancyTabBar),
      hideTabBarIfOnlyOneTab: z.boolean().default(defaultAppearance.window.hideTabBarIfOnlyOneTab),
      windowBackgroundOpacity: z.number().default(defaultAppearance.window.windowBackgroundOpacity),
      textBackgroundOpacity: z.number().default(defaultAppearance.window.textBackgroundOpacity),
      padding: z.object({
        left: z.number().default(defaultAppearance.window.padding.left),
        right: z.number().default(defaultAppearance.window.padding.right),
        top: z.number().default(defaultAppearance.window.padding.top),
        bottom: z.number().default(defaultAppearance.window.padding.bottom),
      }),
    }),
    cursor: z.object({
      style: stringField().default(defaultAppearance.cursor.style),
      blinkRate: z.number().default(defaultAppearance.cursor.blinkRate),
    }),
    tabBar: z.object({
      showIndex: z.boolean().default(defaultAppearance.tabBar.showIndex),
      atBottom: z.boolean().default(defaultAppearance.tabBar.atBottom),
    }),
  }).default(defaultAppearance),
  behavior: z.object({
    scrollbackLines: z.number().default(defaultBehavior.scrollbackLines),
    checkForUpdates: z.boolean().default(defaultBehavior.checkForUpdates),
    audibleBell: stringField().default(defaultBehavior.audibleBell),
    adjustWindowSizeWhenChangingFontSize: z.boolean().default(defaultBehavior.adjustWindowSizeWhenChangingFontSize),
    defaultDomain: stringField().default(defaultBehavior.defaultDomain),
    copyOnSelect: z.boolean().default(defaultBehavior.copyOnSelect),
  }).default(defaultBehavior),
  startup: z.object({
    enabled: z.boolean().default(defaultStartup.enabled),
    commandDelayMs: z.number().min(0).max(10000).default(defaultStartup.commandDelayMs),
    layout: z.object({
      type: stringField().default(defaultStartup.layout.type),
      leftCommand: paneSchema.default(defaultStartup.layout.leftCommand),
      rightTopCommand: paneSchema.default(defaultStartup.layout.rightTopCommand),
      leftBottomCommand: paneSchema.default(defaultStartup.layout.leftBottomCommand),
      rightBottomCommand: paneSchema.default(defaultStartup.layout.rightBottomCommand),
    }),
    extraTabs: z.array(extraTabSchema).max(MAX_ARRAY_LENGTH).default(defaultStartup.extraTabs),
  }).default(defaultStartup),
  commands: z.record(z.string(), z.object({
    title: stringField(),
    program: stringField(),
    args: z.array(stringField()).max(MAX_ARRAY_LENGTH).default([]),
    cwd: stringField(),
    includeInLaunchMenu: z.boolean().default(true),
    includeHotkey: z.boolean().default(true),
    hotkey: stringField(),
  })).default({}),
  themes: z.record(z.string(), colorPaletteSchema).default({}),
  activeTheme: stringField().default(''),
  keybindings: z.array(keybindingSchema).default([]),
});

export type AgenticConfig = z.infer<typeof agenticConfigSchema>;
export type ColorPalette = z.infer<typeof colorPaletteSchema>;
export type Keybinding = z.infer<typeof keybindingSchema>;
