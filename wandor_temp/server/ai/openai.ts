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

  async generateItinerary(prompt: string, attachmentText?: string, retryError?: string, origin?: string): Promise<TripItinerary> {
    if (!this.client) throw new Error('OpenAI not configured');

    let userMessage = `Create a complete travel itinerary based on this traveler prompt: "${prompt}"`;
    if (origin) {
      userMessage += `\nThe traveler is departing / traveling from: "${origin}". Please provide full transitRoutes (flight routes & timings, train routes & timings, bus/highway routes & timings from ${origin} to the destination).`;
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
    return JSON.parse(responseText);
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
