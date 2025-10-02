import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, QuizQuestion, Flashcard, FAQItem, TimelineEvent, MindMapNode, Debate } from '../types';
import { ContentType } from '../types';
import { ChevronDownIcon, FlashcardIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, PlayIcon, PauseIcon, StopIcon, MindMapIcon, DownloadIcon, FolderArrowDownIcon } from './Icons';

interface GeneratedContentProps {
    message: ChatMessage;
    onSaveItem: (type: ContentType, contentData: any) => void;
}

// Download and formatting helpers
const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
};

const flashcardsToCsv = (flashcards: Flashcard[]): string => {
    const header = '"term","definition"\n';
    const rows = flashcards.map(fc => `"${fc.term.replace(/"/g, '""')}","${fc.definition.replace(/"/g, '""')}"`).join('\n');
    return header + rows;
};

const mindMapToText = (node: MindMapNode, indent = 0): string => {
    let text = '  '.repeat(indent) + '- ' + node.topic + '\n';
    if (node.children) {
        node.children.forEach(child => {
            text += mindMapToText(child, indent + 1);
        });
    }
    return text;
};

const quizToText = (questions: QuizQuestion[]): string => {
    return questions.map((q, i) => 
        `Question ${i + 1}: ${q.question}\n` +
        q.options.map(opt => `  - ${opt}`).join('\n') +
        `\nCorrect Answer: ${q.correctAnswer}\n`
    ).join('\n');
};

const debateToText = (debate: Debate): string => {
    let text = `Viewpoint: ${debate.viewpointA.title}\n`;
    debate.viewpointA.arguments.forEach(arg => text += `- ${arg}\n`);
    text += `\nViewpoint: ${debate.viewpointB.title}\n`;
    debate.viewpointB.arguments.forEach(arg => text += `- ${arg}\n`);
    return text;
};


const ContentActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center gap-2 mt-3 border-t border-brand-border dark:border-dark-border pt-3">
        {children}
    </div>
);

const ActionButton: React.FC<{ onClick?: () => void; href?: string; download?: string | boolean; children: React.ReactNode; 'aria-label': string }> = (props) => {
    if (props.href) {
         return (
            <a
                href={props.href}
                download={props.download}
                aria-label={props['aria-label']}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-full bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors font-semibold"
            >
                {props.children}
            </a>
        );
    }
    return (
        <button
            onClick={props.onClick}
            aria-label={props['aria-label']}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-full bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors font-semibold"
        >
            {props.children}
        </button>
    );
}


export const FlashcardViewerModal: React.FC<{ flashcards: Flashcard[]; onClose: () => void }> = ({ flashcards, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setIsFlipped(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsFlipped(f => !f);
            }
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, flashcards.length]);

    const currentCard = flashcards[currentIndex];

    return (
        <div className="fixed inset-0 bg-brand-bg dark:bg-dark-bg z-50 flex flex-col items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="flashcard-term">
            <div className="w-full h-full flex flex-col items-center justify-center [perspective:1000px]">
                <div
                    className="relative w-full max-w-4xl h-3/5 bg-brand-surface dark:bg-dark-surface text-brand-text-primary dark:text-dark-text-primary rounded-2xl shadow-2xl transition-transform duration-700 cursor-pointer"
                    style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'none' }}
                    onClick={() => setIsFlipped(f => !f)}
                >
                    {/* Front of Card */}
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center p-8 text-center" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                        <h2 id="flashcard-term" className="text-2xl md:text-4xl font-bold">{currentCard.term}</h2>
                    </div>
                    {/* Back of Card */}
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center p-8 overflow-y-auto text-center" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                         <p className="text-lg md:text-xl">{currentCard.definition}</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 sm:bottom-12 w-full max-w-4xl px-4 mx-auto flex items-center justify-between">
                <button onClick={handlePrev} disabled={currentIndex === 0} className="p-4 rounded-full bg-brand-surface dark:bg-dark-surface shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all" aria-label="Previous card">
                    <ChevronLeftIcon className="w-7 h-7"/>
                </button>

                <p className="text-lg font-semibold text-brand-text-secondary dark:text-dark-text-secondary">{currentIndex + 1} / {flashcards.length}</p>

                <button onClick={handleNext} disabled={currentIndex === flashcards.length - 1} className="p-4 rounded-full bg-brand-surface dark:bg-dark-surface shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all" aria-label="Next card">
                    <ChevronRightIcon className="w-7 h-7"/>
                </button>
            </div>

            <button onClick={onClose} className="absolute top-6 right-6 w-12 h-12 rounded-full bg-brand-surface dark:bg-dark-surface shadow-md flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors z-10" aria-label="Close flashcards">
               <XMarkIcon className="w-7 h-7"/>
            </button>
        </div>
    );
};

