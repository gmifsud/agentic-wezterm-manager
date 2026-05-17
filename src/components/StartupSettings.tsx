import type { AgenticConfig, ExtraTabConfig, PaneConfig } from '../../shared/schema';
import { CLI_PRESETS, PANE_SHELL_TYPES } from '../../shared/schema';

type ShellType = AgenticConfig['shellType'];
type PaneShellType = PaneConfig['shellType'];

interface StartupSettingsProps {
  config: AgenticConfig;
  onUpdate: (updater: (draft: AgenticConfig) => void) => void;
}

const SHELL_LABELS: Record<PaneShellType, string> = {
  inherit: 'Inherit (global)',
  pwsh: 'PowerShell 7 (pwsh.exe)',
  powershell: 'Windows PowerShell (powershell.exe)',
  cmd: 'Command Prompt (cmd.exe)',
  clink: 'Clink',
  wsl: 'WSL',
  gitbash: 'Git Bash',
  custom: 'Custom...',
};

const PANE_KEYS = [
  ['leftCommand', 'Left'],
  ['rightTopCommand', 'Right Top'],
  ['leftBottomCommand', 'Left Bottom'],
  ['rightBottomCommand', 'Right Bottom'],
] as const;

type PaneKey = (typeof PANE_KEYS)[number][0];

