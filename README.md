# Agentic WezTerm Manager

The Agentic WezTerm Manager is a web-based GUI application designed to give you a declarative, visual way to manage your WezTerm configuration. It uses a JSON file as the source of truth and generates a separate `agentic-wezterm.generated.lua` file. This ensures your manual Lua modifications remain untouched and separates your main configuration from the auto-generated components.

*(Note: If you're looking for a Tmux configuration manager, this project specifically targets WezTerm!)*

## 🚀 Quick Start

Ensure you have Node.js and `npm` installed on your system.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the application:**
   ```bash
   npm run dev
   ```
   This will spin up both the Vite frontend server and the Express backend simultaneously.

3. **Open the Manager:**
   Navigate your browser to the local address provided by Vite (typically `http://localhost:5173/` or similar) to view and edit your configuration via the UI.

## ⚙️ How It Works

* **The GUI (Frontend):** A React/Tailwind application provides a categorized dashboard (General, Appearance, Behavior, Startup, Commands) where you can easily modify your WezTerm preferences, define startup layouts, and configure custom commands.
* **The Server (Backend):** A local Node server that handles file writing.
* **Configuration Source:** Your settings are saved securely as `agentic-wezterm.config.json` inside the project root directory.
* **Generated output:** As soon as you hit **Save**, the backend immediately updates your config and compiles an `agentic-wezterm.generated.lua` file containing the updated variables and commands for WezTerm.

## 🔌 Connecting to WezTerm

To actually load these settings into WezTerm, load the generated Lua file from your main `wezterm.lua` (usually `~/.wezterm.lua` or `$HOME/.config/wezterm/wezterm.lua`).

1. Locate the absolute path to your `agentic-wezterm.generated.lua` file. (e.g., `C:/Repos/CLI/agentic-wezterm-manager/agentic-wezterm.generated.lua`).
2. `dofile` it and hand the config builder to `agentic.apply`. That's the whole integration:

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()

-- Safely attempt to load the generated config
local status, agentic = pcall(dofile, "C:/Repos/CLI/agentic-wezterm-manager/agentic-wezterm.generated.lua")

if status and agentic then
  -- Maps appearance/behavior/keybindings/commands AND registers the
  -- startup layout (quad panes + extra tabs) via 'gui-startup'.
  agentic.apply(config, wezterm, wezterm.mux)
else
  wezterm.log_info("Agentic WezTerm config not found or failed to load. Using defaults.")
end

return config
```

> **Use `dofile`, not `require`.** The generated filename contains dots, so `require 'agentic-wezterm.generated'` resolves to a nonexistent `agentic-wezterm/generated.lua` path and fails.

> **Note:** `agentic.apply` mutates and returns the config builder, so you do not need to map individual properties yourself. The raw settings table is still exposed (e.g. `agentic.appearance.colorScheme`) if you want to read values in your own hand-written Lua.

### Startup layout

`agentic.apply` calls `agentic.setup`, which registers a `wezterm.on('gui-startup', ...)` handler. On the next WezTerm launch it:

* Spawns the window in `projectDir` using the **Left** pane's shell.
* For `layout.type = "quad"`, splits Right (50%), then Bottom on each column, spawning every pane with its own resolved shell (`pwsh` / `wsl` / `gitbash` / `inherit` / custom). Any other layout type falls back to a single pane.
* Types each pane's command with `send_text` after `commandDelayMs`, staggering panes ~300ms apart. Commands are typed rather than passed as spawn args so multiline scripts work.
* Spawns each **extra tab**, sets its title, and types its command the same way.
* Titles the first tab with the workspace name and maximizes the window when **Start maximized** is set.

Set **Startup → Enabled** off to opt out; WezTerm then opens a plain default window. If you prefer to call it yourself, `agentic.setup(config, wezterm, wezterm.mux)` is safe to call directly — registration is guarded, so calling both it and `apply` will not spawn the layout twice.

## 📦 Packaging as a Standalone `.exe`

For end users who don't want to install Node.js, the project can be packaged into a single Windows executable that starts the server and opens the browser automatically.

```bash
npm run package
```

Output: `release/agentic-wezterm-manager.exe` (≈85 MB). Double-click it and the web UI opens at `http://localhost:3001` (or the next free port). `agentic-wezterm.config.json` and `agentic-wezterm.generated.lua` are written next to the `.exe`.

Useful env vars:
- `PORT` — preferred port (default `3001`, auto-increments if busy)
- `NO_OPEN=1` — skip the browser auto-open
- `CONFIG_DIR` — override where the JSON/Lua files are written

## 🎨 Theme

The web UI's light/dark mode is derived from your WezTerm theme selection — no separate setting. Custom themes are classified by their background luminance; built-in WezTerm schemes are classified by name (e.g. "Tomorrow Night" → dark, "GitHub Light" → light). Pick a scheme in the **Appearance** tab or the **Themes** tab and the UI follows.

## 🛠️ Tech Stack

* **Frontend:** React, TypeScript, Vite, Tailwind CSS v4
* **Backend:** Express, Node.js, `tsx` watcher
* **Validation:** Zod
