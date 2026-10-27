// Google Analytics tracking utilities

declare global {
    interface Window {
        gtag?: (command: string, action: string, params?: Record<string, unknown>) => void;
    }
}

export type WorksheetType =
    | 'math'
    | 'fractions'
    | 'decimals'
    | 'percentage'
    | 'geometry'
    | 'ratio'
    | 'units'
    | 'series'
    | 'word-problems';

export interface PrintEventParams {
    worksheet_type: WorksheetType;
    difficulty?: string;
    operation?: string;
    range?: number;
    density?: string;
    exercise_count?: number;
    page_count?: number;
    answer_pages?: number;
    preparation_ms?: number;
}

/**
 * Fires the site's primary conversion. Mark `print_worksheet` as a GA4 key event
 * in Admin so a print flips the session to "engaged" (not a bounce).
 */
export function trackPrintEvent(params: PrintEventParams): void {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'print_worksheet', {
            value: 1,
            density: params.density,
            exercise_count: params.exercise_count,
            page_count: params.page_count,
            answer_pages: params.answer_pages,
            preparation_ms: params.preparation_ms,
            worksheet_type: params.worksheet_type,
            difficulty: params.difficulty || 'default',
            operation: params.operation || 'mixed',
            range: params.range || 0,
        });
    }
}

/**
 * Not intent — `trigger:'auto'` marks automatic on-load generation so it can be
 * filtered out in GA4. Do NOT mark this a key event.
 */
export function trackGenerateEvent(params: PrintEventParams & { trigger?: 'auto' | 'manual' }): void {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'generate_worksheet', {
            trigger: params.trigger || 'manual',
            worksheet_type: params.worksheet_type,
            difficulty: params.difficulty || 'default',
            operation: params.operation || 'mixed',
            range: params.range || 0,
        });
    }
}

/** Game engagement — mark `game_start` (optional) as a key event to rescue game landers from bounce. */
export function trackGameStart(gameId: string, mode?: string): void {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'game_start', {
            game_id: gameId,
            mode: mode || 'default',
        });
    }
}

export interface GameCompleteParams {
    gameId: string;
    mode?: string;
    score: number;
    accuracy: number;
    durationSec: number;
}

/** Secondary conversion — mark `game_complete` as a GA4 key event. `value` = points. */
export function trackGameComplete(params: GameCompleteParams): void {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'game_complete', {
            value: params.score,
            game_id: params.gameId,
            mode: params.mode || 'default',
            score: params.score,
            accuracy: params.accuracy,
            duration_sec: params.durationSec,
        });
    }
}

/** Measures intentional entry into an activity; existing consent controls still apply. */
export function trackDiscoveryEvent(source: string, target: string): void {
    if (!['header', 'footer', 'home', 'worksheet_catalog'].includes(source) || !/^[a-z0-9_-]{1,64}$/.test(target)) return;
    try {
        if (typeof window !== 'undefined') window.gtag?.('event', 'discover_activity', { source, target });
    } catch (error) {
        console.error('Activity discovery analytics failed', error);
    }
}
