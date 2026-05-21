import { useState, useEffect, useCallback, useRef } from "react";
import type { AgenticConfig } from "../shared/schema";
import { generateLuaText } from "../shared/lua-generator";
import { deriveUiMode } from "./lib/themeMode";
import { resolveActivePalette, applyPaletteToRoot } from "./lib/themePalette";
import {
  Sidebar,
  GeneralSettings,
  AppearanceSettings,
  BehaviorSettings,
  StartupSettings,
  CommandsSettings,
  KeybindingsSettings,
  ThemesSettings,
  LuaPreview,
  NewCommandDialog,
} from "./components";

const MIN_PREVIEW_WIDTH = 380;
const MAX_PREVIEW_WIDTH = 800;
const DEFAULT_PREVIEW_WIDTH = 384;

function diffConfigs(
  oldConfig: AgenticConfig | null,
  newConfig: AgenticConfig,
): string[] {
  if (!oldConfig) return ["Initial load"];
  const changes: string[] = [];

  if (oldConfig.workspaceName !== newConfig.workspaceName)
    changes.push(
      `Workspace name: "${oldConfig.workspaceName}" → "${newConfig.workspaceName}"`,
    );
  if (oldConfig.shell !== newConfig.shell)
    changes.push(`Shell: "${oldConfig.shell}" → "${newConfig.shell}"`);
  if (oldConfig.shellType !== newConfig.shellType)
    changes.push(
      `Shell type: "${oldConfig.shellType}" → "${newConfig.shellType}"`,
    );
  if (oldConfig.projectDir !== newConfig.projectDir)
    changes.push(`Project dir changed`);

  if (oldConfig.appearance.colorScheme !== newConfig.appearance.colorScheme)
    changes.push(
      `Color scheme: "${oldConfig.appearance.colorScheme}" → "${newConfig.appearance.colorScheme}"`,
    );
  if (oldConfig.appearance.font.family !== newConfig.appearance.font.family)
    changes.push(
      `Font: "${oldConfig.appearance.font.family}" → "${newConfig.appearance.font.family}"`,
    );
  if (oldConfig.appearance.font.size !== newConfig.appearance.font.size)
    changes.push(
      `Font size: ${oldConfig.appearance.font.size} → ${newConfig.appearance.font.size}`,
    );
  if (
    oldConfig.appearance.window.windowBackgroundOpacity !==
    newConfig.appearance.window.windowBackgroundOpacity
  )
    changes.push(
      `Window opacity: ${oldConfig.appearance.window.windowBackgroundOpacity} → ${newConfig.appearance.window.windowBackgroundOpacity}`,
    );

  if (oldConfig.behavior.checkForUpdates !== newConfig.behavior.checkForUpdates)
    changes.push(`Check for updates: ${newConfig.behavior.checkForUpdates}`);
  if (oldConfig.behavior.copyOnSelect !== newConfig.behavior.copyOnSelect)
    changes.push(`Copy on select: ${newConfig.behavior.copyOnSelect}`);

  if (oldConfig.startup.enabled !== newConfig.startup.enabled)
    changes.push(
      `Startup layout: ${newConfig.startup.enabled ? "enabled" : "disabled"}`,
    );
  if (oldConfig.startup.commandDelayMs !== newConfig.startup.commandDelayMs)
    changes.push(
      `Command delay: ${oldConfig.startup.commandDelayMs} → ${newConfig.startup.commandDelayMs}ms`,
    );

  const oldCmds = Object.keys(oldConfig.commands);
  const newCmds = Object.keys(newConfig.commands);
  for (const cmd of newCmds) {
    if (!oldCmds.includes(cmd)) changes.push(`Added command: "${cmd}"`);
  }
  for (const cmd of oldCmds) {
    if (!newCmds.includes(cmd)) changes.push(`Removed command: "${cmd}"`);
  }

  const oldThemes = Object.keys(oldConfig.themes);
  const newThemes = Object.keys(newConfig.themes);
  for (const theme of newThemes) {
    if (!oldThemes.includes(theme)) changes.push(`Added theme: "${theme}"`);
  }
  for (const theme of oldThemes) {
    if (!newThemes.includes(theme)) changes.push(`Removed theme: "${theme}"`);
  }
  if (oldConfig.activeTheme !== newConfig.activeTheme)
    changes.push(
      `Active theme: "${oldConfig.activeTheme || "(built-in)"}" → "${newConfig.activeTheme || "(built-in)"}"`,
    );

  if (oldConfig.keybindings.length !== newConfig.keybindings.length)
    changes.push(
      `Keybindings: ${oldConfig.keybindings.length} → ${newConfig.keybindings.length}`,
    );

  if (changes.length === 0) changes.push("No visible changes");
  return changes;
}

