# Requirements: Multi-Language Support (i18n)

## Overview

Transform tirgul.net from a Hebrew-only educational platform to a multi-language site supporting 5 languages: Hebrew (default), English, Arabic, German, and Spanish.

## Goals

1. **Global Reach**: Expand user base beyond Hebrew speakers
2. **SEO Optimization**: Proper international SEO with hreflang, localized sitemaps
3. **AdSense Readiness**: Multi-language content for global ad inventory
4. **User Experience**: Seamless language switching while preserving context

## Target Languages

| Language | Code | Direction | Priority |
|----------|------|-----------|----------|
| Hebrew | `he` | RTL | 1 (default) |
| English | `en` | LTR | 2 |
| Arabic | `ar` | RTL | 3 |
| German | `de` | LTR | 4 |
| Spanish | `es` | LTR | 5 |

## Functional Requirements

### URL Structure
- Hebrew stays at root: `tirgul.net/fractions` (preserves existing backlinks)
- Other languages use prefix: `tirgul.net/en/fractions`, `tirgul.net/ar/fractions`
- Language detection order: URL → Cookie → Accept-Language header → Default (Hebrew)

### Content to Translate
- **UI strings**: ~200 strings (navigation, buttons, labels, form messages)
- **Worksheet generators**: Operation names, instructions, print labels
- **Games**: Feedback messages, score labels, game summaries
- **Blog posts**: 18 articles (~15,000-20,000 words)
- **Help topics**: 14 topics (~8,000-10,000 words)
- **Curriculum**: Grade names, topic titles and descriptions
- **SEO metadata**: Titles, descriptions, keywords for all pages

### Math Notation by Region
| Operation | Israel/Germany | US/UK/Spain |
|-----------|----------------|-------------|
| Division | `:` | `÷` |
| Decimal | `.` | `.` (US/UK), `,` (Germany/Spain) |
| Thousands | `,` | `,` (US/UK), `.` (Germany/Spain) |

### Language Switcher
- Visible in header on all pages
- Shows language name in native script (עברית, English, العربية, Deutsch, Español)
- Navigates to same page in selected language
- Stores preference in cookie

## SEO Requirements

### hreflang Tags
Every page must include hreflang tags for all language variants plus x-default:
```html
<link rel="alternate" hreflang="he" href="https://www.tirgul.net/fractions" />
<link rel="alternate" hreflang="en" href="https://www.tirgul.net/en/fractions" />
<link rel="alternate" hreflang="x-default" href="https://www.tirgul.net/fractions" />
```

### Sitemap
- Include all language URLs
- Add `xhtml:link` alternates in sitemap entries
- Submit to GSC for each language

### Schema.org
- Add `availableLanguage` to Organization schema
- Add `inLanguage` to Article and WebPage schemas

### Canonical URLs
- Self-referencing canonicals per language (no cross-language canonicals)

## Non-Functional Requirements

### Performance
- Static generation (SSG) for all language variants
- Separate cache per language
- Lazy load non-critical translations

### Maintainability
- Translations in JSON files, not hardcoded
- Single source of truth for each content piece
- Easy to add new languages in future

### Accessibility
- Correct `lang` and `dir` attributes on HTML
- Appropriate fonts per language (RTL support for Hebrew/Arabic)

## Acceptance Criteria

1. [ ] All existing Hebrew URLs continue to work (no broken backlinks)
2. [ ] Every page accessible in all 5 languages
3. [ ] Language switcher works on all pages
4. [ ] RTL/LTR layout correct per language
5. [ ] Math notation correct per language/region
6. [ ] hreflang tags present and valid on all pages
7. [ ] Sitemap includes all language URLs
8. [ ] Google Search Console shows no hreflang errors
9. [ ] Build completes successfully with all languages
10. [ ] Print worksheets work correctly in all languages

## Dependencies

- `next-intl` library for i18n
- Fonts: Assistant (Hebrew), Noto Sans Arabic (Arabic), Inter (Latin languages)

## Related Features

- Future: RTL-specific UI polish for Arabic
- Future: Country-specific curriculum variations
