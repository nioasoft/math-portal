# Implementation Plan: Multi-Language Support (i18n)

## Overview

Implement internationalization using `next-intl` with Hebrew at root URL and other languages under locale prefix. Includes full UI translation, content migration, and SEO optimization.

---

## Phase 1: Infrastructure Setup

Set up the foundational i18n architecture with next-intl.

### Tasks

- [ ] Install next-intl and configure Next.js
- [ ] Create i18n configuration files (config, navigation, request)
- [ ] Create middleware for locale detection and routing
- [ ] Create base message files structure for Hebrew
- [ ] Create `[locale]` route group with layout

### Technical Details

**Installation:**
```bash
npm install next-intl
```

**File structure to create:**
```
/src/
├── i18n/
│   ├── config.ts         # Locale definitions
│   ├── navigation.ts     # Localized Link, redirect, usePathname
│   └── request.ts        # Server-side translation loading
├── middleware.ts         # Locale detection middleware
/messages/
├── he/
│   ├── common.json       # Header, Footer, shared UI
│   ├── home.json         # Homepage strings
│   ├── worksheet.json    # Worksheet generator strings
│   ├── games.json        # Game UI strings
│   ├── math.json         # Math terms and notation
│   └── meta.json         # SEO metadata
```

**`/src/i18n/config.ts`:**
```typescript
export const locales = ['he', 'en', 'ar', 'de', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'he';
export const rtlLocales: Locale[] = ['he', 'ar'];

export const localeConfig = {
  he: { dir: 'rtl', name: 'עברית', locale: 'he_IL' },
  en: { dir: 'ltr', name: 'English', locale: 'en_US' },
  ar: { dir: 'rtl', name: 'العربية', locale: 'ar_SA' },
  de: { dir: 'ltr', name: 'Deutsch', locale: 'de_DE' },
  es: { dir: 'ltr', name: 'Español', locale: 'es_ES' },
} as const;
```

**`/src/middleware.ts`:**
```typescript
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Hebrew at root, others with prefix
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
```

**Route structure:**
- Hebrew pages stay at root (`/fractions`, `/blog/[slug]`)
- Other languages under `[locale]` (`/en/fractions`, `/ar/blog/[slug]`)
- Shared components receive locale via props or context

---

## Phase 2: Extract Hebrew UI Strings

Extract all hardcoded Hebrew text to JSON message files.

### Tasks

- [ ] Extract Header.tsx strings (~20) to common.json
- [ ] Extract Footer.tsx strings (~25) to common.json
- [ ] Extract homepage strings (~50) to home.json
- [ ] Extract FeedbackModal strings (~20) to common.json
- [ ] Create math notation config in math.json

### Technical Details

**`/messages/he/common.json` structure:**
```json
{
  "nav": {
    "home": "ראשי",
    "byGrade": "לפי כיתה",
    "games": "משחקים",
    "help": "הסברים להורים",
    "blog": "בלוג",
    "about": "אודות",
    "menu": "תפריט",
    "openMenu": "פתח תפריט",
    "closeMenu": "סגור תפריט"
  },
  "grades": {
    "grade1": "כיתה א'",
    "grade2": "כיתה ב'",
    "grade3": "כיתה ג'",
    "grade4": "כיתה ד'",
    "grade5": "כיתה ה'",
    "grade6": "כיתה ו'"
  },
  "footer": {
    "home": "דף הבית",
    "quickNav": "ניווט מהיר",
    "topics": "נושאים",
    "copyright": "© {year} דפי עבודה חכמים. כל הזכויות שמורות."
  },
  "feedback": {
    "title": "משוב",
    "type": "סוג הפנייה",
    "description": "תיאור",
    "email": "אימייל לחזרה",
    "send": "שלח",
    "success": "תודה על המשוב!",
    "error": "יש למלא את כל שדות החובה"
  },
  "siteName": "דפי עבודה חכמים"
}
```

