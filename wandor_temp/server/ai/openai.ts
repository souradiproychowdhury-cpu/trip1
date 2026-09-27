import OpenAI from 'openai';
import { AIProvider } from './types';
import { TripItinerary } from '../../src/types';
import { SYSTEM_INSTRUCTION } from './schema';

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

    let userMessage = `Create a complete travel itinerary based on this traveler prompt: "${prompt}"`;
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
