import 'dotenv/config'; // MUST be first — loads .env before any other module reads process.env
import express from "express";
import path from "path";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { PrismaClient } from "@prisma/client";
import cookieParser from "cookie-parser";
import multer from "multer";
import rateLimit from "express-rate-limit";

import { generateItinerary, refineItinerary, getConfiguredProviderNames, getActiveProviders, getProviders, translateItinerary } from "./server/ai/router";
import { extractTextFromAttachment } from "./server/ai/extractText";
import { generateCompleteTransitRoutes } from "./server/ai/transitService";
import { generateHotelSuggestions } from "./server/ai/hotelService";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const JWT_SECRET = process.env.JWT_SECRET || "WandOr-Secret-key";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "mock-client-id";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
let prisma: any = null;
try {
  prisma = new PrismaClient();
} catch (e: any) {
  console.warn("[Prisma] Running in stateless serverless mode without local DB:", e?.message);
}

const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB limit

// CORS and Preflight handling for Vercel
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// URL prefix normalizer for Vercel serverless rewrites
app.use((req, res, next) => {
  if (
    process.env.VERCEL &&
    !req.url.startsWith('/api') &&
    req.url !== '/' &&
    !req.url.startsWith('/assets') &&
    !req.url.startsWith('/src') &&
    !req.url.startsWith('/@') &&
    !req.url.startsWith('/node_modules')
  ) {
    req.url = '/api' + req.url;
  }
  next();
});

app.use(express.json({ limit: "15mb" }));
app.use(cookieParser());

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: "Too many requests from this IP, please try again after 15 minutes"
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 AI generations per hour
  message: "AI generation limit reached for this IP. Please try again later."
});

// Authentication Middleware
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.cookies.jwt || (req.headers['authorization']?.split(' ')[1]);

  if (!token) {
    (req as any).user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      (req as any).user = null;
    } else {
      (req as any).user = user;
    }
    next();
  });
};

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: "Too many requests, please try again later"
});

app.use(authenticateToken);
app.use('/api/', generalApiLimiter);
app.use('/api/auth/', apiLimiter);

// Public Config & Diagnostics Endpoints
app.get(["/api", "/api/health", "/health"], (req, res) => {
  res.json({
    status: "ok",
    app: "Wandor AI Trip Planner API",
    configuredProviders: getConfiguredProviderNames(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasGoogleMapsKey: Boolean(process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY),
    hasFlightKey: Boolean(process.env.AVIATIONSTACK_API_KEY || process.env.FLIGHT_TIMING_API_KEY),
    hasTrainKey: Boolean(process.env.TRAIN_TIMING_API_KEY || process.env.RAIL_API_KEY),
    timestamp: new Date().toISOString()
  });
});

app.get(["/api/config/maps-key", "/config/maps-key"], (req, res) => {
  const key = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  res.json({ key });
});

// In-memory fallback user store for stateless/serverless environments without external SQL database
const memoryUsers = new Map<string, any>();

// Auth Endpoints
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: "Email and password (min 6 characters) required" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check Prisma or In-Memory
    if (prisma) {
      try {
        const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (existing) return res.status(400).json({ error: "Email already in use" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
          data: { email: cleanEmail, passwordHash: hashedPassword }
        });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        return res.json({ success: true, user: { id: user.id, email: user.email } });
      } catch (dbErr: any) {
        console.warn("[Auth] Prisma registration fallback to in-memory:", dbErr.message);
      }
    }

    // In-memory registration
    if (memoryUsers.has(cleanEmail)) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `user-${Date.now()}`;
    const userObj = { id: userId, email: cleanEmail, passwordHash: hashedPassword };
    memoryUsers.set(cleanEmail, userObj);

    const token = jwt.sign({ id: userId, email: cleanEmail }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    return res.json({ success: true, user: { id: userId, email: cleanEmail } });
  } catch (error: any) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Server error during registration" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const cleanEmail = email.toLowerCase().trim();

    // Check Prisma if available
    if (prisma) {
      try {
        const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (user && user.passwordHash) {
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (valid) {
            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
            return res.json({ success: true, user: { id: user.id, email: user.email } });
          }
        }
      } catch (dbErr: any) {
        console.warn("[Auth] Prisma login fallback:", dbErr.message);
      }
    }

    // Check In-Memory fallback
    const memUser = memoryUsers.get(cleanEmail);
    if (memUser && memUser.passwordHash) {
      const valid = await bcrypt.compare(password, memUser.passwordHash);
      if (valid) {
        const token = jwt.sign({ id: memUser.id, email: memUser.email }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        return res.json({ success: true, user: { id: memUser.id, email: memUser.email } });
      }
    }

    // Fallback: allow demo sign-in or create account on the fly if not existing
    return res.status(400).json({ error: "Invalid email or password" });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error during login" });
  }
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential, email: directEmail, name: directName } = req.body;
    let email = directEmail;
    let name = directName;
    let googleId = `gid-${Date.now()}`;

    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload?.email) {
          email = payload.email;
          name = payload.name;
          googleId = payload.sub;
        }
      } catch (e: any) {
        // Fallback: decode JWT payload without audience check for preview/demo
        const decoded = jwt.decode(credential) as any;
        if (decoded && decoded.email) {
          email = decoded.email;
          name = decoded.name;
          googleId = decoded.sub || googleId;
        }
      }
    }

    if (!email) {
      return res.status(400).json({ error: "Could not identify Google email address" });
    }

    const cleanEmail = email.toLowerCase().trim();
    let userId = `user-${Date.now()}`;

    // Try saving to Prisma if DB is active
    if (prisma) {
      try {
        let user = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (!user) {
          user = await prisma.user.create({
            data: { email: cleanEmail, name, googleId }
          });
        }
        userId = user.id;
      } catch (dbErr: any) {
        console.warn("[Auth] Prisma Google auth fallback:", dbErr.message);
      }
    }

    // Save to memory cache
    memoryUsers.set(cleanEmail, { id: userId, email: cleanEmail, name });

    const token = jwt.sign({ id: userId, email: cleanEmail, name }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    return res.json({ success: true, user: { id: userId, email: cleanEmail, name } });
  } catch (error: any) {
    console.error("Google auth error:", error);
    return res.status(500).json({ error: "Server error during Google authentication" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie('jwt');
  return res.json({ success: true });
});

app.get("/api/auth/me", async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Not logged in" });

  if (prisma) {
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, name: true } });
      if (dbUser) return res.json({ success: true, user: dbUser });
    } catch {}
  }

  // Memory or token payload fallback
  return res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
});

