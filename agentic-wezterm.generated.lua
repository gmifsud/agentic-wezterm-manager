local agentic = {
  workspaceName = 'Obsidian',
  shell = 'pwsh.exe',
  shellType = 'pwsh',
  customShell = '',
  projectDir = 'C:\\Users\\grego\\Documents\\Obsidian\\Knowledge',

  metadata = {
    isPackaged = false,
    configDir = 'C:\\Repos\\CLI\\agentic-wezterm-manager',
    configFile = 'C:\\Repos\\CLI\\agentic-wezterm-manager\\agentic-wezterm.config.json',
    luaOutputFile = 'C:\\Repos\\CLI\\agentic-wezterm-manager\\agentic-wezterm.generated.lua',
    luaHomeFile = null,
    environment = 'dev'
  },

  appearance = {
    colorScheme = 'Monokai Pro Spectrum (Gogh)',
    font = {
      family = 'Roboto Mono',
      size = 8,
      lineHeight = 1,
    },
    window = {
      decorations = 'INTEGRATED_BUTTONS|RESIZE',
      startMaximized = true,
      useFancyTabBar = false,
      hideTabBarIfOnlyOneTab = false,
      windowBackgroundOpacity = 1,
      textBackgroundOpacity = 1,
      padding = {
        left = 8,
        right = 8,
        top = 6,
        bottom = 6,
      },
    },
    cursor = {
      style = 'BlinkingBlock',
      blinkRate = 800,
    },
    tabBar = {
      showIndex = true,
      atBottom = false,
    },
  },

  behavior = {
    scrollbackLines = 100000,
    checkForUpdates = true,
    audibleBell = 'Disabled',
    adjustWindowSizeWhenChangingFontSize = false,
    defaultDomain = 'local',
    copyOnSelect = true,
  },

  startup = {
    enabled = true,
    commandDelayMs = 500,
    layout = {
      type = 'quad',
      leftCommand = { command = 'sleep 2000\nobsidian dev:console on', shellType = 'inherit', customShell = '' },
      rightTopCommand = { command = 'sleep 2000\necho "Booting openclaw ..."\n\nopenclaw logs --follow', shellType = 'wsl', customShell = '' },
      leftBottomCommand = { command = 'sleep 2000\necho "Running Pieces"\npieces', shellType = 'inherit', customShell = '' },
      rightBottomCommand = { command = 'sleep 2000\ngemini', shellType = 'wsl', customShell = '' },
    },
    extraTabs = {

    },
  },

  commands = {
    openclaw = {
      title = 'openclaw',
      program = '',
      args = {  },
      cwd = '',
      includeInLaunchMenu = true,
      includeHotkey = true,
      hotkey = '',
    },
  },

  themes = {
  ['Monokai Pro Spectrum (Gogh)'] = {
    foreground = '#f7f1ff',
    background = '#222222',
    cursor_bg = '#bab6c0',
    cursor_fg = '#faf6ff',
    cursor_border = '#bab6c0',
    selection_fg = '#f7f1ff',
    selection_bg = '#525053',
    scrollbar_thumb = '#222222',
    split = '#222222',
    compose_cursor = '#fce566',
    ansi = { '#222222', '#fc618d', '#7bd88f', '#fce566', '#fd9353', '#948ae3', '#5ad4e6', '#f7f1ff' },
    brights = { '#69676c', '#fc618d', '#7bd88f', '#fce566', '#fd9353', '#948ae3', '#5ad4e6', '#f7f1ff' },
    
  }
  },

  activeTheme = '',

  keybindings = {
    { key = 'N', mods = 'CTRL', action = { type = 'SpawnWindow', params = {} }, enabled = true, description = 'Spawn Window', disableDefault = true }
  },
}