**`/messages/he/math.json` structure:**
```json
{
  "operations": {
    "addition": "חיבור",
    "subtraction": "חיסור",
    "multiplication": "כפל",
    "division": "חילוק"
  },
  "notation": {
    "divisionSymbol": ":",
    "decimalSeparator": ".",
    "thousandsSeparator": ","
  },
  "labels": {
    "exercise": "תרגיל",
    "answer": "תשובה",
    "range": "טווח",
    "from": "מ",
    "to": "עד"
  }
}
```

**Refactoring pattern for Header.tsx:**
```typescript
// Before
<Link href="/">ראשי</Link>

// After
import { useTranslations } from 'next-intl';

export function Header() {
  const t = useTranslations('common');
  return <Link href="/">{t('nav.home')}</Link>;
}
```

---

## Phase 3: Worksheet Generators

Internationalize all worksheet generator components.

### Tasks

- [ ] Extract WorksheetClient.tsx strings to worksheet.json
- [ ] Extract FractionsClient.tsx strings
- [ ] Extract GeometryClient.tsx strings
- [ ] Extract PercentageClient.tsx strings
- [ ] Extract DecimalsClient.tsx strings
- [ ] Extract RatioClient.tsx strings
- [ ] Extract UnitsClient.tsx strings
- [ ] Extract SeriesClient.tsx strings
- [ ] Extract WordProblemsClient.tsx strings
- [ ] Implement dynamic math notation based on locale

### Technical Details

**`/messages/he/worksheet.json` structure:**
```json
{
  "controls": {
    "print": "הדפס",
    "refresh": "רענן",
    "showAnswers": "הצג תשובות",
    "hideAnswers": "הסתר תשובות",
    "settings": "הגדרות",
    "problemCount": "מספר תרגילים"
  },
  "print": {
    "title": "דף תרגול",
    "name": "שם:",
    "date": "תאריך:",
    "grade": "כיתה:",
    "answerKey": "דף תשובות"
  },
  "fractions": {
    "title": "שברים",
    "sameDenominator": "מכנה משותף",
    "differentDenominator": "מכנים שונים",
    "mixedNumbers": "מספרים מעורבים"
  },
  "geometry": {
    "title": "הנדסה",
    "perimeter": "היקף",
    "area": "שטח"
  }
}
```

**Math notation helper:**
```typescript
// /src/lib/math-notation.ts
import { Locale } from '@/i18n/config';

const notations: Record<Locale, MathNotation> = {
  he: { division: ':', decimal: '.', thousands: ',' },
  en: { division: '÷', decimal: '.', thousands: ',' },
  ar: { division: '÷', decimal: '.', thousands: ',' },
  de: { division: ':', decimal: ',', thousands: '.' },
  es: { division: '÷', decimal: ',', thousands: '.' },
};

export function getMathNotation(locale: Locale) {
  return notations[locale];
}

export function formatDivision(a: number, b: number, locale: Locale) {
  const { division } = getMathNotation(locale);
  return `${a} ${division} ${b}`;
}
```

---

## Phase 4: Games

Internationalize all game components.

### Tasks

- [ ] Extract GameShell.tsx strings to games.json
- [ ] Extract GameSummary.tsx strings
- [ ] Extract Feedback.tsx strings ("נכון!", "לא נכון")
- [ ] Extract ScoreDisplay.tsx strings
- [ ] Extract Timer.tsx strings
- [ ] Extract ProblemDisplay.tsx strings

### Technical Details

**`/messages/he/games.json` structure:**
```json
{
  "feedback": {
    "correct": "נכון!",
    "incorrect": "לא נכון",
    "tryAgain": "נסה שוב"
  },
  "summary": {
    "title": "סיום משחק",
    "score": "ניקוד",
    "maxStreak": "סטריק מקסימלי",
    "accuracy": "דיוק",
    "correctWrong": "נכון / שגוי",
    "newRecord": "שיא חדש!",
    "greatJob": "כל הכבוד על התרגול!",
    "playAgain": "שחק שוב",
    "backToMenu": "חזרה לתפריט"
  },
  "modes": {
    "practice": "תרגול",
    "quiz": "מבחן",
    "timed": "נגד הזמן"
  },
  "timer": {
    "timeLeft": "זמן נותר",
    "seconds": "שניות"
  }
}
```

