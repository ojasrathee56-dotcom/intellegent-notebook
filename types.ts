export type SourceType = 'text' | 'url';

export interface Source {
    id: string;
    type: SourceType;
    title: string;
    content: string; // Content for 'text', URL for 'url'
}

export interface SavedItem {
    id: string;
    notebookId: string;
    title: string;
    type: ContentType;
    contentData: any;
    createdAt: string;
}

export interface Notebook {
    id: string;
    title: string;
    sources: Source[];
    createdAt: string;
    savedItems?: SavedItem[];
}

export enum ContentType {
    TEXT = 'TEXT',
    QUIZ = 'QUIZ',
    FLASHCARDS = 'FLASHCARDS',
    PODCAST = 'PODCAST',
    ERROR = 'ERROR',
    SUMMARY = 'SUMMARY',
    FAQ = 'FAQ',
    TIMELINE = 'TIMELINE',
    IDEAS = 'IDEAS',
    CRITIQUE = 'CRITIQUE',
    MIND_MAP = 'MIND_MAP',
    DEBATE = 'DEBATE',
}

export interface Flashcard {
    id: string;
    term: string;
    definition: string;
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
}

export interface FAQItem {
    question: string;
    answer: string;
}

export interface TimelineEvent {
    date: string;
    event: string;
    description: string;
}

export interface MindMapNode {
    topic: string;
    children?: MindMapNode[];
}

export interface Debate {
    viewpointA: {
        title: string;
        arguments: string[];
    };
    viewpointB: {
        title: string;
        arguments: string[];
    };
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    contentType: ContentType;
    contentData?: QuizQuestion[] | Flashcard[] | { script: string } | string | FAQItem[] | TimelineEvent[] | MindMapNode | Debate;
}
