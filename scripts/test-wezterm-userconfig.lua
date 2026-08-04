local wezterm = require 'wezterm'
local mux = wezterm.mux

local config = {}
if wezterm.config_builder then
  config = wezterm.config_builder()
end

-- Resolve the path to the generated agentic lua dynamically.
-- Priority: env var > home directory > exe directory > hardcoded dev path
local function resolve_agentic_lua()
  -- 1. Explicit override via environment variable
  local env_path = os.getenv('AGENTIC_LUA_PATH')
  if env_path and env_path ~= '' then
    return env_path
  end

  -- 2. User's home directory (used when packaged as .exe)
  local home = os.getenv('USERPROFILE') or os.getenv('HOME')
  if home then
    local home_lua = home .. '/.agentic-wezterm.generated.lua'
    local f = io.open(home_lua, 'r')
    if f then
      f:close()
      return home_lua
    end
  end

  -- 3. Fallback: hardcoded dev path
  return 'C:/Repos/CLI/agentic-wezterm-manager/agentic-wezterm.generated.lua'
end

local agentic_path = resolve_agentic_lua()
local agentic_status, agentic = pcall(dofile, agentic_path)
if not agentic_status then
  wezterm.log_info('Agentic WezTerm generated config not loaded: ' .. tostring(agentic))
  agentic = nil
end

local project_dir = os.getenv('AGENTIC_PROJECT_DIR') or (agentic and agentic.projectDir) or wezterm.home_dir
local shell_args = (agentic and agentic.shell_args) or {'pwsh.exe', '-NoLogo'}
local shell_exe = shell_args[1]
local claude_cmd = os.getenv('AGENTIC_CLAUDE_CMD') or 'claude'
local codex_cmd = os.getenv('AGENTIC_CODEX_CMD') or 'codex'
local gemini_cmd = os.getenv('AGENTIC_GEMINI_CMD') or 'gemini'
local ollama_cmd = os.getenv('AGENTIC_OLLAMA_CMD') or 'ollama'
local startup = agentic and agentic.startup or nil
local startup_layout = startup and startup.layout or {}
local workspace_name = os.getenv('AGENTIC_WORKSPACE') or (agentic and agentic.workspaceName) or 'agentic'
local startup_left_cmd = startup_layout.leftCommand
local startup_right_top_cmd = startup_layout.rightTopCommand
local startup_left_bottom_cmd = startup_layout.leftBottomCommand
local startup_right_bottom_cmd = startup_layout.rightBottomCommand

local function ps_quote(value)
  return "'" .. tostring(value):gsub("'", "''") .. "'"
end

local function pwsh_command(command, label)
  local script = table.concat({
    "$ErrorActionPreference = 'Continue'",
    "Set-Location -LiteralPath " .. ps_quote(project_dir),
    "if (Get-Command " .. ps_quote(command) .. " -ErrorAction SilentlyContinue) { & " .. ps_quote(command) .. " } else { Write-Host " .. ps_quote(label .. ' not found in PATH. Staying in PowerShell.') .. " -ForegroundColor Yellow }"
  }, "; ")

  return {
    shell_exe,
    '-NoLogo',
    '-NoExit',
    '-Command',
    script,
  }
end

local function pwsh_info(script_lines)
  local script = table.concat(script_lines, '; ')
  return {
    shell_exe,
    '-NoLogo',
    '-NoExit',
    '-Command',
    script,
  }
end

-- Resolve which shell type a pane should use:
-- pane may be a string (legacy), a table { command, shellType, customShell }, or nil
local function resolve_pane(pane)
  if pane == nil then
    return { command = '', shellType = 'inherit', customShell = '' }
  end
  if type(pane) == 'string' then
    return { command = pane, shellType = 'inherit', customShell = '' }
  end
  return {
    command = pane.command or '',
    shellType = pane.shellType or 'inherit',
    customShell = pane.customShell or '',
  }
end

local function effective_shell_type(pane_shell_type)
  if not pane_shell_type or pane_shell_type == '' or pane_shell_type == 'inherit' then
    return agentic and agentic.shellType or 'pwsh'
  end
  return pane_shell_type
end

local function startup_args(pane_or_command)
  local pane = resolve_pane(pane_or_command)
  local command = pane.command
  local shell_type = effective_shell_type(pane.shellType)

  -- No command: just open the resolved shell using the generator helper if available
  if not command or command == '' then
    if agentic and agentic.startup_args then
      return agentic.startup_args({ shellType = pane.shellType, customShell = pane.customShell })
    end
    return shell_args
  end

  -- Custom shell with a command: best-effort: just run the custom shell, ignore command
  if shell_type == 'custom' then
    if pane.customShell and pane.customShell ~= '' then
      return { pane.customShell }
    end
    return shell_args
  end

  -- Convert newlines to shell separators so multi-line commands execute properly
  if shell_type == 'cmd' or shell_type == 'clink' then
    command = command:gsub('\r?\n', ' & ')
  else
    command = command:gsub('\r?\n', '; ')
  end

  if shell_type == 'cmd' then
    return { 'cmd.exe', '/k', command }
  elseif shell_type == 'clink' then
    return { 'cmd.exe', '/k', 'clink inject & ' .. command }
  elseif shell_type == 'powershell' then
    return { 'powershell.exe', '-NoLogo', '-NoExit', '-Command', command }
  elseif shell_type == 'pwsh' then
    return { 'pwsh.exe', '-NoLogo', '-NoExit', '-Command', command }
  elseif shell_type == 'wsl' then
    return { 'wsl.exe', 'sh', '-lc', command .. '; exec $SHELL' }
  elseif shell_type == 'gitbash' then
    return { 'bash.exe', '--login', '-lc', command .. '; exec bash' }
  end

  return shell_args
