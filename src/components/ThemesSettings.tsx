import { useState } from 'react';
import type { AgenticConfig, ColorPalette } from '../../shared/schema';
import { BUILTIN_COLOR_SCHEMES } from '../../shared/schema';

interface ThemesSettingsProps {
  config: AgenticConfig;
  onUpdate: (updater: (draft: AgenticConfig) => void) => void;
}

const ANSI_LABELS = ['Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White'];

const defaultPalette: ColorPalette = {
  foreground: '#d4d4d4',
  background: '#1e1e1e',
  cursor_bg: '#52ad70',
  cursor_fg: '#1e1e1e',
  cursor_border: '#52ad70',
  selection_fg: '#1e1e1e',
  selection_bg: '#3a3d41',
  scrollbar_thumb: '#3a3d41',
  split: '#444444',
  compose_cursor: '#fbd38d',
  ansi: ['#1e1e1e', '#f48771', '#a1cd5e', '#e4c877', '#6ab0f3', '#f47590', '#00bcd4', '#d4d4d4'],
  brights: ['#8b8b8b', '#f48771', '#a1cd5e', '#e4c877', '#6ab0f3', '#f47590', '#00bcd4', '#ffffff'],
  indexed: {},
};

export function ThemesSettings({ config, onUpdate }: ThemesSettingsProps) {
  const [editingTheme, setEditingTheme] = useState<string | null>(null);
  const [newThemeName, setNewThemeName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBuiltin = BUILTIN_COLOR_SCHEMES.filter(s =>
    s.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 30);

  const customThemes = Object.entries(config.themes);

  const handleSelectCustom = (name: string) => {
    onUpdate(c => {
      c.activeTheme = name;
    });
  };

  const handleCreateTheme = () => {
    if (!newThemeName.trim()) return;
    if (config.themes[newThemeName.trim()]) return;
    onUpdate(c => {
      c.themes[newThemeName.trim()] = { ...defaultPalette };
      c.activeTheme = newThemeName.trim();
    });
    setNewThemeName('');
    setEditingTheme(newThemeName.trim());
  };

  const handleDeleteTheme = (name: string) => {
    onUpdate(c => {
      delete c.themes[name];
      if (c.activeTheme === name) c.activeTheme = '';
    });
    if (editingTheme === name) setEditingTheme(null);
  };

  const handleSavePalette = (name: string, palette: ColorPalette) => {
    onUpdate(c => {
      c.themes[name] = palette;
    });
    setEditingTheme(null);
  };

  return (
    <div className="space-y-6">
      {/* Active Theme Indicator */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Active Theme</h3>
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${config.activeTheme ? 'bg-green-400' : 'bg-blue-400'}`} />
          <span className="text-foreground font-medium">
            {config.activeTheme || config.appearance.colorScheme}
          </span>
          <span className="text-xs text-muted-foreground">
            ({config.activeTheme ? 'Custom' : 'Built-in'})
          </span>
        </div>
      </div>

      {/* Built-in Colour Schemes */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground mb-4">Built-in Colour Schemes</h3>
        <input
          type="text"
          placeholder="Search schemes..."
          className="w-full bg-input border border-border rounded p-2 text-sm text-foreground outline-none focus:border-ring mb-4"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {filteredBuiltin.map(scheme => (
            <button
              key={scheme}
              onClick={() => onUpdate(c => { c.activeTheme = ''; c.appearance.colorScheme = scheme; })}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                !config.activeTheme && config.appearance.colorScheme === scheme
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              {scheme}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Themes */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">Custom Themes</h3>
        </div>

        {/* Create New Theme */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="New theme name..."
            className="flex-1 bg-input border border-border rounded p-2 text-sm text-foreground outline-none focus:border-ring"
            value={newThemeName}
            onChange={e => setNewThemeName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateTheme()}
          />
          <button
            onClick={handleCreateTheme}
            disabled={!newThemeName.trim()}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Create
          </button>
        </div>

        {/* Theme List */}
        {customThemes.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No custom themes yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {customThemes.map(([name, palette]) => (
              <div
                key={name}
                className={`border rounded-xl p-4 transition-colors ${
                  config.activeTheme === name
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-secondary/30'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-foreground">{name}</h4>
                    {config.activeTheme === name && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Active</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingTheme(name)}
                      className="px-3 py-1 text-xs bg-secondary hover:bg-secondary/80 text-foreground rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTheme(name)}
                      className="px-3 py-1 text-xs bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Colour Swatches */}
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-6 h-6 rounded-sm border border-border" style={{ backgroundColor: palette.background }} title="Background" />
                  <div className="w-6 h-6 rounded-sm border border-border" style={{ backgroundColor: palette.foreground }} title="Foreground" />
                  <div className="w-6 h-6 rounded-sm border border-border" style={{ backgroundColor: palette.cursor_bg }} title="Cursor" />
                  <div className="w-6 h-6 rounded-sm border border-border" style={{ backgroundColor: palette.selection_bg }} title="Selection" />
                  {palette.ansi.map((color, i) => (
                    <div key={i} className="w-4 h-4 rounded-sm border border-border" style={{ backgroundColor: color }} title={`ANSI ${ANSI_LABELS[i]}`} />
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectCustom(name)}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      config.activeTheme === name
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80 text-foreground'
                    }`}
                  >
                    {config.activeTheme === name ? 'Active' : 'Apply'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Theme Editor Dialog */}
      {editingTheme && config.themes[editingTheme] && (
        <ThemeEditorDialog
          name={editingTheme}
          palette={config.themes[editingTheme]}
          onSave={handleSavePalette}
          onCancel={() => setEditingTheme(null)}
        />
      )}
    </div>
  );
}

interface ThemeEditorDialogProps {
  name: string;
  palette: ColorPalette;
  onSave: (name: string, palette: ColorPalette) => void;
  onCancel: () => void;
}

function ThemeEditorDialog({ name, palette, onSave, onCancel }: ThemeEditorDialogProps) {
  const [edited, setEdited] = useState<ColorPalette>({ ...palette, ansi: [...palette.ansi], brights: [...palette.brights] });

  const updateField = (field: keyof ColorPalette, value: string) => {
    setEdited(prev => ({ ...prev, [field]: value }));
  };

  const updateAnsi = (index: number, value: string) => {
    setEdited(prev => {
      const newAnsi = [...prev.ansi];
      newAnsi[index] = value;
      return { ...prev, ansi: newAnsi };
    });
  };

  const updateBright = (index: number, value: string) => {
    setEdited(prev => {
      const newBrights = [...prev.brights];
      newBrights[index] = value;
      return { ...prev, brights: newBrights };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Edit Theme: {name}</h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Core Colours */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Core Colours</h4>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Foreground" value={edited.foreground} onChange={v => updateField('foreground', v)} />
              <ColorField label="Background" value={edited.background} onChange={v => updateField('background', v)} />
            </div>
          </div>

          {/* Cursor Colours */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Cursor</h4>
            <div className="grid grid-cols-3 gap-3">
              <ColorField label="Background" value={edited.cursor_bg} onChange={v => updateField('cursor_bg', v)} />
              <ColorField label="Foreground" value={edited.cursor_fg} onChange={v => updateField('cursor_fg', v)} />
              <ColorField label="Border" value={edited.cursor_border} onChange={v => updateField('cursor_border', v)} />
            </div>
          </div>

          {/* Selection Colours */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Selection</h4>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Foreground" value={edited.selection_fg} onChange={v => updateField('selection_fg', v)} />
              <ColorField label="Background" value={edited.selection_bg} onChange={v => updateField('selection_bg', v)} />
            </div>
          </div>

          {/* UI Colours */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">UI</h4>
            <div className="grid grid-cols-3 gap-3">
              <ColorField label="Scrollbar" value={edited.scrollbar_thumb} onChange={v => updateField('scrollbar_thumb', v)} />
              <ColorField label="Split" value={edited.split} onChange={v => updateField('split', v)} />
              <ColorField label="Compose Cursor" value={edited.compose_cursor} onChange={v => updateField('compose_cursor', v)} />
            </div>
          </div>

          {/* ANSI Colours */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">ANSI Colours (0-7)</h4>
            <div className="grid grid-cols-4 gap-3">
              {edited.ansi.map((color, i) => (
                <ColorField key={i} label={ANSI_LABELS[i]} value={color} onChange={v => updateAnsi(i, v)} />
              ))}
            </div>
          </div>

          {/* Bright Colours */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Bright Colours (8-15)</h4>
            <div className="grid grid-cols-4 gap-3">
              {edited.brights.map((color, i) => (
                <ColorField key={i} label={ANSI_LABELS[i]} value={color} onChange={v => updateBright(i, v)} />
              ))}
            </div>
          </div>

          {/* Preview Swatches */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Preview</h4>
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="flex items-center gap-1 flex-wrap">
                <div className="w-8 h-8 rounded-sm border border-border" style={{ backgroundColor: edited.background }} />
                <div className="w-8 h-8 rounded-sm border border-border" style={{ backgroundColor: edited.foreground }} />
                <div className="w-8 h-8 rounded-sm border border-border" style={{ backgroundColor: edited.cursor_bg }} />
                <div className="w-8 h-8 rounded-sm border border-border" style={{ backgroundColor: edited.selection_bg }} />
                <div className="w-8 h-8 rounded-sm border border-border" style={{ backgroundColor: edited.scrollbar_thumb }} />
                <div className="w-8 h-8 rounded-sm border border-border" style={{ backgroundColor: edited.split }} />
                {edited.ansi.map((c, i) => (
                  <div key={`a${i}`} className="w-6 h-6 rounded-sm border border-border" style={{ backgroundColor: c }} />
                ))}
                {edited.brights.map((c, i) => (
                  <div key={`b${i}`} className="w-6 h-6 rounded-sm border border-border" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border flex gap-3">
          <button
            onClick={() => onSave(name, edited)}
            className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
          >
            Save Theme
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

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-input border border-border rounded p-2 text-sm text-foreground font-mono outline-none focus:border-ring"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
