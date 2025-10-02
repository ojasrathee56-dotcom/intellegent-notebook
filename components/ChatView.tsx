import React, { useState, useRef, useEffect } from 'react';
import type { Notebook, ChatMessage, SourceType, SavedItem, Flashcard, MindMapNode, QuizQuestion, FAQItem, TimelineEvent, Debate } from '../types';
import { ContentType } from '../types';
import { GeneratedContent, FlashcardViewerModal, MindMapViewerModal } from './GeneratedContent';
import { SendIcon, SparklesIcon, SummaryIcon, QuizIcon, FlashcardIcon, FAQIcon, TimelineIcon, PodcastIcon, BrainstormIcon, CritiqueIcon, MindMapIcon, DebateIcon, BookIcon, LinkIcon, UploadIcon, TrashIcon, MenuIcon } from './Icons';
import { parseFile } from '../services/fileParserService';
import * as geminiService from '../services/geminiService';

type ActionType = 'summary' | 'quiz' | 'flashcards' | 'faq' | 'timeline' | 'podcast' | 'ideas' | 'critique' | 'mindmap' | 'debate';

interface ChatViewProps {
    notebook: Notebook;
    chatHistory: ChatMessage[];
    onSendMessage: (message: string, type: 'chat' | ActionType) => void;
    onAddSource: (notebookId: string, title: string, content: string, type: SourceType) => void;
    isLoading: boolean;
    onSaveItem: (notebookId: string, itemData: { type: ContentType; contentData: any; title: string; }) => void;
    onDeleteSavedItem: (notebookId: string, itemId: string) => void;
    onToggleSidebar: () => void;
}

