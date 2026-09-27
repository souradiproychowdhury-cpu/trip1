import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Star, 
  MapPin, 
  ExternalLink, 
  Check, 
  Sparkles, 
  Coffee, 
  Wifi, 
  Waves, 
  ShieldCheck, 
  SlidersHorizontal,
  Loader2
} from 'lucide-react';
import { HotelOption } from '../types';

interface HotelSuggestionsSectionProps {
  hotels?: HotelOption[];
  destination: string;
}

export const HotelSuggestionsSection: React.FC<HotelSuggestionsSectionProps> = ({
  hotels: initialHotels,
  destination
}) => {
  const [hotels, setHotels] = useState<HotelOption[]>(initialHotels || []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    if (initialHotels && initialHotels.length > 0) {
      setHotels(initialHotels);
      return;
    }

    let isMounted = true;
    const fetchHotels = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/hotels?destination=${encodeURIComponent(destination)}`);
        const data = await res.json();
        if (data.success && data.hotels && isMounted) {
          setHotels(data.hotels);
        }
      } catch (err) {
        console.warn('Failed to load hotel suggestions:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchHotels();
    return () => { isMounted = false; };
  }, [initialHotels, destination]);

  const categories = ['All', 'Luxury', 'Boutique', 'Heritage', 'Mid-range', 'Budget'];

  const filteredHotels = hotels.filter(hotel => {
    const matchesCategory =
      selectedCategory === 'All' ||
      hotel.category.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory === 'Heritage' && (hotel.category === 'Heritage' || hotel.category === 'Resort'));

    const matchesSearch =
      searchFilter === '' ||
      hotel.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (hotel.neighborhood && hotel.neighborhood.toLowerCase().includes(searchFilter.toLowerCase())) ||
      hotel.description.toLowerCase().includes(searchFilter.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('pool') || lower.includes('river')) return <Waves className="w-3 h-3 text-cyan-600" />;
    if (lower.includes('wifi')) return <Wifi className="w-3 h-3 text-emerald-600" />;
    if (lower.includes('breakfast') || lower.includes('dining') || lower.includes('kitchen')) return <Coffee className="w-3 h-3 text-amber-600" />;
    return <Sparkles className="w-3 h-3 text-stone-500" />;
  };

  return (
    <section className="mt-8 rounded-[28px] bg-white/95 backdrop-blur-md border border-stone-200/90 p-6 sm:p-8 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-100/90 text-amber-900 border border-amber-200/60 shadow-2xs">
              <Building2 className="w-5 h-5 text-amber-800" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-xl sm:text-2xl font-bold text-stone-900">
                  Recommended Hotels & Stays
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Travel Partner Verified
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Handpicked boutique stays, luxury palaces, and central retreats in <strong>{destination}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Google Travel Partner Guarantee Badge */}
        <div className="flex items-center gap-2 bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200 text-xs text-stone-600">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Availability & Lowest Partner Rates</span>
        </div>
      </div>

      {/* Filter and Category Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-5 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quick Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search hotel or area..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="text-xs px-3 py-1.5 pr-8 rounded-full border border-stone-200 bg-stone-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 w-48 sm:w-56"
          />
          <SlidersHorizontal className="w-3 h-3 text-stone-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && hotels.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-stone-500">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          <p className="text-sm">Connecting to Travel Partner API for {destination} hotel availability...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredHotels.length === 0 && (
        <div className="py-10 text-center text-stone-500 text-sm">
          No accommodations found matching &ldquo;{searchFilter}&rdquo;. Try another filter or search term.
        </div>
      )}

      {/* Hotels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
        {filteredHotels.map((hotel) => (
          <div
            key={hotel.id || hotel.name}
            className="flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-stone-50/60 hover:bg-white transition-all duration-200 hover:shadow-md hover:border-stone-300 overflow-hidden group"
          >
            {/* Top Photo & Badge */}
            <div className="relative h-44 w-full overflow-hidden bg-stone-200">
              {hotel.imageUrl ? (
                <img
                  src={hotel.imageUrl}
                  alt={hotel.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-tr from-stone-800 to-stone-600 flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-stone-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-linear-to-t from-stone-900/70 via-transparent to-transparent pointer-events-none" />

              {/* Category Pill */}
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-stone-900/85 backdrop-blur-xs text-white border border-white/20">
                  {hotel.category}
                </span>
              </div>

              {/* Rating Pill */}
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400 text-stone-950 shadow-xs">
                <Star className="w-3.5 h-3.5 fill-stone-950" />
                <span>{hotel.rating.toFixed(1)}</span>
                {hotel.reviewsCount && (
                  <span className="text-[10px] text-stone-800 font-normal">({hotel.reviewsCount})</span>
                )}
              </div>

              {/* Price Tag overlay on image */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                <div className="text-xs font-medium text-stone-200 truncate">
                  {hotel.neighborhood || destination}
                </div>
                <div className="text-sm font-bold bg-emerald-700/90 backdrop-blur-xs px-2.5 py-0.5 rounded-lg border border-emerald-400/40">
                  {hotel.pricePerNight}
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-heading text-base font-bold text-stone-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                  {hotel.name}
                </h4>

                {hotel.distanceToCenter && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                    <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                    <span className="truncate">{hotel.distanceToCenter}</span>
                  </div>
                )}

                <p className="text-xs text-stone-600 mt-2 line-clamp-2 leading-relaxed">
                  {hotel.description}
                </p>

                {/* Amenities Badges */}
                {hotel.amenities && hotel.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {hotel.amenities.slice(0, 3).map((amenity, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200/80"
                      >
                        {getAmenityIcon(amenity)}
                        <span>{amenity}</span>
                      </span>
                    ))}
                    {hotel.amenities.length > 3 && (
                      <span className="text-[10px] text-stone-500 self-center">
                        +{hotel.amenities.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-stone-200/80 flex items-center justify-between gap-2">
                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Free cancellation available
                </div>

                <a
                  href={hotel.bookingUrl || `https://www.google.com/travel/hotels?q=${encodeURIComponent(hotel.name + ' ' + destination)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-2xs transition-colors"
                >
                  <span>Book on Google</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Travel Partner Note */}
      <div className="mt-6 rounded-xl bg-stone-100/80 border border-stone-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Integrated with Google Travel Partner and official accommodation providers for authentic traveler reviews and lowest available pricing.
          </span>
        </div>
        <a
          href={`https://www.google.com/travel/hotels?q=hotels+in+${encodeURIComponent(destination)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-900 font-semibold hover:underline inline-flex items-center gap-1 text-xs"
        >
          <span>Explore all {destination} hotels on Google</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </section>
  );
};