// Fetch past trips for logged in user
app.get("/api/trips", async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const trips = await prisma.trip.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    // Parse itineraries
    const formattedTrips = trips.map(t => ({
      ...t,
      itinerary: typeof t.itinerary === 'string' ? JSON.parse(t.itinerary) : t.itinerary
    }));
    res.json({ success: true, trips: formattedTrips });
  } catch (error) {
    console.error("Error fetching trips:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/trips/:id", async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const trip = await prisma.trip.findFirst({
      where: { id: req.params.id, userId: user.id }
    });
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const itinerary = typeof trip.itinerary === 'string' ? JSON.parse(trip.itinerary) : trip.itinerary;
    res.json({ success: true, trip: { ...trip, itinerary } });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// OCR Endpoint
app.post("/api/extract-attachment", aiLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const activeProviders = getActiveProviders();
    const provider = activeProviders.length > 0 ? activeProviders[0] : undefined;
    const text = await extractTextFromAttachment(req.file.buffer, req.file.mimetype, provider);
    res.json({ success: true, text });
  } catch (err: any) {
    console.error("OCR Error:", err);
    res.status(500).json({ error: err.message || "Failed to extract text." });
  }
});

// Health check
app.get(["/api/health", "/health"], (req, res) => {
  res.json({
    status: "ok",
    service: "wandor-backend",
    aiProviders: getConfiguredProviderNames()
  });
});

// In-memory caches for fast sub-second responses
const imageCache = new Map<string, string>();
const placeInfoCache = new Map<string, any>();
const voiceNarrativeCache = new Map<string, string>();
const translationCache = new Map<string, any>();
const tripMapCache = new Map<string, any>();
let exchangeRatesCache: { timestamp: number; rates: Record<string, number> } | null = null;

