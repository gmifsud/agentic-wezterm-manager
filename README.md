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

To actually load these settings into WezTerm, you need to import the generated Lua file into your main `wezterm.lua` configuration file (which is usually located in `~/.wezterm.lua` or `$HOME/.config/wezterm/wezterm.lua`).

1. Locate the absolute path to your `agentic-wezterm.generated.lua` file. (e.g., `C:/Repos/CLI/agentic-wezterm-manager/agentic-wezterm.generated.lua`).
2. Add the following logic to your `wezterm.lua` to pull in the generated settings:

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()

-- Safely attempt to load the generated config
local status, generated_config = pcall(dofile, "C:/Repos/CLI/agentic-wezterm-manager/agentic-wezterm.generated.lua")

if status and generated_config then
  -- Example of how to map a generated setting to the actual config
  if generated_config.appearance then
    config.color_scheme = generated_config.appearance.colorScheme
    config.font_size = generated_config.appearance.font.size
  end
  
  -- Add more mappings based on what you configured in the Web UI
  -- ...
else
  wezterm.log_info("Agentic WezTerm config not found or failed to load. Using defaults.")
end

return config
```

> **Note:** The `agentic-wezterm.generated.lua` file returns a Lua dictionary containing all your settings. You'll need to map the returned properties onto the actual `wezterm.config_builder()` object in your primary config file.

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
