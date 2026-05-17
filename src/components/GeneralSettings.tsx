import type { AgenticConfig } from '../../shared/schema';

interface GeneralSettingsProps {
  config: AgenticConfig;
  onUpdate: (updater: (draft: AgenticConfig) => void) => void;
}

export function GeneralSettings({ config, onUpdate }: GeneralSettingsProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xl">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Workspace Name</span>
        <input
          className="w-full bg-input border border-border rounded p-2 text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none"
          value={config.workspaceName}
          onChange={e => onUpdate(c => c.workspaceName = e.target.value)}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Shell Default (Path/Executable)</span>
        <input
          className="w-full bg-input border border-border rounded p-2 text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none"
          value={config.shell}
          onChange={e => onUpdate(c => c.shell = e.target.value)}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Project Directory</span>
        <input
          className="w-full bg-input border border-border rounded p-2 text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none"
          value={config.projectDir}
          onChange={e => onUpdate(c => c.projectDir = e.target.value)}
        />
      </label>
    </div>
  );
}
