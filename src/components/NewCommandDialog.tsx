import { useState } from 'react';

interface NewCommandDialogProps {
  onAdd: (name: string) => void;
  onClose: () => void;
}

export function NewCommandDialog({ onAdd, onClose }: NewCommandDialogProps) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#161925] border border-slate-700 rounded-xl p-6 w-96 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Add New Command</h3>
        <label className="block space-y-2 mb-4">
          <span className="text-sm font-medium text-slate-300">Command Name</span>
          <input
            className="w-full bg-[#0a0c10] border border-slate-700 rounded p-2 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </label>
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
          >
            Add
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
