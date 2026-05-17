interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = ['general', 'appearance', 'themes', 'behavior', 'startup', 'commands', 'keybindings'];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          Agentic WezTerm
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-secondary text-muted-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
    </div>
  );
}
