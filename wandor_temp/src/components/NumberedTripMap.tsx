import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Download,
  Printer,
  Sparkles,
  Compass,
  Navigation,
  Clock,
  Coffee,
  CheckCircle,
  ExternalLink,
  Layers,
  ChevronRight,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { TripItinerary } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface NumberedStop {
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
  transitToNext?: string;
}

interface MapData {
  destination: string;
  title: string;
  duration: string;
  totalStops: number;
  stops: NumberedStop[];
  routeSummary?: string;
  routeTips?: string[];
  generatedAt?: string;
}

interface NumberedTripMapProps {
  itinerary: TripItinerary;
  onSelectPlace?: (place: { title: string; location: string; description: string; imageUrl?: string }) => void;
}

// Day color themes for numbered pins
const DAY_COLORS: Record<number, { bg: string; border: string; text: string; ring: string }> = {
  1: { bg: '#d97706', border: '#b45309', text: '#ffffff', ring: 'ring-amber-500/30' },
  2: { bg: '#059669', border: '#047857', text: '#ffffff', ring: 'ring-emerald-500/30' },
  3: { bg: '#0284c7', border: '#0369a1', text: '#ffffff', ring: 'ring-sky-500/30' },
  4: { bg: '#7c3aed', border: '#6d28d9', text: '#ffffff', ring: 'ring-purple-500/30' },
  5: { bg: '#e11d48', border: '#be123c', text: '#ffffff', ring: 'ring-rose-500/30' },
  6: { bg: '#ea580c', border: '#c2410c', text: '#ffffff', ring: 'ring-orange-500/30' },
  7: { bg: '#0891b2', border: '#0e7490', text: '#ffffff', ring: 'ring-cyan-500/30' },
};

const KNOWN_DESTINATIONS: Record<string, [number, number]> = {
  tokyo: [35.6762, 139.6503],
  kyoto: [35.0116, 135.7681],
  osaka: [34.6937, 135.5023],
  paris: [48.8566, 2.3522],
  london: [51.5074, -0.1278],
  goa: [15.2993, 74.1240],
  kolkata: [22.5726, 88.3639],
  delhi: [28.6139, 77.2090],
  mumbai: [19.0760, 72.8777],
  rome: [41.9028, 12.4964],
  bali: [-8.4095, 115.1889],
  bangkok: [13.7563, 100.5018],
  barcelona: [41.3879, 2.1699],
  amsterdam: [52.3676, 4.9041],
  'new york': [40.7128, -74.0060],
  dubai: [25.2048, 55.2708],
  singapore: [1.3521, 103.8198],
  srinagar: [34.0837, 74.7973],
  jaipur: [26.9124, 75.7873],
  manali: [32.2432, 77.1892]
};

function getDestinationCenter(destName: string): [number, number] {
  const clean = destName.toLowerCase();
  for (const [city, coords] of Object.entries(KNOWN_DESTINATIONS)) {
    if (clean.includes(city)) return coords;
  }
  return [35.6762, 139.6503]; // Default fallback
}

export const NumberedTripMap: React.FC<NumberedTripMapProps> = ({ itinerary, onSelectPlace }) => {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeStop, setActiveStop] = useState<NumberedStop | null>(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>('all');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Fetch or generate the full numbered map data
  useEffect(() => {
    let isMounted = true;
    const loadMapData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/generate-trip-map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itinerary })
        });
        const data = await res.json();
        if (data.success && isMounted) {
          // Ensure every stop has coordinates
          const destCenter = getDestinationCenter(itinerary.destination);
          const stopsWithCoords = data.mapData.stops.map((s: NumberedStop, idx: number) => {
            if (typeof s.lat === 'number' && typeof s.lng === 'number') return s;
            // Generate distinct subtle grid offset around city center
            const angle = (idx / Math.max(1, data.mapData.stops.length)) * Math.PI * 2;
            const radius = 0.02 + (idx % 3) * 0.012;
            return {
              ...s,
              lat: destCenter[0] + Math.sin(angle) * radius,
              lng: destCenter[1] + Math.cos(angle) * radius,
            };
          });

          const normalizedMapData = {
            ...data.mapData,
            stops: stopsWithCoords
          };

          setMapData(normalizedMapData);
          if (stopsWithCoords.length > 0) {
            setActiveStop(stopsWithCoords[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load trip map data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadMapData();
    return () => {
      isMounted = false;
    };
  }, [itinerary]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || !mapData || mapData.stops.length === 0) return;

    // Filter stops based on selected day
    const stopsToRender = selectedDayFilter === 'all'
      ? mapData.stops
      : mapData.stops.filter(s => s.dayNumber === selectedDayFilter);

    const validStops = stopsToRender.filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');

    // Default center if no coordinates (approximate fallback)
    const centerLat = validStops[0]?.lat || 35.6762;
    const centerLng = validStops[0]?.lng || 139.6503;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([centerLat, centerLng], 12);

      // Add clean, aesthetic tile layer (Voyager / OpenStreetMap)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> | &copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Clear previous markers & polylines
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (validStops.length === 0) return;

    const latLngs: L.LatLngExpression[] = [];

    // Create custom numbered pin icons
    validStops.forEach((stop) => {
      const dayColor = DAY_COLORS[stop.dayNumber] || DAY_COLORS[1];
      const isSelected = activeStop?.number === stop.number;

      const customIcon = L.divIcon({
        className: 'custom-numbered-pin',
        html: `
          <div style="
            background-color: ${dayColor.bg};
            color: ${dayColor.text};
            border: 2px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            width: ${isSelected ? '36px' : '30px'};
            height: ${isSelected ? '36px' : '30px'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: ${isSelected ? '14px' : '12px'};
            transition: all 0.2s ease;
            transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
            cursor: pointer;
          ">
            ${stop.number}
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([stop.lat!, stop.lng!], { icon: customIcon })
        .addTo(map)
        .on('click', () => {
          setActiveStop(stop);
        });

      // Popup with place info
      marker.bindPopup(`
        <div style="font-family: inherit; padding: 4px;">
          <div style="font-size: 11px; font-weight: 700; color: ${dayColor.bg}; text-transform: uppercase;">
            Stop #${stop.number} &bull; Day ${stop.dayNumber} ${stop.timeSlot}
          </div>
          <div style="font-size: 14px; font-weight: 700; margin-top: 2px; color: #1c1917;">
            ${stop.placeName || stop.title}
          </div>
          <div style="font-size: 12px; color: #78716c; margin-top: 2px;">
            ${stop.location}
          </div>
        </div>
      `);

      markersRef.current.push(marker);
      latLngs.push([stop.lat!, stop.lng!]);
    });

    // Draw route connecting numbered stops
    if (latLngs.length > 1) {
      const polyline = L.polyline(latLngs, {
        color: '#d97706',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round',
      }).addTo(map);
      polylineRef.current = polyline;
    }

    // Fit map bounds to show all markers
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [mapData, selectedDayFilter, activeStop]);

  // Pan to active stop when selected
  const handleSelectStop = (stop: NumberedStop) => {
    setActiveStop(stop);
    if (leafletMapRef.current && typeof stop.lat === 'number' && typeof stop.lng === 'number') {
      leafletMapRef.current.setView([stop.lat, stop.lng], 14, { animate: true });
    }
  };

  // Generate downloadable High-Res Route Poster Map Image (Canvas PNG)
  const handleDownloadMapImage = () => {
    if (!mapData || mapData.stops.length === 0) return;
    setIsDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const width = 1200;
      const height = Math.max(900, 300 + mapData.stops.length * 90);
      canvas.width = width;
      canvas.height = height;

      // Background Gradient (Warm Paper Style)
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#fefbf6');
      grad.addColorStop(1, '#f7f2ea');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Decorative Border
      ctx.strokeStyle = '#d6cbba';
      ctx.lineWidth = 3;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      // Header Banner
      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 32px serif';
      ctx.fillText(mapData.destination.toUpperCase(), 60, 90);

      ctx.fillStyle = '#78716c';
      ctx.font = '16px sans-serif';
      ctx.fillText(`NUMBERED ROUTE MAP & TRAVEL ITINERARY • ${mapData.duration || 'WANDOR'}`, 60, 120);

      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`✦ ${mapData.totalStops} CURATED STOPS IN OPTIMIZED ORDER`, 60, 150);

      // Divider
      ctx.strokeStyle = '#e7e0d3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, 175);
      ctx.lineTo(width - 60, 175);
      ctx.stroke();

      // Render Numbered Checkpoint Cards
      let y = 220;
      mapData.stops.forEach((stop) => {
        const dayColor = DAY_COLORS[stop.dayNumber] || DAY_COLORS[1];

        // Stop Card Box
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e7e5e4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(60, y - 30, width - 120, 75, 10);
        ctx.fill();
        ctx.stroke();

        // Number Badge
        ctx.fillStyle = dayColor.bg;
        ctx.beginPath();
        ctx.arc(100, y + 8, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${stop.number}`, 100, y + 14);

        // Reset Text Align
        ctx.textAlign = 'left';

        // Day & Time Tag
        ctx.fillStyle = dayColor.bg;
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`DAY ${stop.dayNumber} • ${stop.timeSlot.toUpperCase()}`, 140, y - 5);

        // Place Title
        ctx.fillStyle = '#1c1917';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(stop.placeName || stop.title, 140, y + 18);

        // Location & Notes
        ctx.fillStyle = '#78716c';
        ctx.font = '13px sans-serif';
        const locNote = stop.transitToNext ? `📍 ${stop.location}  |  🚶 Next: ${stop.transitToNext}` : `📍 ${stop.location}`;
        ctx.fillText(locNote.slice(0, 85), 140, y + 36);

        y += 90;
      });

      // Footer
      ctx.fillStyle = '#a8a29e';
      ctx.font = '13px sans-serif';
      ctx.fillText(`Generated with Wandor Anti-Crowd Travel Engine • wandor.travel`, 60, height - 50);

      // Download Trigger
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${mapData.destination.replace(/[^a-zA-Z0-9]/g, '_')}_Numbered_Route_Map.png`;
      link.href = dataUrl;
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export map poster:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-stone-50/80 rounded-3xl border border-stone-200/80 p-12 text-center my-8 shadow-sm">
        <div className="inline-flex items-center justify-center p-4 bg-amber-100/70 text-amber-800 rounded-2xl mb-4 animate-bounce">
          <Compass className="w-8 h-8 animate-spin" style={{ animationDuration: '4s' }} />
        </div>
        <h3 className="text-lg font-bold text-stone-900 mb-1">Generating Numbered Route Map with Gemini...</h3>
        <p className="text-sm text-stone-500 max-w-md mx-auto">
          Sequencing all daily stops into an anti-crowd visual route with accurate coordinates and transit paths.
        </p>
      </div>
    );
  }

  if (!mapData || mapData.stops.length === 0) {
    return null;
  }

  const daysList: number[] = Array.from(new Set<number>(mapData.stops.map(s => s.dayNumber))).sort((a: number, b: number) => a - b);
  const displayedStops = selectedDayFilter === 'all'
    ? mapData.stops
    : mapData.stops.filter(s => s.dayNumber === selectedDayFilter);

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden my-8 animate-in fade-in duration-300">
      {/* Map Header & Controls */}
      <div className="p-6 md:p-8 bg-stone-900 text-stone-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Gemini Numbered Route Map
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            {mapData.destination} Complete Journey Map
          </h2>
          <p className="text-sm text-stone-400 mt-1 max-w-xl">
            {mapData.routeSummary || `Follow the numbers #1 to #${mapData.totalStops} for an optimized, peaceful route avoiding peak crowd hours.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadMapImage}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Generating Poster...' : downloadSuccess ? '✓ Map Downloaded!' : 'Download Route Map (PNG)'}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold uppercase tracking-wider transition-all border border-stone-700 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Map
          </button>
        </div>
      </div>

      {/* Day Filter Pills */}
      <div className="px-6 py-4 bg-stone-50 border-b border-stone-200/80 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider mr-2">
          Filter Route:
        </span>
        <button
          onClick={() => setSelectedDayFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            selectedDayFilter === 'all'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-200/70 border border-stone-200'
          }`}
        >
          Full Route (Stops #1–#{mapData.totalStops})
        </button>
        {daysList.map((dayNum) => {
          const color = DAY_COLORS[dayNum] || DAY_COLORS[1];
          const isSelected = selectedDayFilter === dayNum;
          return (
            <button
              key={dayNum}
              onClick={() => setSelectedDayFilter(dayNum)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'text-white shadow-sm'
                  : 'bg-white text-stone-700 hover:bg-stone-200/70 border border-stone-200'
              }`}
              style={{ backgroundColor: isSelected ? color.bg : undefined }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isSelected ? '#ffffff' : color.bg }}
              />
              Day {dayNum}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Interactive Map + Numbered Stop List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[550px]">
        {/* Left: Interactive Leaflet Map Container */}
        <div className="lg:col-span-7 relative bg-stone-100 min-h-[420px] lg:min-h-[550px]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[420px] lg:min-h-[550px] z-10" />

          {/* Map Overlay Badge */}
          <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-stone-200/80 shadow-md flex items-center gap-2 text-xs font-medium text-stone-700">
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Interactive Numbered Pins &bull; Click any pin to inspect</span>
          </div>
        </div>

        {/* Right: Stop-by-Stop Numbered Timeline */}
        <div className="lg:col-span-5 p-6 bg-stone-50/50 overflow-y-auto max-h-[550px] divide-y divide-stone-200/60">
          <div className="pb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-1">
              Numbered Itinerary Stops
            </h3>
            <p className="text-xs text-stone-500">
              Showing {displayedStops.length} stops for {selectedDayFilter === 'all' ? 'entire journey' : `Day ${selectedDayFilter}`}
            </p>
          </div>

          <div className="space-y-3 pt-4">
            {displayedStops.map((stop) => {
              const isSelected = activeStop?.number === stop.number;
              const dayColor = DAY_COLORS[stop.dayNumber] || DAY_COLORS[1];

              return (
                <div
                  key={stop.number}
                  onClick={() => handleSelectStop(stop)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-amber-400 shadow-md ring-2 ring-amber-400/20'
                      : 'bg-white hover:bg-stone-100/80 border-stone-200/70 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Number Badge */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 text-white shadow-xs"
                      style={{ backgroundColor: dayColor.bg }}
                    >
                      {stop.number}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-[11px] font-bold uppercase tracking-wider"
                          style={{ color: dayColor.bg }}
                        >
                          Day {stop.dayNumber} &bull; {stop.timeSlot}
                        </span>
                        {stop.quietLevel && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            {stop.quietLevel}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-stone-900 truncate mt-0.5">
                        {stop.placeName || stop.title}
                      </h4>

                      <p className="text-xs text-stone-500 truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                        {stop.location}
                      </p>

                      {stop.transitToNext && (
                        <div className="mt-2 text-[11px] text-amber-800 bg-amber-50/80 rounded-lg p-1.5 border border-amber-200/60 flex items-center gap-1.5">
                          <Navigation className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Next stop: {stop.transitToNext}</span>
                        </div>
                      )}

                      {/* Google Maps Directions Link */}
                      <div className="mt-2 flex items-center gap-3">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            (stop.placeName || stop.title) + ' ' + (stop.location || itinerary.destination)
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-950 underline underline-offset-2"
                        >
                          Open in Google Maps
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Route Tips */}
      {mapData.routeTips && mapData.routeTips.length > 0 && (
        <div className="p-6 bg-stone-50 border-t border-stone-200/80">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Gemini Numbered Transit & Timing Advice
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mapData.routeTips.map((tip, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-stone-200 text-xs text-stone-700 flex items-start gap-2">
                <span className="font-bold text-amber-600">✦</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
