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
      <div className="bg-card border border-border rounded-xl p-6 w-96 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground mb-4">Add New Command</h3>
        <label className="block space-y-2 mb-4">
          <span className="text-sm font-medium text-foreground">Command Name</span>
          <input
            className="w-full bg-input border border-border rounded p-2 text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </label>
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
          >
            Add
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