// Fallback rates against USD
const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 86.5,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 154.0,
  AED: 3.67,
  CAD: 1.38,
  AUD: 1.54,
  CHF: 0.89,
  SGD: 1.34,
  CNY: 7.24,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.38,
  OMR: 0.38,
  KRW: 1380.0,
  THB: 36.5,
  IDR: 16250.0,
  MYR: 4.71,
  VND: 25420.0,
  PHP: 58.5,
  TRY: 32.8,
  RUB: 91.0,
  BRL: 5.45,
  ZAR: 18.2,
  MXN: 18.1,
  EGP: 47.5,
  PKR: 278.5,
  BDT: 117.5,
  NPR: 138.4,
  LKR: 302.0,
  SEK: 10.6,
  NOK: 10.7,
  DKK: 6.9,
  NZD: 1.64,
  ILS: 3.72,
  PLN: 3.96
};

// Curated high quality travel fallbacks by theme
const THEME_FALLBACKS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200", // alpine/mountains
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=1200", // scenic road
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=1200", // serene lake
  "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=1200", // historic city
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200"  // coastal/beach
];

// Helper: Check if an image URL is an actual authentic photograph (not an SVG logo, map, flag, or coat of arms)
function isValidPhotoUrl(url?: string | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  if (
    u.includes('.svg') ||
    u.includes('logo') ||
    u.includes('coat_of_arms') ||
    u.includes('arms_of') ||
    u.includes('flag_') ||
    u.includes('flag.') ||
    u.includes('insignia') ||
    u.includes('symbol') ||
    u.includes('location_map') ||
    u.includes('orthographic') ||
    u.includes('_map.') ||
    u.includes('_map_') ||
    u.includes('emblem') ||
    u.includes('blason') ||
    u.includes('icon.') ||
    u.includes('icon_') ||
    u.includes('locator') ||
    u.includes('pointer')
  ) {
    return false;
  }
  return true;
}

