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
  // The schema defaults are the workspace that ships with the bundled exe —
  // a fresh `agentic-wezterm.config.json` is empty/missing and WezTerm is
  // configured from these defaults via loadConfig(). Pin them here so a
  // future edit to shared/schema.ts that drifts away from the Knowledge
  // workspace gets caught at test time, not in the user's terminal.
  it('should apply top-level defaults', () => {
    const result = agenticConfigSchema.parse({});
    expect(result.workspaceName).toBe('Knowledge');
    expect(result.shell).toBe('pwsh.exe');
    expect(result.shellType).toBe('pwsh');
    expect(result.projectDir).toBe('C:\\Users\\grego\\Documents\\Obsidian\\Knowledge');
  });

  it('should apply appearance defaults matching the Knowledge workspace', () => {
    const result = agenticConfigSchema.parse({});
    expect(result.appearance.colorScheme).toBe('Monokai Pro Octagon (Gogh)');
    expect(result.appearance.font.family).toBe('Roboto Mono');
    expect(result.appearance.font.size).toBe(8);
    expect(result.appearance.window.startMaximized).toBe(true);
    expect(result.appearance.window.padding).toEqual({
      left: 8,
      right: 8,
      top: 6,
      bottom: 6,
    });
    expect(result.appearance.cursor.style).toBe('BlinkingBlock');
  });

  it('should ship the quad startup layout with Knowledge pane commands', () => {
    const result = agenticConfigSchema.parse({});
    expect(result.startup.enabled).toBe(true);
    expect(result.startup.commandDelayMs).toBe(500);
    expect(result.startup.layout.type).toBe('quad');
    expect(result.startup.layout.leftCommand.command).toContain('Consulting the oracle');
    expect(result.startup.layout.rightTopCommand.shellType).toBe('wsl');
    expect(result.startup.layout.rightBottomCommand.shellType).toBe('gitbash');
    expect(result.startup.layout.leftBottomCommand.command).toContain('Checking Ollama');
  });

  it('should ship six extra tabs in declaration order', () => {
    const result = agenticConfigSchema.parse({});
    const titles = result.startup.extraTabs.map((t) => t.title);
    expect(titles).toEqual([
      'Pieces',
      'Miyo',
      'Weztern Commands',
      'Neovim Commands',
      'Kilocode Console',
      'Vault Architect',
    ]);
  });

  it('should ship the Monokai Pro Octagon palette under themes', () => {
    const result = agenticConfigSchema.parse({});
    const palette = result.themes['Monokai Pro Octagon (Gogh)'];
    expect(palette).toBeDefined();
    expect(palette.background).toBe('#282a3a');
    expect(palette.foreground).toBe('#eaf2f1');
    expect(palette.ansi).toHaveLength(8);
    expect(palette.brights).toHaveLength(8);
  });

  it('should default behavior.copyOnSelect to true', () => {
    const result = agenticConfigSchema.parse({});
    expect(result.behavior.copyOnSelect).toBe(true);
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
