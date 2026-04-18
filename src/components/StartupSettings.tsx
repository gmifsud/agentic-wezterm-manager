import type { AgenticConfig } from '../../shared/schema';

interface StartupSettingsProps {
  config: AgenticConfig;
  onUpdate: (updater: (draft: AgenticConfig) => void) => void;
}

export function StartupSettings({ config, onUpdate }: StartupSettingsProps) {
  return (
    <div className="bg-[#161925] border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
      <label className="flex items-center space-x-3 cursor-pointer mb-4">
        <input
          type="checkbox"
          className="w-5 h-5 accent-blue-500"
          checked={config.startup.enabled}
          onChange={e => onUpdate(c => c.startup.enabled = e.target.checked)}
        />
        <span className="text-slate-300 font-medium">Enable Custom Startup Layout</span>
      </label>
      <div className="grid grid-cols-2 gap-4 p-4 bg-[#0a0c10] border border-slate-800 rounded-lg">
        <h3 className="col-span-2 font-medium text-blue-400 mb-2">Quad Layout Panes Map</h3>
        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Left Command Ref</span>
          <input
            className="w-full bg-[#161925] border border-slate-700 rounded p-2 text-sm"
            value={config.startup.layout.leftCommand}
            onChange={e => onUpdate(c => c.startup.layout.leftCommand = e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Right Top Ref</span>
          <input
            className="w-full bg-[#161925] border border-slate-700 rounded p-2 text-sm"
            value={config.startup.layout.rightTopCommand}
            onChange={e => onUpdate(c => c.startup.layout.rightTopCommand = e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Left Bottom Ref</span>
          <input
            className="w-full bg-[#161925] border border-slate-700 rounded p-2 text-sm"
            value={config.startup.layout.leftBottomCommand}
            onChange={e => onUpdate(c => c.startup.layout.leftBottomCommand = e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Right Bottom Ref</span>
          <input
            className="w-full bg-[#161925] border border-slate-700 rounded p-2 text-sm"
            value={config.startup.layout.rightBottomCommand}
            onChange={e => onUpdate(c => c.startup.layout.rightBottomCommand = e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
