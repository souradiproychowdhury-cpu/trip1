import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    console.log(`Checking API access with model ${model}...`);
    const response = await ai.models.generateContent({
      model: model,
      contents: "Respond with a short JSON containing { \"success\": true }",
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });
    console.log("Success! Response:", response.text);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
