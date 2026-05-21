interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  metadata?: {
    environment: string;
    luaOutputFile: string;
    luaHomeFile: string | null;
    isPackaged: boolean;
  };
}

const tabs = [
  "general",
  "appearance",
  "themes",
  "behavior",
  "startup",
  "commands",
  "keybindings",
];

export function Sidebar({ activeTab, onTabChange, metadata }: SidebarProps) {
  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-primary">
          Agentic WezTerm Manager
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-secondary text-muted-foreground"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {metadata && (
        <div className="p-4 border-t border-border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Status
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${metadata.environment === "production" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"}`}
              />
              <span className="text-[10px] font-bold uppercase tracking-tight">
                {metadata.environment}
              </span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Generated Config
            </div>
            <div className="group relative">
              <div className="text-[10px] font-mono break-all text-muted-foreground bg-muted/50 p-2 rounded border border-border/50 group-hover:border-primary/30 transition-colors">
                {metadata.luaOutputFile}
              </div>
              {metadata.isPackaged && metadata.luaHomeFile && (
                <div className="mt-2 text-[9px] text-muted-foreground italic flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  Also synced to home directory
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
