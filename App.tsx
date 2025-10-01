import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { SourceEditor } from './components/SourceEditor';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Notebook, ChatMessage, Source, SourceType, Flashcard, SavedItem } from './types';
import { ContentType } from './types';
import * as geminiService from './services/geminiService';

const App: React.FC = () => {
    const [notebooks, setNotebooks] = useLocalStorage<Notebook[]>('intelligent-notebook-notebooks', []);
    const [activeNotebookId, setActiveNotebookId] = useLocalStorage<string | null>('intelligent-notebook-activeNotebookId', null);
    const [chatHistory, setChatHistory] = useLocalStorage<Record<string, ChatMessage[]>>('intelligent-notebook-chatHistory', {});
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
    const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('intelligent-notebook-darkMode', false);

    const activeNotebook = notebooks.find(n => n.id === activeNotebookId) || null;
    const activeChatHistory = activeNotebookId ? chatHistory[activeNotebookId] || [] : [];

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    useEffect(() => {
        if (!activeNotebookId && notebooks.length > 0) {
            setActiveNotebookId(notebooks[0].id);
        }
    }, [notebooks, activeNotebookId, setActiveNotebookId]);

    const handleCreateNotebook = (title: string) => {
        const newNotebook: Notebook = {
            id: `notebook_${Date.now()}`,
            title,
            sources: [],
            createdAt: new Date().toISOString(),
            savedItems: [],
        };
        const newNotebooks = [...notebooks, newNotebook];
        setNotebooks(newNotebooks);
        setChatHistory({ ...chatHistory, [newNotebook.id]: [] });
        setActiveNotebookId(newNotebook.id);
        setIsCreatingNotebook(false);
    };

    const handleDeleteNotebook = (id: string) => {
        const newNotebooks = notebooks.filter(n => n.id !== id);
        setNotebooks(newNotebooks);
        
        const newChatHistory = { ...chatHistory };
        delete newChatHistory[id];
        setChatHistory(newChatHistory);
        
        if (activeNotebookId === id) {
            setActiveNotebookId(newNotebooks.length > 0 ? newNotebooks[0].id : null);
        }
    };

    const handleAddSourceToNotebook = (notebookId: string, title: string, content: string, type: SourceType) => {
        const newSource: Source = {
            id: `source_${Date.now()}`,
            title,
            content,
            type
        };

        const updatedNotebooks = notebooks.map(n => {
            if (n.id === notebookId) {
                return { ...n, sources: [...n.sources, newSource] };
            }
            return n;
        });
        setNotebooks(updatedNotebooks);
    };
    
    const updateChat = useCallback((notebookId: string, message: ChatMessage) => {
        setChatHistory(prev => ({
            ...prev,
            [notebookId]: [...(prev[notebookId] || []), message],
        }));
    }, [setChatHistory]);

    const handleSendMessage = async (message: string, type: 'chat' | 'quiz' | 'flashcards' | 'podcast' | 'summary' | 'faq' | 'timeline' | 'ideas' | 'critique' | 'mindmap' | 'debate') => {
        if (!activeNotebook || isLoading) return;

        setIsLoading(true);
        const userMessage: ChatMessage = { id: `msg_${Date.now()}`, role: 'user', text: message, contentType: ContentType.TEXT };
        updateChat(activeNotebook.id, userMessage);

        try {
            let response: ChatMessage | null = null;
            const msgId = `msg_${Date.now() + 1}`;
            const sources = activeNotebook.sources;
            
            switch(type) {
                case 'chat': response = { id: msgId, role: 'model', text: await geminiService.askAboutSource(sources, message), contentType: ContentType.TEXT }; break;
                case 'summary': response = { id: msgId, role: 'model', text: 'Here is a summary of the sources:', contentType: ContentType.SUMMARY, contentData: await geminiService.generateSummary(sources) }; break;
                case 'quiz': response = { id: msgId, role: 'model', text: 'Here is your quiz:', contentType: ContentType.QUIZ, contentData: await geminiService.generateQuiz(sources) }; break;
                case 'flashcards': {
                    const rawFlashcards = await geminiService.generateFlashcards(sources);
                    const flashcardsWithIds: Flashcard[] = rawFlashcards.map((card, index) => ({
                        ...card,
                        id: `flashcard_${Date.now()}_${index}`,
                    }));
                    response = { id: msgId, role: 'model', text: 'Here are your flashcards:', contentType: ContentType.FLASHCARDS, contentData: flashcardsWithIds };
                    break;
                }
                case 'faq': response = { id: msgId, role: 'model', text: 'Here are some frequently asked questions:', contentType: ContentType.FAQ, contentData: await geminiService.generateFAQ(sources) }; break;
                case 'timeline': response = { id: msgId, role: 'model', text: 'Here is a timeline of key events:', contentType: ContentType.TIMELINE, contentData: await geminiService.generateTimeline(sources) }; break;
                case 'podcast': response = { id: msgId, role: 'model', text: 'Podcast Script:', contentType: ContentType.PODCAST, contentData: { script: await geminiService.generatePodcastScript(sources) } }; break;
                case 'ideas': response = { id: msgId, role: 'model', text: 'Here are some ideas based on the sources:', contentType: ContentType.IDEAS, contentData: await geminiService.generateIdeas(sources) }; break;
                case 'critique': response = { id: msgId, role: 'model', text: 'Here is a critique of the sources:', contentType: ContentType.CRITIQUE, contentData: await geminiService.generateCritique(sources) }; break;
                case 'mindmap': response = { id: msgId, role: 'model', text: 'Here is a mind map of the key concepts:', contentType: ContentType.MIND_MAP, contentData: await geminiService.generateMindMap(sources) }; break;
                case 'debate': response = { id: msgId, role: 'model', text: 'Here is a debate on the source material:', contentType: ContentType.DEBATE, contentData: await geminiService.generateDebate(sources) }; break;
            }
            if (response) {
                updateChat(activeNotebook.id, response);
            }
        } catch (error) {
            console.error("Error generating content:", error);
            const errorMessage: ChatMessage = { id: `msg_${Date.now() + 1}`, role: 'model', text: 'Sorry, I encountered an error. Please check the console for details.', contentType: ContentType.ERROR };
            updateChat(activeNotebook.id, errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveItemToNotebook = (notebookId: string, itemData: { type: ContentType; contentData: any; title: string; }) => {
        const newItem: SavedItem = {
            id: `saved_${Date.now()}`,
            notebookId,
            title: itemData.title,
            type: itemData.type,
            contentData: itemData.contentData,
            createdAt: new Date().toISOString(),
        };

        setNotebooks(prev => prev.map(n => {
            if (n.id === notebookId) {
                return {
                    ...n,
                    savedItems: [...(n.savedItems || []), newItem],
                };
            }
            return n;
        }));
    };

    const handleDeleteSavedItem = (notebookId: string, itemId: string) => {
        setNotebooks(prev => prev.map(n => {
            if (n.id === notebookId) {
                return {
                    ...n,
                    savedItems: (n.savedItems || []).filter(item => item.id !== itemId),
                };
            }
            return n;
        }));
    };

    if (notebooks.length === 0 || isCreatingNotebook) {
        return <SourceEditor onSave={handleCreateNotebook} onCancel={() => setIsCreatingNotebook(false)} isInitial={notebooks.length === 0}/>;
    }

    return (
        <div className="flex h-screen w-screen text-brand-text-primary dark:text-dark-text-primary">
            <Sidebar
                notebooks={notebooks}
                activeNotebookId={activeNotebookId}
                onSelectNotebook={setActiveNotebookId}
                onAddNotebook={() => setIsCreatingNotebook(true)}
                onDeleteNotebook={handleDeleteNotebook}
                isDarkMode={isDarkMode}
                onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            />
            <main className="flex-1 flex flex-col bg-brand-surface dark:bg-dark-surface">
                {activeNotebook ? (
                    <ChatView
                        key={activeNotebook.id} // Re-mount component on notebook change
                        notebook={activeNotebook}
                        chatHistory={activeChatHistory}
                        onSendMessage={handleSendMessage}
                        onAddSource={handleAddSourceToNotebook}
                        isLoading={isLoading}
                        onSaveItem={handleSaveItemToNotebook}
                        onDeleteSavedItem={handleDeleteSavedItem}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-brand-text-secondary dark:text-dark-text-secondary">
                        <p>Select a notebook to start or create a new one.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
