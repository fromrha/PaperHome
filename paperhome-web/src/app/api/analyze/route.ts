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
                const pdf = require('pdf-parse');
                const data = await pdf(buffer);
                textForAnalysis = data.text;
            } catch (e) {
                console.error('PDF Parse Error', e);
                return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 });
            }
        } else {
            // Assume text
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
