import Anthropic from '@anthropic-ai/sdk';
import { AIProvider } from './types';
import { TripItinerary } from '../../src/types';
import { SYSTEM_INSTRUCTION } from './schema';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private client: Anthropic | null = null;
  private model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest';

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
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
    if (!this.client) throw new Error('Anthropic not configured');

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

    let userMessage = `Create a complete travel itinerary based on this traveler prompt: "${prompt}"`;
    userMessage += `\n\nLANGUAGE INSTRUCTION: Default to English. Write all itinerary text in ${targetLanguage}. "language": "${targetLanguage}".`;
    if (options?.travelersCount && options.travelersCount > 0) {
      userMessage += `\n\nTRAVEL PARTY: ${options.travelersCount} traveler(s). Calculate the budget for this party size: totalLow & totalHigh must be the full total for all ${options.travelersCount} travelers combined, and perPersonTotal & perPersonPerDay must be the individual per-person amount.`;
    }
    if (attachmentText) {
      userMessage += `\nAdditional context / attached notes: "${attachmentText}"`;
    }
    if (retryError) {
      userMessage += `\n\nWARNING: Your last response failed validation with the following error:\n${retryError}\n\nPlease fix these issues and ensure your response strictly matches the required JSON schema.`;
    }

    userMessage += `\n\nOutput only a JSON object.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: SYSTEM_INSTRUCTION,
      messages: [
        { role: 'user', content: userMessage }
      ],
      temperature: 0.4,
    });

    const block = response.content[0];
    const responseText = block.type === 'text' ? block.text : '';
    // Strip markdown if anthropic added it
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
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
    if (!this.client) throw new Error('Anthropic not configured');

    let prompt = `Here is an existing travel itinerary JSON:\n${JSON.stringify(current)}\n\nThe traveler asks: "${refinePrompt}".\nUpdate and return the modified itinerary adhering strictly to the JSON schema.`;
    
    if (retryError) {
      prompt += `\n\nWARNING: Your last response failed validation with the following error:\n${retryError}\n\nPlease fix these issues and ensure your response strictly matches the required JSON schema.`;
    }

    prompt += `\n\nOutput only a JSON object.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: SYSTEM_INSTRUCTION,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    });

    const block = response.content[0];
    const responseText = block.type === 'text' ? block.text : '';
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  }

  async translateItinerary(itinerary: TripItinerary, language: string = 'English'): Promise<TripItinerary> {
    if (!this.client) throw new Error('Anthropic not configured');

    const prompt = `Translate the entire itinerary into ${language}. Preserve the structure and JSON schema exactly. Keep place names, destinations, day numbers, and routes intact where possible. Translate all descriptions, tips, titles, themes, summaries, and labels into the requested language. Output only a JSON object.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: SYSTEM_INSTRUCTION,
      messages: [
        { role: 'user', content: `${prompt}\n\nITINERARY_JSON:\n${JSON.stringify(itinerary)}` }
      ],
      temperature: 0.2,
    });

    const block = response.content[0];
    const responseText = block.type === 'text' ? block.text : '';
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  }
}
