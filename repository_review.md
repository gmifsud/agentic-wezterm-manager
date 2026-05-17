# Repository Review: Agentic WezTerm Manager

## Overview
**Agentic WezTerm Manager** is a locally hosted web application designed to provide a graphical user interface (GUI) for managing WezTerm configurations on Windows. It separates manual configuration from auto-generated configuration by using a JSON file as the source of truth, and outputting a declarative `.lua` file for WezTerm to ingest.

## Architecture & Tech Stack
The project is built as a full-stack JavaScript/TypeScript application:
- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4.
- **Backend**: Node.js, Express, `tsx` watcher.
- **Validation**: Zod (used across both frontend and backend in a `shared` directory).
- **Execution**: A PowerShell script (`Start-Agentic-Wezterm-Manager.ps1`) and `concurrently` in `package.json` are used to run both the Vite dev server and Express backend simultaneously.

## Core Mechanisms
1. **Source of Truth**: The app stores the configuration locally in `agentic-wezterm.config.json`.
2. **Schema & Validation**: `shared/schema.ts` defines the available configuration surface. This includes settings for:
   - **General**: Workspace name, shell executable, project directory.
   - **Appearance**: Color schemes, font configurations, window decorations/opacity, cursor styles, and tab bar preferences.
   - **Behavior**: Scrollback lines, update checks, audible bells, and default domains.
   - **Startup**: Enables layout definitions (e.g., 'quad' layouts) and extra startup tabs with defined commands.
   - **Commands**: Custom commands defining the program, arguments, working directory, and hotkeys.
3. **Code Generation**: Upon saving settings in the UI, `server/storage.ts` writes the JSON data and instantly generates an `agentic-wezterm.generated.lua` file. This Lua file returns a clean, structured dictionary of the configuration.
4. **Integration**: The user requires the `agentic-wezterm.generated.lua` inside their `~/.wezterm.lua` via `pcall` and maps the values into the `wezterm.config_builder()`. This architecture specifically prevents the web tool from destructively overriding ad-hoc, handwritten Lua scripts.

## Origin & Context
According to `Windows Configuration Management Interface.md`, this tool was scaffolded during a conversational coding session to replace a strictly CLI-based or single-file Lua approach. The user explicitly requested an interface to run on Windows to manage configurations with ease, whilst strictly prohibiting the tool from directly modifying their primary `.wezterm.lua` file to avoid overwriting handwritten logic. 

## Codebase Structure
- `/src`: Contains the React UI (App, components, styling).
- `/server`: Contains the Express API (`index.ts`, `routes.ts`) and the crucial Lua file generator (`storage.ts`).
- `/shared`: Contains `schema.ts`, ensuring end-to-end typing between the React forms and the Node file writer.
- Root scripts: `Start-Agentic-Wezterm-Manager.ps1` for easy launching on Windows.
