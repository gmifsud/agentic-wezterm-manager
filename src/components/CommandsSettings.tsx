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
        <div key={key} className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-lg text-primary">Command: {key}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Title</span>
              <input
                className="w-full bg-input border border-border rounded p-2 text-sm outline-none focus:border-ring"
                value={cmd.title}
                onChange={e => onUpdate(c => c.commands[key].title = e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Program</span>
              <input
                className="w-full bg-input border border-border rounded p-2 text-sm outline-none focus:border-ring"
                value={cmd.program}
                onChange={e => onUpdate(c => c.commands[key].program = e.target.value)}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Arguments (comma separated for preview)</span>
            <input
              className="w-full bg-input border border-border rounded p-2 text-sm outline-none focus:border-ring font-mono text-foreground"
              value={cmd.args.join(',')}
              onChange={e => onUpdate(c => c.commands[key].args = e.target.value.split(','))}
            />
          </label>
        </div>
      ))}
      <button
        onClick={onAddCommand}
        className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors font-medium"
      >
        + Add New Command
      </button>
    </div>
  );
}