---

## Phase 5: Content Migration

Migrate blog and help content to locale-aware structure.

### Tasks

- [ ] Create content folder structure for blog posts
- [ ] Migrate blog-data.ts to JSON files per locale [complex]
  - [ ] Create `/content/blog/he/` with 18 post JSON files
  - [ ] Update blog page to load from JSON by locale
  - [ ] Update blog listing to filter by locale
- [ ] Create content folder structure for help topics
- [ ] Migrate help-data.ts to JSON files per locale [complex]
  - [ ] Create `/content/help/he/` with 14 topic JSON files
  - [ ] Update help page to load from JSON by locale
- [ ] Migrate curriculum.ts to locale-aware structure

### Technical Details

**Content folder structure:**
```
/content/
├── blog/
│   ├── he/
│   │   ├── math-anxiety-tips.json
│   │   ├── multiplication-table-tricks.json
│   │   └── ... (18 files)
│   ├── en/
│   └── ...
└── help/
    ├── he/
    │   ├── addition.json
    │   ├── subtraction.json
    │   └── ... (14 files)
    ├── en/
    └── ...
```

**Blog post JSON structure (`/content/blog/he/math-anxiety-tips.json`):**
```json
{
  "slug": "math-anxiety-tips",
  "title": "10 טיפים להתמודדות עם חרדת מתמטיקה",
  "excerpt": "איך לעזור לילדים להתגבר על פחד ממתמטיקה...",
  "content": "...",
  "date": "2024-01-15",
  "lastModified": "2024-01-15",
  "category": "tips",
  "tags": ["חרדה", "הורים", "טיפים"]
}
```

**Content loading utility:**
```typescript
// /src/lib/content.ts
import { Locale } from '@/i18n/config';

export async function getBlogPost(slug: string, locale: Locale) {
  try {
    const post = await import(`@/content/blog/${locale}/${slug}.json`);
    return post.default;
  } catch {
    // Fallback to Hebrew
    const post = await import(`@/content/blog/he/${slug}.json`);
    return post.default;
  }
}

export async function getAllBlogPosts(locale: Locale) {
  // Implementation using fs or dynamic imports
}
```

**Curriculum structure (`/messages/he/curriculum.json`):**
```json
{
  "grades": {
    "1": {
      "title": "כיתה א'",
      "hebrewLetter": "א",
      "description": "צעדים ראשונים בעולם המספרים"
    }
  },
  "topics": {
    "addition": {
      "title": "חיבור",
      "description": "תרגילי חיבור"
    }
  }
}
```

---

## Phase 6: SEO Implementation

Implement comprehensive international SEO.

### Tasks

- [ ] Add hreflang tags to root layout
- [ ] Create generateAlternates helper for page metadata
- [ ] Update sitemap.ts with all language URLs and xhtml:link alternates
- [ ] Update Schema.org with availableLanguage and inLanguage
- [ ] Add GA4 language dimension tracking
- [ ] Create robots.txt rules for all locales

### Technical Details

**hreflang helper (`/src/lib/seo.ts`):**
```typescript
import { locales, defaultLocale } from '@/i18n/config';

const BASE_URL = 'https://www.tirgul.net';

export function generateAlternates(path: string, currentLocale: string) {
  const cleanPath = path.replace(/^\/(en|ar|de|es)/, '');

  const languages: Record<string, string> = {};

  for (const locale of locales) {
    if (locale === defaultLocale) {
      languages[locale] = `${BASE_URL}${cleanPath}`;
    } else {
      languages[locale] = `${BASE_URL}/${locale}${cleanPath}`;
    }
  }

  languages['x-default'] = `${BASE_URL}${cleanPath}`;

  return {
    canonical: currentLocale === defaultLocale
      ? `${BASE_URL}${cleanPath}`
      : `${BASE_URL}/${currentLocale}${cleanPath}`,
    languages,
  };
}
```

