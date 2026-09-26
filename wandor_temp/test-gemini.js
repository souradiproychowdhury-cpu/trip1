require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log("Checking API access...");
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
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
