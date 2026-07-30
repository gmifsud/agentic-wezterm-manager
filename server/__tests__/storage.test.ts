import { describe, it, expect, vi } from "vitest";
import { generateLuaText } from "../storage";

vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe("generateLuaText", () => {
  const minimalConfig = {
    workspaceName: "test",
    shell: "pwsh.exe",
    shellType: "pwsh",
    customShell: "",
    projectDir: "C:\\test",
    appearance: {
      colorScheme: "Dark",
      font: { family: "Consolas", size: 12, lineHeight: 1.0 },
      window: {
        decorations: "RESIZE",
        startMaximized: true,
        useFancyTabBar: false,
        hideTabBarIfOnlyOneTab: false,
        windowBackgroundOpacity: 0.95,
        textBackgroundOpacity: 1.0,
        padding: { left: 8, right: 8, top: 8, bottom: 8 },
      },
      cursor: { style: "Block", blinkRate: 800 },
      tabBar: { showIndex: true, atBottom: false },
    },
    behavior: {
      scrollbackLines: 10000,
      checkForUpdates: true,
      audibleBell: "Disabled",
      adjustWindowSizeWhenChangingFontSize: false,
      defaultDomain: "DefaultDomain",
      copyOnSelect: false,
    },
    startup: {
      enabled: true,
      commandDelayMs: 500,
      layout: {
        type: "quad",
        leftCommand: { command: "left", shellType: "inherit", customShell: "" },
        rightTopCommand: {
          command: "right-top",
          shellType: "inherit",
          customShell: "",
        },
        leftBottomCommand: {
          command: "left-bottom",
          shellType: "wsl",
          customShell: "",
        },
        rightBottomCommand: {
          command: "right-bottom",
          shellType: "custom",
          customShell: "C:\\nu.exe",
        },
      },
      extraTabs: [],
    },
    commands: {},
    themes: {},
    activeTheme: "",
    keybindings: [],
  };

  it("should generate valid Lua return statement", () => {
    const lua = generateLuaText(minimalConfig as any);
    expect(lua).toContain("local agentic = {");
    expect(lua).toContain("function agentic.apply(config, wezterm, mux)");
    expect(lua).toContain("return agentic");
    expect(lua).toContain("workspaceName = 'test'");
  });

  it("should escape single quotes in strings", () => {
    const config = { ...minimalConfig, workspaceName: "test's workspace" };
    const lua = generateLuaText(config as any);
    expect(lua).toContain("workspaceName = 'test\\'s workspace'");
  });

  it("should escape backslashes in strings", () => {
    const lua = generateLuaText(minimalConfig as any);
    expect(lua).toContain("projectDir = 'C:\\\\test'");
  });

  it("should include appearance settings", () => {
    const lua = generateLuaText(minimalConfig as any);
    expect(lua).toContain("colorScheme = 'Dark'");
    expect(lua).toContain("family = 'Consolas'");
    expect(lua).toContain("size = 12");
  });

  it("should include startup settings", () => {
    const lua = generateLuaText(minimalConfig as any);
    expect(lua).toContain("enabled = true");
    expect(lua).toContain("type = 'quad'");
  });

  it("should emit each pane with its own shell override", () => {
    const lua = generateLuaText(minimalConfig as any);
    expect(lua).toContain(
      "leftCommand = { command = 'left', shellType = 'inherit', customShell = '' }",
    );
    expect(lua).toContain(
      "leftBottomCommand = { command = 'left-bottom', shellType = 'wsl', customShell = '' }",
    );
    expect(lua).toContain(
      "rightBottomCommand = { command = 'right-bottom', shellType = 'custom', customShell = 'C:\\\\nu.exe' }",
    );
    expect(lua).toContain(
      "function agentic.resolve_shell(shellType, customShell)",
    );
    expect(lua).toContain("function agentic.startup_args(pane)");
  });

  it("should emit extra tabs with per-tab shell override", () => {
    const config = {
      ...minimalConfig,
      startup: {
        ...minimalConfig.startup,
        extraTabs: [
          {
            command: "htop",
            title: "Monitor",
            shellType: "wsl",
            customShell: "",
          },
          {
            command: "nu",
            title: "Nushell",
            shellType: "custom",
            customShell: "C:\\nu.exe",
          },
        ],
      },
    };
    const lua = generateLuaText(config as any);
    expect(lua).toContain(
      "{ command = 'htop', title = 'Monitor', shellType = 'wsl', customShell = '' },",
    );
    expect(lua).toContain(
      "{ command = 'nu', title = 'Nushell', shellType = 'custom', customShell = 'C:\\\\nu.exe' },",
    );
  });

  it("should map copy on select without using an invalid config field", () => {
    const config = {
      ...minimalConfig,
      behavior: {
        ...minimalConfig.behavior,
        copyOnSelect: true,
      },
    };
    const lua = generateLuaText(config as any);
    expect(lua).not.toContain("config.copy_on_select");
    expect(lua).toContain(
      "CompleteSelectionOrOpenLinkAtMouseCursor 'Clipboard'",
    );
  });

  it("should not map DefaultDomain as a config default domain", () => {
    const lua = generateLuaText(minimalConfig as any);
    expect(lua).toContain("defaultDomain = 'DefaultDomain'");
    expect(lua).toContain("behavior.defaultDomain ~= 'DefaultDomain'");
    expect(lua).toContain("behavior.defaultDomain ~= 'local'");
  });

  it("should format commands correctly", () => {
    const config = {
      ...minimalConfig,
      commands: {
        dev: {
          title: "Dev Server",
          program: "npm",
          args: ["run", "dev"],
          cwd: "/project",
          includeInLaunchMenu: true,
          includeHotkey: true,
          hotkey: "Ctrl+D",
        },
      },
    };
    const lua = generateLuaText(config as any);
    expect(lua).toContain("dev = {");
    expect(lua).toContain("title = 'Dev Server'");
    expect(lua).toContain("program = 'npm'");
    expect(lua).toContain("args = { 'run', 'dev' }");
  });

  it("should quote command keys that are not Lua identifiers", () => {
    const config = {
      ...minimalConfig,
      commands: {
        "dev server": {
          title: "Dev Server",
          program: "npm",
          args: ["run", "dev"],
          cwd: "/project",
          includeInLaunchMenu: true,
          includeHotkey: true,
          hotkey: "Ctrl+D",
        },
      },
    };
    const lua = generateLuaText(config as any);
    expect(lua).toContain("['dev server'] = {");
  });

  describe("startup handler", () => {
    const lua = generateLuaText(minimalConfig as any);

    it("should emit a gui-startup handler and call it from apply", () => {
      expect(lua).toContain("function agentic.setup(config, wezterm, mux)");
      expect(lua).toContain("wezterm.on('gui-startup', function(cmd)");
      expect(lua).toContain("agentic.setup(config, wezterm, mux)");
    });

    it("should guard against registering the handler twice", () => {
      expect(lua).toContain("if agentic._startup_registered then");
      expect(lua).toContain("agentic._startup_registered = true");
    });

    it("should spawn a plain window when startup is disabled", () => {
      expect(lua).toContain("if not startup.enabled then");
      expect(lua).toContain("mux.spawn_window(cmd or {})");
    });

    it("should spawn the window from the left pane shell in projectDir", () => {
      expect(lua).toContain(
        "local tab, main_pane, window = mux.spawn_window(spawn_opts(layout.leftCommand))",
      );
      expect(lua).toContain("args = agentic.startup_args(pane),");
      expect(lua).toContain("cwd = data.projectDir,");
    });

    it("should split a quad layout with per-pane shells", () => {
      expect(lua).toContain("if layout.type == 'quad' then");
      expect(lua).toContain("local right_top = main_pane:split {");
      expect(lua).toContain("local left_bottom = main_pane:split {");
      expect(lua).toContain("local right_bottom = right_top:split {");
      expect(lua).toContain("direction = 'Right',");
      expect(lua).toContain("direction = 'Bottom',");
      expect(lua).toContain("size = 0.5,");
      expect(lua).toContain(
        "args = agentic.startup_args(layout.rightBottomCommand),",
      );
    });

    it("should type pane commands with send_text after a staggered delay", () => {
      expect(lua).toContain("pane:send_text(command .. '\\r')");
      expect(lua).toContain("wezterm.time.call_after(delay_ms / 1000,");
      expect(lua).toContain(
        "send_command(entry.pane, entry.command, base_delay + (offset + index - 1) * stagger)",
      );
      expect(lua).toContain("local base_delay = startup.commandDelayMs or 500");
    });

    it("should spawn extra tabs with their title and command", () => {
      expect(lua).toContain(
        "for _, tab_config in ipairs(startup.extraTabs or {}) do",
      );
      expect(lua).toContain(
        "local extra_tab, extra_pane = window:spawn_tab(spawn_opts(tab_config))",
      );
      expect(lua).toContain("extra_tab:set_title(tab_config.title)");
      expect(lua).toContain("send_all(tab_entries, #entries)");
    });

    it("should title the main tab and maximize when configured", () => {
      expect(lua).toContain("tab:set_title(data.workspaceName)");
      expect(lua).toContain("tab:activate()");
      expect(lua).toContain("data.appearance.window.startMaximized then");
      expect(lua).toContain("gui_window:maximize()");
    });
  });

  it("should include metadata when provided", () => {
    const metadata = {
      environment: "dev",
      luaOutputFile: "C:\\path\\to\\lua",
    };
    const lua = generateLuaText(minimalConfig as any, metadata);
    expect(lua).toContain("metadata = {");
    expect(lua).toContain("environment = 'dev'");
    expect(lua).toContain("luaOutputFile = 'C:\\\\path\\\\to\\\\lua'");
    expect(lua).toContain(
      'wezterm.log_info("Agentic WezTerm Manager: Loaded " .. data.metadata.environment .. " config from " .. (data.metadata.luaOutputFile or "unknown path"))',
    );
  });
});
