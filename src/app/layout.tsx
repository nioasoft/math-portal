import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.smart-worksheets.co.il'),
  title: {
    default: "דפי עבודה בחשבון להדפסה - מחולל תרגילים לכיתות א׳-ו׳",
    template: "%s | דפי עבודה חכמים"
  },
  description: "מחולל דפי עבודה חכם המאפשר יצירת דפי תרגול בחשבון והנדסה מותאמים אישית. תרגול 4 פעולות חשבון, שברים, אחוזים, הנדסה ועוד. חינם וללא הרשמה.",
  keywords: ["דפי עבודה בחשבון", "דפי עבודה להדפסה", "תרגילי חשבון", "חשבון לכיתה א", "חשבון לכיתה ב", "מחולל דפי עבודה", "דפי עבודה בשברים", "דפי עבודה באחוזים"],
  openGraph: {
    title: "דפי עבודה בחשבון להדפסה - חינם וללא הרשמה",
    description: "צרו דפי עבודה מותאמים אישית בחשבון והנדסה בקלות. מתאים למורים, הורים ותלמידים.",
    url: 'https://www.smart-worksheets.co.il',
    siteName: 'Smart Worksheets',
    locale: 'he_IL',
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Smart Worksheets - דפי עבודה חכמים',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
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
    "alternateName": "Smart Worksheets",
    "url": "https://www.smart-worksheets.co.il",
    "logo": "https://www.smart-worksheets.co.il/logo.png",
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
    "url": "https://www.smart-worksheets.co.il",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://www.smart-worksheets.co.il/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  const educationalOrganizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "דפי עבודה חכמים",
    "url": "https://www.smart-worksheets.co.il",
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
      </body>
    </html>
  );
}
