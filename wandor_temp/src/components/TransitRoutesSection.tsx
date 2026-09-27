import React, { useState, useEffect } from 'react';
import { Plane, Train, Bus, Clock, Calendar, ArrowRight, DollarSign, Compass, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { TransitRoutesInfo } from '../types';

interface TransitRoutesSectionProps {
  transitRoutes?: TransitRoutesInfo;
  destination: string;
  origin?: string;
}

export const TransitRoutesSection: React.FC<TransitRoutesSectionProps> = ({
  transitRoutes,
  destination,
  origin
}) => {
  const [activeTab, setActiveTab] = useState<'flights' | 'trains' | 'buses'>('flights');
  const [liveTransit, setLiveTransit] = useState<TransitRoutesInfo | undefined>(transitRoutes);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (transitRoutes && ((transitRoutes.flights && transitRoutes.flights.length > 0) || (transitRoutes.trains && transitRoutes.trains.length > 0))) {
      setLiveTransit(transitRoutes);
      return;
    }

    let isMounted = true;
    const fetchLiveRoutes = async () => {
      setIsLoading(true);
      try {
        const queryOrigin = origin || 'Your departure city';
        const res = await fetch(`/api/transit-routes?destination=${encodeURIComponent(destination)}&origin=${encodeURIComponent(queryOrigin)}`);
        const data = await res.json();
        if (data.success && data.transitRoutes && isMounted) {
          setLiveTransit(data.transitRoutes);
        }
      } catch (err) {
        console.warn('Could not fetch transit routes:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLiveRoutes();
    return () => { isMounted = false; };
  }, [transitRoutes, destination, origin]);

  const activeRoutes = liveTransit || transitRoutes;
  const startingPoint = origin || activeRoutes?.origin || 'Your starting city';
  const flights = activeRoutes?.flights || [];
  const trains = activeRoutes?.trains || [];
  const buses = activeRoutes?.buses || [];

  return (
    <section className="mt-8 rounded-[24px] bg-white/80 backdrop-blur-xs border border-stone-200/90 p-6 sm:p-7 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-900">
              <Compass className="w-4 h-4" />
            </span>
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-stone-900">
              Journey & Transit Routes
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 flex items-center gap-1.5">
            <span>From <strong>{startingPoint}</strong></span>
            <ArrowRight className="w-3 h-3 text-stone-400" />
            <span>To <strong>{destination}</strong></span>
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-stone-100/90 border border-stone-200">
          <button
            type="button"
            onClick={() => setActiveTab('flights')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'flights'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>Flights {flights.length > 0 && `(${flights.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trains')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'trains'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Train className="w-3.5 h-3.5" />
            <span>Trains {trains.length > 0 && `(${trains.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('buses')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'buses'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            <span>Bus & Road {buses.length > 0 && `(${buses.length})`}</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="mt-6">
        {/* Flights Tab */}
        {activeTab === 'flights' && (
          <div className="space-y-4">
            {flights.length === 0 ? (
              <p className="text-xs sm:text-sm text-stone-500 italic p-4 bg-[#FAF6F0] rounded-xl border border-stone-200">
                Direct regional flights are available between {startingPoint} and {destination} airports. Check major carriers (IndiGo, Air India, etc.) for daily schedules.
              </p>
            ) : (
              flights.map((flight, idx) => (
                <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F0] border border-stone-200/90 shadow-2xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-base text-stone-900">
                        {flight.airline}
                      </span>
                      {flight.flightNumberOrType && (
                        <span className="text-[11px] font-mono bg-stone-200/70 text-stone-700 px-2 py-0.5 rounded">
                          {flight.flightNumberOrType}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-full">
                      {flight.estPriceRange}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-stone-600 flex flex-wrap items-center gap-3">
                    <span className="font-medium text-stone-800">{flight.route}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      Duration: {flight.duration}
                    </span>
                  </div>

                  {/* Flight Timings */}
                  {flight.departureTimes?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-200/70">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1.5">
                        Sample Flight Timings & Schedules
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {flight.departureTimes.map((dep, i) => (
                          <div
                            key={i}
                            className="inline-flex items-center gap-1.5 text-xs bg-white border border-stone-200 px-3 py-1 rounded-lg text-stone-800 shadow-2xs font-mono"
                          >
                            <span className="font-bold text-amber-900">{dep}</span>
                            {flight.arrivalTimes?.[i] && (
                              <>
                                <ArrowRight className="w-3 h-3 text-stone-400" />
                                <span className="text-stone-600">{flight.arrivalTimes[i]}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {flight.notes && (
                    <p className="mt-2 text-[11px] text-stone-500 italic">
                      ℹ️ {flight.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Trains Tab */}
        {activeTab === 'trains' && (
          <div className="space-y-4">
            {trains.length === 0 ? (
              <p className="text-xs sm:text-sm text-stone-500 italic p-4 bg-[#FAF6F0] rounded-xl border border-stone-200">
                Major superfast express and Rajdhani/Vande Bharat trains connect {startingPoint} to {destination}. Advance booking on IRCTC/national rail is recommended.
              </p>
            ) : (
              trains.map((train, idx) => (
                <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F0] border border-stone-200/90 shadow-2xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-base text-stone-900">
                        {train.trainNameOrNumber}
                      </span>
                      <span className="text-[11px] font-medium bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                        {train.frequency}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-full">
                      {train.estPriceRange}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-stone-600 flex flex-wrap items-center gap-3">
                    <span className="font-medium text-stone-800">{train.routeStations}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      Duration: {train.duration}
                    </span>
                  </div>

                  {/* Train Departure & Arrival Timings */}
                  {train.departureTimes?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-200/70">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1.5">
                        Train Timings
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {train.departureTimes.map((dep, i) => (
                          <div
                            key={i}
                            className="inline-flex items-center gap-1.5 text-xs bg-white border border-stone-200 px-3 py-1 rounded-lg text-stone-800 shadow-2xs font-mono"
                          >
                            <span className="font-bold text-emerald-900">Dep: {dep}</span>
                            {train.arrivalTimes?.[i] && (
                              <>
                                <ArrowRight className="w-3 h-3 text-stone-400" />
                                <span className="text-stone-700">Arr: {train.arrivalTimes[i]}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {train.bookingTip && (
                    <p className="mt-2 text-[11px] text-stone-600 bg-stone-100/60 p-2 rounded-lg">
                      💡 <strong>Booking Tip:</strong> {train.bookingTip}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Buses Tab */}
        {activeTab === 'buses' && (
          <div className="space-y-4">
            {buses.length === 0 ? (
              <p className="text-xs sm:text-sm text-stone-500 italic p-4 bg-[#FAF6F0] rounded-xl border border-stone-200">
                Intercity Volvo, sleeper, and state transport buses operate on national highways between {startingPoint} and {destination}.
              </p>
            ) : (
              buses.map((bus, idx) => (
                <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F0] border border-stone-200/90 shadow-2xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-heading font-bold text-base text-stone-900">
                      {bus.operatorOrType}
                    </span>
                    <span className="text-xs font-bold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-full">
                      {bus.estPriceRange}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-stone-600 flex flex-wrap items-center gap-3">
                    <span className="font-medium text-stone-800">{bus.route}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      Duration: {bus.duration}
                    </span>
                  </div>

                  {bus.departureTimes?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-200/70">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1.5">
                        Bus Departure Timings
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {bus.departureTimes.map((t, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-md bg-white border border-stone-200 text-xs font-mono font-medium text-stone-800 shadow-2xs"
                          >
                            🚌 {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {bus.notes && (
                    <p className="mt-2 text-[11px] text-stone-500 italic">
                      ℹ️ {bus.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Local Transit / Transfer Tip */}
        {transitRoutes?.localTransitTip && (
          <div className="mt-5 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Local Arrival Advice:</strong>
              <span className="text-stone-700">{transitRoutes.localTransitTip}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
