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
  private primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  private fallbackModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.8-flash'];

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

    // Determine target output language: Default to English unless prompt has non-Latin script or explicit language was chosen
    const hasBengali = /[\u0980-\u09FF]/.test(prompt);
    const hasHindi = /[\u0900-\u097F]/.test(prompt);
    const hasUrdu = /[\u0600-\u06FF]/.test(prompt);
    const hasJapanese = /[\u3040-\u30FF\u4E00-\u9FAF]/.test(prompt);

    let targetLanguage = 'English';
    if (options?.language && options.language !== 'Auto' && options.language !== 'English') {
      targetLanguage = options.language;
    } else if (hasBengali) {
      targetLanguage = 'Bengali';
    } else if (hasHindi) {
      targetLanguage = 'Hindi';
    } else if (hasUrdu) {
      targetLanguage = 'Urdu';
    } else if (hasJapanese) {
      targetLanguage = 'Japanese';
    }

    userMessage += `\n\nLANGUAGE & VOICE INTRO REQUIREMENT:
- DEFAULT OUTPUT LANGUAGE: ENGLISH.
- Unless the user prompt was written in a non-English script or explicit language requested, generate the entire itinerary in English.
- The output language for this itinerary MUST be: ${targetLanguage}.
- Write all titles, summaries, "destinationIntro", themes, activity descriptions, hidden gems, and insider tips naturally in ${targetLanguage}.
- "destinationIntro": Provide an evocative, atmospheric 2 to 3 line description introducing this destination in ${targetLanguage}. This will be spoken aloud to the traveler automatically.
- "language": "${targetLanguage}".`;

    if (options?.travelersCount && options.travelersCount > 0) {
      userMessage += `\n\nTRAVEL PARTY: ${options.travelersCount} traveler(s). Calculate the budget for this party size: totalLow & totalHigh must be the full total for all ${options.travelersCount} travelers combined, and perPersonTotal & perPersonPerDay must be the individual per-person amount.`;
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

    // Assign canonical resolved language
    parsed.language = targetLanguage;

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
    // Extract only core human-readable strings to avoid massive token payload and schema loss
    const translatablePayload = {
      title: itinerary.title,
      destinationIntro: itinerary.destinationIntro,
      summary: itinerary.summary,
      vibe: itinerary.vibe,
      crowdStrategy: itinerary.crowdStrategy,
      insiderTips: itinerary.insiderTips,
      days: (itinerary.days || []).map(d => ({
        dayNumber: d.dayNumber,
        title: d.title,
        theme: d.theme,
        morning: d.morning ? {
          title: d.morning.title,
          description: d.morning.description,
          briefDescription: d.morning.briefDescription
        } : undefined,
        afternoon: d.afternoon ? {
          title: d.afternoon.title,
          description: d.afternoon.description,
          briefDescription: d.afternoon.briefDescription
        } : undefined,
        evening: d.evening ? {
          title: d.evening.title,
          description: d.evening.description,
          briefDescription: d.evening.briefDescription
        } : undefined,
        hiddenGem: d.hiddenGem ? {
          name: d.hiddenGem.name,
          note: d.hiddenGem.note,
          briefDescription: d.hiddenGem.briefDescription
        } : undefined,
      })),
      curatedCafes: (itinerary.curatedCafes || []).map(c => ({
        name: c.name,
        specialty: c.specialty,
        tip: c.tip,
        vibe: c.vibe
      })),
      scenicHikes: (itinerary.scenicHikes || []).map(h => ({
        name: h.name,
        difficulty: h.difficulty,
        viewHighlight: h.viewHighlight
      }))
    };

    const prompt = `Translate all titles, destinationIntro, summary, themes, activity descriptions, briefDescription, hidden gem notes, tips, and cafe/hike notes in this travel plan into ${language}.
Keep day numbers, landmark names, place names, and JSON keys identical.
Set "language": "${language}".

INPUT_JSON:
${JSON.stringify(translatablePayload)}`;

    const responseText = await this.generateWithFallback(
      prompt,
      {
        systemInstruction: `You are an ultra-fast, professional multilingual travel translator. Return ONLY a valid JSON object with the exact same structure as INPUT_JSON, with all narrative descriptions, titles, and tips translated naturally and beautifully into ${language}. Do not change JSON keys, place names, or day numbers.`,
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 8192,
      }
    );

    const parsed = parseJsonSafely(responseText);

    // Merge translated text back into the full original itinerary preserving all hotels, transit, and schemas
    const translatedDays = (itinerary.days || []).map((origDay, idx) => {
      const transDay = parsed.days?.[idx] || {};
      return {
        ...origDay,
        title: transDay.title || origDay.title,
        theme: transDay.theme || origDay.theme,
        morning: origDay.morning ? {
          ...origDay.morning,
          title: transDay.morning?.title || origDay.morning.title,
          description: transDay.morning?.description || origDay.morning.description,
          briefDescription: transDay.morning?.briefDescription || origDay.morning.briefDescription,
        } : origDay.morning,
        afternoon: origDay.afternoon ? {
          ...origDay.afternoon,
          title: transDay.afternoon?.title || origDay.afternoon.title,
          description: transDay.afternoon?.description || origDay.afternoon.description,
          briefDescription: transDay.afternoon?.briefDescription || origDay.afternoon.briefDescription,
        } : origDay.afternoon,
        evening: origDay.evening ? {
          ...origDay.evening,
          title: transDay.evening?.title || origDay.evening.title,
          description: transDay.evening?.description || origDay.evening.description,
          briefDescription: transDay.evening?.briefDescription || origDay.evening.briefDescription,
        } : origDay.evening,
        hiddenGem: origDay.hiddenGem ? {
          ...origDay.hiddenGem,
          name: transDay.hiddenGem?.name || origDay.hiddenGem.name,
          note: transDay.hiddenGem?.note || origDay.hiddenGem.note,
          briefDescription: transDay.hiddenGem?.briefDescription || origDay.hiddenGem.briefDescription,
        } : origDay.hiddenGem,
      };
    });

    const translatedCafes = (itinerary.curatedCafes || []).map((origCafe, idx) => {
      const transCafe = parsed.curatedCafes?.[idx] || {};
      return {
        ...origCafe,
        specialty: transCafe.specialty || origCafe.specialty,
        tip: transCafe.tip || origCafe.tip,
        vibe: transCafe.vibe || origCafe.vibe,
      };
    });

    const translatedHikes = (itinerary.scenicHikes || []).map((origHike, idx) => {
      const transHike = parsed.scenicHikes?.[idx] || {};
      return {
        ...origHike,
        difficulty: transHike.difficulty || origHike.difficulty,
        viewHighlight: transHike.viewHighlight || origHike.viewHighlight,
      };
    });

    return {
      ...itinerary,
      title: parsed.title || itinerary.title,
      destinationIntro: parsed.destinationIntro || itinerary.destinationIntro,
      summary: parsed.summary || itinerary.summary,
      vibe: parsed.vibe || itinerary.vibe,
      crowdStrategy: parsed.crowdStrategy || itinerary.crowdStrategy,
      insiderTips: parsed.insiderTips || itinerary.insiderTips,
      days: translatedDays,
      curatedCafes: translatedCafes,
      scenicHikes: translatedHikes,
      language: language
    };
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
