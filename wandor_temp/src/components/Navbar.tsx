import React, { useState } from 'react';
import { Menu, X, Compass, Sparkles, User, MapPin } from 'lucide-react';

interface NavbarProps {
  activeTab: 'hero' | 'discover' | 'faqs' | 'itinerary' | 'my-trips';
  onSelectTab: (tab: 'hero' | 'discover' | 'faqs' | 'itinerary' | 'my-trips') => void;
  onOpenLogin: () => void;
  onPlanTripClick: () => void;
  userEmail: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenLogin,
  onPlanTripClick,
  userEmail
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="relative z-30 w-full max-w-7xl mx-auto px-6 lg:px-12 pt-7 pb-4">
      <div className="flex items-center justify-between">
        {/* Brand Logo: "wandor" matching exact reference image */}
        <button
          onClick={() => onSelectTab('hero')}
          className="group flex items-baseline gap-1 text-left cursor-pointer focus:outline-none"
        >
          <span className="font-logo text-2xl sm:text-[28px] font-medium tracking-[-0.03em] text-[#121212] group-hover:text-amber-950 transition-colors">
            wandor
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-700/70 inline-block translate-y-[-2px] opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Center Navigation Links: DISCOVER, FAQS */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-11">
          <button
            onClick={() => onSelectTab('discover')}
            className={`text-[13px] font-medium tracking-[0.14em] uppercase transition-colors relative py-1 focus:outline-none ${
              activeTab === 'discover'
                ? 'text-[#121212] font-semibold'
                : 'text-stone-700 hover:text-black'
            }`}
          >
            DISCOVER
            {activeTab === 'discover' && (
              <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#121212] rounded-full" />
            )}
          </button>

          <button
            onClick={() => onSelectTab('faqs')}
            className={`text-[13px] font-medium tracking-[0.14em] uppercase transition-colors relative py-1 focus:outline-none ${
              activeTab === 'faqs'
                ? 'text-[#121212] font-semibold'
                : 'text-stone-700 hover:text-black'
            }`}
          >
            FAQS
            {activeTab === 'faqs' && (
              <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#121212] rounded-full" />
            )}
          </button>

          {userEmail && (
            <button
              onClick={() => onSelectTab('my-trips')}
              className={`text-[13px] font-medium tracking-[0.14em] uppercase transition-colors relative py-1 focus:outline-none ${
                activeTab === 'my-trips'
                  ? 'text-[#121212] font-semibold'
                  : 'text-stone-700 hover:text-black'
              }`}
            >
              MY PLANS
              {activeTab === 'my-trips' && (
                <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#121212] rounded-full" />
              )}
            </button>
          )}
        </nav>

        {/* Right Nav Action Buttons: LOGIN & PLAN MY TRIP */}
        <div className="hidden md:flex items-center gap-6">
          {!userEmail ? (
            <button
              onClick={onOpenLogin}
              className="text-[13px] font-medium tracking-[0.14em] uppercase text-stone-800 hover:text-black transition-colors focus:outline-none cursor-pointer py-1"
            >
              LOGIN
            </button>
          ) : (
            <span className="text-[13px] font-medium tracking-[0.14em] uppercase text-stone-800 py-1">
              {userEmail.split('@')[0]}
            </span>
          )}

          <button
            onClick={onPlanTripClick}
            className="bg-[#121212] hover:bg-stone-800 text-white text-[12px] font-semibold tracking-[0.12em] uppercase px-6 py-2.5 rounded-full transition-all duration-200 shadow-sm hover:shadow active:scale-95 cursor-pointer"
          >
            PLAN MY TRIP
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={onPlanTripClick}
            className="bg-[#121212] text-white text-[11px] font-semibold tracking-wider uppercase px-4 py-2 rounded-full"
          >
            PLAN
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-stone-800 hover:text-black focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 p-5 rounded-2xl bg-[#FAF6F0] border border-stone-200 shadow-lg flex flex-col gap-4 animate-in fade-in slide-in-from-top-3">
          <button
            onClick={() => {
              onSelectTab('hero');
              setMobileMenuOpen(false);
            }}
            className="text-left text-sm font-medium uppercase tracking-wider text-stone-800 py-1"
          >
            Home
          </button>
          <button
            onClick={() => {
              onSelectTab('discover');
              setMobileMenuOpen(false);
            }}
            className="text-left text-sm font-medium uppercase tracking-wider text-stone-800 py-1"
          >
            Discover
          </button>
          <button
            onClick={() => {
              onSelectTab('faqs');
              setMobileMenuOpen(false);
            }}
            className="text-left text-sm font-medium uppercase tracking-wider text-stone-800 py-1"
          >
            FAQs
          </button>
          <div className="pt-2 border-t border-stone-200 flex flex-col gap-2">
            <button
              onClick={() => {
                onOpenLogin();
                setMobileMenuOpen(false);
              }}
              className="w-full text-center py-2 text-xs uppercase tracking-wider font-medium text-stone-800"
            >
              Log In
            </button>
            <button
              onClick={() => {
                onPlanTripClick();
                setMobileMenuOpen(false);
              }}
              className="w-full bg-[#121212] text-white py-2.5 rounded-full text-xs uppercase tracking-wider font-semibold"
            >
              Plan My Trip
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
