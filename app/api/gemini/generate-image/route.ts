// app/api/gemini/generate-image/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const geminiApiKey = process.env.GEMINI_API_KEY as string | undefined;

export async function POST(req: Request) {
  if (!geminiApiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const resp = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const parts = (resp as any)?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p?.inlineData?.data && p?.inlineData?.mimeType);

    if (!imgPart) {
      const details =
        typeof (resp as any)?.text === 'function'
          ? (resp as any).text()
          : (resp as any)?.text ?? 'No image returned.';
      return NextResponse.json(
        { error: 'Image generation failed.', details },
        { status: 502 }
      );
    }

    return NextResponse.json({
      images: [
        {
          data: imgPart.inlineData.data as string,      // base64
          mimeType: imgPart.inlineData.mimeType as string,
        },
      ],
    });
  } catch (err) {
    console.error('Error in image generation route:', err);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}
