import React, { useEffect, useState } from 'react';

interface LocationImageProps {
  location?: string;
  placeName?: string;
  destination?: string;
  className?: string;
  alt?: string;
  onClick?: () => void;
}

// Client-side cache to make image re-renders instant
const clientImageCache = new Map<string, string>();

export const LocationImage: React.FC<LocationImageProps> = ({
  location = '',
  placeName = '',
  destination = '',
  className = '',
  alt,
  onClick
}) => {
  const cacheKey = `${placeName}::${destination}::${location}`;
  const [imageUrl, setImageUrl] = useState<string | null>(clientImageCache.get(cacheKey) || null);
  const [isLoading, setIsLoading] = useState(!clientImageCache.has(cacheKey));
  const [hasError, setHasError] = useState(false);
  const [source, setSource] = useState<string>('wikipedia');

  useEffect(() => {
    if (clientImageCache.has(cacheKey)) {
      setImageUrl(clientImageCache.get(cacheKey)!);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const fetchImage = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const params = new URLSearchParams();
        if (placeName) params.append('place', placeName);
        if (destination) params.append('destination', destination);
        if (location) params.append('q', location);

        const res = await fetch(`/api/location-image?${params.toString()}`);
        if (!res.ok) throw new Error('Image fetch failed');
        const data = await res.json();

        if (isMounted && data.success && data.imageUrl) {
          clientImageCache.set(cacheKey, data.imageUrl);
          setImageUrl(data.imageUrl);
          if (data.source) setSource(data.source);
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Failed to fetch image for", placeName || location);
          setHasError(true);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [cacheKey, placeName, destination, location]);

  const fallback = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200";

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-stone-200/60 ${className} ${onClick ? 'cursor-pointer group' : ''}`}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-stone-200/70 animate-pulse flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-stone-400 border-t-stone-700 rounded-full animate-spin" />
        </div>
      )}

      <img
        src={hasError || !imageUrl ? fallback : imageUrl}
        alt={alt || placeName || location || "Destination view"}
        className={`w-full h-full object-cover transition-all duration-500 ${
          isLoading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
        } ${onClick ? 'group-hover:scale-105' : ''}`}
        loading="lazy"
        onError={() => setHasError(true)}
      />

      {/* Wikipedia Sightseeing Verified Badge */}
      {!isLoading && !hasError && imageUrl && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/95 bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-xs">
            Wikipedia Photo
          </span>
        </div>
      )}
    </div>
  );
};
