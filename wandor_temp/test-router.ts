import 'dotenv/config';
import { generateItinerary } from './server/ai/router';

async function run() {
  try {
    console.log("Testing generateItinerary...");
    const result = await generateItinerary("I want to visit Tokyo for 3 days.");
    console.log("Success!");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Failed:", err.message);
  }
}

run();
