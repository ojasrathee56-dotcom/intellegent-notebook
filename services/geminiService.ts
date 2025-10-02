import { GoogleGenAI, Type } from "@google/genai";
import type { Source, QuizQuestion, Flashcard, FAQItem, TimelineEvent, MindMapNode, Debate } from '../types';

// Fix: Correctly initialize GoogleGenAI with named apiKey parameter.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash';

// Helper function to combine sources into a single context string
const getSourceContext = (sources: Source[]): string => {
    if (!sources || sources.length === 0) {
        return "No sources provided.";
    }
    // Combine sources into a single string for the model prompt
    return sources.map(s => `Source Title: ${s.title}\nSource Content:\n${s.content}`).join('\n\n---\n\n');
};

/**
 * Generic handler for generating content with JSON output.
 */
async function generateJsonContent<T>(prompt: string, schema: any): Promise<T> {
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
        }
    });

    try {
        // Fix: Use response.text to get the generated content.
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse JSON response:", e, "\nRaw response:", response.text);
        throw new Error("The model returned an invalid format. Please try again.");
    }
}

/**
 * Generic handler for generating text content.
 */
async function generateTextContent(prompt: string): Promise<string> {
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
    });
    // Fix: Use response.text to get the generated content.
    return response.text;
}

export async function askAboutSource(sources: Source[], question: string): Promise<string> {
    const sourceContext = getSourceContext(sources);
    const prompt = `Based on the following sources, please answer the question.\n\nSources:\n${sourceContext}\n\nQuestion: ${question}`;
    return generateTextContent(prompt);
}

export async function generateSummary(sources: Source[]): Promise<string> {
    const sourceContext = getSourceContext(sources);
    const prompt = `Please provide a concise summary of the key points from the following sources:\n\n${sourceContext}`;
    return generateTextContent(prompt);
}

export async function generateQuiz(sources: Source[]): Promise<QuizQuestion[]> {
    const sourceContext = getSourceContext(sources);
    const prompt = `Based on the provided sources, create a multiple-choice quiz with 5 questions. For each question, provide 4 options and indicate the correct answer.\n\nSources:\n${sourceContext}`;
    
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING, description: "The quiz question." },
                options: { 
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "An array of 4 possible answers."
                },
                correctAnswer: { type: Type.STRING, description: "The correct answer from the options." }
            },
            required: ['question', 'options', 'correctAnswer']
        }
    };
    return generateJsonContent<QuizQuestion[]>(prompt, schema);
}

export async function generateFlashcards(sources: Source[]): Promise<Flashcard[]> {
    const sourceContext = getSourceContext(sources);
    const prompt = `Generate a set of 10 flashcards from the provided sources. Each flashcard should have a 'term' and a 'definition'.\n\nSources:\n${sourceContext}`;
    
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                term: { type: Type.STRING, description: "The key term for the flashcard." },
                definition: { type: Type.STRING, description: "The definition of the term." }
            },
            required: ['term', 'definition']
        }
    };
    return generateJsonContent<Flashcard[]>(prompt, schema);
}

export async function generateFAQ(sources: Source[]): Promise<FAQItem[]> {
    const sourceContext = getSourceContext(sources);
    const prompt = `Generate a list of 5 frequently asked questions (FAQs) with their answers based on the provided sources.\n\nSources:\n${sourceContext}`;

    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING }
            },
            required: ['question', 'answer']
        }
    };
    return generateJsonContent<FAQItem[]>(prompt, schema);
}

export async function generateTimeline(sources: Source[]): Promise<TimelineEvent[]> {
    const sourceContext = getSourceContext(sources);
    const prompt = `Create a timeline of key events based on the provided sources. Each event should have a date, a short event title, and a brief description. If exact dates are not available, use relative terms (e.g., 'Early 20th Century').\n\nSources:\n${sourceContext}`;

    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                date: { type: Type.STRING },
                event: { type: Type.STRING },
                description: { type: Type.STRING }
            },
            required: ['date', 'event', 'description']
        }
    };
    return generateJsonContent<TimelineEvent[]>(prompt, schema);
}

export async function generatePodcastScript(sources: Source[]): Promise<string> {
    const sourceContext = getSourceContext(sources);
    const prompt = `Write a short podcast script (around 300 words) discussing the main themes of the following sources. The script should be engaging and conversational. Include intro and outro music cues.\n\nSources:\n${sourceContext}`;
    return generateTextContent(prompt);
}

export async function generateIdeas(sources: Source[]): Promise<string> {
    const sourceContext = getSourceContext(sources);
    const prompt = `Brainstorm a list of 5-7 interesting ideas, concepts, or project proposals based on the provided sources. Format them as a bulleted list.\n\nSources:\n${sourceContext}`;
    return generateTextContent(prompt);
}

export async function generateCritique(sources: Source[]): Promise<string> {
    const sourceContext = getSourceContext(sources);
    const prompt = `Provide a balanced critique of the provided sources. Discuss their strengths, weaknesses, potential biases, and any gaps in the information presented.\n\nSources:\n${sourceContext}`;
    return generateTextContent(prompt);
}

export async function generateMindMap(sources: Source[]): Promise<MindMapNode> {
    const sourceContext = getSourceContext(sources);
    const prompt = `Generate a mind map structure from the provided sources. The mind map should have a central topic and several child nodes, which can also have their own children. Keep it to a maximum of 3 levels deep.\n\nSources:\n${sourceContext}`;

    // Define the schema up to 3 levels deep as requested by the prompt.
    const mindMapNodeSchema: any = {
        type: Type.OBJECT,
        properties: {
            topic: { type: Type.STRING },
            children: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        topic: { type: Type.STRING },
                        children: {
                           type: Type.ARRAY,
                           items: {
                               type: Type.OBJECT,
                               properties: {
                                   topic: { type: Type.STRING }
                               }
                           }
                        }
                    }
                }
            }
        },
        required: ['topic']
    };
    
    return generateJsonContent<MindMapNode>(prompt, mindMapNodeSchema);
}

export async function generateDebate(sources: Source[]): Promise<Debate> {
    const sourceContext = getSourceContext(sources);
    const prompt = `Based on the provided sources, construct a debate with two opposing viewpoints. For each viewpoint, provide a title and a list of 3-4 supporting arguments.\n\nSources:\n${sourceContext}`;

    const viewpointSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            arguments: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        },
        required: ['title', 'arguments']
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            viewpointA: viewpointSchema,
            viewpointB: viewpointSchema
        },
        required: ['viewpointA', 'viewpointB']
    };

    return generateJsonContent<Debate>(prompt, schema);
}

export async function fetchUrlContent(url: string): Promise<string> {
    const prompt = `Please summarize the main content from the following URL and return it as plain text. If you cannot access the URL, please state that clearly. URL: ${url}`;
    
    // Use Google Search grounding to allow the model to access web content.
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });
    
    return response.text;
}