import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const t0 = Date.now();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Create a 1-day itinerary for Kyoto in JSON format with title, destination, summary, and days array.',
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    });
    console.log(`[SUCCESS] Completed in ${Date.now() - t0}ms! Length: ${response.text?.length}`);
  } catch (e: any) {
    console.log(`[FAILED]: ${e.message}`);
  }
}
run();

