export interface ActivityItem {
  time: string;
  title: string;
  description: string;
  location: string;
  placeName?: string;
  briefDescription?: string;
  badge?: string;
  quietLevel?: string;
  recommendedEat?: string;
  lunchSpot?: string;
  dinnerSpot?: string;
}

export interface DayPlan {
  dayNumber: number;
  title: string;
  theme: string;
  morning: ActivityItem;
  afternoon: ActivityItem;
  evening: ActivityItem;
  hiddenGem: {
    name: string;
    note: string;
    tag: string;
    placeName?: string;
    briefDescription?: string;
  };
}

export interface CafeSpot {
  name: string;
  neighborhood: string;
  specialty: string;
  vibe: string;
  tip: string;
  placeName?: string;
  briefDescription?: string;
}

export interface HikeSpot {
  name: string;
  distance: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  viewHighlight: string;
  placeName?: string;
  briefDescription?: string;
}

export interface BudgetEstimate {
  currency: string;
  totalLow: number;
  totalHigh: number;
  breakdown: {
    flights: { low: number; high: number };
    accommodation: { low: number; high: number };
    food: { low: number; high: number };
    activities: { low: number; high: number };
    localTransport: { low: number; high: number };
    miscBuffer: { low: number; high: number };
  };
  perPersonPerDay: { low: number; high: number };
  notes: string;
}

export interface FlightOption {
  airline: string;
  flightNumberOrType?: string;
  route: string;
  duration: string;
  departureTimes: string[];
  arrivalTimes: string[];
  estPriceRange: string;
  notes?: string;
}

export interface TrainOption {
  trainNameOrNumber: string;
  routeStations: string;
  duration: string;
  departureTimes: string[];
  arrivalTimes: string[];
  frequency: string;
  estPriceRange: string;
  bookingTip?: string;
}

export interface BusOption {
  operatorOrType: string;
  route: string;
  duration: string;
  departureTimes: string[];
  frequency: string;
  estPriceRange: string;
  notes?: string;
}

export interface TransitRoutesInfo {
  origin: string;
  flights?: FlightOption[];
  trains?: TrainOption[];
  buses?: BusOption[];
  localTransitTip?: string;
}

export interface TripItinerary {
  id: string;
  title: string;
  destination: string;
  origin?: string;
  transitRoutes?: TransitRoutesInfo;
  duration: string;
  seasonOrDates: string;
  summary: string;
  vibe: string;
  crowdStrategy: string;
  budgetEstimate: BudgetEstimate;
  days: DayPlan[];
  curatedCafes: CafeSpot[];
  scenicHikes: HikeSpot[];
  insiderTips: string[];
  generatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  userId: string;
  prompt: string;
  itinerary: TripItinerary;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoverTrip {
  id: string;
  title: string;
  destination: string;
  duration: string;
  tag: string;
  country: string;
  promptText: string;
  summary: string;
  savedCount: number;
  curator: string;
  imageUrl: string;
  highlights: string[];
}

export interface FAQItem {
  question: string;
  answer: string;
  category: 'Planning' | 'AI & Accuracy' | 'Crowds' | 'Accounts';
}

export interface PricingPlan {
  id: string;
  name: string;
  subtitle: string;
  priceMonthly: number;
  priceAnnual: number;
  popular?: boolean;
  features: string[];
  ctaText: string;
}
