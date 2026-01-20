'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, localeConfig, type Locale } from '@/i18n/config';
import { Globe, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

// Utility function to set locale preference cookie (outside component for React Compiler)
function setLocaleCookie(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
}

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleChange = (newLocale: Locale) => {
    // Save user preference in cookie for 1 year
    setLocaleCookie(newLocale);
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
          isOpen
            ? 'text-orange-600 bg-orange-50'
            : 'text-slate-600 hover:text-orange-600 hover:bg-orange-50'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
      >
        <Globe size={16} />
        <span className="hidden sm:inline">{localeConfig[locale].name}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      <div
        className={`absolute top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 py-2 min-w-[140px] transition-all z-50 ${
          isOpen
            ? 'opacity-100 visible translate-y-0'
            : 'opacity-0 invisible -translate-y-2'
        }`}
        style={{
          // Position based on text direction - align to the start of the button
          insetInlineStart: 0
        }}
        role="listbox"
        aria-label="Available languages"
      >
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => handleChange(loc)}
            className={`w-full text-start px-4 py-2.5 text-sm font-medium transition-colors ${
              loc === locale
                ? 'text-orange-600 bg-orange-50'
                : 'text-slate-600 hover:text-orange-600 hover:bg-orange-50'
            }`}
            role="option"
            aria-selected={loc === locale}
          >
            {localeConfig[loc].name}
          </button>
        ))}
      </div>
    </div>
  );
}
