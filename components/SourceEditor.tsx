import React, { useState } from 'react';

interface SourceEditorProps {
    onSave: (title: string) => void;
    onCancel: () => void;
    isInitial?: boolean;
}

export const SourceEditor: React.FC<SourceEditorProps> = ({ onSave, onCancel, isInitial = false }) => {
    const [title, setTitle] = useState('');

    const handleSave = () => {
        if (title.trim()) {
            onSave(title);
            setTitle('');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-bg dark:bg-dark-bg">
            <div className="w-full max-w-lg bg-brand-surface dark:bg-dark-surface p-8 rounded-xl shadow-lg">
                <h2 className="text-3xl font-bold mb-2 text-brand-text-primary dark:text-dark-text-primary">{isInitial ? 'Welcome!' : 'Create a New Notebook'}</h2>
                <p className="text-brand-text-secondary dark:text-dark-text-secondary mb-6">{isInitial ? 'Create your first notebook to get started.' : 'Give your new notebook a title.'}</p>
                
                <div className="space-y-4">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Notebook Title (e.g., 'Project Phoenix Research')"
                        className="w-full p-3 rounded-lg border border-brand-border dark:border-dark-border focus:ring-2 focus:ring-brand-primary dark:focus:ring-dark-primary focus:outline-none"
                    />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    {!isInitial && (
                        <button
                            onClick={onCancel}
                            className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-brand-text-primary dark:text-dark-text-primary hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!title.trim()}
                        className="px-6 py-2 rounded-lg bg-brand-primary dark:bg-dark-primary text-white dark:text-gray-900 hover:bg-brand-primary-hover dark:hover:bg-dark-primary-hover disabled:opacity-50 transition-colors"
                    >
                        Create Notebook
                    </button>
                </div>
            </div>
        </div>
    );
};
