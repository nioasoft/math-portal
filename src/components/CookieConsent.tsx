'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Cookie, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import {
  hasConsentChoice,
  acceptAllCookies,
  acceptNecessaryOnly,
  saveCookiePreferences,
  getCookiePreferences,
  type CookiePreferences,
} from '@/lib/cookie-consent';
import { Link } from '@/i18n/navigation';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<Omit<CookiePreferences, 'necessary' | 'timestamp'>>({
    functional: true,
    analytics: true,
    marketing: true,
  });
  const t = useTranslations('cookies');

  useEffect(() => {
    // Small delay to avoid hydration issues and let page load
    const timer = setTimeout(() => {
      if (!hasConsentChoice()) {
        setShowBanner(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setShowBanner(false);
  };

  const handleDeclineOptional = () => {
    acceptNecessaryOnly();
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    saveCookiePreferences(preferences);
    setShowBanner(false);
  };

  const handleOpenSettings = () => {
    // Load current preferences if they exist
    const current = getCookiePreferences();
    if (current) {
      setPreferences({
        functional: current.functional,
        analytics: current.analytics,
        marketing: current.marketing,
      });
    }
    setShowSettings(true);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[70] p-4 print:hidden">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-xl border border-slate-200">
        {/* Main Banner */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
              <Cookie size={20} className="text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 leading-relaxed">
                {t('message')}{' '}
                <Link href="/privacy" className="text-orange-600 hover:underline">
                  {t('learnMore')}
                </Link>
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              onClick={handleAcceptAll}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {t('acceptAll')}
            </button>
            <button
              onClick={handleDeclineOptional}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              {t('necessaryOnly')}
            </button>
            <button
              onClick={handleOpenSettings}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
            >
              <Settings size={16} />
              {t('settings')}
              {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t border-slate-200 p-4 bg-slate-50 rounded-b-xl">
            <div className="space-y-3">
              {/* Necessary - Always on */}
              <label className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-800">{t('categories.necessary')}</p>
                  <p className="text-xs text-slate-500">{t('categories.necessaryDesc')}</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-orange-500 rounded-full opacity-70 cursor-not-allowed" />
                  <div className="absolute start-1 top-1 w-4 h-4 bg-white rounded-full translate-x-4 rtl:-translate-x-4" />
                </div>
              </label>

              {/* Functional */}
              <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{t('categories.functional')}</p>
                  <p className="text-xs text-slate-500">{t('categories.functionalDesc')}</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-checked:bg-orange-500 rounded-full transition-colors" />
                  <div className="absolute start-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 peer-checked:rtl:-translate-x-4 transition-transform shadow" />
                </div>
              </label>

              {/* Analytics */}
              <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{t('categories.analytics')}</p>
                  <p className="text-xs text-slate-500">{t('categories.analyticsDesc')}</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-checked:bg-orange-500 rounded-full transition-colors" />
                  <div className="absolute start-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 peer-checked:rtl:-translate-x-4 transition-transform shadow" />
                </div>
              </label>

              {/* Marketing */}
              <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{t('categories.marketing')}</p>
                  <p className="text-xs text-slate-500">{t('categories.marketingDesc')}</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-checked:bg-orange-500 rounded-full transition-colors" />
                  <div className="absolute start-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 peer-checked:rtl:-translate-x-4 transition-transform shadow" />
                </div>
              </label>
            </div>

            <button
              onClick={handleSavePreferences}
              className="w-full mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {t('savePreferences')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
