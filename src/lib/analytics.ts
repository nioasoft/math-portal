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

export function trackPrintEvent(params: PrintEventParams): void {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'print_worksheet', {
            event_category: 'engagement',
            event_label: params.worksheet_type,
            worksheet_type: params.worksheet_type,
            difficulty: params.difficulty || 'default',
            operation: params.operation || 'mixed',
            range: params.range || 0,
        });
    }
}

export function trackGenerateEvent(params: PrintEventParams): void {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'generate_worksheet', {
            event_category: 'engagement',
            event_label: params.worksheet_type,
            worksheet_type: params.worksheet_type,
            difficulty: params.difficulty || 'default',
            operation: params.operation || 'mixed',
            range: params.range || 0,
        });
    }
}

export function trackNavigationEvent(from: string, to: string): void {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'navigation', {
            event_category: 'navigation',
            from_page: from,
            to_page: to,
        });
    }
}
