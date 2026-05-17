import { useState, useMemo } from 'react';
import type { AgenticConfig, Keybinding } from '../../shared/schema';
import { KEYBINDING_ACTIONS } from '../../shared/schema';
import { KeybindingEditorDialog } from './KeybindingEditorDialog';

interface KeybindingsSettingsProps {
  config: AgenticConfig;
  onUpdate: (updater: (draft: AgenticConfig) => void) => void;
}

export function KeybindingsSettings({ config, onUpdate }: KeybindingsSettingsProps) {
  const [editingKb, setEditingKb] = useState<number | null>(null);
  const [showNewKb, setShowNewKb] = useState(false);

  const commandConflicts = useMemo(() => {
    const hotkeyMap = new Map<string, string[]>();
    for (const [key, cmd] of Object.entries(config.commands)) {
      if (cmd.includeHotkey && cmd.hotkey && cmd.hotkey.trim() !== '') {
        const normalised = cmd.hotkey.trim().toLowerCase();
        const existing = hotkeyMap.get(normalised) || [];
        hotkeyMap.set(normalised, [...existing, key]);
      }
    }
    const conflictSet = new Set<string>();
    for (const [, commands] of hotkeyMap.entries()) {
      if (commands.length > 1) {
        commands.forEach(cmd => conflictSet.add(cmd));
      }
    }
    return conflictSet;
  }, [config.commands]);

  const allConflicts = useMemo(() => {
    const keyMap = new Map<string, string[]>();
    for (const [key, cmd] of Object.entries(config.commands)) {
      if (cmd.includeHotkey && cmd.hotkey && cmd.hotkey.trim() !== '') {
        const normalised = `${cmd.hotkey.trim().toLowerCase()}`;
        const existing = keyMap.get(normalised) || [];
        keyMap.set(normalised, [...existing, `cmd:${key}`]);
      }
    }
    for (let i = 0; i < config.keybindings.length; i++) {
      const kb = config.keybindings[i];
      if (kb.enabled) {
        const normalised = `${kb.mods}|${kb.key}`.toLowerCase();
        const existing = keyMap.get(normalised) || [];
        keyMap.set(normalised, [...existing, `kb:${i}`]);
      }
    }
    const conflictSet = new Set<string>();
    for (const [, items] of keyMap.entries()) {
      if (items.length > 1) {
        items.forEach(item => conflictSet.add(item));
      }
    }
    return conflictSet;
  }, [config.commands, config.keybindings]);

  const commands = Object.entries(config.commands);

  const handleSaveKb = (kb: Keybinding) => {
    if (editingKb !== null) {
      onUpdate(c => { c.keybindings[editingKb] = kb; });
      setEditingKb(null);
    } else {
      onUpdate(c => { c.keybindings.push(kb); });
      setShowNewKb(false);
    }
  };

  const handleDeleteKb = (index: number) => {
    onUpdate(c => { c.keybindings.splice(index, 1); });
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Command Hotkeys */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Command Hotkeys</h3>
        {commands.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4 shadow-xl">
            <p className="text-muted-foreground text-lg">No commands configured</p>
            <p className="text-sm text-muted-foreground">Add commands in the Commands tab to configure keybindings.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-secondary text-sm font-medium text-muted-foreground border-b border-border">
              <div className="col-span-3">Command</div>
              <div className="col-span-4">Hotkey</div>
              <div className="col-span-2">Enabled</div>
              <div className="col-span-3">Status</div>
            </div>

            {commands.map(([key, cmd]) => {
              const hasConflict = commandConflicts.has(key);
              const isEnabled = cmd.includeHotkey && cmd.hotkey.trim() !== '';
              const statusColor = hasConflict ? 'text-red-400' : isEnabled ? 'text-green-400' : 'text-muted-foreground';
              const statusText = hasConflict ? '⚠ Conflict' : isEnabled ? '✓ Active' : 'Disabled';

              return (
                <div
                  key={key}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-border last:border-b-0 transition-colors ${hasConflict ? 'bg-red-500/5' : ''}`}
                >
                  <div className="col-span-3 flex items-center">
                    <span className="font-medium text-foreground">{cmd.title || key}</span>
                  </div>
                  <div className="col-span-4 flex items-center">
                    <input
                      type="text"
                      placeholder="Ctrl+Shift+K"
                      className={`w-full bg-input border rounded p-2 text-sm outline-none transition-colors ${hasConflict ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-ring'}`}
                      value={cmd.hotkey}
                      onChange={e => onUpdate(c => c.commands[key].hotkey = e.target.value)}
                      disabled={!cmd.includeHotkey}
                    />
                  </div>
                  <div className="col-span-2 flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded accent-blue-500" checked={cmd.includeHotkey} onChange={e => onUpdate(c => c.commands[key].includeHotkey = e.target.checked)} />
                      <span className="text-sm text-foreground">Enabled</span>
                    </label>
                  </div>
                  <div className={`col-span-3 flex items-center text-sm font-medium ${statusColor}`}>{statusText}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-secondary border border-border rounded-xl p-4 space-y-2 mt-4">
          <h4 className="text-sm font-medium text-foreground">Hotkey Format</h4>
          <p className="text-xs text-muted-foreground">
            Use <code className="bg-background px-1 py-0.5 rounded text-primary">+</code> to separate modifiers and key.
            Examples: <code className="bg-background px-1 py-0.5 rounded text-primary">Ctrl+D</code>, <code className="bg-background px-1 py-0.5 rounded text-primary">Super+Shift+T</code>
          </p>
        </div>

        {commandConflicts.size > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2 mt-4">
            <h4 className="text-sm font-medium text-red-400">⚠ Hotkey Conflicts Detected</h4>
            <ul className="text-xs text-red-300 space-y-1">
              {Array.from(commandConflicts).map(cmd => (
                <li key={cmd} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />{cmd}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Section 2: Custom Keybindings */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">Custom Keybindings</h3>
          <button
            onClick={() => setShowNewKb(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
          >
            + Add Keybinding
          </button>
        </div>

        {config.keybindings.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center shadow-xl">
            <p className="text-muted-foreground text-sm">No custom keybindings yet. Add one to configure arbitrary WezTerm actions.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-secondary text-sm font-medium text-muted-foreground border-b border-border">
              <div className="col-span-3">Description</div>
              <div className="col-span-2">Key</div>
              <div className="col-span-2">Modifiers</div>
              <div className="col-span-3">Action</div>
              <div className="col-span-1">Enabled</div>
              <div className="col-span-1">Actions</div>
            </div>

            {config.keybindings.map((kb, index) => {
              const conflictKey = `kb:${index}`;
              const hasConflict = allConflicts.has(conflictKey);
              const actionDef = KEYBINDING_ACTIONS[kb.action.type];

              return (
                <div
                  key={index}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-border last:border-b-0 transition-colors ${hasConflict ? 'bg-red-500/5' : ''}`}
                >
                  <div className="col-span-3 flex items-center">
                    <span className="text-sm text-foreground truncate">{kb.description || <span className="text-muted-foreground italic">Unnamed</span>}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <code className="text-sm font-mono text-primary">{kb.key}</code>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-xs text-muted-foreground">{kb.mods === 'NONE' ? '—' : kb.mods}</span>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span className="text-sm text-foreground">{actionDef?.label || kb.action.type}</span>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className={`text-xs ${kb.enabled ? 'text-green-400' : 'text-muted-foreground'}`}>
                      {kb.enabled ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center gap-1">
                    <button onClick={() => setEditingKb(index)} className="text-xs text-primary hover:underline">Edit</button>
                    <button onClick={() => handleDeleteKb(index)} className="text-xs text-red-400 hover:underline">Del</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showNewKb && (
        <KeybindingEditorDialog onSave={handleSaveKb} onCancel={() => setShowNewKb(false)} />
      )}
      {editingKb !== null && config.keybindings[editingKb] && (
        <KeybindingEditorDialog
          keybinding={config.keybindings[editingKb]}
          onSave={handleSaveKb}
          onCancel={() => setEditingKb(null)}
        />
      )}
    </div>
  );
}
