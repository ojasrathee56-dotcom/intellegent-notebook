import { GoogleGenAI, Type } from "@google/genai";
import type { Flashcard, QuizQuestion, FAQItem, TimelineEvent, MindMapNode, Debate, Source } from '../types';
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.min.mjs';

// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs`;

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash';

// Schemas for structured content
const flashcardSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        term: { type: Type.STRING, description: 'The key term or concept.' },
        definition: { type: Type.STRING, description: 'A concise definition or explanation of the term.' },
      },
      required: ["term", "definition"],
    },
};

const quizSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            question: { type: Type.STRING, description: 'The quiz question.' },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'An array of 4 possible answers.' },
            correctAnswer: { type: Type.STRING, description: 'The correct answer from the options.' }
        },
        required: ["question", "options", "correctAnswer"],
    }
};

const faqSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            question: { type: Type.STRING, description: 'A frequently asked question from the source material.' },
            answer: { type: Type.STRING, description: 'A concise answer to the question, based on the source.' },
        },
        required: ["question", "answer"],
    }
};

const timelineSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            date: { type: Type.STRING, description: 'The date or time period of the event (e.g., "1992", "Late 18th Century").' },
            event: { type: Type.STRING, description: 'A concise title for the event.' },
            description: { type: Type.STRING, description: 'A short description of the event, based on the source material.' },
        },
        required: ["date", "event", "description"],
    }
};

// A schema for a mind map with a fixed depth to prevent infinite recursion errors.
// This allows for a root topic with up to 5 nested levels of children.
const mindMapNodeSchemaL5 = {
    type: Type.OBJECT,
    properties: {
        topic: { type: Type.STRING, description: 'The topic for this node.' },
    },
    required: ['topic'],
};

const mindMapNodeSchemaL4 = {
    type: Type.OBJECT,
    properties: {
        topic: { type: Type.STRING, description: 'The topic for this node.' },
        children: { type: Type.ARRAY, items: mindMapNodeSchemaL5, description: 'Sub-topics.' },
    },
    required: ['topic'],
};

const mindMapNodeSchemaL3 = {
    type: Type.OBJECT,
    properties: {
        topic: { type: Type.STRING, description: 'The topic for this node.' },
        children: { type: Type.ARRAY, items: mindMapNodeSchemaL4, description: 'Sub-topics.' },
    },
    required: ['topic'],
};

const mindMapNodeSchemaL2 = {
    type: Type.OBJECT,
    properties: {
        topic: { type: Type.STRING, description: 'The topic for this node.' },
        children: { type: Type.ARRAY, items: mindMapNodeSchemaL3, description: 'Sub-topics.' },
    },
    required: ['topic'],
};

const mindMapNodeSchemaL1 = {
    type: Type.OBJECT,
    properties: {
        topic: { type: Type.STRING, description: 'The topic for this node.' },
        children: { type: Type.ARRAY, items: mindMapNodeSchemaL2, description: 'Sub-topics.' },
    },
    required: ['topic'],
};

const mindMapSchema = {
    type: Type.OBJECT,
    properties: {
        topic: { 
            type: Type.STRING, 
            description: 'The central idea or concept for the mind map.' 
        },
        children: {
            type: Type.ARRAY,
            description: 'An array of child nodes, representing sub-topics.',
            items: mindMapNodeSchemaL1,
        },
    },
    required: ['topic'],
};

const debateSchema = {
    type: Type.OBJECT,
    properties: {
        viewpointA: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "The title for the first viewpoint (e.g., 'For the Proposal')." },
                arguments: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of arguments supporting this viewpoint." }
            },
            required: ["title", "arguments"]
        },
        viewpointB: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "The title for the opposing viewpoint (e.g., 'Against the Proposal')." },
                arguments: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of arguments supporting this viewpoint." }
            },
            required: ["title", "arguments"]
        }
    },
    required: ["viewpointA", "viewpointB"]
};


// Generic function to generate prompts from multiple sources
const generatePrompt = (sources: Source[], task: string): string => {
    const sourceMaterial = sources.map((source, index) => {
        return `
--- SOURCE ${index + 1}: ${source.title} (${source.type.toUpperCase()}) ---
${source.content}
-----------------------------------
`
    }).join('\n\n');

    return `Based on the following source materials, ${task}.

${sourceMaterial}
`;
};

// Function to handle JSON parsing with error handling
async function generateJsonContent<T>(prompt: string, schema: object): Promise<T> {
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
        },
    });

    try {
        const jsonText = response.text.trim();
        if (!jsonText) {
            throw new Error("Received an empty response from the AI.");
        }
        return JSON.parse(jsonText) as T;
    } catch (error) {
        console.error("Failed to parse JSON response:", error, "\nRaw text:", response.text);
        throw new Error("Could not generate valid structured content.");
    }
}

