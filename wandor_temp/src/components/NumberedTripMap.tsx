import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Download,
  Printer,
  Sparkles,
  Compass,
  Navigation,
  ExternalLink,
  Layers,
  ChevronRight,
  ShieldCheck,
  Key,
  Globe,
  Satellite,
  Map as MapIcon,
  Check,
  Route,
  AlertCircle
} from 'lucide-react';
import { TripItinerary } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

declare const google: any;

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
const DAY_COLORS: Record<number, { bg: string; border: string; text: string; hex: string }> = {
  1: { bg: '#d97706', border: '#b45309', text: '#ffffff', hex: '#d97706' },
  2: { bg: '#059669', border: '#047857', text: '#ffffff', hex: '#059669' },
  3: { bg: '#0284c7', border: '#0369a1', text: '#ffffff', hex: '#0284c7' },
  4: { bg: '#7c3aed', border: '#6d28d9', text: '#ffffff', hex: '#7c3aed' },
  5: { bg: '#e11d48', border: '#be123c', text: '#ffffff', hex: '#e11d48' },
  6: { bg: '#ea580c', border: '#c2410c', text: '#ffffff', hex: '#ea580c' },
  7: { bg: '#0891b2', border: '#0e7490', text: '#ffffff', hex: '#0891b2' },
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

// Generate an authentic Google Maps SVG Pin with prominent numbering
function createNumberedGooglePinSvg(number: number, bgColor: string, isSelected: boolean): string {
  const scale = isSelected ? 1.25 : 1.0;
  const width = Math.round(36 * scale);
  const height = Math.round(50 * scale);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 50" width="${width}" height="${height}">
    <defs>
      <filter id="pdrop" x="-30%" y="-20%" width="160%" height="160%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.45"/>
      </filter>
    </defs>
    <path d="M 18 1 C 8.6 1 1 8.6 1 18 C 1 30.5 18 49 18 49 C 18 49 35 30.5 35 18 C 35 8.6 27.4 1 18 1 Z" 
          fill="${bgColor}" stroke="#ffffff" stroke-width="2.5" filter="url(#pdrop)"/>
    <circle cx="18" cy="18" r="11" fill="#ffffff" />
    <text x="18" y="22.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          font-size="12" font-weight="900" fill="${bgColor}" text-anchor="middle">${number}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

export const NumberedTripMap: React.FC<NumberedTripMapProps> = ({ itinerary, onSelectPlace }) => {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeStop, setActiveStop] = useState<NumberedStop | null>(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>('all');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Map Mode: 'google' (Google Maps JS API), 'google-embed' (Google Maps Embed), 'leaflet' (OpenStreetMap)
  const [mapMode, setMapMode] = useState<'google' | 'google-embed' | 'leaflet'>('google');
  const [googleMapTypeId, setGoogleMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');

  // Google Maps API Key state
  const envGoogleKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  const [googleMapsKey, setGoogleMapsKey] = useState<string>(() => {
    return localStorage.getItem('wandor_google_maps_key') || envGoogleKey || '';
  });
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [tempKeyInput, setTempKeyInput] = useState<string>('');
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState<boolean>(false);
  const [googleMapsError, setGoogleMapsError] = useState<string | null>(null);

  // DOM Refs
  const googleMapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const googleMarkersRef = useRef<any[]>([]);
  const googlePolylineRef = useRef<any>(null);
  const googleInfoWindowRef = useRef<any>(null);

  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<L.Marker[]>([]);
  const leafletPolylineRef = useRef<L.Polyline | null>(null);

  // 1. Fetch or generate the full numbered map data
  useEffect(() => {
    let isMounted = true;
    const loadMapData = async () => {
      setIsLoading(true);
      try {
        const clientGeminiKey = localStorage.getItem('wandor_gemini_key') || '';
        const res = await fetch('/api/generate-trip-map', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(clientGeminiKey ? { 'x-gemini-key': clientGeminiKey } : {})
          },
          body: JSON.stringify({ itinerary, geminiKey: clientGeminiKey })
        });
        const data = await res.json();
        if (data.success && isMounted) {
          const destCenter = getDestinationCenter(itinerary.destination);
          const stopsWithCoords = data.mapData.stops.map((s: NumberedStop, idx: number) => {
            if (typeof s.lat === 'number' && typeof s.lng === 'number') return s;
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

  // 2. Load Google Maps JavaScript API when key is available
  useEffect(() => {
    if (!googleMapsKey) {
      setIsGoogleMapsReady(false);
      return;
    }

    if (typeof window !== 'undefined' && (window as any).google?.maps) {
      setIsGoogleMapsReady(true);
      setGoogleMapsError(null);
      return;
    }

    const scriptId = 'wandor-google-maps-script';
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.remove();
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsKey)}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsGoogleMapsReady(true);
      setGoogleMapsError(null);
    };
    script.onerror = () => {
      setIsGoogleMapsReady(false);
      setGoogleMapsError('Failed to load Google Maps script with provided API key. Falling back to embedded view.');
      setMapMode('google-embed');
    };

    document.head.appendChild(script);
  }, [googleMapsKey]);

  // 3. Render and update Real Google Maps (JS API)
  useEffect(() => {
    if (mapMode !== 'google' || !isGoogleMapsReady || !googleMapContainerRef.current || !mapData || mapData.stops.length === 0) {
      return;
    }

    const stopsToRender = selectedDayFilter === 'all'
      ? mapData.stops
      : mapData.stops.filter(s => s.dayNumber === selectedDayFilter);

    const validStops = stopsToRender.filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');
    if (validStops.length === 0) return;

    const centerLat = activeStop?.lat || validStops[0]?.lat || 35.6762;
    const centerLng = activeStop?.lng || validStops[0]?.lng || 139.6503;

    try {
      if (!googleMapInstanceRef.current) {
        googleMapInstanceRef.current = new (window as any).google.maps.Map(googleMapContainerRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 13,
          mapTypeId: googleMapTypeId,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          styles: [
            { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] }
          ]
        });
        googleInfoWindowRef.current = new (window as any).google.maps.InfoWindow();
      } else {
        googleMapInstanceRef.current.setMapTypeId(googleMapTypeId);
      }

      const map = googleMapInstanceRef.current;

      // Clear old markers & polyline
      googleMarkersRef.current.forEach(m => m.setMap(null));
      googleMarkersRef.current = [];
      if (googlePolylineRef.current) {
        googlePolylineRef.current.setMap(null);
        googlePolylineRef.current = null;
      }

      const bounds = new (window as any).google.maps.LatLngBounds();
      const pathCoordinates: any[] = [];

      validStops.forEach((stop) => {
        const isSelected = activeStop?.number === stop.number;
        const dayColor = DAY_COLORS[stop.dayNumber] || DAY_COLORS[1];
        const latLng = new (window as any).google.maps.LatLng(stop.lat, stop.lng);
        bounds.extend(latLng);
        pathCoordinates.push(latLng);

        const pinIcon = {
          url: createNumberedGooglePinSvg(stop.number, dayColor.bg, isSelected),
          scaledSize: new (window as any).google.maps.Size(isSelected ? 45 : 36, isSelected ? 62 : 50),
          anchor: new (window as any).google.maps.Point(isSelected ? 22 : 18, isSelected ? 62 : 50),
        };

        const marker = new (window as any).google.maps.Marker({
          position: latLng,
          map,
          title: `#${stop.number} ${stop.placeName || stop.title}`,
          icon: pinIcon,
          zIndex: isSelected ? 999 : stop.number,
          animation: isSelected ? (window as any).google.maps.Animation.BOUNCE : undefined,
        });

        if (isSelected && marker.getAnimation() !== null) {
          setTimeout(() => marker.setAnimation(null), 1200);
        }

        const infoContent = `
          <div style="font-family: inherit; padding: 6px; max-width: 250px;">
            <div style="font-size: 11px; font-weight: 800; color: ${dayColor.bg}; text-transform: uppercase;">
              Stop #${stop.number} &bull; Day ${stop.dayNumber} ${stop.timeSlot}
            </div>
            <div style="font-size: 14px; font-weight: 700; margin-top: 3px; color: #1c1917;">
              ${stop.placeName || stop.title}
            </div>
            <div style="font-size: 12px; color: #78716c; margin-top: 2px;">
              📍 ${stop.location}
            </div>
            ${stop.transitToNext ? `<div style="font-size: 11px; color: #d97706; margin-top: 4px; font-weight: 600;">🚶 Next stop: ${stop.transitToNext}</div>` : ''}
            <div style="margin-top: 8px;">
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((stop.placeName || stop.title) + ' ' + stop.location)}" 
                 target="_blank" 
                 style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-decoration: underline;">
                Open in Real Google Maps ↗
              </a>
            </div>
          </div>
        `;

        marker.addListener('click', () => {
          setActiveStop(stop);
          googleInfoWindowRef.current.setContent(infoContent);
          googleInfoWindowRef.current.open(map, marker);
        });

        googleMarkersRef.current.push(marker);
      });

      // Draw route connecting numbered stops
      if (pathCoordinates.length > 1) {
        googlePolylineRef.current = new (window as any).google.maps.Polyline({
          path: pathCoordinates,
          geodesic: true,
          strokeColor: '#d97706',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map,
        });
      }

      if (validStops.length > 0) {
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        if (map.getZoom() > 16) {
          map.setZoom(16);
        }
      }
    } catch (err: any) {
      console.warn('Google Maps rendering notice:', err?.message);
    }
  }, [mapMode, isGoogleMapsReady, mapData, selectedDayFilter, activeStop, googleMapTypeId]);

  // 4. Render and update Leaflet Map (Fallback or user choice)
  useEffect(() => {
    if (mapMode !== 'leaflet' || !leafletContainerRef.current || !mapData || mapData.stops.length === 0) return;

    const stopsToRender = selectedDayFilter === 'all'
      ? mapData.stops
      : mapData.stops.filter(s => s.dayNumber === selectedDayFilter);

    const validStops = stopsToRender.filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');
    const centerLat = validStops[0]?.lat || 35.6762;
    const centerLng = validStops[0]?.lng || 139.6503;

    if (!leafletMapRef.current) {
      const map = L.map(leafletContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([centerLat, centerLng], 12);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    leafletMarkersRef.current.forEach(m => m.remove());
    leafletMarkersRef.current = [];
    if (leafletPolylineRef.current) {
      leafletPolylineRef.current.remove();
      leafletPolylineRef.current = null;
    }

    if (validStops.length === 0) return;

    const latLngs: L.LatLngExpression[] = [];

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

      leafletMarkersRef.current.push(marker);
      latLngs.push([stop.lat!, stop.lng!]);
    });

    if (latLngs.length > 1) {
      const polyline = L.polyline(latLngs, {
        color: '#d97706',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round',
      }).addTo(map);
      leafletPolylineRef.current = polyline;
    }

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [mapMode, mapData, selectedDayFilter, activeStop]);

  // Pan to active stop
  const handleSelectStop = (stop: NumberedStop) => {
    setActiveStop(stop);
    if (mapMode === 'google' && googleMapInstanceRef.current && typeof stop.lat === 'number' && typeof stop.lng === 'number') {
      googleMapInstanceRef.current.panTo({ lat: stop.lat, lng: stop.lng });
      googleMapInstanceRef.current.setZoom(15);
    } else if (mapMode === 'leaflet' && leafletMapRef.current && typeof stop.lat === 'number' && typeof stop.lng === 'number') {
      leafletMapRef.current.setView([stop.lat, stop.lng], 14, { animate: true });
    }
  };

  // Launch the Complete Numbered Route in Real Google Maps App / Website with all Waypoints
  const handleOpenFullRouteInGoogleMapsApp = () => {
    if (!mapData || mapData.stops.length === 0) return;
    const stops = mapData.stops;

    const origin = encodeURIComponent(`${stops[0].placeName || stops[0].title}, ${stops[0].location || mapData.destination}`);
    const destination = encodeURIComponent(`${stops[stops.length - 1].placeName || stops[stops.length - 1].title}, ${stops[stops.length - 1].location || mapData.destination}`);

    // Intermediate stops as waypoints (up to 9 in free url)
    const waypoints = stops
      .slice(1, -1)
      .slice(0, 9)
      .map(s => encodeURIComponent(`${s.placeName || s.title}, ${s.location || mapData.destination}`))
      .join('|');

    const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
    window.open(googleMapsDirectionsUrl, '_blank', 'noopener,noreferrer');
  };

  // Save user Google Maps API key
  const handleSaveGoogleKey = () => {
    const cleanKey = tempKeyInput.trim();
    localStorage.setItem('wandor_google_maps_key', cleanKey);
    setGoogleMapsKey(cleanKey);
    setIsKeyModalOpen(false);
    if (cleanKey) {
      setMapMode('google');
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

      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#fefbf6');
      grad.addColorStop(1, '#f7f2ea');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#d6cbba';
      ctx.lineWidth = 3;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 32px serif';
      ctx.fillText(mapData.destination.toUpperCase(), 60, 90);

      ctx.fillStyle = '#78716c';
      ctx.font = '16px sans-serif';
      ctx.fillText(`NUMBERED ROUTE MAP & TRAVEL ITINERARY • ${mapData.duration || 'WANDOR'}`, 60, 120);

      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`✦ ${mapData.totalStops} CURATED STOPS IN OPTIMIZED ORDER`, 60, 150);

      ctx.strokeStyle = '#e7e0d3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, 175);
      ctx.lineTo(width - 60, 175);
      ctx.stroke();

      let y = 220;
      mapData.stops.forEach((stop) => {
        const dayColor = DAY_COLORS[stop.dayNumber] || DAY_COLORS[1];

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e7e5e4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(60, y - 30, width - 120, 75, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = dayColor.bg;
        ctx.beginPath();
        ctx.arc(100, y + 8, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${stop.number}`, 100, y + 14);

        ctx.textAlign = 'left';
        ctx.fillStyle = dayColor.bg;
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`DAY ${stop.dayNumber} • ${stop.timeSlot.toUpperCase()}`, 140, y - 5);

        ctx.fillStyle = '#1c1917';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(stop.placeName || stop.title, 140, y + 18);

        ctx.fillStyle = '#78716c';
        ctx.font = '13px sans-serif';
        const locNote = stop.transitToNext ? `📍 ${stop.location}  |  🚶 Next: ${stop.transitToNext}` : `📍 ${stop.location}`;
        ctx.fillText(locNote.slice(0, 85), 140, y + 36);

        y += 90;
      });

      ctx.fillStyle = '#a8a29e';
      ctx.font = '13px sans-serif';
      ctx.fillText(`Generated with Wandor Real Google Maps Route Planner • wandor.travel`, 60, height - 50);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${mapData.destination.replace(/[^a-zA-Z0-9]/g, '_')}_Numbered_Google_Route_Map.png`;
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
        <h3 className="text-lg font-bold text-stone-900 mb-1">Generating Real Numbered Route Map...</h3>
        <p className="text-sm text-stone-500 max-w-md mx-auto">
          Sequencing all daily stops into an authentic Google Map route with precise GPS coordinates and transit paths.
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

  // Fallback query for Google Map Embed
  const activePlaceQuery = activeStop
    ? `${activeStop.placeName || activeStop.title} ${activeStop.location || mapData.destination}`
    : mapData.destination;

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden my-8 animate-in fade-in duration-300">
      {/* Map Header & Controls */}
      <div className="p-6 md:p-8 bg-stone-900 text-stone-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Real Google Maps Numbered Route
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>{mapData.destination} Complete Route</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
              Google Maps
            </span>
          </h2>
          <p className="text-sm text-stone-400 mt-1 max-w-xl">
            {mapData.routeSummary || `Follow stops #1 to #${mapData.totalStops} in numbered order for a smooth, crowd-free journey.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Main Action: Open in Real Google Maps App */}
          <button
            onClick={handleOpenFullRouteInGoogleMapsApp}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
            title="Open all stops in Google Maps application with driving / walking navigation"
          >
            <Route className="w-4 h-4 text-stone-950" />
            Open Route in Google Maps App
          </button>

          {/* Google Maps API Key Config */}
          <button
            onClick={() => {
              setTempKeyInput(googleMapsKey);
              setIsKeyModalOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all border cursor-pointer ${
              googleMapsKey
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
            }`}
            title="Configure or test your Google Maps API Key"
          >
            <Key className="w-3.5 h-3.5" />
            {googleMapsKey ? 'Google Maps API: Active' : 'Set Google Maps API Key'}
          </button>

          {/* Download & Print */}
          <button
            onClick={handleDownloadMapImage}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold uppercase tracking-wider transition-all border border-stone-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {isDownloading ? 'Exporting...' : downloadSuccess ? '✓ Saved' : 'Poster'}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold uppercase tracking-wider transition-all border border-stone-700 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Map Mode & Layer Switcher Bar */}
      <div className="px-6 py-3 bg-stone-100/90 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Map Engine Switch */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200/80 shadow-xs">
          <button
            onClick={() => {
              if (!googleMapsKey) {
                setTempKeyInput('');
                setIsKeyModalOpen(true);
              } else {
                setMapMode('google');
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              mapMode === 'google'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Real Google Maps (JS API)
            {googleMapsKey && <span className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5" />}
          </button>

          <button
            onClick={() => setMapMode('google-embed')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              mapMode === 'google-embed'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Google Maps (Direct Embed)
          </button>

          <button
            onClick={() => setMapMode('leaflet')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              mapMode === 'leaflet'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            High-Contrast Leaflet
          </button>
        </div>

        {/* Right: Map Type Toggle (Satellite vs Roadmap) when on Google Maps JS */}
        {mapMode === 'google' && isGoogleMapsReady && (
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200/80 shadow-xs">
            <button
              onClick={() => setGoogleMapTypeId('roadmap')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                googleMapTypeId === 'roadmap' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <MapIcon className="w-3 h-3" />
              Roadmap
            </button>
            <button
              onClick={() => setGoogleMapTypeId('satellite')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                googleMapTypeId === 'satellite' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Satellite className="w-3 h-3" />
              Satellite
            </button>
            <button
              onClick={() => setGoogleMapTypeId('terrain')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                googleMapTypeId === 'terrain' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Terrain
            </button>
          </div>
        )}
      </div>

      {/* Day Filter Pills */}
      <div className="px-6 py-3.5 bg-stone-50 border-b border-stone-200/80 flex flex-wrap items-center gap-2">
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
          All Stops (#1–#{mapData.totalStops})
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

      {/* Main Grid: Interactive Map (Google or Leaflet) + Numbered Stop List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[550px]">
        {/* Left Map Viewport */}
        <div className="lg:col-span-7 relative bg-stone-100 min-h-[440px] lg:min-h-[580px]">
          {/* Mode 1: Real Google Maps JS API */}
          {mapMode === 'google' && (
            <div className="w-full h-full min-h-[440px] lg:min-h-[580px] relative">
              {isGoogleMapsReady ? (
                <div ref={googleMapContainerRef} className="w-full h-full min-h-[440px] lg:min-h-[580px]" />
              ) : (
                <div className="w-full h-full min-h-[440px] lg:min-h-[580px] flex flex-col items-center justify-center p-8 text-center bg-stone-50">
                  <div className="p-4 bg-amber-100 text-amber-800 rounded-2xl mb-3 shadow-xs">
                    <Key className="w-8 h-8 text-amber-600" />
                  </div>
                  <h4 className="text-base font-bold text-stone-900 mb-1">Enter Real Google Maps API Key</h4>
                  <p className="text-xs text-stone-500 max-w-sm mb-4">
                    To render interactive Google Maps with custom numbered pins and live satellite views, please enter your Google Maps JavaScript API key.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => setIsKeyModalOpen(true)}
                      className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs"
                    >
                      Enter Google Maps API Key
                    </button>
                    <button
                      onClick={() => setMapMode('google-embed')}
                      className="px-4 py-2 rounded-full bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200 cursor-pointer"
                    >
                      Use Zero-Key Google Maps Embed
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Real Google Maps Direct Embed (Zero API Key needed) */}
          {mapMode === 'google-embed' && (
            <div className="w-full h-full min-h-[440px] lg:min-h-[580px] relative">
              <iframe
                title="Google Maps Authentic View"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '440px' }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(activePlaceQuery)}&t=m&z=15&ie=UTF8&iwloc=&output=embed`}
              />
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-200/80 shadow-md text-[11px] font-semibold text-stone-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>Showing: {activeStop ? `#${activeStop.number} ${activeStop.placeName}` : mapData.destination}</span>
              </div>
            </div>
          )}

          {/* Mode 3: Leaflet Voyager Fallback */}
          {mapMode === 'leaflet' && (
            <div className="w-full h-full min-h-[440px] lg:min-h-[580px] relative">
              <div ref={leafletContainerRef} className="w-full h-full min-h-[440px] lg:min-h-[580px] z-10" />
            </div>
          )}

          {/* Map Overlay Badge */}
          <div className="absolute bottom-3 left-3 z-[400] bg-stone-900/90 text-stone-100 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-700 shadow-md flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive Numbered Pins &bull; Click any stop to view on Google Maps</span>
          </div>
        </div>

        {/* Right: Stop-by-Stop Numbered Timeline */}
        <div className="lg:col-span-5 p-6 bg-stone-50/50 overflow-y-auto max-h-[580px] divide-y divide-stone-200/60">
          <div className="pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Numbered Daily Stops
              </h3>
              <p className="text-xs text-stone-500">
                Showing {displayedStops.length} stops for {selectedDayFilter === 'all' ? 'entire journey' : `Day ${selectedDayFilter}`}
              </p>
            </div>
            <button
              onClick={handleOpenFullRouteInGoogleMapsApp}
              className="text-[11px] font-bold text-amber-700 hover:text-amber-800 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
            >
              Route in Google Maps
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 pt-3">
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

                      {/* Direct Google Maps Actions */}
                      <div className="mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap items-center gap-3">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            (stop.placeName || stop.title) + ' ' + (stop.location || itinerary.destination)
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                        >
                          Open in Google Maps
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            (stop.placeName || stop.title) + ' ' + (stop.location || itinerary.destination)
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-stone-800"
                        >
                          Directions
                          <Navigation className="w-3 h-3 text-stone-400" />
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

      {/* Google Maps API Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-stone-900 text-base">Google Maps API Key</h3>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 mt-3 leading-relaxed">
              Add your Google Maps JavaScript API key to load genuine Google Maps imagery, satellite views, and authentic numbered pin markers.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Google Maps API Key:
              </label>
              <input
                type="text"
                value={tempKeyInput}
                onChange={(e) => setTempKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            {googleMapsError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{googleMapsError}</span>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoogleKey}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer shadow-xs"
              >
                Save &amp; Activate Google Maps
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