-- Resolved shell args based on shellType/customShell
local cli_presets = {
  pwsh = { shell = 'pwsh.exe', args = {'-NoLogo'} },
  powershell = { shell = 'powershell.exe', args = {'-NoLogo'} },
  cmd = { shell = 'cmd.exe', args = {} },
  clink = { shell = 'cmd.exe', args = {'/k', 'clink', 'inject'} },
  wsl = { shell = 'wsl.exe', args = {} },
  gitbash = { shell = 'bash.exe', args = {'--login'} },
}

if agentic.shellType == 'custom' and agentic.customShell and agentic.customShell ~= '' then
  agentic.shell_args = { agentic.customShell }
elseif cli_presets[agentic.shellType] then
  local preset = cli_presets[agentic.shellType]
  if preset.args and #preset.args > 0 then
    agentic.shell_args = { preset.shell, table.unpack(preset.args) }
  else
    agentic.shell_args = { preset.shell }
  end
else
  agentic.shell_args = { agentic.shell, '-NoLogo' }
end

-- Startup delay in milliseconds
agentic.startup_delay = agentic.startup.commandDelayMs or 500

-- Resolve the spawn-args for a given shellType/customShell pair.
-- Pass 'inherit' (or nil/'') to fall back to the global shell.
-- Use this from your wezterm.lua when spawning the quad layout panes,
-- e.g.  local args = agentic.resolve_shell(pane.shellType, pane.customShell)
function agentic.resolve_shell(shellType, customShell)
  if not shellType or shellType == '' or shellType == 'inherit' then
    return agentic.shell_args
  end
  if shellType == 'custom' then
    if customShell and customShell ~= '' then
      return { customShell }
    end
    return agentic.shell_args
  end
  local preset = cli_presets[shellType]
  if not preset then
    return agentic.shell_args
  end
  if preset.args and #preset.args > 0 then
    return { preset.shell, table.unpack(preset.args) }
  end
  return { preset.shell }
end

-- Convenience wrapper: returns spawn-args for a pane/tab object that
-- exposes shellType and customShell fields.
function agentic.startup_args(pane)
  if not pane then
    return agentic.shell_args
  end
  return agentic.resolve_shell(pane.shellType, pane.customShell)
end

local function append(target, item)
  if not target then
    target = {}
  end
  table.insert(target, item)
  return target
end

local function command_args(command)
  local args = { command.program }
  for _, arg in ipairs(command.args or {}) do
    table.insert(args, arg)
  end
  return args
end