// Function to handle text generation
async function generateTextContent(prompt: string): Promise<string> {
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
    });
    return response.text;
}

export const askAboutSource = (sources: Source[], question: string) => 
    generateTextContent(generatePrompt(sources, `answer the following question: "${question}"`));

export const generateFlashcards = (sources: Source[]): Promise<Omit<Flashcard, 'id'>[]> => 
    generateJsonContent<Omit<Flashcard, 'id'>[]>(generatePrompt(sources, 'generate a list of flashcards with terms and definitions covering the main topics.'), flashcardSchema);

export const generateQuiz = (sources: Source[]): Promise<QuizQuestion[]> => 
    generateJsonContent<QuizQuestion[]>(generatePrompt(sources, 'generate a multiple-choice quiz with 4 options per question to test understanding of the key concepts.'), quizSchema);

export const generatePodcastScript = (sources: Source[]) => 
    generateTextContent(generatePrompt(sources, 'write a short, engaging podcast script that summarizes and discusses the main ideas. The script should be conversational and easy to follow.'));

export const generateSummary = (sources: Source[]) =>
    generateTextContent(generatePrompt(sources, 'provide a concise summary.'));

export const generateFAQ = (sources: Source[]): Promise<FAQItem[]> =>
    generateJsonContent<FAQItem[]>(generatePrompt(sources, 'generate a list of frequently asked questions (FAQs) with answers.'), faqSchema);

export const generateTimeline = (sources: Source[]): Promise<TimelineEvent[]> =>
    generateJsonContent<TimelineEvent[]>(generatePrompt(sources, 'generate a timeline of key events. Only include events explicitly mentioned in the text.'), timelineSchema);

export const generateIdeas = (sources: Source[]) =>
    generateTextContent(generatePrompt(sources, 'generate a list of brainstorm ideas, new concepts, or interesting questions based on the material.'));

export const generateCritique = (sources: Source[]) =>
    generateTextContent(generatePrompt(sources, 'provide a constructive critique of the source material. Discuss its strengths, weaknesses, and potential biases.'));

export const generateMindMap = (sources: Source[]): Promise<MindMapNode> =>
    generateJsonContent<MindMapNode>(generatePrompt(sources, 'generate a deeply hierarchical mind map of the key concepts. The mind map should have a central topic and multiple levels of nested children topics to represent the information hierarchy.'), mindMapSchema);

export const generateDebate = (sources: Source[]): Promise<Debate> =>
    generateJsonContent<Debate>(generatePrompt(sources, 'generate two opposing viewpoints based on the source material. For each viewpoint, provide a title and a list of supporting arguments.'), debateSchema);


export async function fetchUrlContent(url: string): Promise<string> {
    // Using a CORS proxy to bypass browser restrictions
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch from proxy with status: ${response.status}. The requested URL might be down or blocking the proxy.`);
        }

        const contentType = response.headers.get('content-type') || '';

        const parseHtml = (html: string): string => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            // Remove common non-content elements
            doc.querySelectorAll('script, style, nav, header, footer, aside, form, button, [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]').forEach(el => el.remove());
            let text = doc.body?.textContent || "";
            // Clean up whitespace
            text = text.replace(/(\r\n|\n|\r)/gm, " ").replace(/\s\s+/g, ' ').trim();
            return text;
        };

        if (contentType.includes('application/pdf')) {
            const arrayBuffer = await response.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let textContent = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const text = await page.getTextContent();
                textContent += text.items.map((s: any) => s.str).join(' ') + '\n\n';
            }
            return textContent.trim();
        }

        if (contentType.includes('text/html')) {
            const html = await response.text();
            return parseHtml(html);
        }

        if (contentType.startsWith('text/')) {
            return await response.text();
        }

        // Fallback for unknown or missing content types
        const bodyText = await response.text();
        // A simple check to see if the content is likely HTML
        if (bodyText.trim().toLowerCase().startsWith('<!doctype html') || bodyText.trim().toLowerCase().startsWith('<html')) {
            return parseHtml(bodyText);
        }
        
        // If it's not clearly HTML, and not empty, return the raw text
        if (bodyText) {
            return bodyText;
        }

        throw new Error(`Unsupported or empty content from URL. Content-Type: ${contentType || 'Not specified'}`);
        
    } catch (error: any) {
        console.error("Error fetching URL content:", error);
        // Updated error message to be more user-friendly
        throw new Error(`Could not fetch content from the URL. This might be due to a network issue, an invalid URL, or the content being blocked. Details: ${error.message}`);
    }
}