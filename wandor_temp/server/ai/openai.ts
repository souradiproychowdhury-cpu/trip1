import OpenAI from 'openai';
import { AIProvider } from './types';
import { TripItinerary } from '../../src/types';
import { SYSTEM_INSTRUCTION } from './schema';

import { extractRequestedDays } from './gemini';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI | null = null;
  private model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async generateItinerary(
    prompt: string,
    attachmentText?: string,
    retryError?: string,
    options?: { travelersCount?: number; language?: string }
  ): Promise<TripItinerary> {
    if (!this.client) throw new Error('OpenAI not configured');

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
- "destinationIntro": Provide an evocative, atmospheric 2 to 3 line description introducing this destination in ${targetLanguage}.
- "language": "${targetLanguage}".`;

    if (options?.travelersCount && options.travelersCount > 0) {
      userMessage += `\n\nTRAVEL PARTY: ${options.travelersCount} traveler(s). Calculate the budget for this party size: totalLow & totalHigh must be the full total for all ${options.travelersCount} travelers combined, and perPersonTotal & perPersonPerDay must be the individual per-person amount.`;
    }
    if (attachmentText) {
      userMessage += `\nAdditional context / attached notes: "${attachmentText}"`;
    }
    if (retryError) {
      userMessage += `\n\nWARNING: Your last response failed validation with the following error:\n${retryError}\n\nPlease fix these issues and ensure your response strictly matches the required JSON schema.`;
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const responseText = response.choices[0]?.message?.content || '';
    const parsed = JSON.parse(responseText);
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

    if (!parsed.destinationIntro && parsed.summary) {
      parsed.destinationIntro = parsed.summary;
    }

    // Assign canonical resolved language
    parsed.language = targetLanguage;
    return parsed;
  }

  async refineItinerary(current: TripItinerary, refinePrompt: string, retryError?: string): Promise<TripItinerary> {
    if (!this.client) throw new Error('OpenAI not configured');

    let prompt = `Here is an existing travel itinerary JSON:\n${JSON.stringify(current)}\n\nThe traveler asks: "${refinePrompt}".\nUpdate and return the modified itinerary adhering strictly to the JSON schema.`;
    
    if (retryError) {
      prompt += `\n\nWARNING: Your last response failed validation with the following error:\n${retryError}\n\nPlease fix these issues and ensure your response strictly matches the required JSON schema.`;
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const responseText = response.choices[0]?.message?.content || '';
    return JSON.parse(responseText);
  }

  async translateItinerary(itinerary: TripItinerary, language: string = 'English'): Promise<TripItinerary> {
    if (!this.client) throw new Error('OpenAI not configured');

    const prompt = `Translate the entire itinerary into ${language}. Preserve the structure and JSON schema exactly. Keep place names, destinations, day numbers, and routes intact where possible. Translate all descriptions, tips, titles, themes, summaries, and labels into the requested language. Return only a JSON object.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: `${prompt}\n\nITINERARY_JSON:\n${JSON.stringify(itinerary)}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const responseText = response.choices[0]?.message?.content || '';
    return JSON.parse(responseText);
  }
}
