import { describe, it, expect, vi } from 'vitest';
import { generateLuaText } from '../storage';

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe('generateLuaText', () => {
  const minimalConfig = {
    workspaceName: 'test',
    shell: 'pwsh.exe',
    shellType: 'pwsh',
    customShell: '',
    projectDir: 'C:\\test',
    appearance: {
      colorScheme: 'Dark',
      font: { family: 'Consolas', size: 12, lineHeight: 1.0 },
      window: {
        decorations: 'RESIZE',
        startMaximized: true,
        useFancyTabBar: false,
        hideTabBarIfOnlyOneTab: false,
        windowBackgroundOpacity: 0.95,
        textBackgroundOpacity: 1.0,
        padding: { left: 8, right: 8, top: 8, bottom: 8 },
      },
      cursor: { style: 'Block', blinkRate: 800 },
      tabBar: { showIndex: true, atBottom: false },
    },
    behavior: {
      scrollbackLines: 10000,
      checkForUpdates: true,
      audibleBell: 'Disabled',
      adjustWindowSizeWhenChangingFontSize: false,
      defaultDomain: 'DefaultDomain',
      copyOnSelect: false,
    },
    startup: {
      enabled: true,
      commandDelayMs: 500,
      layout: {
        type: 'quad',
        leftCommand: { command: 'left', shellType: 'inherit', customShell: '' },
        rightTopCommand: { command: 'right-top', shellType: 'inherit', customShell: '' },
        leftBottomCommand: { command: 'left-bottom', shellType: 'wsl', customShell: '' },
        rightBottomCommand: { command: 'right-bottom', shellType: 'custom', customShell: 'C:\\nu.exe' },
      },
      extraTabs: [],
    },
    commands: {},
    themes: {},
    activeTheme: '',
    keybindings: [],
  };

  it('should generate valid Lua return statement', () => {
    const lua = generateLuaText(minimalConfig);
    expect(lua).toContain('local agentic = {');
    expect(lua).toContain('function agentic.apply(config, wezterm, mux)');
    expect(lua).toContain('return agentic');
    expect(lua).toContain('workspaceName = \'test\'');
  });

  it('should escape single quotes in strings', () => {
    const config = { ...minimalConfig, workspaceName: "test's workspace" };
    const lua = generateLuaText(config);
    expect(lua).toContain("workspaceName = 'test\\'s workspace'");
  });

  it('should escape backslashes in strings', () => {
    const lua = generateLuaText(minimalConfig);
    expect(lua).toContain("projectDir = 'C:\\\\test'");
  });

  it('should include appearance settings', () => {
    const lua = generateLuaText(minimalConfig);
    expect(lua).toContain("colorScheme = 'Dark'");
    expect(lua).toContain("family = 'Consolas'");
    expect(lua).toContain('size = 12');
  });

  it('should include startup settings', () => {
    const lua = generateLuaText(minimalConfig);
    expect(lua).toContain('enabled = true');
    expect(lua).toContain("type = 'quad'");
  });

  it('should emit each pane with its own shell override', () => {
    const lua = generateLuaText(minimalConfig);
    expect(lua).toContain("leftCommand = { command = 'left', shellType = 'inherit', customShell = '' }");
    expect(lua).toContain("leftBottomCommand = { command = 'left-bottom', shellType = 'wsl', customShell = '' }");
    expect(lua).toContain("rightBottomCommand = { command = 'right-bottom', shellType = 'custom', customShell = 'C:\\\\nu.exe' }");
    expect(lua).toContain('function agentic.resolve_shell(shellType, customShell)');
    expect(lua).toContain('function agentic.startup_args(pane)');
  });

  it('should emit extra tabs with per-tab shell override', () => {
    const config = {
      ...minimalConfig,
      startup: {
        ...minimalConfig.startup,
        extraTabs: [
          { command: 'htop', title: 'Monitor', shellType: 'wsl', customShell: '' },
          { command: 'nu', title: 'Nushell', shellType: 'custom', customShell: 'C:\\nu.exe' },
        ],
      },
    };
    const lua = generateLuaText(config);
    expect(lua).toContain("{ command = 'htop', title = 'Monitor', shellType = 'wsl', customShell = '' },");
    expect(lua).toContain("{ command = 'nu', title = 'Nushell', shellType = 'custom', customShell = 'C:\\\\nu.exe' },");
  });

  it('should map copy on select without using an invalid config field', () => {
    const config = {
      ...minimalConfig,
      behavior: {
        ...minimalConfig.behavior,
        copyOnSelect: true,
      },
    };
    const lua = generateLuaText(config);
    expect(lua).not.toContain('config.copy_on_select');
    expect(lua).toContain("CompleteSelectionOrOpenLinkAtMouseCursor 'Clipboard'");
  });

  it('should not map DefaultDomain as a config default domain', () => {
    const lua = generateLuaText(minimalConfig);
    expect(lua).toContain("defaultDomain = 'DefaultDomain'");
    expect(lua).toContain("behavior.defaultDomain ~= 'DefaultDomain'");
    expect(lua).toContain("behavior.defaultDomain ~= 'local'");
  });

  it('should format commands correctly', () => {
    const config = {
      ...minimalConfig,
      commands: {
        dev: {
          title: 'Dev Server',
          program: 'npm',
          args: ['run', 'dev'],
          cwd: '/project',
          includeInLaunchMenu: true,
          includeHotkey: true,
          hotkey: 'Ctrl+D',
        },
      },
    };
    const lua = generateLuaText(config);
    expect(lua).toContain('dev = {');
    expect(lua).toContain("title = 'Dev Server'");
    expect(lua).toContain("program = 'npm'");
    expect(lua).toContain("args = { 'run', 'dev' }");
  });

  it('should quote command keys that are not Lua identifiers', () => {
    const config = {
      ...minimalConfig,
      commands: {
        'dev server': {
          title: 'Dev Server',
          program: 'npm',
          args: ['run', 'dev'],
          cwd: '/project',
          includeInLaunchMenu: true,
          includeHotkey: true,
          hotkey: 'Ctrl+D',
        },
      },
    };
    const lua = generateLuaText(config);
    expect(lua).toContain("['dev server'] = {");
  });
});
