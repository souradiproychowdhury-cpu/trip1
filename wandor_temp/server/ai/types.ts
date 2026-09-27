import { TripItinerary } from '../../src/types';

export interface AIProvider {
  name: string;
  isConfigured(): boolean;
  generateItinerary(prompt: string, attachmentText?: string, retryError?: string, options?: { travelersCount?: number; language?: string }): Promise<TripItinerary>;
  refineItinerary(current: TripItinerary, refinePrompt: string, retryError?: string): Promise<TripItinerary>;
  translateItinerary?(itinerary: TripItinerary, language: string): Promise<TripItinerary>;
  extractText?(base64Data: string, mimeType: string): Promise<string>;
}
