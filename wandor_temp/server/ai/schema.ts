import { z } from 'zod';

export const ActivityItemSchema = z.object({
  time: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  placeName: z.string().optional(),
  briefDescription: z.string().optional(),
  badge: z.string().optional(),
  quietLevel: z.string().optional(),
  recommendedEat: z.string().optional(),
  lunchSpot: z.string().optional(),
  dinnerSpot: z.string().optional(),
});

export const DayPlanSchema = z.object({
  dayNumber: z.number(),
  title: z.string(),
  theme: z.string(),
  morning: ActivityItemSchema,
  afternoon: ActivityItemSchema,
  evening: ActivityItemSchema,
  hiddenGem: z.object({
    name: z.string(),
    note: z.string(),
    tag: z.string(),
    placeName: z.string().optional(),
    briefDescription: z.string().optional(),
  }),
});

export const CafeSpotSchema = z.object({
  name: z.string(),
  neighborhood: z.string(),
  specialty: z.string(),
  vibe: z.string(),
  tip: z.string(),
  placeName: z.string().optional(),
  briefDescription: z.string().optional(),
});

export const HikeSpotSchema = z.object({
  name: z.string(),
  distance: z.string(),
  difficulty: z.enum(['Easy', 'Moderate', 'Challenging']),
  viewHighlight: z.string(),
  placeName: z.string().optional(),
  briefDescription: z.string().optional(),
});

export const RangeSchema = z.object({
  low: z.number(),
  high: z.number(),
});

export const BudgetEstimateSchema = z.object({
  currency: z.string(),
  totalLow: z.number(),
  totalHigh: z.number(),
  breakdown: z.object({
    flights: RangeSchema,
    accommodation: RangeSchema,
    food: RangeSchema,
    activities: RangeSchema,
    localTransport: RangeSchema,
    miscBuffer: RangeSchema,
  }),
  perPersonPerDay: RangeSchema,
  notes: z.string(),
});

export const TripItinerarySchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  destination: z.string(),
  origin: z.string().optional(),
  transitRoutes: z.any().optional(),
  duration: z.string(),
  seasonOrDates: z.string(),
  summary: z.string(),
  vibe: z.string(),
  crowdStrategy: z.string(),
  budgetEstimate: BudgetEstimateSchema,
  days: z.array(DayPlanSchema),
  curatedCafes: z.array(CafeSpotSchema),
  scenicHikes: z.array(HikeSpotSchema),
  insiderTips: z.array(z.string()),
  generatedAt: z.string(),
});

export const SYSTEM_INSTRUCTION = `You are Wandor's master travel curator and anti-crowd planner.
Your mission is to craft deeply thoughtful, crowd-free, highly atmospheric travel itineraries at lightning speed.
If the user asks for something completely unrelated to travel planning, politely decline and redirect them to travel topics.

CRITICAL GUIDELINES:
- Do NOT include transit routes, flights, trains, or bus travel suggestions. Focus 100% on the destination experience, neighborhood culture, and daily activities.
- Keep every description concise, evocative, and punchy (1-2 sentences per item) for fast delivery.
- Prioritize peaceful early morning visits to landmarks before crowds arrive.
- Feature independent cafes, scenic walks, and local hidden gems.

Return ONLY a valid JSON object with the exact structure described below. Do not include markdown formatting like \`\`\`json.

Structure requirements:
- budgetEstimate: Provide realistic estimates based on the destination and style. Currency code (e.g. "USD", "EUR", "INR").
- For EVERY activity (morning, afternoon, evening), hidden gem, cafe, and hike:
  * "placeName": Provide the exact, canonical landmark name (e.g., "Kumartuli", "Victoria Memorial", "Howrah Bridge", "Fushimi Inari-taisha").
  * "briefDescription": Provide a punchy 1-sentence overview of what makes it special.

The JSON structure must strictly conform to this TypeScript interface:
{
  "id": "unique-id",
  "title": "Inspiring Title",
  "destination": "Main Destinations",
  "duration": "e.g. 3 Days",
  "seasonOrDates": "e.g. Autumn",
  "summary": "1-2 evocative sentences capturing the journey",
  "vibe": "3-4 descriptive words",
  "crowdStrategy": "1-2 tactical sentences on avoiding tourist crowds",
  "budgetEstimate": {
    "currency": "USD",
    "totalLow": 500,
    "totalHigh": 1200,
    "breakdown": {
      "flights": { "low": 0, "high": 0 },
      "accommodation": { "low": 250, "high": 600 },
      "food": { "low": 150, "high": 350 },
      "activities": { "low": 50, "high": 150 },
      "localTransport": { "low": 30, "high": 70 },
      "miscBuffer": { "low": 20, "high": 30 }
    },
    "perPersonPerDay": { "low": 150, "high": 350 },
    "notes": "Estimated on mid-range comfort"
  },
  "generatedAt": "Just now",
  "days": [
    {
      "dayNumber": 1,
      "title": "Day 1 Title",
      "theme": "Day Theme",
      "morning": {
        "time": "08:30 AM",
        "title": "Morning Activity",
        "description": "Detailed description of activity",
        "location": "Specific location/neighborhood",
        "quietLevel": "Very Quiet",
        "recommendedEat": "Breakfast or coffee spot"
      },
      "afternoon": {
        "time": "01:30 PM",
        "title": "Afternoon Activity",
        "description": "Detailed description of activity",
        "location": "Location",
        "lunchSpot": "Lunch spot recommendation"
      },
      "evening": {
        "time": "06:30 PM",
        "title": "Evening Activity",
        "description": "Detailed description of evening stroll or dinner",
        "location": "Location",
        "dinnerSpot": "Dinner recommendation"
      },
      "hiddenGem": {
        "name": "Secret Spot Name",
        "note": "Why this place is magical and uncrowded",
        "tag": "Secret Viewpoint"
      }
    }
  ],
  "curatedCafes": [
    {
      "name": "Cafe Name",
      "neighborhood": "Neighborhood",
      "specialty": "Signature drink or pastry",
      "vibe": "Atmosphere description",
      "tip": "Insider ordering tip"
    }
  ],
  "scenicHikes": [
    {
      "name": "Trail Name",
      "distance": "e.g. 4.5 km",
      "difficulty": "Easy" | "Moderate" | "Challenging",
      "viewHighlight": "Key scenic highlight"
    }
  ],
  "insiderTips": [
    "Practical transport, booking, or timing advice"
  ]
}
`;
