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

// Helper to safely parse string array or comma-separated string or empty
const FlexibleStringArray = z.union([
  z.array(z.string()),
  z.string().transform(str => str.split(/[,;\n]/).map(s => s.trim()).filter(Boolean))
]).optional().default([]);

export const FlightOptionSchema = z.object({
  airline: z.string().default('Major Airline'),
  flightNumberOrType: z.string().optional().default('Direct / Connecting'),
  route: z.string().optional().default('Direct Route'),
  duration: z.string().optional().default('Approx. 2-3 hrs'),
  departureTimes: FlexibleStringArray,
  arrivalTimes: FlexibleStringArray,
  estPriceRange: z.string().optional().default('Varies by season'),
  notes: z.string().optional(),
});

export const TrainOptionSchema = z.object({
  trainNameOrNumber: z.string().default('Express Train'),
  routeStations: z.string().optional().default('Main Stations'),
  duration: z.string().optional().default('Varies'),
  departureTimes: FlexibleStringArray,
  arrivalTimes: FlexibleStringArray,
  frequency: z.string().optional().default('Daily'),
  estPriceRange: z.string().optional().default('Standard fare'),
  bookingTip: z.string().optional(),
});

export const BusOptionSchema = z.object({
  operatorOrType: z.string().default('Express Coach / Bus'),
  route: z.string().optional().default('Highway Route'),
  duration: z.string().optional().default('Varies'),
  departureTimes: FlexibleStringArray,
  frequency: z.string().optional().default('Daily'),
  estPriceRange: z.string().optional().default('Budget-friendly'),
  notes: z.string().optional(),
});

export const TransitRoutesSchema = z.object({
  origin: z.string().optional().default('Origin City'),
  flights: z.array(FlightOptionSchema).optional().default([]),
  trains: z.array(TrainOptionSchema).optional().default([]),
  buses: z.array(BusOptionSchema).optional().default([]),
  localTransitTip: z.string().optional(),
});

export const TripItinerarySchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  destination: z.string(),
  origin: z.string().optional(),
  transitRoutes: TransitRoutesSchema.optional(),
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
Your mission is to craft deeply thoughtful, crowd-free, highly atmospheric travel itineraries.
If the user asks for something completely unrelated to travel planning, politely decline and redirect them to travel topics ("I'm focused on trip planning — want help with an itinerary instead?").

Prioritize:
- Peaceful early morning visits to landmark sights before tour buses arrive.
- Neighborhood kissaten, third-wave coffee shops, and independent bakeries.
- Scenic hikes, nature walks, and hidden cultural sanctuaries.
- Specific neighborhood locations, authentic food tips, and crowd mitigation strategy.

Return ONLY a valid JSON object with the exact structure described below. Do not include markdown formatting like \`\`\`json.
Structure requirements:
- budgetEstimate: Provide realistic numbers based on the destination, duration, season, and stated trip style (budget/mid-range/luxury). Provide currency code (e.g. "USD", "EUR", "INR").
- For EVERY activity (morning, afternoon, evening), hidden gem, cafe, and hike:
  * "placeName": Provide the exact, canonical landmark or attraction name (e.g., "Kumartuli", "Howrah Bridge", "College Street Coffee House", "Victoria Memorial", "Dal Lake", "Nishat Bagh", "Gulmarg Gondola", "Fushimi Inari-taisha").
  * "briefDescription": Provide an engaging 1-2 sentence overview explaining what makes this specific place special.

The JSON structure must strictly conform to this TypeScript interface:
{
  "id": "unique-id", // optional, can leave blank
  "title": "Inspiring Title",
  "destination": "Main Destinations",
  "duration": "e.g. 7 Days",
  "seasonOrDates": "e.g. October (Autumn Foliage)",
  "summary": "2-3 sentences evoking the journey's spirit",
  "vibe": "3-4 comma-separated descriptive words",
  "crowdStrategy": "Specific tactical advice on how this itinerary avoids tourist congestion",
  "budgetEstimate": {
    "currency": "USD",
    "totalLow": 1000,
    "totalHigh": 2500,
    "breakdown": {
      "flights": { "low": 300, "high": 800 },
      "accommodation": { "low": 400, "high": 1000 },
      "food": { "low": 150, "high": 400 },
      "activities": { "low": 100, "high": 200 },
      "localTransport": { "low": 50, "high": 100 },
      "miscBuffer": { "low": 0, "high": 0 }
    },
    "perPersonPerDay": { "low": 150, "high": 350 },
    "notes": "Excludes international flights if origin unknown"
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