**Page metadata example:**
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = params.locale || 'he';
  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    title: t('fractions.title'),
    description: t('fractions.description'),
    alternates: generateAlternates('/fractions', locale),
    openGraph: {
      locale: localeConfig[locale].locale,
      alternateLocales: locales
        .filter(l => l !== locale)
        .map(l => localeConfig[l].locale),
    },
  };
}
```

**Updated sitemap.ts:**
```typescript
import { MetadataRoute } from 'next';
import { locales, defaultLocale } from '@/i18n/config';

const BASE_URL = 'https://www.tirgul.net';

const routes = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/fractions', changeFrequency: 'weekly', priority: 0.8 },
  // ... all routes
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    for (const locale of locales) {
      const url = locale === defaultLocale
        ? `${BASE_URL}${route.path}`
        : `${BASE_URL}/${locale}${route.path}`;

      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: Object.fromEntries(
            locales.map(l => [
              l,
              l === defaultLocale
                ? `${BASE_URL}${route.path}`
                : `${BASE_URL}/${l}${route.path}`
            ])
          ),
        },
      });
    }
  }

  return entries;
}
```

**Schema.org update:**
```typescript
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": t('siteName'),
  "availableLanguage": [
    { "@type": "Language", "name": "Hebrew", "alternateName": "he" },
    { "@type": "Language", "name": "English", "alternateName": "en" },
    { "@type": "Language", "name": "Arabic", "alternateName": "ar" },
    { "@type": "Language", "name": "German", "alternateName": "de" },
    { "@type": "Language", "name": "Spanish", "alternateName": "es" },
  ],
};
```

**GA4 language tracking:**
```typescript
gtag('config', 'G-PL0WLGMMHH', {
  custom_map: { dimension1: 'content_language' },
});
gtag('set', 'content_language', locale);
```

---

## Phase 7: Language Switcher & Fonts

Add language selection UI and proper font support.

### Tasks

- [ ] Create LanguageSwitcher component
- [ ] Add LanguageSwitcher to Header
- [ ] Configure fonts per language (Assistant, Noto Sans Arabic, Inter)
- [ ] Update root layout for dynamic dir and lang attributes

### Technical Details

**LanguageSwitcher component:**
```typescript
// /src/components/LanguageSwitcher.tsx
'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, localeConfig } from '@/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value)}
      className="bg-transparent text-sm font-medium"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeConfig[loc].name}
        </option>
      ))}
    </select>
  );
}
```

**Font configuration:**
```typescript
// /src/app/[locale]/layout.tsx
import { Assistant, Noto_Sans_Arabic } from 'next/font/google';
import { Inter } from 'next/font/google';