local function parse_hotkey(hotkey)
  if not hotkey or hotkey == '' then
    return nil
  end

  local parts = {}
  for part in string.gmatch(hotkey, '[^+]+') do
    table.insert(parts, part)
  end

  if #parts == 0 then
    return nil
  end

  local key = parts[#parts]
  local mods = {}

  for index = 1, #parts - 1 do
    local mod = string.upper(parts[index])
    if mod == 'CONTROL' then
      mod = 'CTRL'
    elseif mod == 'OPTION' then
      mod = 'ALT'
    elseif mod == 'COMMAND' or mod == 'WIN' or mod == 'WINDOWS' then
      mod = 'SUPER'
    end
    table.insert(mods, mod)
  end

  return {
    key = key,
    mods = table.concat(mods, '|'),
  }
end

function agentic.apply(config, wezterm, mux)
  local data = agentic
  local appearance = data.appearance or {}
  local behavior = data.behavior or {}

  -- CLI preset resolution
  local cli_presets = {
    pwsh = { shell = 'pwsh.exe', args = {'-NoLogo'} },
    powershell = { shell = 'powershell.exe', args = {'-NoLogo'} },
    cmd = { shell = 'cmd.exe', args = {} },
    clink = { shell = 'cmd.exe', args = {'/k', 'clink', 'inject'} },
    wsl = { shell = 'wsl.exe', args = {} },
    gitbash = { shell = 'bash.exe', args = {'--login'} },
  }

  if data.shellType == 'custom' and data.customShell and data.customShell ~= '' then
    config.default_prog = { data.customShell }
  elseif cli_presets[data.shellType] then
    local preset = cli_presets[data.shellType]
    if preset.args and #preset.args > 0 then
      config.default_prog = { preset.shell, table.unpack(preset.args) }
    else
      config.default_prog = { preset.shell }
    end
  else
    config.default_prog = { data.shell, '-NoLogo' }
  end

  config.default_cwd = data.projectDir

  -- Theme resolution: custom theme takes precedence over built-in color scheme
  local theme_name = data.activeTheme
  if (not theme_name or theme_name == '') then
    theme_name = appearance.colorScheme
  end

  if theme_name and theme_name ~= '' and data.themes and data.themes[theme_name] then
    local theme = data.themes[theme_name]
    config.color_schemes = {
      [theme_name] = {
        foreground = theme.foreground,
        background = theme.background,
        cursor_bg = theme.cursor_bg,
        cursor_fg = theme.cursor_fg,
        cursor_border = theme.cursor_border,
        selection_fg = theme.selection_fg,
        selection_bg = theme.selection_bg,
        scrollbar_thumb = theme.scrollbar_thumb,
        split = theme.split,
        compose_cursor = theme.compose_cursor,
        ansi = theme.ansi,
        brights = theme.brights,
      },
    }
    config.color_scheme = theme_name
  elseif appearance.colorScheme then
    config.color_scheme = appearance.colorScheme
  end

  if appearance.font then
    if wezterm and wezterm.font and appearance.font.family then
      config.font = wezterm.font(appearance.font.family)
    end
    config.font_size = appearance.font.size
    config.line_height = appearance.font.lineHeight
  end

  if appearance.window then
    config.window_decorations = appearance.window.decorations
    config.use_fancy_tab_bar = appearance.window.useFancyTabBar
    config.hide_tab_bar_if_only_one_tab = appearance.window.hideTabBarIfOnlyOneTab
    config.window_background_opacity = appearance.window.windowBackgroundOpacity
    config.text_background_opacity = appearance.window.textBackgroundOpacity
    config.window_padding = appearance.window.padding
  end

  if appearance.cursor then
    config.default_cursor_style = appearance.cursor.style
    config.cursor_blink_rate = appearance.cursor.blinkRate
  end

  if appearance.tabBar then
    config.show_tab_index_in_tab_bar = appearance.tabBar.showIndex
    config.tab_bar_at_bottom = appearance.tabBar.atBottom
  end

  config.scrollback_lines = behavior.scrollbackLines
  config.check_for_updates = behavior.checkForUpdates
  config.audible_bell = behavior.audibleBell
  config.adjust_window_size_when_changing_font_size = behavior.adjustWindowSizeWhenChangingFontSize

  if behavior.defaultDomain and behavior.defaultDomain ~= '' and behavior.defaultDomain ~= 'DefaultDomain' and behavior.defaultDomain ~= 'local' then
    config.default_domain = behavior.defaultDomain
  end

  if behavior.copyOnSelect and wezterm and wezterm.action then
    config.mouse_bindings = append(config.mouse_bindings, {
      event = { Up = { streak = 1, button = 'Left' } },
      mods = 'NONE',
      action = wezterm.action.CompleteSelectionOrOpenLinkAtMouseCursor 'Clipboard',
    })
  end

  for _, command in pairs(data.commands or {}) do
    if command.includeInLaunchMenu then
      config.launch_menu = append(config.launch_menu, {
        label = command.title,
        args = command_args(command),
        cwd = command.cwd,
      })
    end

    if command.includeHotkey and wezterm and wezterm.action then
      local hotkey = parse_hotkey(command.hotkey)
      if hotkey then
        config.keys = append(config.keys, {
          key = hotkey.key,
          mods = hotkey.mods,
          action = wezterm.action.SpawnCommandInNewTab {
            cwd = command.cwd,
            args = command_args(command),
          },
        })
      end
    end
  end

  -- Custom keybindings
  local function make_action(action_def)
    local action_type = action_def.type
    local params = action_def.params or {}

    -- Unit actions (no parameters)
    if action_type == 'ReloadConfiguration' then return wezterm.action.ReloadConfiguration end
    if action_type == 'ToggleFullScreen' then return wezterm.action.ToggleFullScreen end
    if action_type == 'SpawnWindow' then return wezterm.action.SpawnWindow end
    if action_type == 'TogglePaneZoom' then return wezterm.action.TogglePaneZoom end
    if action_type == 'IncreaseFontSize' then return wezterm.action.IncreaseFontSize end
    if action_type == 'DecreaseFontSize' then return wezterm.action.DecreaseFontSize end
    if action_type == 'ResetFontSize' then return wezterm.action.ResetFontSize end
    if action_type == 'ScrollToTop' then return wezterm.action.ScrollToTop end
    if action_type == 'ScrollToBottom' then return wezterm.action.ScrollToBottom end
    if action_type == 'ActivateCopyMode' then return wezterm.action.ActivateCopyMode end
    if action_type == 'QuickSelect' then return wezterm.action.QuickSelect end
    if action_type == 'ShowLauncher' then return wezterm.action.ShowLauncher end
    if action_type == 'DisableDefaultAssignment' then return wezterm.action.DisableDefaultAssignment end

    -- String parameter actions
    if action_type == 'CopyTo' then return wezterm.action.CopyTo(params.target or 'Clipboard') end
    if action_type == 'PasteFrom' then return wezterm.action.PasteFrom(params.target or 'Clipboard') end
    if action_type == 'ActivatePaneDirection' then return wezterm.action.ActivatePaneDirection(params.direction or 'Left') end
    if action_type == 'SpawnTab' then return wezterm.action.SpawnTab(params.domain or 'CurrentPaneDomain') end

    -- Numeric parameter actions
    if action_type == 'ActivateTab' then return wezterm.action.ActivateTab(tonumber(params.tabIndex) or 0) end
    if action_type == 'ActivateTabRelative' then return wezterm.action.ActivateTabRelative(tonumber(params.offset) or 1) end
    if action_type == 'ScrollByPage' then return wezterm.action.ScrollByPage(tonumber(params.amount) or 1) end
    if action_type == 'ScrollByLine' then return wezterm.action.ScrollByLine(tonumber(params.amount) or 1) end

    -- Table parameter actions
    if action_type == 'SplitHorizontal' then
      return wezterm.action.SplitHorizontal { domain = params.domain or 'CurrentPaneDomain' }
    end
    if action_type == 'SplitVertical' then
      return wezterm.action.SplitVertical { domain = params.domain or 'CurrentPaneDomain' }
    end
    if action_type == 'CloseCurrentTab' then
      return wezterm.action.CloseCurrentTab { confirm = params.confirm ~= false }
    end
    if action_type == 'AdjustPaneSize' then
      return wezterm.action.AdjustPaneSize { params.direction or 'Left', tonumber(params.amount) or 1 }
    end
    if action_type == 'EmitEvent' then
      return wezterm.action.EmitEvent { name = params.name or '' }
    end

    -- Fallback: try to use the action type directly
    return wezterm.action[action_type]
  end

  for _, kb in ipairs(data.keybindings or {}) do
    if kb.enabled and wezterm and wezterm.action then
      -- If disableDefault is set, emit a DisableDefaultAssignment first to override WezTerm defaults
      if kb.disableDefault then
        config.keys = append(config.keys, {
          key = kb.key,
          mods = kb.mods,
          action = wezterm.action.DisableDefaultAssignment,
        })
      end
      local action = make_action(kb.action)
      if action then
        config.keys = append(config.keys, {
          key = kb.key,
          mods = kb.mods,
          action = action,
        })
      end
    end
  end

  -- Environment indicator
  if data.metadata and data.metadata.environment then
    wezterm.log_info("Agentic WezTerm Manager: Loaded " .. data.metadata.environment .. " config from " .. (data.metadata.luaOutputFile or "unknown path"))
  end

  return config
end

return agentic
