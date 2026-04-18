interface LuaPreviewProps {
  lua: string;
}

export function LuaPreview({ lua }: LuaPreviewProps) {
  return (
    <div className="w-96 border-l border-slate-800 bg-[#0a0c10] flex flex-col p-4 overflow-y-auto hidden lg:flex">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Generated Lua Preview</h3>
      <pre className="text-xs text-blue-300/80 font-mono overflow-auto flex-1 custom-scrollbar">
        {lua || '-- Wait for sync'}
      </pre>
    </div>
  );
}
