interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = ['general', 'appearance', 'behavior', 'startup', 'commands'];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-64 border-r border-slate-800 bg-[#161925] flex flex-col">
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
                ? 'bg-blue-500/10 text-blue-400 font-medium'
                : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
    </div>
  );
}
