// Cookie consent categories and utilities

export type CookieCategory = 'necessary' | 'functional' | 'analytics' | 'marketing';

export interface CookiePreferences {
  necessary: boolean; // Always true, cannot be disabled
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp?: number;
}

const COOKIE_NAME = 'cookie_consent';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

// Parse cookie consent from cookie string
function parseCookieConsent(cookieValue: string): CookiePreferences | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue));
    return {
      necessary: true, // Always true
      functional: Boolean(parsed.functional),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

// Get current cookie preferences (client-side only)
export function getCookiePreferences(): CookiePreferences | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === COOKIE_NAME && value) {
      return parseCookieConsent(value);
    }
  }
  return null;
}

// Check if user has made a consent choice
export function hasConsentChoice(): boolean {
  return getCookiePreferences() !== null;
}

// Check if a specific category is allowed
export function isCategoryAllowed(category: CookieCategory): boolean {
  if (category === 'necessary') return true;

  const prefs = getCookiePreferences();
  if (!prefs) return false;

  return prefs[category] === true;
}

// Save cookie preferences (called from component)
export function saveCookiePreferences(preferences: Omit<CookiePreferences, 'necessary' | 'timestamp'>): void {
  if (typeof document === 'undefined') return;

  const fullPreferences: CookiePreferences = {
    necessary: true,
    ...preferences,
    timestamp: Date.now(),
  };

  const value = encodeURIComponent(JSON.stringify(fullPreferences));
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;

  // Dispatch custom event so other components can react
  window.dispatchEvent(new CustomEvent('cookieConsentUpdate', { detail: fullPreferences }));
}

// Accept all cookies
export function acceptAllCookies(): void {
  saveCookiePreferences({
    functional: true,
    analytics: true,
    marketing: true,
  });
}

// Accept only necessary cookies (decline optional)
export function acceptNecessaryOnly(): void {
  saveCookiePreferences({
    functional: false,
    analytics: false,
    marketing: false,
  });
}

// Get default preferences for initial state
export function getDefaultPreferences(): CookiePreferences {
  return { ...DEFAULT_PREFERENCES };
}
