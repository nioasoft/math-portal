# Action Required: Multi-Language Support (i18n)

Manual steps that must be completed by a human. These cannot be automated.

## Before Implementation

No manual steps required before implementation.

## During Implementation

No manual steps required during implementation.

## After Implementation

- [ ] **Set up GSC URL prefix properties** - Create Google Search Console properties for `/en/`, `/ar/`, `/de/`, `/es/` paths to monitor indexing per language
- [ ] **Submit sitemaps to GSC** - Submit the updated sitemap with all language URLs to each GSC property
- [ ] **Create GA4 custom dimension** - In GA4 Admin > Custom definitions, create `content_language` dimension for tracking
- [ ] **Review translations for quality** - Have native speakers or domain experts review translated content for accuracy
- [ ] **Monitor GSC hreflang report** - Check Enhancements > Hreflang in GSC for any errors after deployment

---

> **Note:** These tasks are also listed in context within `implementation-plan.md`
