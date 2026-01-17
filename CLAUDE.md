# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Math Portal (Smart Worksheets / דפי עבודה חכמים) is a Hebrew-language educational platform for generating printable math worksheets. Built with Next.js 16, React 19, and Tailwind CSS 4.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint with Next.js TypeScript rules
npm run start    # Start production server
```

## Architecture

### Route Structure (App Router)
- `/` - Homepage with topic cards linking to generators
- `/grade/[id]` - Grade-specific topic pages (1-6, using Hebrew letters א-ו)
- `/worksheet/math` - Basic math worksheet generator (add/sub/mul/div)
- `/fractions`, `/geometry`, `/percentage`, `/decimals`, `/ratio`, `/units`, `/series` - Specialized worksheet generators
- `/blog/[slug]` - Blog posts (static generation from `blog-data.ts`)
- `/about` - About page

### Key Patterns

**Worksheet Generators**: Each topic has a client component in `src/components/worksheet/` that:
1. Uses `'use client'` directive for interactivity
2. Manages problem state with useState
3. Generates problems using engines from `src/lib/`
4. Provides print-optimized A4 layout with `print:` Tailwind utilities
5. Includes URL query param sync for operation/range settings
6. Has show/hide answers toggle

**Math Engines** (`src/lib/`):
- `math-engine.ts` - Basic arithmetic (MathEngine class)
- `word-problem-engine.ts` - Word problem generation
- `curriculum.ts` - Grade-level topic definitions (CURRICULUM object)
- `blog-data.ts` - Static blog content

**Layout Components** (`src/components/layout/`):
- `Header.tsx`, `Footer.tsx` - Shared across pages
- `ContentSection.tsx` - SEO content blocks below worksheets

### Styling
- Tailwind CSS 4 with `@import "tailwindcss"` in globals.css
- RTL layout: `dir="rtl"` and `lang="he"` on html element
- Font: Assistant (Hebrew/Latin) via next/font/google
- Print styles in globals.css with `@media print` and `print:` utilities
- Custom `.container-custom` class for consistent max-width

### Static Generation
- Grade pages use `generateStaticParams()` for grades 1-6
- Blog pages use `generateStaticParams()` from `blogPosts` array
- React Compiler enabled (`reactCompiler: true` in next.config.ts)

## Conventions

- Path alias: `@/*` maps to `./src/*`
- Division operator displays as `:` (Israeli notation) not `/`
- Worksheets target A4 paper size with proper print margins
- All user-facing text is in Hebrew