const AddSourceForm: React.FC<{ notebookId: string; onAddSource: ChatViewProps['onAddSource'] }> = ({ notebookId, onAddSource }) => {
    const [sourceType, setSourceType] = useState<'text' | 'url' | 'file'>('text');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = () => {
        setTitle('');
        setContent('');
        setFile(null);
        setError(null);
        setIsParsing(false);
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (sourceType === 'file') {
            if (!file) {
                setError("Please select a file to upload.");
                return;
            }
            setIsParsing(true);
            try {
                const { content: parsedContent, title: fileTitle } = await parseFile(file);
                onAddSource(notebookId, title || fileTitle, parsedContent, 'text'); // Add as text source
                resetForm();
            } catch (err: any) {
                setError(err.message || "Failed to parse file. Please ensure it is a supported format.");
            } finally {
                setIsParsing(false);
            }
        } else {
            if (title.trim() && content.trim()) {
                if (sourceType === 'url') {
                    setIsParsing(true);
                    try {
                        const fetchedContent = await geminiService.fetchUrlContent(content);
                        onAddSource(notebookId, title, fetchedContent, 'text');
                        resetForm();
                    } catch (err: any) {
                        setError(err.message || 'Failed to fetch from URL. It may be blocked due to security policies (CORS).');
                    } finally {
                        setIsParsing(false);
                    }
                } else {
                    onAddSource(notebookId, title, content, 'text');
                    resetForm();
                }
            }
        }
    };

    return (
        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm border border-brand-border dark:border-dark-border">
            <h3 className="text-lg font-semibold mb-3">Add a new source</h3>
            <div className="flex border-b border-brand-border dark:border-dark-border mb-3">
                <button onClick={() => setSourceType('text')} className={`px-4 py-2 text-sm font-medium ${sourceType === 'text' ? 'border-b-2 border-brand-primary dark:border-dark-primary text-brand-primary dark:text-dark-primary' : 'text-brand-text-secondary dark:text-dark-text-secondary'}`}>Text</button>
                <button onClick={() => setSourceType('url')} className={`px-4 py-2 text-sm font-medium ${sourceType === 'url' ? 'border-b-2 border-brand-primary dark:border-dark-primary text-brand-primary dark:text-dark-primary' : 'text-brand-text-secondary dark:text-dark-text-secondary'}`}>URL</button>
                <button onClick={() => setSourceType('file')} className={`px-4 py-2 text-sm font-medium ${sourceType === 'file' ? 'border-b-2 border-brand-primary dark:border-dark-primary text-brand-primary dark:text-dark-primary' : 'text-brand-text-secondary dark:text-dark-text-secondary'}`}>File</button>
            </div>
            <form onSubmit={handleSubmit}>
                {sourceType === 'file' ? (
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Source Title (from filename)"
                            className="w-full p-2 rounded-md border border-brand-border dark:border-dark-border bg-brand-bg dark:bg-dark-bg focus:ring-1 focus:ring-brand-primary dark:focus:ring-dark-primary focus:outline-none"
                            required
                        />
                         <div className="w-full p-4 text-center border-2 border-dashed border-brand-border dark:border-dark-border rounded-lg bg-gray-50 dark:bg-gray-700/50">
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <UploadIcon className="w-8 h-8 mx-auto text-brand-text-secondary dark:text-dark-text-secondary" />
                                <p className="mt-2 text-sm text-brand-text-secondary dark:text-dark-text-secondary">
                                    <span className="font-semibold text-brand-primary dark:text-dark-primary">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Supports .txt, .pdf, .docx, .pptx, .xlsx</p>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".txt,.pdf,.docx,.pptx,.xlsx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
                            </label>
                        </div>
                        {file && <p className="text-sm text-center font-medium text-brand-text-secondary dark:text-dark-text-secondary">Selected: {file.name}</p>}
                        {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={sourceType === 'text' ? "Source Title (e.g., 'Chapter 1 Notes')" : "Source Title (e.g., 'Project Website')"}
                            className="w-full p-2 rounded-md border border-brand-border dark:border-dark-border bg-brand-bg dark:bg-dark-bg focus:ring-1 focus:ring-brand-primary dark:focus:ring-dark-primary focus:outline-none"
                            required
                        />
                        {sourceType === 'text' ? (
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Paste your source content here..."
                                className="w-full p-2 rounded-md border border-brand-border dark:border-dark-border bg-brand-bg dark:bg-dark-bg focus:ring-1 focus:ring-brand-primary dark:focus:ring-dark-primary focus:outline-none"
                                rows={4}
                                required
                            />
                        ) : (
                            <input
                                type="url"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full p-2 rounded-md border border-brand-border dark:border-dark-border bg-brand-bg dark:bg-dark-bg focus:ring-1 focus:ring-brand-primary dark:focus:ring-dark-primary focus:outline-none"
                                required
                            />
                        )}
                        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    </div>
                )}
                <button type="submit" disabled={isParsing || !title.trim() || (sourceType === 'file' ? !file : !content.trim())} className="mt-3 px-4 py-2 text-sm rounded-md bg-brand-primary dark:bg-dark-primary text-white dark:text-gray-900 hover:bg-brand-primary-hover dark:hover:bg-dark-primary-hover disabled:opacity-50 transition-colors">
                    {isParsing ? (sourceType === 'file' ? 'Parsing File...' : 'Fetching Content...') : 'Add Source'}
                </button>
            </form>
        </div>
    )
}

const SavedItemsList: React.FC<{ items: SavedItem[]; onDeleteItem: (itemId: string) => void }> = ({ items, onDeleteItem }) => {
    const [viewingItem, setViewingItem] = useState<SavedItem | null>(null);

    const getIconForType = (type: ContentType) => {
        switch (type) {
            case ContentType.FLASHCARDS: return <FlashcardIcon className="w-4 h-4 text-brand-text-secondary dark:text-dark-text-secondary"/>;
            case ContentType.MIND_MAP: return <MindMapIcon className="w-4 h-4 text-brand-text-secondary dark:text-dark-text-secondary"/>;
            case ContentType.QUIZ: return <QuizIcon className="w-4 h-4 text-brand-text-secondary dark:text-dark-text-secondary"/>;
            case ContentType.DEBATE: return <DebateIcon className="w-4 h-4 text-brand-text-secondary dark:text-dark-text-secondary"/>;
            case ContentType.PODCAST: return <PodcastIcon className="w-4 h-4 text-brand-text-secondary dark:text-dark-text-secondary"/>;
            default: return <BookIcon className="w-4 h-4 text-brand-text-secondary dark:text-dark-text-secondary"/>;
        }
    };
    
    const renderViewingModal = () => {
        if (!viewingItem) return null;

        switch (viewingItem.type) {
            case ContentType.FLASHCARDS:
                return <FlashcardViewerModal flashcards={viewingItem.contentData as Flashcard[]} onClose={() => setViewingItem(null)} />;
            case ContentType.MIND_MAP:
                return <MindMapViewerModal data={viewingItem.contentData as MindMapNode} onClose={() => setViewingItem(null)} />;
            // Other types can be added here if they have special modal views
            default:
                // For simple text types, could show a basic modal, but for now just close
                setViewingItem(null);
                return null;
        }
    };

    return (
        <>
            {renderViewingModal()}
            <ul className="space-y-2">
                {items.map(item => (
                    <li key={item.id} className="group flex items-center justify-between gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md text-sm">
                        {getIconForType(item.type)}
                        <span className="font-medium flex-1 truncate">{item.title}</span>
                        <div className="flex items-center gap-2">
                            {[ContentType.FLASHCARDS, ContentType.MIND_MAP].includes(item.type) && (
                                <button onClick={() => setViewingItem(item)} className="text-xs font-semibold text-brand-primary dark:text-dark-primary hover:underline">View</button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                                className="opacity-0 group-hover:opacity-100 text-brand-text-secondary dark:text-dark-text-secondary hover:text-red-500 dark:hover:text-red-400 transition-opacity p-1"
                                aria-label={`Delete saved item ${item.title}`}
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </>
    );
};


export const ChatView: React.FC<ChatViewProps> = ({ notebook, chatHistory, onSendMessage, onAddSource, isLoading, onSaveItem, onDeleteSavedItem, onToggleSidebar }) => {
    const [input, setInput] = useState('');
    const [showActions, setShowActions] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(scrollToBottom, [chatHistory]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) setShowActions(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input, 'chat');
            setInput('');
        }
    };
    
    const handleSpecialAction = (type: ActionType) => {
        if (!isLoading) {
            const message = `Generate ${type} for this notebook.`;
            onSendMessage(message, type);
            setShowActions(false);
        }
    };

    const actions: { type: ActionType, label: string, icon: React.FC<any> }[] = [
        { type: 'summary', label: 'Summary', icon: SummaryIcon },
        { type: 'faq', label: 'FAQ', icon: FAQIcon },
        { type: 'timeline', label: 'Timeline', icon: TimelineIcon },
        { type: 'ideas', label: 'Brainstorm Ideas', icon: BrainstormIcon },
        { type: 'critique', label: 'Critique', icon: CritiqueIcon },
    ];
    
    const hasSources = notebook.sources.length > 0;

    return (
        <div className="flex-1 flex flex-col h-full">
             <header className="p-4 border-b border-brand-border dark:border-dark-border flex items-center gap-2">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 -ml-2 rounded-full md:hidden hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Open sidebar"
                >
                    <MenuIcon className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-semibold truncate">{notebook.title}</h2>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                <div className="space-y-4">
                    <AddSourceForm notebookId={notebook.id} onAddSource={onAddSource} />
                    {notebook.sources.length > 0 && (
                        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm border border-brand-border dark:border-dark-border">
                            <h3 className="text-lg font-semibold mb-3">Sources in this notebook</h3>
                            <ul className="space-y-2">
                                {notebook.sources.map(source => (
                                    <li key={source.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md text-sm">
                                        {source.type === 'text' ? <BookIcon className="w-4 h-4 text-brand-text-secondary dark:text-dark-text-secondary"/> : <LinkIcon className="w-4 h-4 text-brand-text-secondary dark:text-dark-text-secondary"/>}
                                        <span className="font-medium flex-1 truncate">{source.title}</span>
                                        <span className="text-xs text-brand-text-secondary dark:text-dark-text-secondary truncate">{source.type === 'url' ? source.content : `${source.content.substring(0, 50)}...`}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {notebook.savedItems && notebook.savedItems.length > 0 && (
                         <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm border border-brand-border dark:border-dark-border">
                            <h3 className="text-lg font-semibold mb-3">Saved Items</h3>
                            <SavedItemsList
                                items={notebook.savedItems}
                                onDeleteItem={(itemId) => onDeleteSavedItem(notebook.id, itemId)}
                            />
                        </div>
                    )}
                </div>

                {chatHistory.map(message => (
                     <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                        {message.role === 'model' && <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-brand-primary dark:text-dark-primary"/></div>}
                        <div className={`max-w-2xl w-full ${message.role === 'user' ? 'text-right' : ''}`}>
                             <div className={`inline-block p-3 md:p-4 rounded-2xl ${message.role === 'user' ? 'bg-brand-primary dark:bg-dark-primary text-white dark:text-gray-900 rounded-br-none' : 'bg-gray-100 dark:bg-gray-700 rounded-bl-none'}`}>
                                <GeneratedContent 
                                    message={message} 
                                    onSaveItem={(type, contentData) => {
                                        const title = window.prompt('Enter a title for this item:', `Saved ${type.toLowerCase()}`);
                                        if (title) {
                                            onSaveItem(notebook.id, { type, contentData, title });
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex gap-3">
                         <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-brand-primary dark:text-dark-primary"/></div>
                         <div className="max-w-2xl w-full">
                            <div className="inline-block p-4 rounded-2xl bg-gray-100 dark:bg-gray-700 rounded-bl-none">
                               <div className="animate-pulse flex space-x-2">
                                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                 <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-brand-border dark:border-dark-border">
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
                        placeholder={hasSources ? "Ask a question about your notebook..." : "Add a source to start chatting"}
                        className="w-full p-3 pr-[280px] lg:pr-80 rounded-lg border border-brand-border dark:border-dark-border bg-brand-bg dark:bg-dark-bg focus:ring-2 focus:ring-brand-primary dark:focus:ring-dark-primary focus:outline-none resize-none"
                        rows={1}
                        disabled={!hasSources || isLoading}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0">
                         <button type="button" onClick={() => handleSpecialAction('flashcards')} disabled={!hasSources || isLoading} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50" aria-label="Generate flashcards">
                            <FlashcardIcon className="w-5 h-5 text-brand-text-secondary dark:text-dark-text-secondary"/>
                         </button>
                         <button type="button" onClick={() => handleSpecialAction('podcast')} disabled={!hasSources || isLoading} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50" aria-label="Generate podcast">
                            <PodcastIcon className="w-5 h-5 text-brand-text-secondary dark:text-dark-text-secondary"/>
                         </button>
                         <button type="button" onClick={() => handleSpecialAction('quiz')} disabled={!hasSources || isLoading} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50" aria-label="Generate quiz">
                            <QuizIcon className="w-5 h-5 text-brand-text-secondary dark:text-dark-text-secondary"/>
                         </button>
                         <button type="button" onClick={() => handleSpecialAction('mindmap')} disabled={!hasSources || isLoading} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50" aria-label="Generate mind map">
                            <MindMapIcon className="w-5 h-5 text-brand-text-secondary dark:text-dark-text-secondary"/>
                         </button>
                         <button type="button" onClick={() => handleSpecialAction('debate')} disabled={!hasSources || isLoading} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50" aria-label="Generate debate">
                            <DebateIcon className="w-5 h-5 text-brand-text-secondary dark:text-dark-text-secondary"/>
                         </button>
                         <div className="relative" ref={actionsRef}>
                            <button type="button" onClick={() => setShowActions(!showActions)} disabled={!hasSources || isLoading} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50" aria-label="Generate content">
                                <SparklesIcon className="w-5 h-5 text-brand-primary dark:text-dark-primary"/>
                            </button>
                             {showActions && (
                                <div className="absolute bottom-full right-0 mb-2 w-60 bg-brand-surface dark:bg-dark-surface border border-brand-border dark:border-dark-border rounded-lg shadow-xl z-10">
                                    <div className="p-2">
                                        {actions.map(action => (
                                            <button key={action.type} onClick={() => handleSpecialAction(action.type)} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">
                                                <action.icon className="w-4 h-4 text-brand-text-secondary dark:text-dark-text-secondary"/>
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button type="submit" disabled={!input.trim() || !hasSources || isLoading} className="p-2 rounded-full bg-brand-primary dark:bg-dark-primary text-white dark:text-gray-900 disabled:bg-blue-300 dark:disabled:bg-blue-800" aria-label="Send message">
                            <SendIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};