import type { AgenticConfig } from '../../shared/schema';

interface CommandsSettingsProps {
  config: AgenticConfig;
  onUpdate: (updater: (draft: AgenticConfig) => void) => void;
  onAddCommand: () => void;
}

export function CommandsSettings({ config, onUpdate, onAddCommand }: CommandsSettingsProps) {
  return (
    <div className="space-y-4">
      {Object.entries(config.commands).map(([key, cmd]) => (
        <div key={key} className="bg-[#161925] border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-lg text-blue-300">Command: {key}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-400">Title</span>
              <input
                className="w-full bg-[#0a0c10] border border-slate-700 rounded p-2 text-sm outline-none focus:border-blue-500"
                value={cmd.title}
                onChange={e => onUpdate(c => c.commands[key].title = e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-400">Program</span>
              <input
                className="w-full bg-[#0a0c10] border border-slate-700 rounded p-2 text-sm outline-none focus:border-blue-500"
                value={cmd.program}
                onChange={e => onUpdate(c => c.commands[key].program = e.target.value)}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-400">Arguments (comma separated for preview)</span>
            <input
              className="w-full bg-[#0a0c10] border border-slate-700 rounded p-2 text-sm outline-none focus:border-blue-500 font-mono text-slate-300"
              value={cmd.args.join(',')}
              onChange={e => onUpdate(c => c.commands[key].args = e.target.value.split(','))}
            />
          </label>
        </div>
      ))}
      <button
        onClick={onAddCommand}
        className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-colors font-medium"
      >
        + Add New Command
      </button>
    </div>
  );
}