// Helper: Clean search query for Wikipedia lookup
function cleanPlaceQuery(raw: string): string {
  return raw
    .replace(/\b(near|opp|opposite|behind|beside|next to|close to|around|ghat \d+|boulevard rd|st|street|ave|avenue|road|lane)\b/gi, ' ')
    .replace(/[,\(\)\.\-\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fast alias map for iconic cultural landmarks with disambiguation
const LANDMARK_ALIASES: Record<string, string> = {
  'indian coffee house': 'College Street Coffee House',
  'coffee house': 'College Street Coffee House',
  'coffee house kolkata': 'College Street Coffee House',
  'kumartuli': 'Kumortuli',
  'kumortuli': 'Kumortuli',
  'howrah bridge': 'Howrah Bridge',
  'victoria memorial': 'Victoria Memorial, Kolkata',
  'dakshineswar': 'Dakshineswar Kali Temple',
  'belur math': 'Belur Math',
  'prinsep ghat': 'James Prinsep',
  'eiffel tower': 'Eiffel Tower',
  'louvre': 'Louvre',
  'louvre museum': 'Louvre',
};

// Enhanced Wikipedia & Wikimedia Commons Photo Endpoint (Authentic Sightseeing Photos)
app.get(["/api/location-image", "/location-image"], async (req, res) => {
  const rawPlace = (req.query.place as string) || '';
  const rawDest = (req.query.destination as string) || '';
  const rawQ = (req.query.q as string) || '';

  const cacheKey = `${rawPlace.toLowerCase()}::${rawDest.toLowerCase()}::${rawQ.toLowerCase()}`;
  if (imageCache.has(cacheKey)) {
    const cached = imageCache.get(cacheKey)!;
    if (isValidPhotoUrl(cached)) {
      return res.json({ success: true, imageUrl: cached, source: 'wikipedia' });
    }
    imageCache.delete(cacheKey);
  }

  // Build candidate queries in priority order: specific landmark -> landmark + dest -> destination tourism
  const candidates: string[] = [];
  const normalizedPlace = rawPlace.trim().toLowerCase();
  if (LANDMARK_ALIASES[normalizedPlace]) {
    candidates.push(LANDMARK_ALIASES[normalizedPlace]);
  }
  if (rawPlace) {
    candidates.push(rawPlace);
    if (rawDest && !rawPlace.toLowerCase().includes(rawDest.toLowerCase())) {
      candidates.push(`${rawPlace} ${rawDest}`);
    }
  }
  if (rawQ) {
    const cleanedQ = cleanPlaceQuery(rawQ);
    if (cleanedQ && cleanedQ !== rawPlace) {
      candidates.push(cleanedQ);
    }
    const firstPart = rawQ.split(',')[0].trim();
    if (firstPart && !candidates.includes(firstPart)) {
      candidates.push(firstPart);
    }
  }
  // Fallbacks: destination sightseeing on Wikipedia
  if (rawDest) {
    candidates.push(`${rawDest} landmarks`);
    candidates.push(`${rawDest} tourism`);
    candidates.push(rawDest);
  }

  const wikiHeaders = {
    'User-Agent': 'WandorTravelApp/1.0 (contact@wandor.travel; travel curator bot)'
  };

  try {
    for (const query of candidates) {
      if (!query || query.length < 2) continue;

      // 1. Search Wikipedia
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=4`;
      const searchRes = await fetch(searchUrl, { headers: wikiHeaders });
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const hits = searchData.query?.search;
      if (!hits || hits.length === 0) continue;

      // Try hits to find one with a valid photographic image (NOT a logo/SVG)
      for (const hit of hits) {
        const title = hit.title;
        // Query Wikipedia REST Summary API
        try {
          const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
          const sumRes = await fetch(sumUrl, { headers: wikiHeaders });
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            const thumbSrc = sumData.thumbnail?.source;
            const origSrc = sumData.originalimage?.source;

            if (isValidPhotoUrl(thumbSrc)) {
              const hiResUrl = thumbSrc.replace(/\/\d+px-/, '/1200px-');
              imageCache.set(cacheKey, hiResUrl);
              return res.json({ success: true, imageUrl: hiResUrl, title, source: 'wikipedia' });
            }
            if (isValidPhotoUrl(origSrc)) {
              imageCache.set(cacheKey, origSrc);
              return res.json({ success: true, imageUrl: origSrc, title, source: 'wikipedia' });
            }
          }
        } catch (_) { }
      }

      // 2. Search Wikimedia Commons files (namespace 6) for authentic landmark photographs
      try {
        const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + ' photo')}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|mime&iiurlwidth=1200&format=json`;
        const cRes = await fetch(commonsUrl, { headers: wikiHeaders });
        if (cRes.ok) {
          const cData = await cRes.json();
          const pages = cData.query?.pages;
          if (pages) {
            for (const id in pages) {
              const info = pages[id]?.imageinfo?.[0];
              const thumbUrl = info?.thumburl || info?.url;
              if (thumbUrl && isValidPhotoUrl(thumbUrl)) {
                imageCache.set(cacheKey, thumbUrl);
                return res.json({ success: true, imageUrl: thumbUrl, title: pages[id].title, source: 'wikimedia' });
              }
            }
          }
        }
      } catch (_) { }
    }

    // 3. If specific search failed, fetch main Wikipedia photo of the destination city
    if (rawDest) {
      try {
        const destSumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(rawDest)}`;
        const destRes = await fetch(destSumUrl, { headers: wikiHeaders });
        if (destRes.ok) {
          const destData = await destRes.json();
          const destImg = destData.thumbnail?.source || destData.originalimage?.source;
          if (isValidPhotoUrl(destImg)) {
            const hiRes = destImg.replace(/\/\d+px-/, '/1200px-');
            imageCache.set(cacheKey, hiRes);
            return res.json({ success: true, imageUrl: hiRes, title: destData.title, source: 'wikipedia-dest' });
          }
        }
      } catch (_) { }
    }

    // Default safe fallback if network offline
    const fallbackImage = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200";
    imageCache.set(cacheKey, fallbackImage);
    return res.json({ success: true, imageUrl: fallbackImage, source: 'fallback' });
  } catch (error) {
    console.error("Error fetching location image:", error);
    const fallbackImage = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200";
    return res.json({ success: true, imageUrl: fallbackImage, source: 'fallback' });
  }
});

// AI Voice Narrative Endpoint for Multilingual Audio Guide with Cache
app.post(["/api/voice-narrative", "/voice-narrative"], async (req, res) => {
  const { placeName, destination, language = "English", context, geminiKey } = req.body;
  if (!placeName) return res.status(400).json({ error: "placeName is required" });

  const cacheKey = `${placeName.toLowerCase()}::${(destination || '').toLowerCase()}::${language.toLowerCase()}`;
  if (voiceNarrativeCache.has(cacheKey)) {
    return res.json({ success: true, narrative: voiceNarrativeCache.get(cacheKey), language, cached: true });
  }

  try {
    const apiKey = (req.headers['x-gemini-key'] as string) || geminiKey || process.env.GEMINI_API_KEY;
    if (apiKey) {
      const { GoogleGenAI } = await import('@google/genai');
      const aiClient = new GoogleGenAI({ apiKey });
      const prompt = `You are Wandor's poetic, culturally profound travel voice guide.
Create a concise 2-sentence audio tour narration describing the atmosphere, beauty, and essence of "${placeName}" in ${destination || 'this region'}.
${context ? `Notes: ${context}` : ''}
Language: Write the narration in ${language} (using native script).
Return ONLY the spoken text, no quotes or markdown.`;

      const response = await aiClient.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 150,
        }
      });
      const narrative = response.text?.trim() || '';
      if (narrative) {
        voiceNarrativeCache.set(cacheKey, narrative);
        return res.json({ success: true, narrative, language });
      }
    }

    // Fallback narrative if AI key unavailable
    const fallback = `${placeName} in ${destination} is an extraordinary sanctuary of culture and timeless charm. Feel the distinct rhythm of the neighborhood and savor its authentic beauty.`;
    voiceNarrativeCache.set(cacheKey, fallback);
    return res.json({ success: true, narrative: fallback, language: 'English' });
  } catch (err: any) {
    console.warn("Voice narrative generation fallback:", err.message);
    const fallback = `${placeName} is a wonderful place to explore in ${destination}.`;
    return res.json({ success: true, narrative: fallback, language: 'English' });
  }
});

// Place Info Endpoint (Brief Idea, Overview, Photo, Coordinates, Wiki & Maps URLs)
app.get(["/api/place-info", "/place-info"], async (req, res) => {
  const rawPlace = (req.query.place as string) || (req.query.q as string) || '';
  const rawDest = (req.query.destination as string) || '';

  if (!rawPlace) {
    return res.status(400).json({ error: "Place name or query required." });
  }

  const cacheKey = `${rawPlace.toLowerCase()}::${rawDest.toLowerCase()}`;
  if (placeInfoCache.has(cacheKey)) {
    return res.json({ success: true, place: placeInfoCache.get(cacheKey) });
  }

  const wikiHeaders = {
    'User-Agent': 'WandorTravelApp/1.0 (contact@wandor.travel; travel curator bot)'
  };

  const candidateQueries = [
    rawDest ? `${rawPlace} ${rawDest}` : '',
    rawPlace,
    cleanPlaceQuery(rawPlace)
  ].filter(Boolean);

  try {
    for (const query of candidateQueries) {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=2`;
      const searchRes = await fetch(searchUrl, { headers: wikiHeaders });
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const hits = searchData.query?.search;
      if (!hits || hits.length === 0) continue;

      const title = hits[0].title;
      const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const sumRes = await fetch(sumUrl, { headers: wikiHeaders });
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        const imageUrl = sumData.thumbnail?.source
          ? sumData.thumbnail.source.replace(/\/\d+px-/, '/1000px-')
          : (sumData.originalimage?.source || null);

        const placeDetails = {
          title: sumData.title || title,
          description: sumData.description || '',
          extract: sumData.extract || '',
          imageUrl,
          coordinates: sumData.coordinates || null,
          wikipediaUrl: sumData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title + (rawDest ? ' ' + rawDest : ''))}`
        };

        placeInfoCache.set(cacheKey, placeDetails);
        return res.json({ success: true, place: placeDetails });
      }
    }

    // If not found on Wikipedia, return synthesized fallback info
    const fallbackPlace = {
      title: rawPlace,
      description: rawDest ? `Scenic destination in ${rawDest}` : 'Suggested destination',
      extract: `${rawPlace} is one of the curated destinations in this journey, known for its tranquil atmosphere, distinct charm, and authentic local experience away from congested tourist corridors.`,
      imageUrl: null,
      coordinates: null,
      wikipediaUrl: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(rawPlace)}`,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawPlace + (rawDest ? ' ' + rawDest : ''))}`
    };

    placeInfoCache.set(cacheKey, fallbackPlace);
    return res.json({ success: true, place: fallbackPlace });
  } catch (err: any) {
    console.error("Place info lookup error:", err.message);
    return res.status(500).json({ error: "Failed to retrieve place info" });
  }
});

// Live Currency Exchange Rates Endpoint
app.get(["/api/exchange-rates", "/exchange-rates"], async (req, res) => {
  const now = Date.now();
  // Return cached rates if fresh within 12 hours
  if (exchangeRatesCache && (now - exchangeRatesCache.timestamp < 12 * 60 * 60 * 1000)) {
    return res.json({ success: true, base: "USD", rates: exchangeRatesCache.rates });
  }

  try {
    const apiRes = await fetch("https://open.er-api.com/v6/latest/USD");
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.rates && typeof data.rates === 'object') {
        exchangeRatesCache = {
          timestamp: now,
          rates: { ...DEFAULT_EXCHANGE_RATES, ...data.rates }
        };
        return res.json({ success: true, base: "USD", rates: exchangeRatesCache.rates });
      }
    }
  } catch (err) {
    console.warn("Could not fetch live exchange rates, falling back to cached/default rates:", err);
  }

  // Fallback to default rates
  return res.json({ success: true, base: "USD", rates: DEFAULT_EXCHANGE_RATES });
});

// Attachment Extraction & Ticket Analysis Endpoint (Gemini Multimodal / OCR)
app.post(["/api/extract-attachment", "/extract-attachment"], upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded." });
    }

    const clientKey = (req.headers['x-gemini-key'] as string) || (req.body && req.body.geminiKey);
    const providers = getProviders(clientKey);
    const gemini = providers.gemini;

    const extracted = await extractTextFromAttachment(
      req.file.buffer,
      req.file.mimetype,
      gemini && gemini.isConfigured() ? gemini : undefined
    );

    return res.json({ success: true, text: extracted });
  } catch (err: any) {
    console.error("Attachment analysis failed:", err);
    return res.status(500).json({ error: err.message || "Failed to analyze document." });
  }
});

// Primary Endpoint: Plan Trip
app.post(["/api/plan-trip", "/plan-trip"], aiLimiter, async (req, res) => {
  const { prompt, attachmentSummary, geminiKey } = req.body;
  const clientKey = (req.headers['x-gemini-key'] as string) || geminiKey;
  const user = (req as any).user;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "A prompt is required." });
  }

  try {
    const itinerary = await generateItinerary(prompt, attachmentSummary, clientKey);
    itinerary.id = `trip-${Date.now()}`;

    // Auto-generate flight and train timings using Aviationstack and Train timing APIs
    try {
      const originMatch = prompt.match(/(?:from|departing|flying from|leaving|origin)\s+([A-Za-z\s]+?)(?:\s+to|\s+in|\s+for|\.|\,|$)/i);
      const originCity = itinerary.origin || (originMatch ? originMatch[1].trim() : 'Your departure city');
      itinerary.origin = originCity;
      const transitRoutes = await generateCompleteTransitRoutes(originCity, itinerary.destination);
      itinerary.transitRoutes = transitRoutes;
    } catch (transitErr: any) {
      console.warn("[Transit] Route generation notice:", transitErr.message);
    }

    // Auto-suggest hotel accommodations using Travel Partner / Hotel API
    try {
      const hotels = await generateHotelSuggestions(itinerary.destination, prompt);
      itinerary.hotels = hotels;
    } catch (hotelErr: any) {
      console.warn("[Hotels] Hotel suggestions notice:", hotelErr.message);
    }

    // Save to database if user is logged in
    if (user && prisma) {
      try {
        await prisma.trip.create({
          data: {
            id: itinerary.id,
            userId: user.id,
            prompt,
            itinerary: itinerary as any
          }
        });
      } catch (dbErr) {
        console.warn("DB save skipped:", dbErr);
      }
    }

    return res.json({ success: true, itinerary });
  } catch (err: any) {
    console.error("Itinerary generation failed:", err.message);
    return res.status(500).json({ error: err.message || "Failed to generate itinerary with AI." });
  }
});

// Dedicated Hotel Suggestions Endpoint (Travel Partner & Google Hotels API)
app.get(["/api/hotels", "/hotels"], async (req, res) => {
  const destination = (req.query.destination as string) || (req.query.q as string) || 'Destination';
  try {
    const hotels = await generateHotelSuggestions(destination);
    return res.json({ success: true, hotels });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch hotel suggestions" });
  }
});

// Dedicated Transit Routes Endpoint (Flights & Train Timings)
app.get(["/api/transit-routes", "/transit-routes"], async (req, res) => {
  const destination = (req.query.destination as string) || 'Destination';
  const origin = (req.query.origin as string) || 'Your departure city';
  try {
    const transitRoutes = await generateCompleteTransitRoutes(origin, destination);
    return res.json({ success: true, transitRoutes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch transit routes" });
  }
});

// Translate Itinerary Endpoint with Cache
app.post(["/api/translate-itinerary", "/translate-itinerary"], aiLimiter, async (req, res) => {
  const { itinerary, language = 'English', geminiKey } = req.body;
  const clientKey = (req.headers['x-gemini-key'] as string) || geminiKey;

  if (!itinerary || !itinerary.days) {
    return res.status(400).json({ error: 'An itinerary object is required for translation.' });
  }

  if (language.toLowerCase() === 'english') {
    return res.json({ success: true, itinerary, language });
  }

  const cacheKey = `${itinerary.id || itinerary.title || 'trip'}::${language.toLowerCase()}`;
  if (translationCache.has(cacheKey)) {
    return res.json({ success: true, itinerary: translationCache.get(cacheKey), language, cached: true });
  }

  try {
    const translatedItinerary = await translateItinerary(itinerary, language, clientKey);
    translationCache.set(cacheKey, translatedItinerary);
    return res.json({ success: true, itinerary: translatedItinerary, language });
  } catch (err: any) {
    console.error('Itinerary translation failed:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to translate itinerary.' });
  }
});

// Full Numbered Trip Map Generator with Gemini Route Enrichment & Geo coordinates
app.post(["/api/generate-trip-map", "/generate-trip-map"], async (req, res) => {
  const { itinerary, geminiKey } = req.body;
  const clientKey = (req.headers['x-gemini-key'] as string) || geminiKey;
  if (!itinerary || !itinerary.days) {
    return res.status(400).json({ error: "Itinerary is required" });
  }

  const cacheKey = `trip-map::${itinerary.id || itinerary.title || 'trip'}`;
  if (tripMapCache.has(cacheKey)) {
    return res.json({ success: true, mapData: tripMapCache.get(cacheKey), cached: true });
  }

  try {
    // Extract numbered stops sequentially from days
    let stopNumber = 1;
    const rawStops: Array<{
      number: number;
      dayNumber: number;
      dayTitle: string;
      timeSlot: 'Morning' | 'Afternoon' | 'Evening' | 'Hidden Gem';
      title: string;
      placeName: string;
      location: string;
      description: string;
      quietLevel?: string;
      foodSpot?: string;
      lat?: number;
      lng?: number;
    }> = [];

    for (const day of itinerary.days) {
      if (day.morning) {
        rawStops.push({
          number: stopNumber++,
          dayNumber: day.dayNumber,
          dayTitle: day.title || `Day ${day.dayNumber}`,
          timeSlot: 'Morning',
          title: day.morning.title,
          placeName: day.morning.placeName || day.morning.title,
          location: day.morning.location || itinerary.destination,
          description: day.morning.description || '',
          quietLevel: day.morning.quietLevel || 'Quiet',
          foodSpot: day.morning.recommendedEat,
        });
      }
      if (day.afternoon) {
        rawStops.push({
          number: stopNumber++,
          dayNumber: day.dayNumber,
          dayTitle: day.title || `Day ${day.dayNumber}`,
          timeSlot: 'Afternoon',
          title: day.afternoon.title,
          placeName: day.afternoon.placeName || day.afternoon.title,
          location: day.afternoon.location || itinerary.destination,
          description: day.afternoon.description || '',
          foodSpot: day.afternoon.lunchSpot,
        });
      }
      if (day.evening) {
        rawStops.push({
          number: stopNumber++,
          dayNumber: day.dayNumber,
          dayTitle: day.title || `Day ${day.dayNumber}`,
          timeSlot: 'Evening',
          title: day.evening.title,
          placeName: day.evening.placeName || day.evening.title,
          location: day.evening.location || itinerary.destination,
          description: day.evening.description || '',
          foodSpot: day.evening.dinnerSpot,
        });
      }
      if (day.hiddenGem) {
        rawStops.push({
          number: stopNumber++,
          dayNumber: day.dayNumber,
          dayTitle: day.title || `Day ${day.dayNumber}`,
          timeSlot: 'Hidden Gem',
          title: day.hiddenGem.name,
          placeName: day.hiddenGem.placeName || day.hiddenGem.name,
          location: day.hiddenGem.tag || itinerary.destination,
          description: day.hiddenGem.note || '',
        });
      }
    }

    // Use Gemini for rapid geo-coordinates and transit link estimations with 3.5s timeout
    const apiKey = clientKey || process.env.GEMINI_API_KEY;
    let enrichedStops = rawStops;
    let routeSummary = `A curated ${itinerary.duration || 'journey'} across ${rawStops.length} numbered stops in ${itinerary.destination}.`;
    let routeTips: string[] = [];

    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const aiClient = new GoogleGenAI({ apiKey });
        const geoPrompt = `Geocode these numbered stops in "${itinerary.destination}":
${rawStops.map(s => `#${s.number}: "${s.placeName || s.title}" at "${s.location}"`).join('\n')}

Return JSON:
{
  "stops": [
    { "number": 1, "lat": 35.6586, "lng": 139.7454, "transitToNext": "10 min walk" }
  ],
  "routeSummary": "Route summary",
  "routeTips": ["Tip 1", "Tip 2"]
}`;

        const geoPromise = aiClient.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
          contents: geoPrompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 1024,
          }
        });

        // Timeout race in 3.5s
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Geo timeout')), 3500));
        const geoRes = await Promise.race([geoPromise, timeoutPromise]) as any;

        const parsedGeo = JSON.parse(geoRes.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}');
        if (parsedGeo.stops && Array.isArray(parsedGeo.stops)) {
          const geoMap = new Map(parsedGeo.stops.map((g: any) => [g.number, g]));
          enrichedStops = rawStops.map(s => {
            const geo = geoMap.get(s.number) as any;
            return {
              ...s,
              lat: typeof geo?.lat === 'number' ? geo.lat : undefined,
              lng: typeof geo?.lng === 'number' ? geo.lng : undefined,
              transitToNext: geo?.transitToNext || undefined,
            };
          });
        }
        if (parsedGeo.routeSummary) routeSummary = parsedGeo.routeSummary;
        if (parsedGeo.routeTips && Array.isArray(parsedGeo.routeTips)) routeTips = parsedGeo.routeTips;
      } catch (err: any) {
        console.warn("Map geo-enrichment fast fallback:", err.message);
      }
    }

    const mapData = {
      destination: itinerary.destination,
      title: itinerary.title,
      duration: itinerary.duration,
      totalStops: enrichedStops.length,
      stops: enrichedStops,
      routeSummary,
      routeTips,
      generatedAt: new Date().toISOString()
    };

    tripMapCache.set(cacheKey, mapData);
    return res.json({ success: true, mapData });
  } catch (err: any) {
    console.error("Trip map generation error:", err);
    return res.status(500).json({ error: "Failed to generate trip map." });
  }
});

// Refine Itinerary Endpoint
app.post(["/api/refine-trip", "/refine-trip"], aiLimiter, async (req, res) => {
  const { currentItinerary, refinePrompt, geminiKey } = req.body;
  const clientKey = (req.headers['x-gemini-key'] as string) || geminiKey;
  const user = (req as any).user;

  if (!currentItinerary || !refinePrompt) {
    return res.status(400).json({ error: "Missing current itinerary or refine prompt." });
  }

  try {
    const updatedItinerary = await refineItinerary(currentItinerary, refinePrompt, clientKey);

    // Update in DB if it was already saved
    if (user && currentItinerary.id && prisma) {
      try {
        const existing = await prisma.trip.findFirst({ where: { id: currentItinerary.id, userId: user.id } });
        if (existing) {
          await prisma.trip.update({
            where: { id: currentItinerary.id },
            data: { itinerary: updatedItinerary as any }
          });
        }
      } catch (dbErr) {
        console.warn("DB update skipped:", dbErr);
      }
    }

    return res.json({ success: true, itinerary: updatedItinerary });
  } catch (err: any) {
    console.error("Refinement failed:", err);
    return res.status(500).json({ error: err.message || "Failed to refine itinerary with AI." });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Wandor server running on http://0.0.0.0:${PORT}`);
    // Safe diagnostic — never prints the actual key value
    console.log(`[ENV] GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'SET ✓' : 'NOT SET ✗'}`);
    console.log(`[ENV] OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'SET ✓' : 'NOT SET ✗'}`);
    console.log(`[ENV] ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'SET ✓' : 'NOT SET ✗'}`);
    console.log(`[ENV] GOOGLE_MAPS_API_KEY: ${process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY ? 'SET ✓' : 'NOT SET ✗'}`);
    console.log(`[AI] Configured providers: ${getConfiguredProviderNames().join(', ') || 'NONE'}`);
  });
}

// In local development or standalone container, run HTTP server
if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };
