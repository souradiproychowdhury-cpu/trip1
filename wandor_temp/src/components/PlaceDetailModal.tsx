import React, { useEffect, useState } from 'react';
import { X, MapPin, Compass, ExternalLink, Sparkles, Clock, Coffee, ShieldCheck, BookOpen } from 'lucide-react';
import { LocationImage } from './LocationImage';
import { VoiceAssistantPlayer } from './VoiceAssistantPlayer';

export interface PlaceDetailData {
  title: string;
  placeName?: string;
  location: string;
  destination: string;
  category?: string;
  briefDescription?: string;
  description?: string;
  time?: string;
  quietLevel?: string;
  recommendedEat?: string;
  lunchSpot?: string;
  dinnerSpot?: string;
  hiddenGemNote?: string;
}

interface PlaceDetailModalProps {
  place: PlaceDetailData | null;
  onClose: () => void;
}

interface WikiPlaceInfo {
  title: string;
  description?: string;
  extract?: string;
  imageUrl?: string | null;
  wikipediaUrl?: string;
  googleMapsUrl?: string;
}

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({ place, onClose }) => {
  const [wikiInfo, setWikiInfo] = useState<WikiPlaceInfo | null>(null);
  const [isLoadingWiki, setIsLoadingWiki] = useState(false);

  useEffect(() => {
    if (!place) {
      setWikiInfo(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    // Fetch Wikipedia background / brief idea
    const query = place.placeName || place.location || place.title;
    setIsLoadingWiki(true);

    const params = new URLSearchParams({
      place: query,
      destination: place.destination || ''
    });

    fetch(`/api/place-info?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.place) {
          setWikiInfo(data.place);
        }
      })
      .catch(err => console.warn('Could not load extra place info:', err))
      .finally(() => setIsLoadingWiki(false));

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [place, onClose]);

  if (!place) return null;

  const displayName = place.placeName || place.title;
  const mapsUrl = wikiInfo?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayName + ' ' + (place.destination || ''))}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#FAF6F0] rounded-3xl shadow-2xl border border-stone-300 flex flex-col scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Photo with Real Location Matching */}
        <div className="relative w-full h-64 sm:h-72 shrink-0 overflow-hidden rounded-t-3xl bg-stone-300">
          <LocationImage
            placeName={place.placeName}
            location={place.location}
            destination={place.destination}
            className="w-full h-full"
            alt={displayName}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />

          {/* Badges on Hero */}
          <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              {place.category && (
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/90 text-stone-950 text-[11px] font-bold uppercase tracking-wider mb-1.5 shadow-sm">
                  {place.category}
                </span>
              )}
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white leading-tight drop-shadow-md">
                {displayName}
              </h2>
            </div>
            {place.time && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-stone-100 text-xs font-mono">
                <Clock className="w-3.5 h-3.5" />
                {place.time}
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Location details & navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200">
            <div className="flex items-center gap-2 text-stone-600 text-xs sm:text-sm">
              <MapPin className="w-4 h-4 text-amber-800 shrink-0" />
              <span>{place.location}</span>
              {place.destination && (
                <span className="text-stone-400">• {place.destination}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-stone-300 text-stone-800 hover:text-black hover:border-stone-400 text-xs font-semibold shadow-2xs transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-amber-700" />
                <span>Open in Maps</span>
                <ExternalLink className="w-3 h-3 text-stone-400" />
              </a>

              {wikiInfo?.wikipediaUrl && (
                <a
                  href={wikiInfo.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-stone-300 text-stone-800 hover:text-black hover:border-stone-400 text-xs font-semibold shadow-2xs transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-stone-600" />
                  <span>Wikipedia</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
              )}
            </div>
          </div>

          {/* Multilingual AI Voice Tour Guide */}
          <VoiceAssistantPlayer
            placeName={displayName}
            destination={place.destination}
            defaultText={place.briefDescription || place.description}
          />

          {/* Primary Brief Idea & Cultural Essence */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Brief Idea & Place Overview</span>
            </div>

            {/* AI Curated Brief Description */}
            {place.briefDescription ? (
              <p className="text-stone-800 text-sm sm:text-base leading-relaxed bg-white/70 p-4 rounded-2xl border border-stone-200/90 shadow-2xs">
                {place.briefDescription}
              </p>
            ) : (
              <p className="text-stone-800 text-sm sm:text-base leading-relaxed bg-white/70 p-4 rounded-2xl border border-stone-200/90 shadow-2xs">
                {place.description}
              </p>
            )}

            {/* In-depth Historical Extract from Wikipedia if available */}
            {wikiInfo?.extract && wikiInfo.extract !== place.briefDescription && (
              <div className="mt-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block mb-1">
                  Historical & Geographic Background
                </span>
                <p className="text-stone-700 text-xs sm:text-sm leading-relaxed">
                  {wikiInfo.extract}
                </p>
              </div>
            )}

            {isLoadingWiki && !wikiInfo && (
              <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
                <div className="w-3.5 h-3.5 border-2 border-stone-400 border-t-stone-700 rounded-full animate-spin" />
                <span>Checking local historical records...</span>
              </div>
            )}
          </div>

          {/* Practical Highlights / Wandor Advice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {place.quietLevel && (
              <div className="p-3.5 rounded-xl bg-white/80 border border-stone-200 text-xs">
                <span className="font-semibold text-stone-900 block mb-0.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Crowd & Atmosphere
                </span>
                <span className="text-stone-600">{place.quietLevel}</span>
              </div>
            )}

            {(place.recommendedEat || place.lunchSpot || place.dinnerSpot) && (
              <div className="p-3.5 rounded-xl bg-white/80 border border-stone-200 text-xs">
                <span className="font-semibold text-stone-900 block mb-0.5 flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-amber-700" />
                  Food Recommendation
                </span>
                <span className="text-stone-600">
                  {place.recommendedEat || place.lunchSpot || place.dinnerSpot}
                </span>
              </div>
            )}
          </div>

          {/* Hidden Gem Callout if applicable */}
          {place.hiddenGemNote && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
              <span className="font-bold uppercase tracking-wider block mb-1">
                Insider Secret
              </span>
              <p className="leading-relaxed text-stone-700">{place.hiddenGemNote}</p>
            </div>
          )}

          {/* Close Action */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Back to Itinerary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
