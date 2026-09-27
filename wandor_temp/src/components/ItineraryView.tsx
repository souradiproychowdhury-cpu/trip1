import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Coffee,
  Compass,
  Download,
  Eye,
  Heart,
  MapPin,
  Mountain,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunset,
  Sunrise,
  Send,
  Printer,
  Users,
  User,
  Plus,
  Minus,
  Calculator
} from 'lucide-react';
import { TripItinerary, DayPlan } from '../types';
import { LocationImage } from './LocationImage';
import { PlaceDetailModal, PlaceDetailData } from './PlaceDetailModal';
import { CurrencyProvider, CurrencySelector, useCurrency } from './CurrencySelector';
import { VoiceAssistantPlayer } from './VoiceAssistantPlayer';
import { NumberedTripMap } from './NumberedTripMap';
import { TransitRoutesSection } from './TransitRoutesSection';
import { HotelSuggestionsSection } from './HotelSuggestionsSection';
import { Map as MapIcon, ListOrdered, Plane, Building2 } from 'lucide-react';

interface ItineraryViewProps {
  itinerary: TripItinerary;
  onBack: () => void;
  onRefineWithAi: (refinePrompt: string) => Promise<void>;
  isRefining: boolean;
}

const ItineraryContent: React.FC<ItineraryViewProps> = ({
  itinerary,
  onBack,
  onRefineWithAi,
  isRefining
}) => {
  const [currentItinerary, setCurrentItinerary] = useState<TripItinerary>(itinerary);
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'itinerary' | 'map' | 'transit' | 'hotels'>('itinerary');
  const [copied, setCopied] = useState(false);
  const [refineText, setRefineText] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetailData | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isTranslating, setIsTranslating] = useState(false);
  const { formatRange } = useCurrency();

  const [budgetTravelers, setBudgetTravelers] = useState<number>(() => itinerary.budgetEstimate?.travelersCount || 1);
  const [budgetViewMode, setBudgetViewMode] = useState<'both' | 'group' | 'perPerson'>('both');

  // Instant client-side translation cache
  const translationCache = useRef<Record<string, TripItinerary>>({
    English: itinerary
  });

  useEffect(() => {
    setCurrentItinerary(itinerary);
    translationCache.current = { English: itinerary };
    if (itinerary.budgetEstimate?.travelersCount) {
      setBudgetTravelers(itinerary.budgetEstimate.travelersCount);
    }
  }, [itinerary]);

  const translationLanguages = [
    'English',
    'Bengali',
    'Hindi',
    'Urdu',
    'Italian',
    'Spanish',
    'French',
    'Japanese'
  ];

  const handleTranslate = async (langToUse?: string) => {
    const targetLang = langToUse || selectedLanguage;
    if (!currentItinerary || !targetLang) return;

    if (translationCache.current[targetLang]) {
      // 0ms instant switch from client cache
      setCurrentItinerary(translationCache.current[targetLang]);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itinerary: currentItinerary, language: targetLang })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Translation failed');
      }

      const data = await response.json();
      if (data.success && data.itinerary) {
        translationCache.current[targetLang] = data.itinerary;
        setCurrentItinerary(data.itinerary);
      }
    } catch (err) {
      console.warn('Translation failed:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang);
    if (translationCache.current[newLang]) {
      setCurrentItinerary(translationCache.current[newLang]);
    } else {
      handleTranslate(newLang);
    }
  };

  // Extract all distinct sightseeing (side seen) stops from the trip plan for the Wikipedia gallery
  const sightseeingSpots = useMemo(() => {
    const spots: Array<{
      id: string;
      dayNumber: number;
      slot: string;
      title: string;
      placeName: string;
      location: string;
      briefDescription?: string;
      description: string;
      category: string;
      time?: string;
      recommendedEat?: string;
      lunchSpot?: string;
      dinnerSpot?: string;
    }> = [];
    const seenNames = new Set<string>();

    currentItinerary.days.forEach(day => {
      const candidates = [
        { slot: 'Morning', data: day.morning, eat: day.morning?.recommendedEat },
        { slot: 'Afternoon', data: day.afternoon, eat: day.afternoon?.lunchSpot },
        { slot: 'Evening', data: day.evening, eat: day.evening?.dinnerSpot },
        { slot: 'Hidden Gem', data: day.hiddenGem, eat: undefined }
      ];

      candidates.forEach(({ slot, data, eat }) => {
        if (!data || !data.placeName) return;
        const norm = data.placeName.trim().toLowerCase();
        if (!seenNames.has(norm)) {
          seenNames.add(norm);
          spots.push({
            id: `${day.dayNumber}-${slot}-${data.placeName}`,
            dayNumber: day.dayNumber,
            slot,
            title: data.title,
            placeName: data.placeName,
            location: data.location,
            briefDescription: data.briefDescription,
            description: data.description,
            category: `${slot} Sightseeing`,
            time: data.time,
            recommendedEat: slot === 'Morning' ? eat : undefined,
            lunchSpot: slot === 'Afternoon' ? eat : undefined,
            dinnerSpot: slot === 'Evening' ? eat : undefined,
          });
        }
      });
    });

    return spots;
  }, [currentItinerary]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refineText.trim() || isRefining) return;
    await onRefineWithAi(refineText);
    setRefineText('');
  };

  const displayedDays = selectedDay === 'all'
    ? currentItinerary.days
    : currentItinerary.days.filter(d => d.dayNumber === selectedDay);

  const baseCurrency = currentItinerary.budgetEstimate?.currency || 'USD';

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Top Navigation & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-stone-200/80">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-700 hover:text-black py-2 px-3 rounded-full hover:bg-stone-200/60 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>New Itinerary</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Multilingual Voice Tour Guide Button (Compact) */}
          <VoiceAssistantPlayer
            compact
            autoPlay={false}
            placeName={currentItinerary.destination}
            destination={currentItinerary.destination}
            defaultText={currentItinerary.destinationIntro || currentItinerary.summary}
            initialLanguage={currentItinerary.language || selectedLanguage}
          />

          <div className="flex items-center gap-2 rounded-full bg-white/80 border border-stone-300 px-2 py-1">
            <label className="sr-only">Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-transparent text-xs text-stone-800 font-semibold outline-none cursor-pointer"
              aria-label="Translate itinerary language"
            >
              {translationLanguages.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleTranslate()}
              disabled={isTranslating}
              className="inline-flex items-center gap-1 rounded-full bg-stone-900 text-white px-3 py-1.5 text-[11px] font-bold hover:bg-stone-700 disabled:opacity-60 cursor-pointer"
            >
              {isTranslating ? '...' : 'Translate'}
            </button>
          </div>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-stone-300 bg-white/80 hover:bg-white text-stone-800 text-xs font-medium tracking-wide transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Link Copied!' : 'Share'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-stone-300 bg-white/80 hover:bg-white text-stone-800 text-xs font-medium tracking-wide transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="px-3 py-1 rounded-full bg-amber-100/80 border border-amber-200 text-amber-900 text-xs font-semibold uppercase tracking-wider">
            {itinerary.duration}
          </span>
          <span className="px-3 py-1 rounded-full bg-stone-200/80 text-stone-800 text-xs font-medium">
            {currentItinerary.destination}
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-900 text-xs font-medium">
            {currentItinerary.seasonOrDates}
          </span>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-stone-900 tracking-tight leading-tight">
          {currentItinerary.title}
        </h1>

        <p className="mt-3 text-stone-600 text-base sm:text-lg leading-relaxed max-w-4xl">
          {currentItinerary.summary}
        </p>
      </div>

      {/* 2-3 Line Destination Introduction & Auto-Spoken Audio Guide Card */}
      <div className="mt-6">
        <VoiceAssistantPlayer
          autoPlay={true}
          placeName={currentItinerary.destination}
          destination={currentItinerary.destination}
          defaultText={currentItinerary.destinationIntro || currentItinerary.summary}
          initialLanguage={currentItinerary.language || selectedLanguage}
          showTextInline={true}
        />
      </div>

      {/* Crowd Avoidance Strategy Banner */}
      <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-amber-50/70 border border-amber-200/90 shadow-xs flex flex-col sm:flex-row items-start gap-4">
        <div className="p-2.5 rounded-xl bg-amber-200/70 text-amber-900 shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="w-full">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-950">
            Wandor Anti-Crowd Intelligence
          </h2>
          <p className="mt-1 text-sm text-stone-700 leading-relaxed">
            {currentItinerary.crowdStrategy}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-stone-600">
            <span><strong>Estimated Pace:</strong> {currentItinerary.vibe}</span>
            <span>•</span>
            <span className="flex flex-wrap items-center gap-1.5">
              <strong>Target Budget:</strong>{' '}
              <span className="font-bold text-stone-900">
                {currentItinerary.budgetEstimate
                  ? formatRange(currentItinerary.budgetEstimate.totalLow, currentItinerary.budgetEstimate.totalHigh, baseCurrency)
                  : 'N/A'}
              </span>
              {currentItinerary.budgetEstimate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900 font-medium text-[11px] border border-amber-200">
                  <Users className="w-3 h-3" />
                  <span>
                    {budgetTravelers} {budgetTravelers === 1 ? 'person' : 'people'} (approx. {formatRange(
                      currentItinerary.budgetEstimate.perPersonTotal?.low || Math.round(currentItinerary.budgetEstimate.totalLow / Math.max(budgetTravelers, 1)),
                      currentItinerary.budgetEstimate.perPersonTotal?.high || Math.round(currentItinerary.budgetEstimate.totalHigh / Math.max(budgetTravelers, 1)),
                      baseCurrency
                    )} / person)
                  </span>
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Destination Hero Panoramic Sightseeing Banner */}
      <div className="mt-6 relative w-full h-56 sm:h-72 rounded-3xl overflow-hidden shadow-md group">
        <LocationImage
          placeName={currentItinerary.destination}
          destination={currentItinerary.destination}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

        <div className="absolute top-3 right-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Wikipedia Sightseeing Photo
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-amber-300 text-xs font-bold uppercase tracking-widest block mb-1">
              Curated Destination
            </span>
            <h2 className="text-white font-heading text-2xl sm:text-4xl font-bold tracking-tight drop-shadow-sm">
              {currentItinerary.destination}
            </h2>
            <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-xl line-clamp-2">
              {currentItinerary.summary}
            </p>
          </div>

        </div>
      </div>

      {/* Authentic Wikipedia Sightseeing Showcase ("Side Seen") */}
      {sightseeingSpots.length > 0 && (
        <div className="mt-8 p-6 rounded-2xl bg-[#FAF6F0] border border-stone-200/90 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                </span>
                <h3 className="font-heading text-lg sm:text-xl font-bold text-stone-900">
                  Trip Sightseeing & Landmark Photos
                </h3>
              </div>
              <p className="text-xs text-stone-600 mt-1">
                Authentic sightseeing photographs fetched live from Wikipedia & Wikimedia Commons for your trip stops.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-stone-300 text-stone-700">
              {sightseeingSpots.length} Sightseeing Stops
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {sightseeingSpots.map(spot => (
              <div
                key={spot.id}
                onClick={() => setSelectedPlace({
                  title: spot.title,
                  placeName: spot.placeName,
                  location: spot.location,
                  destination: currentItinerary.destination,
                  category: spot.category,
                  briefDescription: spot.briefDescription,
                  description: spot.description,
                  time: spot.time,
                  recommendedEat: spot.recommendedEat,
                  lunchSpot: spot.lunchSpot,
                  dinnerSpot: spot.dinnerSpot
                })}
                className="group flex flex-col bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer"
                title="Click to view full photo, brief idea & map"
              >
                <div className="relative w-full h-28 bg-stone-100 overflow-hidden">
                  <LocationImage
                    placeName={spot.placeName}
                    location={spot.location}
                    destination={currentItinerary.destination}
                    className="w-full h-full"
                  />
                  <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Day {spot.dayNumber}
                  </div>
                  <div className="absolute top-1.5 right-1.5 bg-amber-500 text-stone-950 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                    Wikipedia
                  </div>
                </div>

                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-stone-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                      {spot.placeName}
                    </h5>
                    <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                      {spot.location || spot.title}
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10px] text-amber-800 font-medium">
                    <span>{spot.slot}</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">Brief idea →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main View Mode Tabs (Timeline vs Numbered Route Map vs Transit vs Hotels) */}
      <div className="mt-8 flex items-center justify-between flex-wrap gap-3 p-1.5 sm:p-2 bg-stone-100/90 rounded-2xl border border-stone-200/80">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('itinerary')}
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${activeTab === 'itinerary'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
          >
            <ListOrdered className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            <span>Daily Itinerary</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${activeTab === 'map'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
          >
            <MapIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            <span className="flex items-center gap-1.5">
              Trip Map
              <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-amber-100 text-amber-900 font-bold hidden xs:inline">
                Poster
              </span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('transit')}
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${activeTab === 'transit'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
          >
            <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            <span className="flex items-center gap-1.5">
              Flights &amp; Trains
              <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-emerald-100 text-emerald-900 font-bold hidden xs:inline">
                Live API
              </span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hotels')}
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${activeTab === 'hotels'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
          >
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            <span className="flex items-center gap-1.5">
              Hotels &amp; Stays
              <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-amber-100 text-amber-900 font-bold hidden xs:inline">
                Partner API
              </span>
            </span>
          </button>
        </div>

        <div className="text-xs text-stone-500 hidden md:block pr-2">
          {activeTab === 'map' ? '✦ Interactive map with download poster feature' : activeTab === 'transit' ? '✦ Live flight & train schedules via API' : activeTab === 'hotels' ? '✦ Handpicked hotels & live partner booking' : '✦ Anti-crowd day-by-day plan'}
        </div>
      </div>

      {/* Numbered Trip Map View */}
      {activeTab === 'map' && (
        <NumberedTripMap
          itinerary={currentItinerary}
          onSelectPlace={(p) => setSelectedPlace(p as any)}
        />
      )}

      {/* Transit Routes View (Flights & Train Timings) */}
      {activeTab === 'transit' && (
        <TransitRoutesSection
          transitRoutes={currentItinerary.transitRoutes}
          destination={currentItinerary.destination}
          origin={currentItinerary.origin}
        />
      )}

      {/* Hotels & Stays View */}
      {activeTab === 'hotels' && (
        <HotelSuggestionsSection
          hotels={currentItinerary.hotels}
          destination={currentItinerary.destination}
        />
      )}

      {/* Daily Itinerary View */}
      {activeTab === 'itinerary' && (
        <>
          {/* Day Selector Pills */}
          <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedDay('all')}
              className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${selectedDay === 'all'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white/80 hover:bg-white text-stone-700 border border-stone-200'
                }`}
            >
              All Days ({itinerary.days.length})
            </button>

            {itinerary.days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => setSelectedDay(day.dayNumber)}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${selectedDay === day.dayNumber
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-stone-700 border border-stone-200'
                  }`}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>

          {/* Day-by-Day Timeline */}
          <div className="mt-8 space-y-12">
            {displayedDays.map((day) => (
              <article
                key={day.dayNumber}
                className="rounded-[24px] bg-white/70 backdrop-blur-xs border border-stone-200/80 p-6 sm:p-8 shadow-xs"
              >
                {/* Day Header */}
                <div className="flex flex-wrap items-baseline justify-between gap-3 pb-5 border-b border-stone-200">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-stone-900 text-white text-sm font-bold flex items-center justify-center">
                      {day.dayNumber}
                    </span>
                    <div>
                      <h3 className="font-heading text-xl sm:text-2xl font-bold text-stone-900">
                        Day {day.dayNumber}: {day.title}
                      </h3>
                      <p className="text-xs text-amber-800 font-medium tracking-wide uppercase mt-0.5">
                        Theme: {day.theme}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Activities: Morning, Afternoon, Evening */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Morning */}
                  <div className="p-5 rounded-2xl bg-[#FAF6F0] border border-stone-200/90 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                          <Sunrise className="w-4 h-4 text-amber-700" />
                          Morning
                        </span>
                        <span className="text-[11px] font-mono text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded">
                          {day.morning.time}
                        </span>
                      </div>

                      <h4 className="font-heading text-base font-bold text-stone-900 leading-snug">
                        {day.morning.title}
                      </h4>

                      {/* Clickable Image Banner with Brief Idea Preview */}
                      <div
                        onClick={() => setSelectedPlace({
                          title: day.morning.title,
                          placeName: day.morning.placeName,
                          location: day.morning.location,
                          destination: currentItinerary.destination,
                          category: 'Morning Activity',
                          briefDescription: day.morning.briefDescription,
                          description: day.morning.description,
                          time: day.morning.time,
                          quietLevel: day.morning.quietLevel,
                          recommendedEat: day.morning.recommendedEat
                        })}
                        className="group relative w-full h-36 rounded-xl mb-3 mt-3 overflow-hidden shadow-sm cursor-pointer"
                        title="Click to view brief idea, real photo & map"
                      >
                        <LocationImage
                          placeName={day.morning.placeName}
                          location={day.morning.location}
                          destination={currentItinerary.destination}
                          className="w-full h-full"
                        />
                        <div className="absolute inset-0 bg-stone-950/20 group-hover:bg-stone-950/40 transition-colors flex items-end p-2.5">
                          <span className="text-[10px] font-medium text-white bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            Click for brief idea
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                        {day.morning.description}
                      </p>

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{day.morning.location}</span>
                      </div>

                      {/* Interactive Button to Learn Brief Idea */}
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPlace({
                            title: day.morning.title,
                            placeName: day.morning.placeName,
                            location: day.morning.location,
                            destination: currentItinerary.destination,
                            category: 'Morning Activity',
                            briefDescription: day.morning.briefDescription,
                            description: day.morning.description,
                            time: day.morning.time,
                            quietLevel: day.morning.quietLevel,
                            recommendedEat: day.morning.recommendedEat
                          })}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-950 bg-amber-100/90 hover:bg-amber-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                          <span>Learn about {day.morning.placeName || 'this place'}</span>
                        </button>
                      </div>
                    </div>

                    {day.morning.recommendedEat && (
                      <div className="mt-4 pt-3 border-t border-stone-200/70 text-xs text-amber-900 bg-amber-50/60 p-2.5 rounded-xl">
                        <span className="font-semibold block mb-0.5">☕ Recommended Stop:</span>
                        <span>{day.morning.recommendedEat}</span>
                      </div>
                    )}
                  </div>

                  {/* Afternoon */}
                  <div className="p-5 rounded-2xl bg-[#FAF6F0] border border-stone-200/90 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                          <Sun className="w-4 h-4 text-amber-600" />
                          Afternoon
                        </span>
                        <span className="text-[11px] font-mono text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded">
                          {day.afternoon.time}
                        </span>
                      </div>

                      <h4 className="font-heading text-base font-bold text-stone-900 leading-snug">
                        {day.afternoon.title}
                      </h4>

                      {/* Clickable Image Banner with Brief Idea Preview */}
                      <div
                        onClick={() => setSelectedPlace({
                          title: day.afternoon.title,
                          placeName: day.afternoon.placeName,
                          location: day.afternoon.location,
                          destination: currentItinerary.destination,
                          category: 'Afternoon Activity',
                          briefDescription: day.afternoon.briefDescription,
                          description: day.afternoon.description,
                          time: day.afternoon.time,
                          lunchSpot: day.afternoon.lunchSpot
                        })}
                        className="group relative w-full h-36 rounded-xl mb-3 mt-3 overflow-hidden shadow-sm cursor-pointer"
                        title="Click to view brief idea, real photo & map"
                      >
                        <LocationImage
                          placeName={day.afternoon.placeName}
                          location={day.afternoon.location}
                          destination={currentItinerary.destination}
                          className="w-full h-full"
                        />
                        <div className="absolute inset-0 bg-stone-950/20 group-hover:bg-stone-950/40 transition-colors flex items-end p-2.5">
                          <span className="text-[10px] font-medium text-white bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            Click for brief idea
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                        {day.afternoon.description}
                      </p>

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{day.afternoon.location}</span>
                      </div>

                      {/* Interactive Button to Learn Brief Idea */}
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPlace({
                            title: day.afternoon.title,
                            placeName: day.afternoon.placeName,
                            location: day.afternoon.location,
                            destination: currentItinerary.destination,
                            category: 'Afternoon Activity',
                            briefDescription: day.afternoon.briefDescription,
                            description: day.afternoon.description,
                            time: day.afternoon.time,
                            lunchSpot: day.afternoon.lunchSpot
                          })}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-950 bg-amber-100/90 hover:bg-amber-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                          <span>Learn about {day.afternoon.placeName || 'this place'}</span>
                        </button>
                      </div>
                    </div>

                    {day.afternoon.lunchSpot && (
                      <div className="mt-4 pt-3 border-t border-stone-200/70 text-xs text-stone-800 bg-stone-100/70 p-2.5 rounded-xl">
                        <span className="font-semibold block mb-0.5">🥢 Lunch Spot:</span>
                        <span>{day.afternoon.lunchSpot}</span>
                      </div>
                    )}
                  </div>

                  {/* Evening */}
                  <div className="p-5 rounded-2xl bg-[#FAF6F0] border border-stone-200/90 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-800">
                          <Sunset className="w-4 h-4 text-orange-600" />
                          Evening
                        </span>
                        <span className="text-[11px] font-mono text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded">
                          {day.evening.time}
                        </span>
                      </div>

                      <h4 className="font-heading text-base font-bold text-stone-900 leading-snug">
                        {day.evening.title}
                      </h4>

                      {/* Clickable Image Banner with Brief Idea Preview */}
                      <div
                        onClick={() => setSelectedPlace({
                          title: day.evening.title,
                          placeName: day.evening.placeName,
                          location: day.evening.location,
                          destination: currentItinerary.destination,
                          category: 'Evening Activity',
                          briefDescription: day.evening.briefDescription,
                          description: day.evening.description,
                          time: day.evening.time,
                          dinnerSpot: day.evening.dinnerSpot
                        })}
                        className="group relative w-full h-36 rounded-xl mb-3 mt-3 overflow-hidden shadow-sm cursor-pointer"
                        title="Click to view brief idea, real photo & map"
                      >
                        <LocationImage
                          placeName={day.evening.placeName}
                          location={day.evening.location}
                          destination={currentItinerary.destination}
                          className="w-full h-full"
                        />
                        <div className="absolute inset-0 bg-stone-950/20 group-hover:bg-stone-950/40 transition-colors flex items-end p-2.5">
                          <span className="text-[10px] font-medium text-white bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            Click for brief idea
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                        {day.evening.description}
                      </p>

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{day.evening.location}</span>
                      </div>

                      {/* Interactive Button to Learn Brief Idea */}
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPlace({
                            title: day.evening.title,
                            placeName: day.evening.placeName,
                            location: day.evening.location,
                            destination: currentItinerary.destination,
                            category: 'Evening Activity',
                            briefDescription: day.evening.briefDescription,
                            description: day.evening.description,
                            time: day.evening.time,
                            dinnerSpot: day.evening.dinnerSpot
                          })}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-950 bg-amber-100/90 hover:bg-amber-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                          <span>Learn about {day.evening.placeName || 'this place'}</span>
                        </button>
                      </div>
                    </div>

                    {day.evening.dinnerSpot && (
                      <div className="mt-4 pt-3 border-t border-stone-200/70 text-xs text-amber-950 bg-orange-50/60 p-2.5 rounded-xl">
                        <span className="font-semibold block mb-0.5">🏮 Evening Dinner:</span>
                        <span>{day.evening.dinnerSpot}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hidden Gem Callout */}
                {day.hiddenGem && (
                  <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-200/80 text-emerald-900 shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                            Secret Wandor Spot: {day.hiddenGem.name}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-full text-emerald-800">
                            {day.hiddenGem.tag}
                          </span>
                        </div>
                        <p className="text-xs text-stone-700 mt-1">
                          {day.hiddenGem.note}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedPlace({
                        title: day.hiddenGem.name,
                        placeName: day.hiddenGem.placeName || day.hiddenGem.name,
                        location: day.hiddenGem.name,
                        destination: currentItinerary.destination,
                        category: 'Secret Wandor Spot',
                        briefDescription: day.hiddenGem.briefDescription || day.hiddenGem.note,
                        description: day.hiddenGem.note,
                        hiddenGemNote: day.hiddenGem.note
                      })}
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-950 bg-white border border-emerald-300 hover:bg-emerald-100 px-3.5 py-1.5 rounded-full shadow-2xs transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Explore Secret Spot</span>
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>

          {/* Curated Cafés & Scenic Hikes Grid */}
          <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cafés */}
            <div className="rounded-[24px] bg-white/75 border border-stone-200 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-stone-200">
                <Coffee className="w-5 h-5 text-amber-800" />
                <h3 className="font-heading text-xl font-bold text-stone-900">
                  Curated Hidden Cafés & Kissaten
                </h3>
              </div>
              <div className="space-y-4">
                {(currentItinerary.curatedCafes || itinerary.curatedCafes).map((cafe, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#FAF6F0] border border-stone-200/80">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="font-bold text-stone-900 text-sm">{cafe.name}</h4>
                      <span className="text-[11px] font-medium text-stone-500">{cafe.neighborhood}</span>
                    </div>

                    {/* Individual Real Photo for Cafe */}
                    <div
                      onClick={() => setSelectedPlace({
                        title: cafe.name,
                        placeName: cafe.placeName || cafe.name,
                        location: `${cafe.name}, ${cafe.neighborhood}`,
                        destination: currentItinerary.destination,
                        category: 'Curated Cafe / Kissaten',
                        briefDescription: cafe.briefDescription || `${cafe.name} is an atmospheric cafe in ${cafe.neighborhood} known for ${cafe.specialty}. Atmosphere: ${cafe.vibe}`,
                        description: cafe.vibe,
                        recommendedEat: cafe.specialty
                      })}
                      className="w-full h-32 rounded-xl mb-3 mt-2.5 overflow-hidden shadow-2xs cursor-pointer group relative"
                      title="Click to view photo & brief idea"
                    >
                      <LocationImage
                        placeName={cafe.placeName || cafe.name}
                        location={`${cafe.name}, ${cafe.neighborhood}`}
                        destination={currentItinerary.destination}
                        className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-stone-950/20 group-hover:bg-stone-950/40 transition-colors flex items-end p-2">
                        <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          View photo & details
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-amber-900 font-medium mt-1">
                      Specialty: {cafe.specialty}
                    </p>
                    <p className="text-xs text-stone-600 mt-1">
                      Vibe: {cafe.vibe}
                    </p>
                    <p className="text-[11px] text-stone-500 italic mt-1.5 border-t border-stone-200/50 pt-1">
                      Tip: {cafe.tip}
                    </p>
                    <div className="mt-2 pt-2 border-t border-stone-200/40">
                      <button
                        type="button"
                        onClick={() => setSelectedPlace({
                          title: cafe.name,
                          placeName: cafe.placeName || cafe.name,
                          location: `${cafe.name}, ${cafe.neighborhood}`,
                          destination: currentItinerary.destination,
                          category: 'Curated Cafe',
                          briefDescription: cafe.briefDescription || `${cafe.name} is an atmospheric cafe in ${cafe.neighborhood} known for ${cafe.specialty}. Atmosphere: ${cafe.vibe}`,
                          description: cafe.vibe,
                          recommendedEat: cafe.specialty
                        })}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 hover:text-amber-950 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>View photo & brief idea</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scenic Hikes */}
            <div className="rounded-[24px] bg-white/75 border border-stone-200 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-stone-200">
                <Mountain className="w-5 h-5 text-emerald-800" />
                <h3 className="font-heading text-xl font-bold text-stone-900">
                  Scenic Hikes & Nature Trails
                </h3>
              </div>
              <div className="space-y-4">
                {(currentItinerary.scenicHikes || itinerary.scenicHikes).map((hike, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#FAF6F0] border border-stone-200/80">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="font-bold text-stone-900 text-sm">{hike.name}</h4>
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {hike.difficulty}
                      </span>
                    </div>

                    {/* Individual Real Photo for Scenic Hike */}
                    <div
                      onClick={() => setSelectedPlace({
                        title: hike.name,
                        placeName: hike.placeName || hike.name,
                        location: hike.name,
                        destination: currentItinerary.destination,
                        category: 'Scenic Nature Trail',
                        briefDescription: hike.briefDescription || `${hike.name} is a scenic trail (${hike.distance}) with ${hike.difficulty} difficulty. Highlight: ${hike.viewHighlight}`,
                        description: hike.viewHighlight
                      })}
                      className="w-full h-32 rounded-xl mb-3 mt-2.5 overflow-hidden shadow-2xs cursor-pointer group relative"
                      title="Click to view photo & trail overview"
                    >
                      <LocationImage
                        placeName={hike.placeName || hike.name}
                        location={hike.name}
                        destination={currentItinerary.destination}
                        className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-stone-950/20 group-hover:bg-stone-950/40 transition-colors flex items-end p-2">
                        <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-300" />
                          View trail photos & details
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 mt-1">
                      <strong>Distance:</strong> {hike.distance}
                    </p>
                    <p className="text-xs text-stone-700 mt-1">
                      <strong>View Highlight:</strong> {hike.viewHighlight}
                    </p>
                    <div className="mt-2 pt-2 border-t border-stone-200/40">
                      <button
                        type="button"
                        onClick={() => setSelectedPlace({
                          title: hike.name,
                          placeName: hike.placeName || hike.name,
                          location: hike.name,
                          destination: currentItinerary.destination,
                          category: 'Scenic Trail',
                          briefDescription: hike.briefDescription || `${hike.name} is a scenic trail (${hike.distance}) with ${hike.difficulty} difficulty. Highlight: ${hike.viewHighlight}`,
                          description: hike.viewHighlight
                        })}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-900 hover:text-emerald-950 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>View photo & trail overview</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Essential Local Advice */}
                <div className="mt-5 pt-4 border-t border-stone-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-2">
                    Essential Local Advice
                  </h4>
                  <ul className="space-y-1.5">
                    {(currentItinerary.insiderTips || itinerary.insiderTips).map((tip, idx) => (
                      <li key={idx} className="text-xs text-stone-600 flex items-start gap-2">
                        <span className="text-amber-800 font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Journey & Transit Routes Section (Flights & Train Timings) */}
                <TransitRoutesSection
                  transitRoutes={currentItinerary.transitRoutes}
                  destination={currentItinerary.destination}
                  origin={currentItinerary.origin}
                />

                {/* Recommended Hotels & Stays (Travel Partner API) */}
                <HotelSuggestionsSection
                  hotels={currentItinerary.hotels}
                  destination={currentItinerary.destination}
                />

                {/* Budget Breakdown with Currency Selector & Per-Person Cost Split */}
                {(currentItinerary.budgetEstimate || itinerary.budgetEstimate)?.breakdown && (() => {
                  const est = currentItinerary.budgetEstimate || itinerary.budgetEstimate;
                  const originalTravelers = est.travelersCount || 1;
                  const currentTravelers = Math.max(1, budgetTravelers);
                  // Scale factor if user adjusts traveler counter
                  const multiplier = currentTravelers / Math.max(1, originalTravelers);

                  const groupTotalLow = Math.round(est.totalLow * multiplier);
                  const groupTotalHigh = Math.round(est.totalHigh * multiplier);

                  const personTotalLow = est.perPersonTotal?.low 
                    ? Math.round(est.perPersonTotal.low * (multiplier / multiplier)) // keep base per-person
                    : Math.round(est.totalLow / Math.max(1, originalTravelers));
                  const personTotalHigh = est.perPersonTotal?.high 
                    ? Math.round(est.perPersonTotal.high)
                    : Math.round(est.totalHigh / Math.max(1, originalTravelers));

                  const dailyLow = est.perPersonPerDay?.low || Math.round(personTotalLow / Math.max(currentItinerary.days.length, 1));
                  const dailyHigh = est.perPersonPerDay?.high || Math.round(personTotalHigh / Math.max(currentItinerary.days.length, 1));

                  return (
                    <div className="p-5 sm:p-6 bg-[#FAF6F0] rounded-2xl border border-stone-200 shadow-2xs mt-6">
                      {/* Header with Currency Selector */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-200">
                        <div>
                          <h3 className="text-sm font-heading font-bold text-stone-900 flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-amber-700" />
                            <span>Budget &amp; Per-Person Cost Split</span>
                          </h3>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            AI-calculated pricing per traveler &amp; full group
                          </p>
                        </div>
                        <CurrencySelector />
                      </div>

                      {/* Interactive Travelers Stepper Section */}
                      <div className="mb-4 p-3 rounded-xl bg-white/80 border border-stone-200/70 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-amber-700" />
                          <div>
                            <div className="text-xs font-semibold text-stone-900">
                              Party Size: {currentTravelers} {currentTravelers === 1 ? 'Traveler' : 'Travelers'}
                            </div>
                            <div className="text-[10px] text-stone-500">
                              Adjust to recalculate budget split live
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setBudgetTravelers(prev => Math.max(1, prev - 1))}
                            disabled={budgetTravelers <= 1}
                            className="w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed text-stone-700 flex items-center justify-center border border-stone-200 shadow-2xs transition-colors cursor-pointer"
                            aria-label="Decrease traveler count"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="min-w-[42px] text-center font-bold text-xs text-stone-900 px-1 py-0.5 rounded bg-amber-50 border border-amber-200/60">
                            {currentTravelers}
                          </span>
                          <button
                            type="button"
                            onClick={() => setBudgetTravelers(prev => Math.min(20, prev + 1))}
                            disabled={budgetTravelers >= 20}
                            className="w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed text-stone-700 flex items-center justify-center border border-stone-200 shadow-2xs transition-colors cursor-pointer"
                            aria-label="Increase traveler count"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Dual Budget Metric Highlights: Group Total + Per-Person */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                        {/* Group Total Card */}
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-900">
                            Full Trip Budget ({currentTravelers} {currentTravelers === 1 ? 'Person' : 'People'})
                          </div>
                          <div className="text-base sm:text-lg font-extrabold text-stone-900 mt-1">
                            {formatRange(groupTotalLow, groupTotalHigh, baseCurrency)}
                          </div>
                          <div className="text-[10px] text-amber-800 mt-0.5">
                            Combined total for all {currentTravelers} travelers
                          </div>
                        </div>

                        {/* Per-Person Card */}
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-left">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-900">
                            Per-Person (Entire Trip)
                          </div>
                          <div className="text-base sm:text-lg font-extrabold text-emerald-950 mt-1">
                            {formatRange(personTotalLow, personTotalHigh, baseCurrency)}
                          </div>
                          <div className="text-[10px] text-emerald-800 mt-0.5">
                            ~{formatRange(dailyLow, dailyHigh, baseCurrency)} per day / person
                          </div>
                        </div>
                      </div>

                      {/* View Mode Switcher */}
                      <div className="flex items-center justify-end gap-1 mb-3">
                        <span className="text-[10px] text-stone-500 mr-1">Display:</span>
                        <button
                          type="button"
                          onClick={() => setBudgetViewMode('both')}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                            budgetViewMode === 'both' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          Combined
                        </button>
                        <button
                          type="button"
                          onClick={() => setBudgetViewMode('group')}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                            budgetViewMode === 'group' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          Total Group
                        </button>
                        <button
                          type="button"
                          onClick={() => setBudgetViewMode('perPerson')}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                            budgetViewMode === 'perPerson' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          Per Person
                        </button>
                      </div>

                      {/* Breakdown List */}
                      <div className="space-y-2.5 mb-4 text-xs">
                        {/* Flights */}
                        <div className="flex justify-between items-center py-1 border-b border-stone-200/50">
                          <span className="text-stone-700">Flights / Inbound Transit</span>
                          <span className="font-semibold text-stone-900 text-right">
                            {budgetViewMode === 'both' ? (
                              <span>
                                {formatRange(Math.round(est.breakdown.flights.low * multiplier), Math.round(est.breakdown.flights.high * multiplier), baseCurrency)}{' '}
                                <span className="text-[10px] text-stone-500 font-normal">
                                  ({formatRange(Math.round(est.breakdown.flights.low * multiplier / currentTravelers), Math.round(est.breakdown.flights.high * multiplier / currentTravelers), baseCurrency)}/p)
                                </span>
                              </span>
                            ) : budgetViewMode === 'group' ? (
                              formatRange(Math.round(est.breakdown.flights.low * multiplier), Math.round(est.breakdown.flights.high * multiplier), baseCurrency)
                            ) : (
                              formatRange(Math.round(est.breakdown.flights.low * multiplier / currentTravelers), Math.round(est.breakdown.flights.high * multiplier / currentTravelers), baseCurrency)
                            )}
                          </span>
                        </div>

                        {/* Accommodation */}
                        <div className="flex justify-between items-center py-1 border-b border-stone-200/50">
                          <span className="text-stone-700">Accommodation &amp; Stays</span>
                          <span className="font-semibold text-stone-900 text-right">
                            {budgetViewMode === 'both' ? (
                              <span>
                                {formatRange(Math.round(est.breakdown.accommodation.low * multiplier), Math.round(est.breakdown.accommodation.high * multiplier), baseCurrency)}{' '}
                                <span className="text-[10px] text-stone-500 font-normal">
                                  ({formatRange(Math.round(est.breakdown.accommodation.low * multiplier / currentTravelers), Math.round(est.breakdown.accommodation.high * multiplier / currentTravelers), baseCurrency)}/p)
                                </span>
                              </span>
                            ) : budgetViewMode === 'group' ? (
                              formatRange(Math.round(est.breakdown.accommodation.low * multiplier), Math.round(est.breakdown.accommodation.high * multiplier), baseCurrency)
                            ) : (
                              formatRange(Math.round(est.breakdown.accommodation.low * multiplier / currentTravelers), Math.round(est.breakdown.accommodation.high * multiplier / currentTravelers), baseCurrency)
                            )}
                          </span>
                        </div>

                        {/* Food */}
                        <div className="flex justify-between items-center py-1 border-b border-stone-200/50">
                          <span className="text-stone-700">Food, Cafes &amp; Dining</span>
                          <span className="font-semibold text-stone-900 text-right">
                            {budgetViewMode === 'both' ? (
                              <span>
                                {formatRange(Math.round(est.breakdown.food.low * multiplier), Math.round(est.breakdown.food.high * multiplier), baseCurrency)}{' '}
                                <span className="text-[10px] text-stone-500 font-normal">
                                  ({formatRange(Math.round(est.breakdown.food.low * multiplier / currentTravelers), Math.round(est.breakdown.food.high * multiplier / currentTravelers), baseCurrency)}/p)
                                </span>
                              </span>
                            ) : budgetViewMode === 'group' ? (
                              formatRange(Math.round(est.breakdown.food.low * multiplier), Math.round(est.breakdown.food.high * multiplier), baseCurrency)
                            ) : (
                              formatRange(Math.round(est.breakdown.food.low * multiplier / currentTravelers), Math.round(est.breakdown.food.high * multiplier / currentTravelers), baseCurrency)
                            )}
                          </span>
                        </div>

                        {/* Activities */}
                        <div className="flex justify-between items-center py-1 border-b border-stone-200/50">
                          <span className="text-stone-700">Activities, Entry &amp; Sightseeing</span>
                          <span className="font-semibold text-stone-900 text-right">
                            {budgetViewMode === 'both' ? (
                              <span>
                                {formatRange(Math.round(est.breakdown.activities.low * multiplier), Math.round(est.breakdown.activities.high * multiplier), baseCurrency)}{' '}
                                <span className="text-[10px] text-stone-500 font-normal">
                                  ({formatRange(Math.round(est.breakdown.activities.low * multiplier / currentTravelers), Math.round(est.breakdown.activities.high * multiplier / currentTravelers), baseCurrency)}/p)
                                </span>
                              </span>
                            ) : budgetViewMode === 'group' ? (
                              formatRange(Math.round(est.breakdown.activities.low * multiplier), Math.round(est.breakdown.activities.high * multiplier), baseCurrency)
                            ) : (
                              formatRange(Math.round(est.breakdown.activities.low * multiplier / currentTravelers), Math.round(est.breakdown.activities.high * multiplier / currentTravelers), baseCurrency)
                            )}
                          </span>
                        </div>

                        {/* Local Transport */}
                        <div className="flex justify-between items-center py-1 border-b border-stone-200/50">
                          <span className="text-stone-700">Local Transport &amp; Cabs</span>
                          <span className="font-semibold text-stone-900 text-right">
                            {budgetViewMode === 'both' ? (
                              <span>
                                {formatRange(Math.round(est.breakdown.localTransport.low * multiplier), Math.round(est.breakdown.localTransport.high * multiplier), baseCurrency)}{' '}
                                <span className="text-[10px] text-stone-500 font-normal">
                                  ({formatRange(Math.round(est.breakdown.localTransport.low * multiplier / currentTravelers), Math.round(est.breakdown.localTransport.high * multiplier / currentTravelers), baseCurrency)}/p)
                                </span>
                              </span>
                            ) : budgetViewMode === 'group' ? (
                              formatRange(Math.round(est.breakdown.localTransport.low * multiplier), Math.round(est.breakdown.localTransport.high * multiplier), baseCurrency)
                            ) : (
                              formatRange(Math.round(est.breakdown.localTransport.low * multiplier / currentTravelers), Math.round(est.breakdown.localTransport.high * multiplier / currentTravelers), baseCurrency)
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Final Total Summary */}
                      <div className="pt-3 border-t border-stone-300 flex justify-between items-center text-sm sm:text-base font-bold text-stone-900">
                        <div>
                          <span>Total Estimated Trip Cost</span>
                          <div className="text-[11px] font-normal text-stone-500">
                            for {currentTravelers} {currentTravelers === 1 ? 'traveler' : 'travelers'} ({formatRange(personTotalLow, personTotalHigh, baseCurrency)} / person)
                          </div>
                        </div>
                        <span className="text-amber-900 font-extrabold text-base sm:text-lg">
                          {formatRange(groupTotalLow, groupTotalHigh, baseCurrency)}
                        </span>
                      </div>

                      {est.notes && (
                        <p className="mt-3 text-[10px] text-stone-500 italic leading-snug">
                          * {est.notes}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* AI Customization / Refinement Bar at bottom */}
      <div className="mt-12 p-6 rounded-[24px] bg-[#18181B] text-[#FAF6F0] shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-200">
            Fine-Tune this Itinerary with AI
          </h3>
        </div>
        <p className="text-xs text-stone-400 mb-4">
          Want to change the pace, swap an activity, or add a specific dinner request? Tell Wandor and we will adapt your plan.
        </p>

        <form onSubmit={handleRefineSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={refineText}
            onChange={(e) => setRefineText(e.target.value)}
            placeholder="e.g. Add a quiet pottery class on Day 4, or swap Day 2 for rainy weather..."
            className="flex-1 text-xs sm:text-sm px-4 py-3 rounded-full bg-stone-900 border border-stone-700 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={isRefining || !refineText.trim()}
            className="px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isRefining ? (
              <span className="w-4 h-4 border-2 border-stone-900/40 border-t-stone-900 rounded-full animate-spin" />
            ) : (
              <>
                <span>Update Plan</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Place Detail Modal for Brief Idea on Click */}
      <PlaceDetailModal
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
      />
    </div>
  );
};

export const ItineraryView: React.FC<ItineraryViewProps> = (props) => {
  return (
    <CurrencyProvider defaultCurrency={props.itinerary.budgetEstimate?.currency || 'USD'}>
      <ItineraryContent {...props} />
    </CurrencyProvider>
  );
};
