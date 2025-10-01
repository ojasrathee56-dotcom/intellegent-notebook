// services/fileParserService.ts

// Declare libraries as global variables injected by script tags in index.html
declare const mammoth: any;
declare const JSZip: any;
declare const XLSX: any;
// Import pdfjsLib from the CDN module
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.min.mjs';

// Set the worker source for pdf.js to load from the CDN
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs`;

async function parseTxt(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

async function parseDocx(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const arrayBuffer = reader.result as ArrayBuffer;
                const result = await mammoth.extractRawText({ arrayBuffer });
                resolve(result.value);
            } catch (error) {
                console.error("Error parsing DOCX:", error);
                reject(new Error("Failed to read the content of the .docx file."));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

async function parsePdf(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const arrayBuffer = reader.result as ArrayBuffer;
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let textContent = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    // Using a more robust way to join text items, handling spaces
                    textContent += text.items.map((s: any) => s.str).join(' ') + '\n\n';
                }
                resolve(textContent);
            } catch (error) {
                console.error("Error parsing PDF:", error);
                reject(new Error("Failed to read the content of the .pdf file."));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

async function parsePptx(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const zip = await JSZip.loadAsync(arrayBuffer);
                const slidePromises: Promise<string>[] = [];
                
                // Find all slide XML files
                zip.folder("ppt/slides")?.forEach((relativePath: string, file: any) => {
                    if (relativePath.startsWith("slide") && relativePath.endsWith(".xml")) {
                        slidePromises.push(file.async("string"));
                    }
                });

                const slideXmls = await Promise.all(slidePromises);
                let fullText = "";
                const parser = new DOMParser();

                slideXmls.forEach(xmlString => {
                    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
                    const textNodes = xmlDoc.getElementsByTagName("a:t");
                    for (let i = 0; i < textNodes.length; i++) {
                        if (textNodes[i].textContent) {
                           fullText += textNodes[i].textContent + "\n";
                        }
                    }
                });

                resolve(fullText.trim());
            } catch (error) {
                console.error("Error parsing PPTX:", error);
                reject(new Error("Failed to read the content of the .pptx file."));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

async function parseXlsx(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const data = new Uint8Array(arrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                
                let fullText = "";
                workbook.SheetNames.forEach((sheetName: string) => {
                    fullText += `--- Sheet: ${sheetName} ---\n`;
                    const worksheet = workbook.Sheets[sheetName];
                    const csvData = XLSX.utils.sheet_to_csv(worksheet);
                    fullText += csvData + "\n\n";
                });
                
                resolve(fullText.trim());
            } catch (error) {
                console.error("Error parsing XLSX:", error);
                reject(new Error("Failed to read the content of the .xlsx file."));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}


export async function parseFile(file: File): Promise<{ content: string, title: string }> {
    const title = file.name;
    let content = '';
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    if (file.type === 'application/pdf' || fileExtension === 'pdf') {
        content = await parsePdf(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileExtension === 'docx') {
        content = await parseDocx(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || fileExtension === 'pptx') {
        content = await parsePptx(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileExtension === 'xlsx') {
        content = await parseXlsx(file);
    } else if (file.type.startsWith('text/') || fileExtension === 'txt') {
        content = await parseTxt(file);
    } else {
         // As a fallback for files without a clear type, try to read as text.
        try {
            content = await parseTxt(file);
        } catch(e) {
            throw new Error('Unsupported file type. Please upload a .txt, .pdf, .docx, .pptx, or .xlsx file.');
        }
    }
    
    // Return content and the title without the file extension
    return { content, title: title.replace(/\.[^/.]+$/, "") };
}