end

local function power_shell()
  return {
    shell_exe,
    '-NoLogo',
    '-NoExit',
    '-Command',
    table.concat({
      "Set-Location -LiteralPath " .. ps_quote(project_dir),
      "Write-Host 'Control pane ready for git, tests, logs, and ad-hoc commands.' -ForegroundColor Cyan",
      "Write-Host 'Launcher: Ctrl+Shift+P | New agent tabs: Ctrl+Shift+1..5' -ForegroundColor DarkCyan"
    }, '; ')
  }
end


config.default_prog = { shell_exe, '-NoLogo' }
config.default_cwd = project_dir
config.window_decorations = 'INTEGRATED_BUTTONS|RESIZE'
config.use_fancy_tab_bar = false
config.hide_tab_bar_if_only_one_tab = false
config.audible_bell = 'Disabled'
config.adjust_window_size_when_changing_font_size = false
config.scrollback_lines = 100000
config.check_for_updates = true
config.color_scheme = 'Builtin Solarized Dark'
config.font_size = 12.0

config.launch_menu = {
  {
    label = 'PowerShell',
    args = power_shell(),
    cwd = project_dir,
  },
  {
    label = 'Claude Code',
    args = pwsh_command(claude_cmd, 'Claude Code'),
    cwd = project_dir,
  },
  {
    label = 'Codex CLI',
    args = pwsh_command(codex_cmd, 'Codex CLI'),
    cwd = project_dir,
  },
  {
    label = 'Gemini CLI',
    args = pwsh_command(gemini_cmd, 'Gemini CLI'),
    cwd = project_dir,
  },
  {
    label = 'Ollama shell',
    args = pwsh_info({
      "Set-Location -LiteralPath " .. ps_quote(project_dir),
      "if (Get-Command " .. ps_quote(ollama_cmd) .. " -ErrorAction SilentlyContinue) { & " .. ps_quote(ollama_cmd) .. " list } else { Write-Host 'Ollama not found in PATH.' -ForegroundColor Yellow }",
      "Write-Host 'Run: ollama run <model> or ollama ps' -ForegroundColor Cyan"
    }),
    cwd = project_dir,
  },
}

config.keys = {
  {
    key = 'P',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.ShowLauncher,
  },
  {
    key = '1',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.SpawnCommandInNewTab {
      cwd = project_dir,
      args = power_shell(),
    },
  },
  {
    key = '2',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.SpawnCommandInNewTab {
      cwd = project_dir,
      args = pwsh_command(claude_cmd, 'Claude Code'),
    },
  },
  {
    key = '3',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.SpawnCommandInNewTab {
      cwd = project_dir,
      args = pwsh_command(codex_cmd, 'Codex CLI'),
    },
  },
  {
    key = '4',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.SpawnCommandInNewTab {
      cwd = project_dir,
      args = pwsh_command(gemini_cmd, 'Gemini CLI'),
    },
  },
  {
    key = '5',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.SpawnCommandInNewTab {
      cwd = project_dir,
      args = pwsh_info({
        "Set-Location -LiteralPath " .. ps_quote(project_dir),
        "if (Get-Command " .. ps_quote(ollama_cmd) .. " -ErrorAction SilentlyContinue) { & " .. ps_quote(ollama_cmd) .. " list } else { Write-Host 'Ollama not found in PATH.' -ForegroundColor Yellow }",
        "Write-Host 'Run: ollama run <model> or ollama ps' -ForegroundColor Cyan"
      }),
    },
  },
}

wezterm.on('gui-startup', function(cmd)
  local tab, control_pane, window = mux.spawn_window {
    workspace = workspace_name,
    cwd = project_dir,
    args = startup_args(startup_left_cmd),
  }

  if window and window.gui_window then
    window:gui_window():maximize()
  end

  local right_pane = control_pane:split {
    direction = 'Right',
    size = 0.5,
    cwd = project_dir,
    args = startup_args(startup_right_top_cmd),
  }

  local left_bottom_pane = control_pane:split {
    direction = 'Bottom',
    size = 0.5,
    cwd = project_dir,
    args = startup_args(startup_left_bottom_cmd),
  }

  local right_bottom_pane = right_pane:split {
    direction = 'Bottom',
    size = 0.5,
    cwd = project_dir,
    args = startup_args(startup_right_bottom_cmd),
  }

  -- Spawn extra tabs if defined
  local extra_tabs = startup and startup.extraTabs or {}
  for _, t in ipairs(extra_tabs) do
    local extra_tab, extra_pane = window:spawn_tab {
      args = startup_args(t),
      cwd = project_dir,
    }
    if t.title and t.title ~= '' then
      extra_tab:set_title(t.title)
    end
  end

end)


if agentic and agentic.apply then
  config = agentic.apply(config, wezterm, mux)
end

return config