function App() {
  const [config, setConfig] = useState<AgenticConfig | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [savedConfig, setSavedConfig] = useState<AgenticConfig | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [error, setError] = useState<string | null>(null);
  const [showNewCommandDialog, setShowNewCommandDialog] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(DEFAULT_PREVIEW_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [showChanges, setShowChanges] = useState(true);
  const [lastChanges, setLastChanges] = useState<string[]>([]);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const luaPreview = config ? generateLuaText(config, metadata) : "";

  const activePalette = config ? resolveActivePalette(config) : null;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragStartX.current = e.clientX;
      dragStartWidth.current = previewWidth;
      setIsDragging(true);
    },
    [previewWidth],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = dragStartX.current - e.clientX;
      const newWidth = Math.min(
        MAX_PREVIEW_WIDTH,
        Math.max(MIN_PREVIEW_WIDTH, dragStartWidth.current + delta),
      );
      setPreviewWidth(newWidth);
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load settings");
        return res.json();
      })
      .then((data) => {
        const { _metadata, ...configData } = data;
        setConfig(configData as AgenticConfig);
        setMetadata(_metadata);
        setSavedConfig(JSON.parse(JSON.stringify(configData)));
        setError(null);
      })
      .catch((err) => setError(err.message));
  }, []);

  // Mirror WezTerm's theme selection in the web UI.
  //   1. Toggle the .dark class (light/dark base palette) from the scheme's
  //      luminance — this is the safe fallback for unknown built-in schemes.
  //   2. If we have a full palette for the selection (custom theme or one of
  //      the curated built-ins), override the design-token CSS variables so
  //      the whole web UI takes on that scheme's actual colours.
  useEffect(() => {
    if (!config) return;
    const mode = deriveUiMode(config);
    document.documentElement.classList.toggle("dark", mode === "dark");
    applyPaletteToRoot(resolveActivePalette(config));
  }, [config]);

  const handleSave = () => {
    if (!config) return;
    const changes = diffConfigs(savedConfig, config);
    setLastChanges(changes);
    setShowChanges(true);

    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save");
        setSavedConfig(JSON.parse(JSON.stringify(config)));
      })
      .catch((err) => setError(err.message));
  };

  const updateConfig = (updater: (draft: AgenticConfig) => void) => {
    if (!config) return;
    const newConfig = JSON.parse(JSON.stringify(config));
    updater(newConfig);
    setConfig(newConfig);
  };

  const addNewCommand = (name: string) => {
    if (!config) {
      setError("No config loaded");
      return;
    }
    if (name in config.commands) {
      setError("Command name already exists");
      return;
    }
    updateConfig((c) => {
      c.commands[name] = {
        title: name,
        program: "",
        args: [],
        cwd: "",
        includeInLaunchMenu: true,
        includeHotkey: true,
        hotkey: "",
      };
    });
    setShowNewCommandDialog(false);
  };

  if (!config) return <div className="p-8 text-foreground">Loading...</div>;

  return (
    <>
      {error && (
        <div className="fixed top-4 right-4 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg shadow-lg z-50">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {showNewCommandDialog && (
        <NewCommandDialog
          onAdd={addNewCommand}
          onClose={() => setShowNewCommandDialog(false)}
        />
      )}

      <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          metadata={metadata}
        />
        <div className="flex-1 flex flex-col bg-background overflow-y-auto">
          <div className="p-8 flex-1 w-full space-y-6">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold capitalize text-foreground">
                {activeTab} Settings
              </h2>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors shadow-lg shadow-primary/20"
              >
                Save Configuration
              </button>
            </div>

            <div className="space-y-6">
              {activeTab === "general" && (
                <GeneralSettings config={config} onUpdate={updateConfig} />
              )}

              {activeTab === "appearance" && (
                <AppearanceSettings config={config} onUpdate={updateConfig} />
              )}

              {activeTab === "themes" && (
                <ThemesSettings config={config} onUpdate={updateConfig} />
              )}

              {activeTab === "behavior" && (
                <BehaviorSettings config={config} onUpdate={updateConfig} />
              )}

              {activeTab === "startup" && (
                <StartupSettings config={config} onUpdate={updateConfig} />
              )}

              {activeTab === "commands" && (
                <CommandsSettings
                  config={config}
                  onUpdate={updateConfig}
                  onAddCommand={() => setShowNewCommandDialog(true)}
                />
              )}

              {activeTab === "keybindings" && (
                <KeybindingsSettings config={config} onUpdate={updateConfig} />
              )}
            </div>
          </div>
        </div>

        <div
          className={`w-1 cursor-col-resize hover:bg-primary/50 transition-colors flex-shrink-0 ${isDragging ? "bg-primary" : "bg-border"}`}
          onMouseDown={handleMouseDown}
        />

        <LuaPreview
          lua={luaPreview}
          width={previewWidth}
          changes={showChanges ? lastChanges : null}
          onDismissChanges={() => setShowChanges(false)}
          palette={activePalette}
        />
      </div>
    </>
  );
}

export default App;
