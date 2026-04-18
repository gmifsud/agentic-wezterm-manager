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
      layout: {
        type: 'quad',
        leftCommand: 'left',
        rightTopCommand: 'right-top',
        leftBottomCommand: 'left-bottom',
        rightBottomCommand: 'right-bottom',
      },
      extraTabs: [],
    },
    commands: {},
  };

  it('should generate valid Lua return statement', () => {
    const lua = generateLuaText(minimalConfig);
    expect(lua).toContain('return {');
    expect(lua).toContain('}');
    expect(lua).toContain('workspaceName = \'test\'');
  });

  it('should escape single quotes in strings', () => {
    const config = { ...minimalConfig, workspaceName: "test's workspace" };
    const lua = generateLuaText(config);
    expect(lua).toContain("workspaceName = 'test\\'s workspace'");
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
});
