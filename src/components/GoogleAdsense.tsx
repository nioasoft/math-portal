'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { isCategoryAllowed } from '@/lib/cookie-consent';

const ADSENSE_CLIENT_ID = 'ca-pub-6003915008533848';

export function GoogleAdsense() {
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    // Check initial consent state
    const checkConsent = () => {
      setIsAllowed(isCategoryAllowed('marketing'));
    };

    checkConsent();

    // Listen for consent updates
    const handleConsentUpdate = () => {
      checkConsent();
    };

    window.addEventListener('cookieConsentUpdate', handleConsentUpdate);
    return () => window.removeEventListener('cookieConsentUpdate', handleConsentUpdate);
  }, []);

  if (!isAllowed) {
    return null;
  }

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}
