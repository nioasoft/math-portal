import type { Metadata, Viewport } from "next";
import { Assistant, Noto_Sans_Arabic, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { CookieConsent } from "@/components/CookieConsent";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { GoogleAdsense } from "@/components/GoogleAdsense";
import { locales, localeConfig, defaultLocale, type Locale } from "@/i18n/config";
import { BASE_URL, getSiteName, getOrganizationName, getEducationalLevels } from "@/lib/seo";

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
};

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fontByLocale: Record<Locale, string> = {
  he: assistant.variable,
  ar: notoArabic.variable,
  en: inter.variable,
  de: inter.variable,
  es: inter.variable,
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Generate hreflang alternates for the root layout (locale-aware canonical)
function generateAlternates(locale: Locale): Metadata['alternates'] {
  const languages: Record<string, string> = {};

  for (const l of locales) {
    if (l === defaultLocale) {
      languages[l] = BASE_URL;
    } else {
      languages[l] = `${BASE_URL}/${l}`;
    }
  }
  languages['x-default'] = BASE_URL;

  return {
    canonical: locale === defaultLocale ? BASE_URL : `${BASE_URL}/${locale}`,
    languages,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'meta' });
  const siteName = getSiteName(locale as Locale);
  const ogLocale = localeConfig[locale as Locale].locale;
  const canonicalUrl = locale === defaultLocale ? BASE_URL : `${BASE_URL}/${locale}`;

  return {
    metadataBase: new URL("https://www.tirgul.net"),
    title: {
      default: t('site.title'),
      template: `%s | ${siteName}`,
    },
    description: t('site.description'),
    keywords: t('site.keywords'),
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: siteName,
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
      title: t('site.title'),
      description: t('site.description'),
      url: canonicalUrl,
      siteName: siteName,
      locale: ogLocale,
      type: "website",
      images: [
        {
          url: "https://www.tirgul.net/opengraph-image.jpg",
          width: 1424,
          height: 752,
          alt: t('site.title'),
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('site.title'),
      description: t('site.description'),
      images: ['https://www.tirgul.net/opengraph-image.jpg'],
    },
    alternates: generateAlternates(locale as Locale),
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client side
  const messages = await getMessages();
  // Type assertion for accessing nested message properties
  const metaMessages = messages.meta as { site?: { description?: string } } | undefined;
  const siteDescription = metaMessages?.site?.description || "Educational math worksheets portal for grades 1-6";

  const { dir } = localeConfig[locale as Locale];
  const fontVar = fontByLocale[locale as Locale];

  const orgName = getOrganizationName(locale as Locale);
  const eduLevels = getEducationalLevels(locale as Locale);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: orgName,
    alternateName: "Tirgul",
    url: "https://www.tirgul.net",
    logo: "https://www.tirgul.net/logo.png",
    description: siteDescription,
    sameAs: [],
    areaServed: {
      "@type": "Country",
      name: "Israel",
    },
    knowsLanguage: ["he", "en", "ar", "de", "es"],
    availableLanguage: locales.map((l) => ({
      "@type": "Language",
      name: localeConfig[l].name,
      alternateName: l,
    })),
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: orgName,
    url: "https://www.tirgul.net",
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://www.tirgul.net/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  const educationalOrganizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: orgName,
    url: "https://www.tirgul.net",
    description: siteDescription,
    offers: {
      "@type": "Offer",
      priceCurrency: "ILS",
      price: "0",
      availability: "https://schema.org/InStock",
      description: siteDescription,
    },
    educationalLevel: eduLevels,
    areaServed: {
      "@type": "Country",
      name: "Israel",
    },
    inLanguage: locale,
  };

  // Safely serialize JSON for script tags
  const orgSchemaJson = JSON.stringify(organizationSchema);
  const webSchemaJson = JSON.stringify(websiteSchema);
  const eduSchemaJson = JSON.stringify(educationalOrganizationSchema);

  return (
    <html lang={locale} dir={dir} className={fontVar}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: orgSchemaJson }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: webSchemaJson }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: eduSchemaJson }}
        />
      </head>
      <body
        className={`${fontVar} antialiased font-sans bg-slate-50 text-slate-900`}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
          <PWAInstallBanner />
          <CookieConsent />
        </NextIntlClientProvider>
        {/* Conditional scripts - load only after consent */}
        <GoogleAnalytics locale={locale} />
        <GoogleAdsense />
      </body>
    </html>
  );
}
