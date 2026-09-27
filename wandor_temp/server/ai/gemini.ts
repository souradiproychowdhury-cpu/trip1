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
  private primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  private fallbackModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.6-flash', 'gemini-3.8-flash'];

  constructor(explicitKey?: string) {
    const apiKey = explicitKey || process.env.GEMINI_API_KEY;
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

  async generateItinerary(
    prompt: string,
    attachmentText?: string,
    retryError?: string,
    options?: { travelersCount?: number; language?: string }
  ): Promise<TripItinerary> {
    let userMessage = `Create a complete travel itinerary based on this traveler prompt: "${prompt}"`;
    if (options?.travelersCount && options.travelersCount > 0) {
      userMessage += `\n\nTRAVEL PARTY: ${options.travelersCount} traveler(s). Calculate the budget for this party size: totalLow & totalHigh must be the full total for all ${options.travelersCount} travelers combined, and perPersonTotal & perPersonPerDay must be the individual per-person amount.`;
    }
    if (options?.language && options.language !== 'Auto' && options.language !== 'English') {
      userMessage += `\n\nLANGUAGE PREFERENCE: Please generate all itinerary descriptions, titles, summaries, themes, vibes, notes, and insider tips naturally in ${options.language}. Keep canonical landmark placeNames recognizable.`;
    }
    if (attachmentText) {
      userMessage += `\n\nATTACHED TRAVEL TICKETS / RESERVATIONS / BOOKINGS:\n"""\n${attachmentText}\n"""\nIMPORTANT: Align the destination, dates, times, and activities with the attached ticket/reservation details above.`;
    }
    if (retryError) {
      userMessage += `\n\nWARNING: Your last response failed validation with the following error:\n${retryError}\n\nPlease fix these issues and ensure your response strictly matches the required JSON schema.`;
    }

    const responseText = await this.generateWithFallback(userMessage, {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 3500,
    });

    const parsed = parseJsonSafely(responseText);
    const travelersCount = options?.travelersCount || parsed.budgetEstimate?.travelersCount || 1;
    if (parsed.budgetEstimate) {
      parsed.budgetEstimate.travelersCount = travelersCount;
      if (!parsed.budgetEstimate.perPersonTotal && parsed.budgetEstimate.totalLow && parsed.budgetEstimate.totalHigh) {
        parsed.budgetEstimate.perPersonTotal = {
          low: Math.round(parsed.budgetEstimate.totalLow / Math.max(travelersCount, 1)),
          high: Math.round(parsed.budgetEstimate.totalHigh / Math.max(travelersCount, 1)),
        };
      }
    }

    return parsed;
  }

  async refineItinerary(current: TripItinerary, refinePrompt: string, retryError?: string): Promise<TripItinerary> {
    let prompt = `Here is an existing travel itinerary JSON:\n${JSON.stringify(current)}\n\nThe traveler asks: "${refinePrompt}".\nUpdate and return the modified itinerary adhering strictly to the JSON schema.`;

    if (retryError) {
      prompt += `\n\nWARNING: Your last response failed validation with the following error:\n${retryError}\n\nPlease fix these issues and ensure your response strictly matches the required JSON schema.`;
    }

    const responseText = await this.generateWithFallback(prompt, {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.3,
      maxOutputTokens: 4096,
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
        maxOutputTokens: 3500,
      }
    );

    return parseJsonSafely(responseText);
  }

  async extractText(base64Data: string, mimeType: string): Promise<string> {
    const prompt = 'Analyze this travel ticket, booking confirmation, hotel reservation, flight boarding pass, or travel document. Extract all essential details: Traveler names, Origin & Destination, Travel Dates & Flight/Train Times, Booking/PNR numbers, Hotel addresses, and any special notes. Return a clean, formatted summary that an itinerary planner can use.';

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
      {
        temperature: 0.1,
        maxOutputTokens: 1024,
      }
    );
  }
}
