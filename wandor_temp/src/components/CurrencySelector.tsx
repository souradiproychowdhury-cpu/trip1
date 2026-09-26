import React, { useEffect, useState, createContext, useContext } from 'react';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag?: string;
}

export const WORLD_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'AU$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'SG$' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: 'CN¥' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BHD' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'EGP' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'PKR' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'NPR' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'LKR' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'SEK' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'NOK' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'DKK' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
];

const TOP_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AED', 'CAD', 'AUD'];

interface CurrencyContextType {
  selectedCurrency: string;
  setSelectedCurrency: (code: string) => void;
  rates: Record<string, number>;
  convert: (amount: number, fromCurrency?: string) => number;
  format: (amount: number, fromCurrency?: string) => string;
  formatRange: (low: number, high: number, fromCurrency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const CurrencyProvider: React.FC<{ children: React.ReactNode; defaultCurrency?: string }> = ({
  children,
  defaultCurrency = 'USD'
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const [rates, setRates] = useState<Record<string, number>>({
    USD: 1.0,
    INR: 86.5,
    EUR: 0.92,
    GBP: 0.78,
    JPY: 154.0,
    AED: 3.67,
    CAD: 1.38,
    AUD: 1.54
  });

  useEffect(() => {
    fetch('/api/exchange-rates')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.rates) {
          setRates(data.rates);
        }
      })
      .catch(err => console.warn('Could not load live rates:', err));
  }, []);

  const convert = (amount: number, fromCurrency = 'USD'): number => {
    if (!amount || isNaN(amount)) return 0;
    const fromRate = rates[fromCurrency.toUpperCase()] || 1.0;
    const toRate = rates[selectedCurrency.toUpperCase()] || 1.0;
    // Base is USD
    const inUSD = amount / fromRate;
    return Math.round(inUSD * toRate);
  };

  const format = (amount: number, fromCurrency = 'USD'): string => {
    const converted = convert(amount, fromCurrency);
    const currInfo = WORLD_CURRENCIES.find(c => c.code === selectedCurrency);
    const symbol = currInfo ? currInfo.symbol : selectedCurrency;

    // Formatting rules: JPY, KRW, VND, IDR don't use decimal places
    const formattedNum = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 0
    }).format(converted);

    return `${symbol} ${formattedNum}`;
  };

  const formatRange = (low: number, high: number, fromCurrency = 'USD'): string => {
    const convLow = convert(low, fromCurrency);
    const convHigh = convert(high, fromCurrency);
    const currInfo = WORLD_CURRENCIES.find(c => c.code === selectedCurrency);
    const symbol = currInfo ? currInfo.symbol : selectedCurrency;

    const fmtLow = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(convLow);
    const fmtHigh = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(convHigh);

    return `${symbol} ${fmtLow} – ${symbol} ${fmtHigh}`;
  };

  return (
    <CurrencyContext.Provider value={{ selectedCurrency, setSelectedCurrency, rates, convert, format, formatRange }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencySelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { selectedCurrency, setSelectedCurrency } = useCurrency();

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mr-1">
        Currency:
      </span>
      {TOP_CURRENCIES.map((code) => {
        const info = WORLD_CURRENCIES.find(c => c.code === code);
        const isSelected = selectedCurrency === code;
        return (
          <button
            key={code}
            onClick={() => setSelectedCurrency(code)}
            type="button"
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all cursor-pointer ${
              isSelected
                ? 'bg-stone-900 text-white shadow-xs font-semibold'
                : 'bg-white/80 hover:bg-stone-100 text-stone-700 border border-stone-200'
            }`}
          >
            {info?.symbol || ''} {code}
          </button>
        );
      })}

      <div className="relative inline-block ml-1">
        <select
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          aria-label="Select trip budget currency"
          className="px-3 py-1 text-xs rounded-full bg-white/90 border border-stone-300 text-stone-800 font-medium hover:border-stone-400 focus:outline-none cursor-pointer"
        >
          <option disabled value="">More Currencies...</option>
          {WORLD_CURRENCIES.map((curr) => (
            <option key={curr.code} value={curr.code}>
              {curr.code} ({curr.symbol}) — {curr.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
