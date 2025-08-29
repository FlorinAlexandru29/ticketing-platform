
//app\api\gemini\generate-description\route.ts
const geminiApiKey = process.env.GEMINI_API_KEY as string | undefined;
// The client gets the API key from the environment variable `GEMINI_API_KEY`.
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(contents: Request) {
  if (!geminiApiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
  }
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const groundingTool = {
  googleSearch: {},
};

    const config = {
  tools: [groundingTool],
  thinkingConfig: { thinkingBudget: 24576}
};

  // Example usage: generate a simple text response
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents.body ? await contents.text() : 'Hello, world!',
    config,
  });

  return NextResponse.json({ response: response.text });}