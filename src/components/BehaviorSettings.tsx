import type { AgenticConfig } from '../../shared/schema';

interface BehaviorSettingsProps {
  config: AgenticConfig;
  onUpdate: (updater: (draft: AgenticConfig) => void) => void;
}

export function BehaviorSettings({ config, onUpdate }: BehaviorSettingsProps) {
  return (
    <div className="bg-[#161925] border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
      <label className="flex items-center space-x-3 cursor-pointer">
        <input
          type="checkbox"
          className="w-5 h-5 accent-blue-500"
          checked={config.behavior.checkForUpdates}
          onChange={e => onUpdate(c => c.behavior.checkForUpdates = e.target.checked)}
        />
        <span className="text-slate-300 font-medium">Check for WezTerm Updates</span>
      </label>
      <label className="flex items-center space-x-3 cursor-pointer">
        <input
          type="checkbox"
          className="w-5 h-5 accent-blue-500"
          checked={config.behavior.copyOnSelect}
          onChange={e => onUpdate(c => c.behavior.copyOnSelect = e.target.checked)}
        />
        <span className="text-slate-300 font-medium">Copy on Select</span>
      </label>
    </div>
  );
}
