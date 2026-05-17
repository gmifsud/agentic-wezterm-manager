import { useState } from 'react';
import type { Keybinding } from '../../shared/schema';
import { KEYBINDING_ACTIONS } from '../../shared/schema';

interface KeybindingEditorDialogProps {
  keybinding?: Keybinding;
  onSave: (kb: Keybinding) => void;
  onCancel: () => void;
}

const MODS = ['CTRL', 'SHIFT', 'ALT', 'SUPER', 'LEADER'] as const;

const ACTION_CATEGORIES = Array.from(
  new Set(Object.values(KEYBINDING_ACTIONS).map(a => a.category))
);

export function KeybindingEditorDialog({ keybinding, onSave, onCancel }: KeybindingEditorDialogProps) {
  const [key, setKey] = useState(keybinding?.key || '');
  const [mods, setMods] = useState<string[]>(keybinding?.mods ? keybinding.mods.split('|').filter(Boolean) : ['CTRL']);
  const [actionType, setActionType] = useState(keybinding?.action.type || 'ReloadConfiguration');
  const [actionParams, setActionParams] = useState<Record<string, string>>(() => {
    const params = keybinding?.action.params || {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      result[k] = String(v);
    }
    return result;
  });
  const [description, setDescription] = useState(keybinding?.description || '');
  const [enabled, setEnabled] = useState(keybinding?.enabled ?? true);
  const [disableDefault, setDisableDefault] = useState(keybinding?.disableDefault ?? false);

  const actionDef = KEYBINDING_ACTIONS[actionType];
  const actionParamsDef = actionDef?.params || {};

  const toggleMod = (mod: string) => {
    setMods(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  const handleSave = () => {
    if (!key.trim()) return;
    const params: Record<string, unknown> = {};
    for (const [paramKey, paramDef] of Object.entries(actionParamsDef)) {
      const value = actionParams[paramKey] ?? paramDef.default ?? '';
      if (paramDef.type === 'number') {
        params[paramKey] = parseFloat(value) || 0;
      } else if (paramDef.type === 'boolean') {
        params[paramKey] = value === 'true';
      } else {
        params[paramKey] = value;
      }
    }

    onSave({
      key: key.trim(),
      mods: mods.join('|') || 'NONE',
      action: { type: actionType, params },
      enabled,
      description: description.trim(),
      disableDefault,
    });
  };

  const hasLeader = mods.includes('LEADER');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            {keybinding ? 'Edit Keybinding' : 'New Keybinding'}
          </h3>
        </div>

        <div className="p-6 space-y-5">
          {/* Key Input */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Key</label>
            <input
              type="text"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="e.g. t, F1, LeftArrow, Space"
              className="w-full bg-input border border-border rounded p-2 text-sm text-foreground outline-none focus:border-ring font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Examples: <code className="bg-background px-1 rounded">t</code>, <code className="bg-background px-1 rounded">F1</code>–<code className="bg-background px-1 rounded">F24</code>, <code className="bg-background px-1 rounded">LeftArrow</code>, <code className="bg-background px-1 rounded">Space</code>, <code className="bg-background px-1 rounded">Enter</code>
            </p>
          </div>

          {/* Modifiers */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Modifiers</label>
            <div className="flex gap-3 flex-wrap">
              {MODS.map(mod => (
                <label key={mod} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mods.includes(mod)}
                    onChange={() => toggleMod(mod)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-sm text-foreground">{mod === 'SUPER' ? 'Super (Win)' : mod}</span>
                </label>
              ))}
            </div>
            {hasLeader && (
              <p className="text-xs text-amber-400 mt-2">
                Leader key must be configured in your <code className="bg-background px-1 rounded">wezterm.lua</code> (e.g., <code className="bg-background px-1 rounded">config.leader = {'{'} key = 'a', mods = 'CTRL' {'}'}</code>)
              </p>
            )}
          </div>

          {/* Action Type */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Action</label>
            <select
              value={actionType}
              onChange={e => {
                setActionType(e.target.value);
                setActionParams({});
              }}
              className="w-full bg-input border border-border rounded p-2 text-sm text-foreground outline-none focus:border-ring"
            >
              {ACTION_CATEGORIES.map(category => (
                <optgroup key={category} label={category}>
                  {Object.entries(KEYBINDING_ACTIONS)
                    .filter(([, def]) => def.category === category)
                    .map(([type, def]) => (
                      <option key={type} value={type}>{def.label}</option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Action Parameters */}
          {Object.entries(actionParamsDef).length > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Parameters</label>
              <div className="space-y-3">
                {Object.entries(actionParamsDef).map(([paramKey, paramDef]) => (
                  <div key={paramKey}>
                    <label className="text-xs text-muted-foreground mb-1 block capitalize">
                      {paramKey.replace(/([A-Z])/g, ' $1').trim()}
                      {paramDef.default !== undefined && ` (default: ${paramDef.default})`}
                    </label>
                    {paramDef.type === 'string' && paramKey === 'direction' ? (
                      <select
                        value={actionParams[paramKey] ?? paramDef.default ?? ''}
                        onChange={e => setActionParams(prev => ({ ...prev, [paramKey]: e.target.value }))}
                        className="w-full bg-input border border-border rounded p-2 text-sm text-foreground outline-none focus:border-ring"
                      >
                        <option value="Left">Left</option>
                        <option value="Right">Right</option>
                        <option value="Up">Up</option>
                        <option value="Down">Down</option>
                      </select>
                    ) : paramDef.type === 'string' && paramKey === 'target' ? (
                      <select
                        value={actionParams[paramKey] ?? paramDef.default ?? ''}
                        onChange={e => setActionParams(prev => ({ ...prev, [paramKey]: e.target.value }))}
                        className="w-full bg-input border border-border rounded p-2 text-sm text-foreground outline-none focus:border-ring"
                      >
                        <option value="Clipboard">Clipboard</option>
                        <option value="PrimarySelection">Primary Selection</option>
                      </select>
                    ) : paramDef.type === 'string' && paramKey === 'domain' ? (
                      <select
                        value={actionParams[paramKey] ?? paramDef.default ?? ''}
                        onChange={e => setActionParams(prev => ({ ...prev, [paramKey]: e.target.value }))}
                        className="w-full bg-input border border-border rounded p-2 text-sm text-foreground outline-none focus:border-ring"
                      >
                        <option value="CurrentPaneDomain">Current Pane Domain</option>
                        <option value="CurrentTabDomain">Current Tab Domain</option>
                        <option value="CurrentWindowDomain">Current Window Domain</option>
                      </select>
                    ) : (
                      <input
                        type={paramDef.type === 'number' ? 'number' : 'text'}
                        value={actionParams[paramKey] ?? paramDef.default ?? ''}
                        onChange={e => setActionParams(prev => ({ ...prev, [paramKey]: e.target.value }))}
                        className="w-full bg-input border border-border rounded p-2 text-sm text-foreground outline-none focus:border-ring"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full bg-input border border-border rounded p-2 text-sm text-foreground outline-none focus:border-ring"
            />
          </div>

          {/* Options */}
          <div className="space-y-3 bg-secondary/30 border border-border rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className="w-4 h-4 accent-blue-500 mt-0.5"
              />
              <div>
                <span className="text-sm text-foreground font-medium">Enabled</span>
                <p className="text-xs text-muted-foreground">Toggle this keybinding on or off</p>
              </div>
            </label>

            <div className="border-t border-border" />

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={disableDefault}
                onChange={e => setDisableDefault(e.target.checked)}
                className="w-4 h-4 accent-amber-500 mt-0.5"
              />
              <div>
                <span className="text-sm text-foreground font-medium">Disable Default Assignment</span>
                <p className="text-xs text-muted-foreground">
                  Overrides WezTerm's built-in behaviour for this key combination. Use when a shortcut conflicts with terminal defaults (e.g., Ctrl+N for new window).
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-border flex gap-3">
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {keybinding ? 'Update' : 'Add'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
