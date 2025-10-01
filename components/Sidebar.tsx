import React from 'react';
import type { Notebook } from '../types';
import { PlusIcon, TrashIcon, BookIcon, SunIcon, MoonIcon } from './Icons';

interface SidebarProps {
    notebooks: Notebook[];
    activeNotebookId: string | null;
    onSelectNotebook: (id: string) => void;
    onAddNotebook: () => void;
    onDeleteNotebook: (id: string) => void;
    isDarkMode: boolean;
    onToggleDarkMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ notebooks, activeNotebookId, onSelectNotebook, onAddNotebook, onDeleteNotebook, isDarkMode, onToggleDarkMode }) => {
    return (
        <aside className="w-80 bg-brand-bg dark:bg-dark-bg border-r border-brand-border dark:border-dark-border flex flex-col p-4">
            <header className="mb-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-brand-text-primary dark:text-dark-text-primary">Intelligent Notebook</h1>
                    <button onClick={onToggleDarkMode} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Toggle dark mode">
                        {isDarkMode ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <MoonIcon className="w-5 h-5 text-gray-600" />}
                    </button>
                </div>
                <p className="text-sm text-brand-text-secondary dark:text-dark-text-secondary">Your personal AI assistant.</p>
            </header>
            <button
                onClick={onAddNotebook}
                className="w-full flex items-center justify-center gap-2 p-2.5 mb-4 rounded-lg bg-brand-primary dark:bg-dark-primary text-white dark:text-gray-800 font-medium hover:bg-brand-primary-hover dark:hover:bg-dark-primary-hover transition-colors"
            >
                <PlusIcon className="w-5 h-5" />
                New Notebook
            </button>
            <nav className="flex-1 overflow-y-auto">
                <h2 className="text-sm font-medium text-brand-text-secondary dark:text-dark-text-secondary mb-2 px-2">Notebooks</h2>
                <ul>
                    {notebooks.map(notebook => (
                        <li key={notebook.id}>
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); onSelectNotebook(notebook.id); }}
                                className={`group flex items-center justify-between p-2 rounded-md text-sm transition-colors ${
                                    activeNotebookId === notebook.id ? 'bg-blue-100 dark:bg-blue-900/50 text-brand-primary dark:text-dark-primary' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                  <BookIcon className="w-4 h-4 text-brand-text-secondary dark:text-dark-text-secondary"/>
                                  <span className="truncate flex-1">{notebook.title}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteNotebook(notebook.id); }}
                                    className="opacity-0 group-hover:opacity-100 text-brand-text-secondary dark:text-dark-text-secondary hover:text-red-500 dark:hover:text-red-400 transition-opacity p-1"
                                    aria-label="Delete notebook"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};
