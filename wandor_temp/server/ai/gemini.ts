import { GoogleGenAI } from '@google/genai';
import { AIProvider } from './types';
import { TripItinerary } from '../../src/types';
import { SYSTEM_INSTRUCTION } from './schema';

function parseJsonSafely(text: string): any {
  let clean = text.trim();
  const firstBrace = clean.indexOf('{');
  if (firstBrace === -1) {
    return JSON.parse(clean);
  }

  let inString = false;
  let escape = false;
  let depth = 0;
  let endBrace = -1;

  for (let i = firstBrace; i < clean.length; i++) {
    const ch = clean[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          endBrace = i;
          break;
        }
      }
    }
  }

  if (endBrace !== -1) {
    clean = clean.substring(firstBrace, endBrace + 1);
  } else {
    const lastBrace = clean.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }
  }

  return JSON.parse(clean.trim());
}

export function extractRequestedDays(promptText: string): number {
  const bengaliNums: Record<string, number> = { '১': 1, '২': 2, '৩': 3, '৪': 4, '৫': 5, '৬': 6, '৭': 7 };
  const bnMatch = promptText.match(/([১-৭]|\d+)\s*(?:দিনের|দিন|days?|day)/i);
  if (bnMatch) {
    const raw = bnMatch[1];
    if (bengaliNums[raw]) return bengaliNums[raw];
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n > 0 && n <= 14) return n;
  }
  const match = promptText.match(/(\d+)\s*(?:days?|day|nights?|night)/i);
  if (match) {
    const n = parseInt(match[1], 10);
    if (!isNaN(n) && n > 0 && n <= 14) return n;
  }
  return 3;
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
    const requestedDays = extractRequestedDays(prompt);
    let userMessage = `Create a complete travel itinerary based on this traveler prompt: "${prompt}"`;
    userMessage += `\n\nCRITICAL DURATION & DAY COUNT:
- The traveler explicitly wants a ${requestedDays}-day trip ("duration": "${requestedDays} Days").
- You MUST generate EXACTLY ${requestedDays} distinct day objects in the "days" array: Day 1, Day 2${requestedDays >= 3 ? `, ... up to Day ${requestedDays}` : ''}.
- The "days" array MUST contain exactly ${requestedDays} items (length ${requestedDays}). NEVER output only 1 day when the prompt requests ${requestedDays} days!`;

    userMessage += `\n\nLANGUAGE & VOICE INTRO REQUIREMENT:
- Detect the language of the traveler's prompt. If the prompt is written in Bengali / বাংলা, Hindi / हिन्दी, Urdu / اردو, Spanish, etc., you MUST write the entire itinerary ("destinationIntro", "summary", "title", themes, activity descriptions, hidden gems) naturally and beautifully in that exact language.
- "destinationIntro": You MUST include an evocative, atmospheric 2 to 3 line description introducing this destination in the user's language. This will be spoken aloud to the traveler automatically.
- "language": State the language name used (e.g. "Bengali", "Hindi", "English").`;

    if (options?.travelersCount && options.travelersCount > 0) {
      userMessage += `\n\nTRAVEL PARTY: ${options.travelersCount} traveler(s). Calculate the budget for this party size: totalLow & totalHigh must be the full total for all ${options.travelersCount} travelers combined, and perPersonTotal & perPersonPerDay must be the individual per-person amount.`;
    }
    if (options?.language && options.language !== 'Auto' && options.language !== 'English') {
      userMessage += `\n\nEXPLICIT LANGUAGE PREFERENCE: Please generate all itinerary descriptions, "destinationIntro", titles, summaries, themes, vibes, notes, and insider tips naturally in ${options.language}. Keep canonical landmark placeNames recognizable.`;
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
      maxOutputTokens: 8192,
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

    // Ensure destinationIntro is always present (fallback to summary if model omitted it)
    if (!parsed.destinationIntro && parsed.summary) {
      parsed.destinationIntro = parsed.summary;
    }

    // Detect language if not provided by model
    if (!parsed.language) {
      const sampleText = `${prompt} ${parsed.summary || ''} ${parsed.destinationIntro || ''}`;
      if (/[\u0980-\u09FF]/.test(sampleText)) parsed.language = 'Bengali';
      else if (/[\u0900-\u097F]/.test(sampleText)) parsed.language = 'Hindi';
      else if (/[\u0600-\u06FF]/.test(sampleText)) parsed.language = 'Urdu';
      else if (options?.language && options.language !== 'Auto') parsed.language = options.language;
      else parsed.language = 'English';
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
