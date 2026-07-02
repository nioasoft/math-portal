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
}

/**
 * Fires the site's primary conversion. Mark `print_worksheet` as a GA4 key event
 * in Admin so a print flips the session to "engaged" (not a bounce).
 */
export function trackPrintEvent(params: PrintEventParams): void {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'print_worksheet', {
            value: 1,
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
