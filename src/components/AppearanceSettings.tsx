import type { AgenticConfig } from '../../shared/schema';

interface AppearanceSettingsProps {
  config: AgenticConfig;
  onUpdate: (updater: (draft: AgenticConfig) => void) => void;
}

export function AppearanceSettings({ config, onUpdate }: AppearanceSettingsProps) {
  return (
    <div className="bg-[#161925] border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-300">Color Scheme</span>
        <input
          className="w-full bg-[#0a0c10] border border-slate-700 rounded p-2 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          value={config.appearance.colorScheme}
          onChange={e => onUpdate(c => c.appearance.colorScheme = e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-300">Font Family</span>
          <input
            className="w-full bg-[#0a0c10] border border-slate-700 rounded p-2 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            value={config.appearance.font.family}
            onChange={e => onUpdate(c => c.appearance.font.family = e.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-300">Font Size</span>
          <input
            type="number"
            step="0.5"
            className="w-full bg-[#0a0c10] border border-slate-700 rounded p-2 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            value={config.appearance.font.size}
            onChange={e => onUpdate(c => c.appearance.font.size = parseFloat(e.target.value))}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-300">
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
