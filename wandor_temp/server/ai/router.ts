import { AIProvider } from './types';
import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { TripItinerarySchema } from './schema';
import { TripItinerary } from '../../src/types';

export function getProviders(): Record<string, AIProvider> {
  return {
    gemini: new GeminiProvider(),
    openai: new OpenAIProvider(),
    anthropic: new AnthropicProvider(),
  };
}

export function getActiveProviders(): AIProvider[] {
  const priorityStr = process.env.AI_PROVIDER_PRIORITY || 'gemini,openai,anthropic';
  const orderedNames = priorityStr.split(',').map(s => s.trim().toLowerCase());
  const providers = getProviders();
  
  const active: AIProvider[] = [];
  for (const name of orderedNames) {
    if (providers[name] && providers[name].isConfigured()) {
      active.push(providers[name]);
    }
  }
  return active;
}

export function getConfiguredProviderNames(): string[] {
  return getActiveProviders().map(p => p.name);
}

export async function generateItinerary(prompt: string, attachmentText?: string): Promise<TripItinerary> {
  const activeProviders = getActiveProviders();
  if (activeProviders.length === 0) {
    throw new Error('No AI providers configured. Please set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.');
  }

  let lastError: any;

  for (const provider of activeProviders) {
    try {
      const result = await provider.generateItinerary(prompt, attachmentText);
      const parseResult = TripItinerarySchema.safeParse(result);

      if (!parseResult.success) {
        throw new Error(`Validation failed on first generation: ${parseResult.error.message}`);
      }

      console.log(`[AI Router] Successfully generated itinerary using ${provider.name}`);
      return parseResult.data as TripItinerary;
    } catch (err: any) {
      console.error(`[AI Router] Provider ${provider.name} failed:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`All configured AI providers failed. Last error: ${lastError?.message}`);
}

export async function refineItinerary(current: TripItinerary, refinePrompt: string): Promise<TripItinerary> {
  const activeProviders = getActiveProviders();
  if (activeProviders.length === 0) {
    throw new Error('No AI providers configured.');
  }

  let lastError: any;

  for (const provider of activeProviders) {
    try {
      const result = await provider.refineItinerary(current, refinePrompt);
      const parseResult = TripItinerarySchema.safeParse(result);

      if (!parseResult.success) {
        throw new Error(`Validation failed on refine: ${parseResult.error.message}`);
      }

      console.log(`[AI Router] Successfully refined itinerary using ${provider.name}`);
      return parseResult.data as TripItinerary;
    } catch (err: any) {
      console.error(`[AI Router] Provider ${provider.name} failed:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`All configured AI providers failed. Last error: ${lastError?.message}`);
}

export async function translateItinerary(itinerary: TripItinerary, language: string = 'English'): Promise<TripItinerary> {
  const activeProviders = getActiveProviders();
  if (activeProviders.length === 0) {
    throw new Error('No AI providers configured.');
  }

  let lastError: any;

  for (const provider of activeProviders) {
    try {
      if (!provider.translateItinerary) {
        continue;
      }

      const translated = await provider.translateItinerary(itinerary, language);
      const parseResult = TripItinerarySchema.safeParse(translated);
      if (!parseResult.success) {
        console.warn(`[AI Router] Translation schema warning: ${parseResult.error.message}. Using translated content directly.`);
        return (translated || itinerary) as TripItinerary;
      }

      console.log(`[AI Router] Successfully translated itinerary using ${provider.name}`);
      return parseResult.data as TripItinerary;
    } catch (err: any) {
      console.error(`[AI Router] Translation provider ${provider.name} failed:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`All configured AI providers failed translation. Last error: ${lastError?.message}`);
}
