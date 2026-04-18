import { describe, it, expect } from 'vitest';
import { agenticConfigSchema } from '../../shared/schema';

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

describe('agenticConfigSchema', () => {
  it('should apply top-level defaults', () => {
    const result = agenticConfigSchema.parse({});
    expect(result.workspaceName).toBe('agentic');
    expect(result.shell).toBe('pwsh.exe');
  });

  it('should parse config with custom values', () => {
    const result = agenticConfigSchema.parse({
      ...minimalConfig,
      workspaceName: 'my-workspace',
      shell: 'cmd.exe',
      projectDir: 'D:\\projects',
    });
    expect(result.workspaceName).toBe('my-workspace');
    expect(result.shell).toBe('cmd.exe');
    expect(result.projectDir).toBe('D:\\projects');
  });

  it('should reject strings exceeding max length', () => {
    const longString = 'a'.repeat(1001);
    const config = { ...minimalConfig, workspaceName: longString };
    expect(() => agenticConfigSchema.parse(config)).toThrow();
  });

  it('should validate nested appearance settings', () => {
    const result = agenticConfigSchema.parse({
      ...minimalConfig,
      appearance: {
        ...minimalConfig.appearance,
        colorScheme: 'Monokai Pro',
        font: {
          family: 'Fira Code',
          size: 14,
          lineHeight: 1.5,
        },
      },
    });
    expect(result.appearance.colorScheme).toBe('Monokai Pro');
    expect(result.appearance.font.family).toBe('Fira Code');
    expect(result.appearance.font.size).toBe(14);
  });

  it('should validate commands', () => {
    const result = agenticConfigSchema.parse({
      ...minimalConfig,
      commands: {
        dev: {
          title: 'Development',
          program: 'npm',
          args: ['run', 'dev'],
          cwd: '/project',
          includeInLaunchMenu: true,
          includeHotkey: true,
          hotkey: 'Ctrl+D',
        },
      },
    });
    expect(result.commands.dev).toBeDefined();
    expect(result.commands.dev.title).toBe('Development');
    expect(result.commands.dev.args).toEqual(['run', 'dev']);
  });
});
