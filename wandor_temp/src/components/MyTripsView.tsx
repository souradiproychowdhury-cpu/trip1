import React, { useEffect, useState } from 'react';
import { TripItinerary } from '../types';

interface MyTripsViewProps {
  onSelectTrip: (itinerary: TripItinerary) => void;
}

export const MyTripsView: React.FC<MyTripsViewProps> = ({ onSelectTrip }) => {
  const [trips, setTrips] = useState<{ id: string; title: string; itinerary: TripItinerary; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await fetch('/api/trips');
        const data = await res.json();
        if (data.success) {
          setTrips(data.trips);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

  if (loading) return <div className="p-12 text-center text-stone-500">Loading your plans...</div>;

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h2 className="text-2xl font-heading font-bold text-stone-900 mb-3">No plans yet</h2>
        <p className="text-stone-600 max-w-md">You haven't generated any trips yet. Head back to the planner to craft your first crowd-free journey.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 w-full animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-3xl font-heading font-bold text-stone-900 mb-8">My Past Plans</h2>
      <div className="grid grid-cols-1 gap-6">
        {trips.map(trip => (
          <div key={trip.id} className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-stone-200/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectTrip(trip.itinerary)}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-heading font-semibold text-stone-900">{trip.title}</h3>
              <span className="text-xs text-stone-500 whitespace-nowrap bg-stone-100 px-3 py-1 rounded-full">{new Date(trip.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-stone-600 mb-4">{trip.itinerary.summary}</p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-amber-50 text-amber-800 px-2 py-1 rounded-md">{trip.itinerary.duration}</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-stone-100 text-stone-800 px-2 py-1 rounded-md">{trip.itinerary.destination}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
