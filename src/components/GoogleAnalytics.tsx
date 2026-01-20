'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { isCategoryAllowed } from '@/lib/cookie-consent';

const GA_MEASUREMENT_ID = 'G-PL0WLGMMHH';

interface GoogleAnalyticsProps {
  locale: string;
}

export function GoogleAnalytics({ locale }: GoogleAnalyticsProps) {
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    // Check initial consent state
    const checkConsent = () => {
      setIsAllowed(isCategoryAllowed('analytics'));
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
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            custom_map: { dimension1: 'content_language' }
          });
          gtag('set', 'content_language', '${locale}');
        `}
      </Script>
    </>
  );
}