const FlashcardsView: React.FC<{ initialFlashcards: Flashcard[] }> = ({ initialFlashcards }) => {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-brand-primary dark:bg-dark-primary text-white dark:text-gray-900 hover:bg-brand-primary-hover dark:hover:bg-dark-primary-hover transition-colors font-semibold"
            >
                <FlashcardIcon className="w-5 h-5"/>
                View Flashcards ({initialFlashcards.length})
            </button>
            {showModal && <FlashcardViewerModal flashcards={initialFlashcards} onClose={() => setShowModal(false)} />}
        </>
    );
};

const PodcastPlayer: React.FC<{ script: string }> = ({ script }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const resetState = () => {
        setIsPlaying(false);
        setIsPaused(false);
    }

    const handlePlay = () => {
        if (!('speechSynthesis' in window)) {
            alert("Sorry, your browser doesn't support text-to-speech.");
            return;
        }
        if (isPaused) {
            window.speechSynthesis.resume();
            setIsPlaying(true);
            setIsPaused(false);
        } else {
            const utterance = new SpeechSynthesisUtterance(script);
            utterance.onend = () => resetState();
            utterance.onerror = (e) => {
                console.error("SpeechSynthesis Error", e);
                resetState();
            };
            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
            setIsPlaying(true);
        }
    };

    const handlePause = () => {
        window.speechSynthesis.pause();
        setIsPlaying(false);
        setIsPaused(true);
    };

    const handleStop = () => {
        window.speechSynthesis.cancel();
        resetState();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    return (
        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm w-full max-w-sm">
            <div className="flex items-center justify-around">
                <button 
                    onClick={isPlaying ? handlePause : handlePlay}
                    className="p-3 rounded-full bg-brand-primary text-white hover:bg-brand-primary-hover transition-colors" 
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <PauseIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
                </button>
                <button 
                    onClick={handleStop}
                    disabled={!isPlaying && !isPaused}
                    className="p-3 rounded-full bg-gray-200 dark:bg-gray-600 text-brand-text-primary dark:text-dark-text-primary hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 transition-colors" 
                    aria-label="Stop"
                >
                    <StopIcon className="w-6 h-6"/>
                </button>
            </div>
            <p className="mt-3 text-xs text-center text-brand-text-secondary dark:text-dark-text-secondary truncate">{script.substring(0, 100)}...</p>
        </div>
    );
};


const QuizComponent: React.FC<{ questions: QuizQuestion[] }> = ({ questions }) => {
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [submitted, setSubmitted] = useState(false);

    const handleAnswer = (qIndex: number, option: string) => {
        if (submitted) return;
        setAnswers(prev => ({ ...prev, [qIndex]: option }));
    }

    const getOptionClass = (qIndex: number, option: string, correctAnswer: string) => {
        if (!submitted) return "hover:bg-gray-200 dark:hover:bg-gray-600";
        if (option === correctAnswer) return "bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200";
        if (answers[qIndex] === option && option !== correctAnswer) return "bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200";
        return "bg-gray-100 dark:bg-gray-700";
    }

    const score = Object.keys(answers).reduce((acc, key) => {
        const qIndex = parseInt(key);
        return answers[qIndex] === questions[qIndex].correctAnswer ? acc + 1 : acc;
    }, 0);

    return (
        <div className="space-y-6">
            {questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm">
                    <p className="font-semibold mb-3">{qIndex + 1}. {q.question}</p>
                    <div className="space-y-2">
                        {q.options.map((option, oIndex) => (
                            <button
                                key={oIndex}
                                onClick={() => handleAnswer(qIndex, option)}
                                className={`w-full text-left p-2 rounded-md transition-colors text-sm ${
                                    answers[qIndex] === option ? 'bg-blue-200 dark:bg-blue-800 ring-2 ring-brand-primary dark:ring-dark-primary' : 'bg-gray-100 dark:bg-gray-700'
                                } ${getOptionClass(qIndex, option, q.correctAnswer)}`}
                                disabled={submitted}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            {!submitted ? (
                 <button onClick={() => setSubmitted(true)} className="mt-4 px-4 py-2 bg-brand-primary dark:bg-dark-primary text-white dark:text-gray-900 rounded-lg hover:bg-brand-primary-hover dark:hover:bg-dark-primary-hover">Submit Quiz</button>
            ) : (
                <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-center font-bold text-brand-primary dark:text-dark-primary">Your score: {score} / {questions.length}</div>
            )}
        </div>
    )
}

const FAQComponent: React.FC<{ items: FAQItem[] }> = ({ items }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleItem = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="space-y-2">
            {items.map((item, index) => (
                <div key={index} className="border border-brand-border dark:border-dark-border rounded-lg overflow-hidden bg-white dark:bg-dark-surface">
                    <button onClick={() => toggleItem(index)} className="w-full text-left p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" aria-expanded={openIndex === index}>
                        <span className="font-semibold flex-1 pr-2">{item.question}</span>
                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${openIndex === index ? 'rotate-180' : ''}`} />
                    </button>
                    {openIndex === index && (
                        <div className="p-4 border-t border-brand-border dark:border-dark-border">
                            <p className="whitespace-pre-wrap text-sm text-brand-text-secondary dark:text-dark-text-secondary">{item.answer}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const TimelineComponent: React.FC<{ events: TimelineEvent[] }> = ({ events }) => {
    return (
        <div className="relative border-l-2 border-brand-primary dark:border-dark-primary ml-4 pl-8 py-4 space-y-8">
            {events.map((event, index) => (
                <div key={index} className="relative">
                    <div className="absolute -left-[35px] top-1 w-4 h-4 bg-brand-primary dark:bg-dark-primary rounded-full border-4 border-gray-100 dark:border-dark-surface"></div>
                    <p className="text-sm font-semibold text-brand-text-secondary dark:text-dark-text-secondary">{event.date}</p>
                    <h4 className="font-bold text-md">{event.event}</h4>
                    <p className="mt-1 text-sm text-brand-text-secondary dark:text-dark-text-secondary">{event.description}</p>
                </div>
            ))}
        </div>
    );
};

const MindMapNodeComponent: React.FC<{ node: MindMapNode; level: number }> = ({ node, level }) => {
    const levelStyles = [
        "font-bold text-lg text-brand-text-primary dark:text-dark-text-primary", // level 0 (root)
        "font-semibold text-md", // level 1
        "font-medium text-base", // level 2
        "text-sm", // level 3+
    ];
    
    const style = levelStyles[Math.min(level, levelStyles.length - 1)];
    const paddingLeft = level > 0 ? `${(level - 1) * 1.5 + 1}rem` : '0rem';

    return (
        <div style={{ paddingLeft }}>
            <div className="flex items-center gap-2 py-1">
                <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${level === 0 ? 'bg-brand-primary dark:bg-dark-primary' : 'bg-gray-400 dark:bg-gray-500'}`}></div>
                <span className={style}>{node.topic}</span>
            </div>
            {node.children && node.children.length > 0 && (
                <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-[5px]">
                    {node.children.map((child, index) => (
                        <MindMapNodeComponent key={`${index}-${child.topic}`} node={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export const MindMapViewerModal: React.FC<{ data: MindMapNode; onClose: () => void }> = ({ data, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="mindmap-title">
            <div className="bg-brand-surface dark:bg-dark-surface w-full max-w-3xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col">
                <header className="p-4 border-b border-brand-border dark:border-dark-border flex justify-between items-center flex-shrink-0">
                    <h2 id="mindmap-title" className="text-xl font-bold">Mind Map</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" aria-label="Close mind map">
                       <XMarkIcon className="w-6 h-6"/>
                    </button>
                </header>
                <div className="p-6 overflow-y-auto">
                    <MindMapNodeComponent node={data} level={0} />
                </div>
            </div>
        </div>
    );
};


const MindMapView: React.FC<{ data: MindMapNode }> = ({ data }) => {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-brand-primary dark:bg-dark-primary text-white dark:text-gray-900 hover:bg-brand-primary-hover dark:hover:bg-dark-primary-hover transition-colors font-semibold"
            >
                <MindMapIcon className="w-5 h-5"/>
                View Mind Map
            </button>
            {showModal && <MindMapViewerModal data={data} onClose={() => setShowModal(false)} />}
        </>
    );
};


const DebateComponent: React.FC<{ data: Debate }> = ({ data }) => {
    return (
        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm space-y-4 md:space-y-0 md:flex md:gap-6">
            <div className="flex-1">
                <h4 className="font-bold text-md mb-2 border-b-2 border-blue-500 pb-1 text-blue-700 dark:text-blue-400">{data.viewpointA.title}</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-brand-text-secondary dark:text-dark-text-secondary">
                    {data.viewpointA.arguments.map((arg, index) => (
                        <li key={`a-${index}`}>{arg}</li>
                    ))}
                </ul>
            </div>
             <div className="flex-1">
                <h4 className="font-bold text-md mb-2 border-b-2 border-red-500 pb-1 text-red-700 dark:text-red-400">{data.viewpointB.title}</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-brand-text-secondary dark:text-dark-text-secondary">
                    {data.viewpointB.arguments.map((arg, index) => (
                        <li key={`b-${index}`}>{arg}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const TextBlockComponent: React.FC<{ content: string }> = ({ content }) => {
     return <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm text-sm whitespace-pre-wrap">{content}</div>
}

export const GeneratedContent: React.FC<GeneratedContentProps> = ({ message, onSaveItem }) => {
    const renderContent = () => {
        switch(message.contentType) {
            case ContentType.TEXT:
            case ContentType.ERROR:
                const formattedText = message.text.split('**').map((part, index) => 
                    index % 2 === 1 ? <strong key={index}>{part}</strong> : <span key={index}>{part}</span>
                );
                return <p className={`whitespace-pre-wrap ${message.contentType === ContentType.ERROR ? 'text-red-500 dark:text-red-400' : ''}`}>{formattedText}</p>;
            
            case ContentType.FLASHCARDS:
                const flashcards = message.contentData as Flashcard[];
                return (
                    <>
                        <FlashcardsView initialFlashcards={flashcards} />
                        <ContentActions>
                             <ActionButton onClick={() => downloadFile(flashcardsToCsv(flashcards), 'flashcards.csv', 'text/csv')} aria-label="Download flashcards as CSV">
                                <DownloadIcon className="w-4 h-4"/> Download as CSV
                            </ActionButton>
                            <ActionButton onClick={() => onSaveItem(ContentType.FLASHCARDS, flashcards)} aria-label="Save flashcards to notebook">
                                <FolderArrowDownIcon className="w-4 h-4"/> Save
                            </ActionButton>
                        </ContentActions>
                    </>
                );

            case ContentType.QUIZ:
                const quizData = message.contentData as QuizQuestion[];
                return (
                    <>
                        <QuizComponent questions={quizData} />
                        <ContentActions>
                             <ActionButton onClick={() => downloadFile(quizToText(quizData), 'quiz.txt', 'text/plain')} aria-label="Download quiz as text">
                                <DownloadIcon className="w-4 h-4"/> Download as Text
                            </ActionButton>
                             <ActionButton onClick={() => onSaveItem(ContentType.QUIZ, quizData)} aria-label="Save quiz to notebook">
                                <FolderArrowDownIcon className="w-4 h-4"/> Save
                            </ActionButton>
                        </ContentActions>
                    </>
                );
            
            case ContentType.FAQ:
                return <FAQComponent items={message.contentData as FAQItem[]} />;
            
            case ContentType.TIMELINE:
                return <TimelineComponent events={message.contentData as TimelineEvent[]} />;

            case ContentType.PODCAST:
                 const script = (message.contentData as { script: string }).script;
                return (
                    <>
                        <PodcastPlayer script={script} />
                        <ContentActions>
                            <ActionButton onClick={() => downloadFile(script, 'podcast_script.txt', 'text/plain')} aria-label="Download podcast script">
                                <DownloadIcon className="w-4 h-4"/> Download Script
                            </ActionButton>
                            <ActionButton onClick={() => onSaveItem(ContentType.PODCAST, { script })} aria-label="Save podcast script to notebook">
                                <FolderArrowDownIcon className="w-4 h-4"/> Save
                            </ActionButton>
                        </ContentActions>
                    </>
                );
            
            case ContentType.SUMMARY:
            case ContentType.IDEAS:
            case ContentType.CRITIQUE:
                return <TextBlockComponent content={message.contentData as string} />;
            
            case ContentType.MIND_MAP:
                const mindMapData = message.contentData as MindMapNode;
                return (
                    <>
                        <MindMapView data={mindMapData} />
                        <ContentActions>
                            <ActionButton onClick={() => downloadFile(JSON.stringify(mindMapData, null, 2), 'mindmap.json', 'application/json')} aria-label="Download mind map as JSON">
                                <DownloadIcon className="w-4 h-4"/> Download as JSON
                            </ActionButton>
                            <ActionButton onClick={() => downloadFile(mindMapToText(mindMapData), 'mindmap.txt', 'text/plain')} aria-label="Download mind map as text">
                                <DownloadIcon className="w-4 h-4"/> Download as Text
                            </ActionButton>
                             <ActionButton onClick={() => onSaveItem(ContentType.MIND_MAP, mindMapData)} aria-label="Save mind map to notebook">
                                <FolderArrowDownIcon className="w-4 h-4"/> Save
                            </ActionButton>
                        </ContentActions>
                    </>
                );
            
            case ContentType.DEBATE:
                const debateData = message.contentData as Debate;
                return (
                    <>
                        <DebateComponent data={debateData} />
                        <ContentActions>
                            <ActionButton onClick={() => downloadFile(debateToText(debateData), 'debate.txt', 'text/plain')} aria-label="Download debate as text">
                                <DownloadIcon className="w-4 h-4"/> Download as Text
                            </ActionButton>
                             <ActionButton onClick={() => onSaveItem(ContentType.DEBATE, debateData)} aria-label="Save debate to notebook">
                                <FolderArrowDownIcon className="w-4 h-4"/> Save
                            </ActionButton>
                        </ContentActions>
                    </>
                );

            default:
                return <p className="whitespace-pre-wrap">{message.text}</p>
        }
    }
    
    return (
        <div className="space-y-4">
            <p className="font-semibold">{message.text}</p>
            {renderContent()}
        </div>
    );
}