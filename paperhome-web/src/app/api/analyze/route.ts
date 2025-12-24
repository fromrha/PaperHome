import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let textForAnalysis = '';

        if (file.type === 'application/pdf') {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const pdfjsLib = require('pdfjs-dist');

                // Convert Buffer to Uint8Array for pdfjs
                const uint8Array = new Uint8Array(buffer);

                const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
                const pdfDocument = await loadingTask.promise;

                let fullText = '';
                const numPages = pdfDocument.numPages;

                // Limit pages to avoid timeout on large docs (e.g., first 10 pages)
                const maxPages = Math.min(numPages, 10);

                for (let i = 1; i <= maxPages; i++) {
                    const page = await pdfDocument.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');
                    fullText += pageText + '\n';
                }

                textForAnalysis = fullText;
            } catch (e: any) {
                console.error('PDF Parse Error:', e);
                return NextResponse.json({ error: `Failed to parse PDF: ${e.message || e}` }, { status: 500 });
            }
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword' ||
            file.name.endsWith('.docx') ||
            file.name.endsWith('.doc')
        ) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const mammoth = require('mammoth');
                const result = await mammoth.extractRawText({ buffer: buffer });
                textForAnalysis = result.value;
                if (result.messages.length > 0) {
                    console.log("Mammoth messages:", result.messages);
                }
            } catch (e: any) {
                console.error('Word Parse Error:', e);
                return NextResponse.json({ error: `Failed to parse Word document: ${e.message || e}` }, { status: 500 });
            }
        } else {
            // Assume text for .txt or others
            textForAnalysis = buffer.toString('utf-8');
        }

        // Truncate to avoid token limits if necessary (Gemini has large context, but let's be safe/economical)
        // 30k chars is usually safe for a paper abstract + intro
        const truncatedText = textForAnalysis.slice(0, 30000);

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
      Analyze the following academic paper text and extract:
      1. Broad Research Field (e.g., Computer Science, Education, Law)
      2. 5 Primary Keywords
      3. A short abstract summary if not clear.
      
      Return ONLY a JSON object with keys: "field", "keywords" (array of strings), "summary".
      Do not include markdown formatting like \`\`\`json.
      
      Text:
      ${truncatedText}
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown code blocks provided by Gemini
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const analysis = JSON.parse(cleanJson);

        return NextResponse.json(analysis);

    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
    }
}