export function StartupSettings({ config, onUpdate }: StartupSettingsProps) {
  const handleShellTypeChange = (value: string) => {
    const shellType = value as ShellType;
    onUpdate(c => {
      c.shellType = shellType;
      if (shellType !== 'custom' && CLI_PRESETS[shellType]) {
        c.shell = CLI_PRESETS[shellType].shell;
      }
    });
  };

  const updatePane = (key: PaneKey, updater: (p: PaneConfig) => void) => {
    onUpdate(c => updater(c.startup.layout[key]));
  };

  const resolvedGlobalShell =
    config.shellType === 'custom' ? config.customShell || '(unset)' : config.shell;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xl">
      <label className="flex items-center space-x-3 cursor-pointer mb-4">
        <input
          type="checkbox"
          className="w-5 h-5 accent-blue-500"
          checked={config.startup.enabled}
          onChange={e => onUpdate(c => c.startup.enabled = e.target.checked)}
        />
        <span className="text-foreground font-medium">Enable Custom Startup Layout</span>
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Global Shell / CLI Type</span>
        <select
          className="w-full bg-input border border-border rounded p-2 text-sm outline-none focus:border-ring"
          value={config.shellType}
          onChange={e => handleShellTypeChange(e.target.value)}
        >
          <option value="pwsh">PowerShell 7 (pwsh.exe)</option>
          <option value="powershell">Windows PowerShell (powershell.exe)</option>
          <option value="cmd">Command Prompt (cmd.exe)</option>
          <option value="clink">Clink</option>
          <option value="wsl">WSL</option>
          <option value="gitbash">Git Bash</option>
          <option value="custom">Custom...</option>
        </select>
        <span className="text-xs text-muted-foreground">
          Used by any pane below set to "Inherit (global)".
        </span>
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Global Shell Path</span>
        <input
          className="w-full bg-input border border-border rounded p-2 text-sm outline-none focus:border-ring"
          value={config.shellType === 'custom' ? config.customShell : config.shell}
          readOnly={config.shellType !== 'custom'}
          placeholder="e.g. C:\tools\nushell\nu.exe"
          onChange={e => onUpdate(c => c.customShell = e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Command Delay After Pane Load (ms)</span>
        <input
          type="number"
          min={0}
          max={10000}
          step={100}
          className="w-full bg-input border border-border rounded p-2 text-sm outline-none focus:border-ring"
          value={config.startup.commandDelayMs}
          onChange={e => onUpdate(c => c.startup.commandDelayMs = parseInt(e.target.value, 10) || 0)}
        />
        <span className="text-xs text-muted-foreground">Wait time before dispatching commands to new panes (0-10000ms)</span>
      </label>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 bg-background border border-border rounded-lg">
        <div className="xl:col-span-2 flex items-baseline justify-between mb-2">
          <h3 className="font-medium text-primary">Quad Layout Panes</h3>
          <span className="text-xs text-muted-foreground">
            Inherited shell → <code className="font-mono">{resolvedGlobalShell}</code>
          </span>
        </div>
        {PANE_KEYS.map(([key, label]) => (
          <PaneEditor
            key={key}
            label={label}
            pane={config.startup.layout[key]}
            onChange={updater => updatePane(key, updater)}
          />
        ))}
      </div>

      <ExtraTabsEditor
        tabs={config.startup.extraTabs}
        onChange={updater => onUpdate(c => updater(c.startup.extraTabs))}
      />
    </div>
  );
}

interface ExtraTabsEditorProps {
  tabs: ExtraTabConfig[];
  onChange: (updater: (tabs: ExtraTabConfig[]) => void) => void;
}

function ExtraTabsEditor({ tabs, onChange }: ExtraTabsEditorProps) {
  const add = () =>
    onChange(arr => {
      arr.push({ command: '', title: `Tab ${arr.length + 1}`, shellType: 'inherit', customShell: '' });
    });
  const remove = (index: number) => onChange(arr => { arr.splice(index, 1); });
  const update = (index: number, updater: (t: ExtraTabConfig) => void) =>
    onChange(arr => updater(arr[index]));

  return (
    <div className="p-4 bg-background border border-border rounded-lg space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium text-primary">Extra Tabs</h3>
        <button
          onClick={add}
          className="px-3 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded font-medium transition-colors"
        >
          + Add Tab
        </button>
      </div>

      {tabs.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No extra tabs configured. Quad layout opens in the first tab; any
          extras spawn after it on startup.
        </p>
      ) : (
        <div className="space-y-3">
          {tabs.map((tab, i) => (
            <ExtraTabEditor
              key={i}
              tab={tab}
              onChange={updater => update(i, updater)}
              onRemove={() => remove(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ExtraTabEditorProps {
  tab: ExtraTabConfig;
  onChange: (updater: (t: ExtraTabConfig) => void) => void;
  onRemove: () => void;
}

function ExtraTabEditor({ tab, onChange, onRemove }: ExtraTabEditorProps) {
  return (
    <div className="space-y-2 border border-border rounded-lg p-3 bg-card/40">
      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
        <input
          className="bg-input border border-border rounded p-1.5 text-sm outline-none focus:border-ring"
          value={tab.title}
          placeholder="Tab title"
          onChange={e => onChange(t => { t.title = e.target.value; })}
        />
        <button
          onClick={onRemove}
          className="px-2 py-1 text-xs bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          className="bg-input border border-border rounded p-1.5 text-xs outline-none focus:border-ring"
          value={tab.shellType}
          onChange={e => onChange(t => { t.shellType = e.target.value as PaneConfig['shellType']; })}
        >
          {PANE_SHELL_TYPES.map(s => (
            <option key={s} value={s}>{SHELL_LABELS[s]}</option>
          ))}
        </select>
        <input
          className="bg-input border border-border rounded p-1.5 text-xs outline-none focus:border-ring disabled:opacity-50"
          value={tab.customShell}
          disabled={tab.shellType !== 'custom'}
          placeholder={tab.shellType === 'custom' ? 'C:\\path\\to\\shell.exe' : '—'}
          onChange={e => onChange(t => { t.customShell = e.target.value; })}
        />
      </div>

      <textarea
        rows={3}
        spellCheck={false}
        className="w-full resize-y bg-card border border-border rounded p-2 text-sm font-mono leading-5 text-foreground outline-none focus:border-ring"
        value={tab.command}
        placeholder="commands to send to this tab on startup"
        onChange={e => onChange(t => { t.command = e.target.value; })}
      />
    </div>
  );
}

interface PaneEditorProps {
  label: string;
  pane: PaneConfig;
  onChange: (updater: (p: PaneConfig) => void) => void;
}

function PaneEditor({ label, pane, onChange }: PaneEditorProps) {
  return (
    <div className="space-y-2 border border-border rounded-lg p-3 bg-card/40">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground/80">
          shell: {pane.shellType === 'custom' ? pane.customShell || '(unset)' : pane.shellType}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          className="bg-input border border-border rounded p-1.5 text-xs outline-none focus:border-ring"
          value={pane.shellType}
          onChange={e => onChange(p => { p.shellType = e.target.value as PaneShellType; })}
        >
          {PANE_SHELL_TYPES.map(t => (
            <option key={t} value={t}>{SHELL_LABELS[t]}</option>
          ))}
        </select>
        <input
          className="bg-input border border-border rounded p-1.5 text-xs outline-none focus:border-ring disabled:opacity-50"
          value={pane.customShell}
          disabled={pane.shellType !== 'custom'}
          placeholder={pane.shellType === 'custom' ? 'C:\\path\\to\\shell.exe' : '—'}
          onChange={e => onChange(p => { p.customShell = e.target.value; })}
        />
      </div>

      <textarea
        rows={6}
        spellCheck={false}
        className="w-full min-h-32 resize-y bg-card border border-border rounded p-3 text-sm font-mono leading-5 text-foreground outline-none focus:border-ring"
        value={pane.command}
        onChange={e => onChange(p => { p.command = e.target.value; })}
        placeholder="commands to send to this pane on startup"
      />
    </div>
  );
}
