import { GoogleGenAI } from '@google/genai';
import { AIProvider } from './types';
import { TripItinerary } from '../../src/types';
import { SYSTEM_INSTRUCTION } from './schema';

function parseJsonSafely(text: string): any {
  let clean = text.trim();
  // Strip Markdown code blocks if present
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(clean.trim());
}

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private client: GoogleGenAI | null = null;
  private primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  private fallbackModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  private async generateWithFallback(contents: any, config: any): Promise<string> {
    if (!this.client) throw new Error('Gemini not configured');

    const candidateModels = [
      this.primaryModel,
      ...this.fallbackModels.filter(m => m !== this.primaryModel)
    ];

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        console.log(`[Gemini] Attempting generation with model: ${model}...`);
        const startTime = Date.now();
        const response = await this.client.models.generateContent({
          model,
          contents,
          config,
        });
        const duration = Date.now() - startTime;
        console.log(`[Gemini] Model ${model} generated content in ${duration}ms!`);
        return response.text || '';
      } catch (err: any) {
        console.warn(`[Gemini] Model ${model} failed (${err.message}). Trying fallback model...`);
        lastError = err;
      }
    }

    throw new Error(`All Gemini models failed. Last error: ${lastError?.message || lastError}`);
  }

  async generateItinerary(prompt: string, attachmentText?: string, retryError?: string): Promise<TripItinerary> {
    let userMessage = `Create a complete travel itinerary based on this traveler prompt: "${prompt}"`;
    if (attachmentText) {
      userMessage += `\nAdditional context / attached notes: "${attachmentText}"`;
    }
    if (retryError) {
      userMessage += `\n\nWARNING: Your last response failed validation with the following error:\n${retryError}\n\nPlease fix these issues and ensure your response strictly matches the required JSON schema.`;
    }

    const responseText = await this.generateWithFallback(userMessage, {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 4096,
    });

    return parseJsonSafely(responseText);
  }

  async refineItinerary(current: TripItinerary, refinePrompt: string, retryError?: string): Promise<TripItinerary> {
    let prompt = `Here is an existing travel itinerary JSON:\n${JSON.stringify(current)}\n\nThe traveler asks: "${refinePrompt}".\nUpdate and return the modified itinerary adhering strictly to the JSON schema.`;

    if (retryError) {
      prompt += `\n\nWARNING: Your last response failed validation with the following error:\n${retryError}\n\nPlease fix these issues and ensure your response strictly matches the required JSON schema.`;
    }

    const responseText = await this.generateWithFallback(prompt, {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.4,
      maxOutputTokens: 8192,
    });

    return parseJsonSafely(responseText);
  }

  async translateItinerary(itinerary: TripItinerary, language: string = 'English'): Promise<TripItinerary> {
    const prompt = `Translate all descriptive strings, titles, themes, summaries, descriptions, and insider tips in this travel itinerary JSON into ${language}. Keep the place names, landmark names, numbers, day numbers, and JSON structure identical.\n\nITINERARY_JSON:\n${JSON.stringify(itinerary)}`;

    const responseText = await this.generateWithFallback(
      prompt,
      {
        systemInstruction: `You are an ultra-fast, professional multilingual travel translator. Return ONLY a valid JSON object matching the input structure with translated text strings in ${language}. Do not change JSON keys, day numbers, times, or currencies.`,
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 4096,
      }
    );

    return parseJsonSafely(responseText);
  }

  async extractText(base64Data: string, mimeType: string): Promise<string> {
    const prompt = 'Transcribe all readable text, dates, times, prices, and confirmation numbers from this document.';

    return await this.generateWithFallback(
      [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          }
        },
        prompt
      ],
      {}
    );
  }
}
