import { useState, useEffect } from 'react';
import type { AgenticConfig } from '../shared/schema';
import {
  Sidebar,
  GeneralSettings,
  AppearanceSettings,
  BehaviorSettings,
  StartupSettings,
  CommandsSettings,
  LuaPreview,
  NewCommandDialog,
} from './components';

function App() {
  const [config, setConfig] = useState<AgenticConfig | null>(null);
  const [luaPreview, setLuaPreview] = useState<string>('');
  const [activeTab, setActiveTab] = useState('general');
  const [error, setError] = useState<string | null>(null);
  const [showNewCommandDialog, setShowNewCommandDialog] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load settings');
        return res.json();
      })
      .then(data => {
        setConfig(data);
        setError(null);
      })
      .catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (!config) return;
    fetch('/api/generated-lua')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load Lua preview');
        return res.json();
      })
      .then(data => setLuaPreview(data.lua))
      .catch(err => setError(err.message));
  }, [config]);

  const handleSave = () => {
    if (!config) return;
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save');
        alert('Saved!');
      })
      .catch(err => setError(err.message));
  };

  const updateConfig = (updater: (draft: AgenticConfig) => void) => {
    if (!config) return;
    const newConfig = JSON.parse(JSON.stringify(config));
    updater(newConfig);
    setConfig(newConfig);
  };

  const addNewCommand = (name: string) => {
    if (!config) {
      setError('No config loaded');
      return;
    }
    if (name in config.commands) {
      setError('Command name already exists');
      return;
    }
    updateConfig(c => {
      c.commands[name] = {
        title: name,
        program: '',
        args: [],
        cwd: '',
        includeInLaunchMenu: true,
        includeHotkey: true,
        hotkey: '',
      };
    });
    setShowNewCommandDialog(false);
  };

  if (!config) return <div className="p-8 text-white">Loading...</div>;

  return (
    <>
      {error && (
        <div className="fixed top-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {showNewCommandDialog && (
        <NewCommandDialog
          onAdd={addNewCommand}
          onClose={() => setShowNewCommandDialog(false)}
        />
      )}

    <div className="flex h-screen bg-[#0f111a] text-slate-200 overflow-hidden font-sans dark">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 flex flex-col bg-[#0f111a] overflow-y-auto">
        <div className="p-8 flex-1 w-full max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-semibold capitalize text-slate-100">{activeTab} Settings</h2>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
            >
              Save Configuration
            </button>
          </div>

          <div className="space-y-6">
            {activeTab === 'general' && (
              <GeneralSettings config={config} onUpdate={updateConfig} />
            )}

            {activeTab === 'appearance' && (
              <AppearanceSettings config={config} onUpdate={updateConfig} />
            )}

            {activeTab === 'behavior' && (
              <BehaviorSettings config={config} onUpdate={updateConfig} />
            )}

            {activeTab === 'startup' && (
              <StartupSettings config={config} onUpdate={updateConfig} />
            )}

            {activeTab === 'commands' && (
              <CommandsSettings
                config={config}
                onUpdate={updateConfig}
                onAddCommand={() => setShowNewCommandDialog(true)}
              />
            )}
          </div>
        </div>
      </div>

      <LuaPreview lua={luaPreview} />
    </div>
    </>
  );
}

export default App;
