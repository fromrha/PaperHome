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
                // Dynamic import to handle bundling issues
                const pdfModule = await import('pdf-parse');
                // Handle various import scenarios (ESM vs CJS default export)
                const pdf = (pdfModule as any).default || pdfModule;

                if (typeof pdf !== 'function') {
                    throw new Error(`pdf-parse library is not a function. It is: ${typeof pdf}`);
                }

                const data = await pdf(buffer);
                textForAnalysis = data.text;
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
                // Dynamic import for mammoth
                const mammoth = await import('mammoth');
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

        // Reverting to gemini-1.5-flash as gemini-2.5-flash is not a valid model ID yet.
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

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
