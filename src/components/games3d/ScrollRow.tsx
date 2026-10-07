'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isRtlLocale, type Locale } from '@/i18n/config';

interface ScrollRowProps {
  children: React.ReactNode;
  /** Classes for the scroller itself — layout only (`flex gap-4 snap-x pb-3`). */
  className?: string;
}

/** Distance from either edge at which the fade stops, in rem. */
const FADE = 2.5;

/**
 * Horizontal card/chip row with a real overflow affordance. `scrollbar-hide`
 * removes the only hint that a row continues off-screen, so this fades the
 * clipped edge with a mask (background-agnostic, unlike a gradient overlay on
 * top of the purple Games Hub) and adds prev/next buttons from `md:` up —
 * phones swipe, so floating buttons there would only cover cards.
 */
export function ScrollRow({ children, className }: ScrollRowProps) {
  const t = useTranslations('games3d');
  const locale = useLocale() as Locale;
  const rtl = isRtlLocale(locale);
  const ref = useRef<HTMLDivElement>(null);
  // Both false initially: a row that fits is the common case and needs no fade.
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth;
    // `scrollLeft` runs negative in RTL, so distance travelled is its magnitude.
    const travelled = Math.abs(el.scrollLeft);
    const next = { start: travelled > 1, end: overflow - travelled > 1 };
    setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(measure);
    // Children resize (webfonts, images) and come and go (catalog filters), and
    // the container alone reports neither, so track the row's whole subtree.
    const observeAll = () => {
      ro.disconnect();
      ro.observe(el);
      for (const child of el.children) ro.observe(child);
    };
    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(el, { childList: true });

    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, [measure]);

  const scrollPage = (direction: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // `scrollBy` is physical, so flip it in RTL: +1 always means "toward the end".
    el.scrollBy({
      left: direction * el.clientWidth * 0.8 * (rtl ? -1 : 1),
      behavior: reduce ? 'auto' : 'smooth',
    });
  };

  const mask = `linear-gradient(to ${rtl ? 'left' : 'right'}, ${edges.start ? 'transparent' : 'black'}, black ${FADE}rem, black calc(100% - ${FADE}rem), ${edges.end ? 'transparent' : 'black'})`;
  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;
  const arrow =
    'absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md backdrop-blur transition-colors hover:text-brand focus-visible:text-brand md:flex';

  return (
    <div className="relative">
      <div
        ref={ref}
        className={`overflow-x-auto scrollbar-hide ${className ?? ''}`}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {children}
      </div>

      {edges.start && (
        <button type="button" onClick={() => scrollPage(-1)} aria-label={t('scrollPrev')} className={`${arrow} start-2`}>
          <PrevIcon size={22} strokeWidth={2.5} />
        </button>
      )}
      {edges.end && (
        <button type="button" onClick={() => scrollPage(1)} aria-label={t('scrollNext')} className={`${arrow} end-2`}>
          <NextIcon size={22} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
