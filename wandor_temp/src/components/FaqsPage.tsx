import React, { useState } from 'react';
import { ChevronDown, HelpCircle, MessageSquare } from 'lucide-react';
import { FAQItem } from '../types';

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How does WandOr generate itineraries?',
    answer: 'WandOr uses Gemini and OpenAI to analyse your preferences, dates, and destination to create a highly personalised day-by-day plan. Every itinerary is generated fresh — nothing is cached or pre-written.',
    category: 'Planning'
  },
  {
    question: 'Can I edit the generated itinerary?',
    answer: 'Yes! You can use the "Refine with AI" feature to ask the AI to adjust specific days or activities. Changes are applied by re-calling the AI — not by editing mock data.',
    category: 'Planning'
  },
  {
    question: 'Which AI model does WandOr use?',
    answer: 'WandOr tries Gemini first (gemini-3.6-flash), then falls back to OpenAI (gpt-4o-mini) and Anthropic (claude-3-haiku) in that order if the primary provider fails.',
    category: 'AI & Accuracy'
  },
  {
    question: 'Is the Discover page data real?',
    answer: 'Yes. The Discover page contains prompt ideas, not pre-generated trips. When you click "Generate Trip", a live request is sent to the AI and a real itinerary is built on the spot.',
    category: 'AI & Accuracy'
  },
  {
    question: 'Is there a mobile app?',
    answer: 'Currently, WandOr is a web application optimised for mobile browsers. A dedicated mobile app is on our roadmap.',
    category: 'Accounts'
  }
];

interface FaqsPageProps {
  onContactClick: () => void;
}

export const FaqsPage: React.FC<FaqsPageProps> = ({ onContactClick }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Planning', 'Crowds', 'AI & Accuracy', 'Accounts'];

  const filteredFaqs = FAQ_ITEMS.filter(faq => {
    return activeCategory === 'All' || faq.category === activeCategory;
  });

  const toggleAccordion = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-900 block mb-2">
          Frequently Asked Questions
        </span>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-stone-900 tracking-tight">
          Everything You Need to Know
        </h1>
        <p className="mt-3 text-stone-600 text-sm sm:text-base leading-relaxed">
          How our travel algorithms work, how we protect your schedule from crowds, and how you can export itineraries anywhere.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              setOpenIndex(0);
            }}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white/80 hover:bg-white text-stone-700 border border-stone-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3.5">
        {filteredFaqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-[#FAF6F0] border border-stone-200/90 overflow-hidden transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => toggleAccordion(idx)}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
              >
                <span className="font-heading text-base sm:text-lg font-bold text-stone-900 leading-snug">
                  {faq.question}
                </span>
                <div className={`p-1 rounded-full bg-stone-200/70 text-stone-700 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className="px-5 sm:px-6 pb-5 pt-0 text-stone-600 text-xs sm:text-sm leading-relaxed border-t border-stone-200/60 mt-1 pt-4 animate-in fade-in">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Still Have Questions? */}
      <div className="mt-12 text-center p-8 rounded-[28px] bg-stone-900 text-white shadow-lg">
        <h3 className="font-heading text-xl font-bold">
          Have a unique travel request?
        </h3>
        <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-md mx-auto">
          Our travel specialists and AI engineering team are happy to assist you with tailored routing.
        </p>
        <button
          onClick={onContactClick}
          className="mt-5 px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs uppercase tracking-wider rounded-full transition-colors cursor-pointer inline-flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Ask Wandor Travel Support</span>
        </button>
      </div>
    </div>
  );
};
