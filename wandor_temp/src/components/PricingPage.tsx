import React, { useState } from 'react';
import { Check, Sparkles, HelpCircle, Shield, ArrowRight } from 'lucide-react';
import { PricingPlan } from '../types';

const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    subtitle: 'For occasional travelers',
    priceMonthly: 0,
    priceAnnual: 0,
    features: ['Up to 3 itineraries per month', 'Basic AI generation', 'Community support'],
    ctaText: 'Get Started',
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'For frequent explorers',
    priceMonthly: 9.99,
    priceAnnual: 99.99,
    popular: true,
    features: ['Unlimited itineraries', 'Advanced AI customization', 'Export to PDF/Calendar', 'Priority support'],
    ctaText: 'Upgrade to Pro',
  },
  {
    id: 'team',
    name: 'Team',
    subtitle: 'For travel agencies',
    priceMonthly: 29.99,
    priceAnnual: 299.99,
    features: ['Everything in Pro', 'Collaborative planning', 'Custom branding', 'Dedicated account manager'],
    ctaText: 'Contact Sales',
  }
];

interface PricingPageProps {
  onSelectPlan: (planId: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onSelectPlan }) => {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-900 block mb-2">
          Simple, Transparent Pricing
        </span>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-stone-900 tracking-tight">
          Invest in Memorable, Crowd-Free Travel
        </h1>
        <p className="mt-3 text-stone-600 text-sm sm:text-base leading-relaxed">
          Unlock unlimited AI itinerary generations, real-time crowd avoidance radar, offline PDF export, and hand-picked hidden gems.
        </p>

        {/* Monthly vs Annual Toggle */}
        <div className="mt-7 inline-flex items-center gap-3 p-1.5 rounded-full bg-stone-200/80 border border-stone-300/80">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              !isAnnual ? 'bg-[#121212] text-white shadow-xs' : 'text-stone-700 hover:text-black'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              isAnnual ? 'bg-[#121212] text-white shadow-xs' : 'text-stone-700 hover:text-black'
            }`}
          >
            <span>Annual</span>
            <span className="text-[10px] bg-amber-200 text-amber-950 font-bold px-1.5 py-0.5 rounded-full">
              Save 25%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {PRICING_PLANS.map((plan) => {
          const monthlyPrice = plan.priceMonthly;
          const annualTotal = plan.priceAnnual;
          const monthlyFromAnnual = annualTotal > 0 ? (annualTotal / 12).toFixed(2) : '0';
          const displayPrice = isAnnual ? monthlyFromAnnual : monthlyPrice;
          const isFree = plan.priceMonthly === 0;
          return (
            <div
              key={plan.id}
              className={`rounded-[28px] p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 relative ${
                plan.popular
                  ? 'bg-[#FAF6F0] border-2 border-stone-900 shadow-xl scale-[1.02]'
                  : 'bg-[#FAF6F0]/70 border border-stone-200 shadow-xs hover:border-stone-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-stone-900 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">
                  Most Popular
                </div>
              )}

              <div>
                <div className="mb-4">
                  <h3 className="font-heading text-xl font-bold text-stone-900">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-stone-600 mt-1">
                    {plan.subtitle}
                  </p>
                </div>

                {/* Price Display */}
                <div className="mb-6 pb-6 border-b border-stone-200/80">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-stone-900 font-heading">
                      ${displayPrice}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">
                      {isFree ? 'forever' : '/mo'}
                    </span>
                  </div>
                  {isAnnual && !isFree && (
                    <p className="text-[11px] text-stone-400 mt-1">
                      Billed as <span className="font-semibold text-stone-600">${annualTotal}/yr</span>
                    </p>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-2">
                    What's Included:
                  </span>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-stone-700">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="leading-snug">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4">
                <button
                  onClick={() => onSelectPlan(plan.id)}
                  className={`w-full py-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                    plan.popular
                      ? 'bg-[#121212] hover:bg-stone-800 text-white'
                      : 'bg-white hover:bg-stone-100 text-stone-900 border border-stone-300'
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="mt-14 max-w-2xl mx-auto p-5 rounded-2xl bg-white/70 border border-stone-200 flex items-center gap-4 text-left">
        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
            14-Day Money-Back Guarantee
          </h4>
          <p className="text-xs text-stone-600 mt-0.5">
            Try Nomad Pro risk-free. If Wandor doesn't help you discover quieter, richer spots on your travels, we will refund you immediately—no questions asked.
          </p>
        </div>
      </div>
    </div>
  );
};
