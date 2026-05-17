import type { AgenticConfig } from '../../shared/schema';

interface AppearanceSettingsProps {
  config: AgenticConfig;
  onUpdate: (updater: (draft: AgenticConfig) => void) => void;
}

export function AppearanceSettings({ config, onUpdate }: AppearanceSettingsProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xl">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Color Scheme</span>
        <input
          className="w-full bg-input border border-border rounded p-2 text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none"
          value={config.appearance.colorScheme}
          onChange={e => onUpdate(c => c.appearance.colorScheme = e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          The web UI follows the same theme (light/dark) as WezTerm — pick a
          scheme here or via the Themes tab.
        </p>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Font Family</span>
          <input
            className="w-full bg-input border border-border rounded p-2 text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none"
            value={config.appearance.font.family}
            onChange={e => onUpdate(c => c.appearance.font.family = e.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Font Size</span>
          <input
            type="number"
            step="0.5"
            className="w-full bg-input border border-border rounded p-2 text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none"
            value={config.appearance.font.size}
            onChange={e => onUpdate(c => c.appearance.font.size = parseFloat(e.target.value))}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">
            Window Opacity ({config.appearance.window.windowBackgroundOpacity})
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            className="w-full"
            value={config.appearance.window.windowBackgroundOpacity}
            onChange={e => onUpdate(c => c.appearance.window.windowBackgroundOpacity = parseFloat(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
