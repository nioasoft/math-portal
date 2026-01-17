import type { Metadata, Viewport } from "next";
import { Assistant } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.tirgul.net'),
  title: {
    default: "דפי עבודה בחשבון להדפסה - מחולל תרגילים לכיתות א׳-ו׳",
    template: "%s | דפי עבודה חכמים"
  },
  description: "מחולל דפי עבודה חכם המאפשר יצירת דפי תרגול בחשבון והנדסה מותאמים אישית. תרגול 4 פעולות חשבון, שברים, אחוזים, הנדסה ועוד. חינם וללא הרשמה.",
  keywords: ["דפי עבודה בחשבון", "דפי עבודה להדפסה", "תרגילי חשבון", "חשבון לכיתה א", "חשבון לכיתה ב", "מחולל דפי עבודה", "דפי עבודה בשברים", "דפי עבודה באחוזים"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "דפי עבודה חכמים",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "דפי עבודה בחשבון להדפסה - חינם וללא הרשמה",
    description: "צרו דפי עבודה מותאמים אישית בחשבון והנדסה בקלות. מתאים למורים, הורים ותלמידים.",
    url: 'https://www.tirgul.net',
    siteName: 'תרגול - דפי עבודה במתמטיקה',
    locale: 'he_IL',
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'תרגול - דפי עבודה במתמטיקה',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "mobile-web-app-capable": "yes",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "דפי עבודה חכמים",
    "alternateName": "Tirgul",
    "url": "https://www.tirgul.net",
    "logo": "https://www.tirgul.net/logo.png",
    "description": "פורטל דפי עבודה חינוכיים בחשבון לכיתות א-ו",
    "sameAs": [],
    "areaServed": {
      "@type": "Country",
      "name": "Israel"
    },
    "knowsLanguage": "he"
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "דפי עבודה חכמים",
    "url": "https://www.tirgul.net",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://www.tirgul.net/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  const educationalOrganizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "דפי עבודה חכמים",
    "url": "https://www.tirgul.net",
    "description": "פלטפורמה חינוכית לייצור דפי עבודה בחשבון מותאמים אישית לכיתות א-ו",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "ILS",
      "price": "0",
      "availability": "https://schema.org/InStock",
      "description": "דפי עבודה בחשבון, שברים, אחוזים, גאומטריה, יחסים, סדרות חשבוניות ובעיות מילוליות - חינם וללא הרשמה"
    },
    "educationalLevel": ["כיתה א", "כיתה ב", "כיתה ג", "כיתה ד", "כיתה ה", "כיתה ו"],
    "areaServed": {
      "@type": "Country",
      "name": "Israel"
    },
    "inLanguage": "he"
  };

  return (
    <html lang="he" dir="rtl">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PL0WLGMMHH"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PL0WLGMMHH');
          `}
        </Script>
      </head>
      <body
        className={`${assistant.variable} antialiased font-sans bg-slate-50 text-slate-900`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema)
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema)
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(educationalOrganizationSchema)
          }}
        />
        {children}
        <PWAInstallBanner />
      </body>
    </html>
  );
}
