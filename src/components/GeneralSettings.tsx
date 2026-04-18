import type { AgenticConfig } from '../../shared/schema';

interface GeneralSettingsProps {
  config: AgenticConfig;
  onUpdate: (updater: (draft: AgenticConfig) => void) => void;
}

export function GeneralSettings({ config, onUpdate }: GeneralSettingsProps) {
  return (
    <div className="bg-[#161925] border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-300">Workspace Name</span>
        <input
          className="w-full bg-[#0a0c10] border border-slate-700 rounded p-2 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          value={config.workspaceName}
          onChange={e => onUpdate(c => c.workspaceName = e.target.value)}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-300">Shell Default (Path/Executable)</span>
        <input
          className="w-full bg-[#0a0c10] border border-slate-700 rounded p-2 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          value={config.shell}
          onChange={e => onUpdate(c => c.shell = e.target.value)}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-300">Project Directory</span>
        <input
          className="w-full bg-[#0a0c10] border border-slate-700 rounded p-2 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          value={config.projectDir}
          onChange={e => onUpdate(c => c.projectDir = e.target.value)}
        />
      </label>
    </div>
  );
}
