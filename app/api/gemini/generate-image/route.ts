// app/api/gemini/generate-image/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Get the API key from environment variables
const geminiApiKey = process.env.GEMINI_API_KEY as string | undefined;

export async function POST(req: Request) {
  // 1. Basic validation and setup
  if (!geminiApiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
  }

  try {
    //const { prompt } = await req.json();

    //if (!prompt) {
    //  return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    //}

    // 2. Initialize the Gemini AI client
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // 3. Call the model to generate content
    // Note: We use the 'gemini-2.5-flash-image-preview' model for image generation.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: "Generate a high-quality image of a futuristic cityscape at sunset, with flying cars and neon lights.",
    });

    // 4. Process the response to extract the image data
    // The response contains the generated data in parts. We need to find the part
    // that contains the inline image data.
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData
    );

    if (!imagePart || !imagePart.inlineData) {
      // Handle cases where the model might not return an image
      // (e.g., due to safety policies or if the prompt is unclear).
      const textResponse = response.text || "No image was generated for the prompt.";
      return NextResponse.json({ error: 'Image generation failed.', details: textResponse }, { status: 500 });
    }

    // 5. Return the image data to the client
    // Instead of saving to a file, we send the base64 data and its MIME type
    // back in the API response. The frontend can then render this image.
    return NextResponse.json({
      image: {
        data: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
      }
    });

  } catch (error) {
    console.error("Error in image generation route:", error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}