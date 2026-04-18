import { z } from 'zod';

const MAX_STRING_LENGTH = 1000;
const MAX_ARRAY_LENGTH = 100;

const stringField = () => z.string().max(MAX_STRING_LENGTH, `Max ${MAX_STRING_LENGTH} characters`);

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
  defaultDomain: 'DefaultDomain',
  copyOnSelect: false,
};

const defaultStartup = {
  enabled: true,
  layout: {
    type: 'quad',
    leftCommand: 'powershell',
    rightTopCommand: 'claude',
    leftBottomCommand: 'codex',
    rightBottomCommand: 'gemini',
  },
  extraTabs: [],
};

export const agenticConfigSchema = z.object({
  workspaceName: stringField().default('agentic'),
  shell: stringField().default('pwsh.exe'),
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
    layout: z.object({
      type: stringField().default(defaultStartup.layout.type),
      leftCommand: stringField().default(defaultStartup.layout.leftCommand),
      rightTopCommand: stringField().default(defaultStartup.layout.rightTopCommand),
      leftBottomCommand: stringField().default(defaultStartup.layout.leftBottomCommand),
      rightBottomCommand: stringField().default(defaultStartup.layout.rightBottomCommand),
    }),
    extraTabs: z.array(
      z.object({
        command: stringField(),
        title: stringField(),
      })
    ).max(MAX_ARRAY_LENGTH).default(defaultStartup.extraTabs),
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
});

export type AgenticConfig = z.infer<typeof agenticConfigSchema>;