const assistant = Assistant({
  subsets: ['hebrew', 'latin'],
  variable: '--font-assistant',
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-arabic',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const fontByLocale = {
  he: assistant.variable,
  ar: notoArabic.variable,
  en: inter.variable,
  de: inter.variable,
  es: inter.variable,
};
```

**Dynamic layout:**
```typescript
export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { dir } = localeConfig[locale];
  const fontVar = fontByLocale[locale];

  return (
    <html lang={locale} dir={dir} className={fontVar}>
      <body>{children}</body>
    </html>
  );
}
```

---

## Phase 8: English Translation

Translate all content to English.

### Tasks

- [ ] Translate common.json (UI strings)
- [ ] Translate home.json
- [ ] Translate worksheet.json
- [ ] Translate games.json
- [ ] Translate math.json
- [ ] Translate meta.json (SEO)
- [ ] Translate curriculum content
- [ ] Translate blog posts (18 articles) [complex]
- [ ] Translate help topics (14 articles) [complex]
- [ ] QA and review English translation

### Technical Details

**Translation approach:**
- Use Claude for professional-quality translation
- Maintain educational tone appropriate for parents/teachers
- Adapt cultural references where needed
- Keep math terminology consistent with US/UK standards

**Key terminology mappings (HE → EN):**
- דפי עבודה חכמים → Smart Worksheets
- כיתה א' → Grade 1 (or 1st Grade)
- חיבור/חיסור/כפל/חילוק → Addition/Subtraction/Multiplication/Division
- שברים → Fractions
- אחוזים → Percentages

---

## Phase 9: Arabic Translation

Translate all content to Arabic.

### Tasks

- [ ] Translate common.json (UI strings)
- [ ] Translate home.json
- [ ] Translate worksheet.json
- [ ] Translate games.json
- [ ] Translate math.json
- [ ] Translate meta.json (SEO)
- [ ] Translate curriculum content
- [ ] Translate blog posts [complex]
- [ ] Translate help topics [complex]
- [ ] QA Arabic RTL layout
- [ ] QA and review Arabic translation

### Technical Details

**Arabic-specific considerations:**
- RTL layout already supported (shares with Hebrew)
- Use Modern Standard Arabic (MSA) for broad comprehension
- Arabic numerals (1, 2, 3) preferred over Hindi numerals (١, ٢, ٣) for math context
- Grade terminology: الصف الأول، الصف الثاني

---

## Phase 10: German Translation

Translate all content to German.

### Tasks

- [ ] Translate common.json (UI strings)
- [ ] Translate home.json
- [ ] Translate worksheet.json
- [ ] Translate games.json
- [ ] Translate math.json (note: German uses `:` for division, `,` for decimals)
- [ ] Translate meta.json (SEO)
- [ ] Translate curriculum content
- [ ] Translate blog posts [complex]
- [ ] Translate help topics [complex]
- [ ] QA and review German translation

### Technical Details

**German-specific considerations:**
- Division symbol: `:` (same as Hebrew)
- Decimal separator: `,` (different from Hebrew)
- Thousands separator: `.` (different from Hebrew)
- Grade terminology: Klasse 1, Klasse 2, etc.
- Formal "Sie" form for addressing users

---

## Phase 11: Spanish Translation

Translate all content to Spanish.

### Tasks

- [ ] Translate common.json (UI strings)
- [ ] Translate home.json
- [ ] Translate worksheet.json
- [ ] Translate games.json
- [ ] Translate math.json (note: Spanish uses `,` for decimals)
- [ ] Translate meta.json (SEO)
- [ ] Translate curriculum content
- [ ] Translate blog posts [complex]
- [ ] Translate help topics [complex]
- [ ] QA and review Spanish translation

### Technical Details

**Spanish-specific considerations:**
- Target neutral Spanish (understood in Spain and Latin America)
- Decimal separator: `,`
- Thousands separator: `.`
- Grade terminology: Grado 1 / 1° Grado

---

## Phase 12: Final QA & Launch

Comprehensive testing and deployment.

### Tasks

- [ ] Test all pages in all 5 languages
- [ ] Verify language switcher on all pages
- [ ] Verify RTL/LTR layouts (Hebrew, Arabic vs others)
- [ ] Verify math notation per language
- [ ] Verify print functionality in all languages
- [ ] Test hreflang with online validator
- [ ] Submit updated sitemaps to GSC
- [ ] Set up GSC URL prefix properties for each language
- [ ] Monitor GSC for hreflang errors
- [ ] Run `npm run build` and verify no errors
- [ ] Deploy to production

### Technical Details

**hreflang validation:**
- Use https://technicalseo.com/tools/hreflang-tags-checker/
- Verify bidirectional links (every page links to all variants)
- Verify x-default points to Hebrew

**GSC setup:**
1. Add URL prefix property for each language path
2. Submit language-specific sitemap to each property
3. Do NOT set international targeting (let hreflang handle it)

**Build verification:**
```bash
npm run build
# Should generate static pages for all locales
# Check for any missing translation warnings
```
