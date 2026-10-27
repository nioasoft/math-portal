import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { trackDiscoveryEvent, trackPrintEvent, trackGenerateEvent, trackGameStart, trackGameComplete } from '../analytics';
beforeEach(() => { document.cookie = `cookie_consent=${encodeURIComponent(JSON.stringify({ analytics: true }))};path=/`; });
afterEach(() => { document.cookie = 'cookie_consent=;max-age=0;path=/'; delete window.gtag; vi.restoreAllMocks(); });
it('tracks static source and target only', () => {
    window.gtag = vi.fn();
    trackDiscoveryEvent('home', 'worksheets');
    expect(window.gtag).toHaveBeenCalledWith('event', 'discover_activity', { source: 'home', target: 'worksheets' });
});
it('rejects text, URLs and unexpected sources', () => {
    window.gtag = vi.fn();
    trackDiscoveryEvent('home', 'שם הילד');
    trackDiscoveryEvent('home', '/worksheet?name=private');
    trackDiscoveryEvent('unknown', 'worksheets');
    expect(window.gtag).not.toHaveBeenCalled();
});
it('remains usable without analytics or when analytics throws', () => {
    expect(() => trackDiscoveryEvent('home', 'worksheets')).not.toThrow();
    window.gtag = vi.fn(() => { throw new Error('Unavailable'); });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => trackDiscoveryEvent('home', 'worksheets')).not.toThrow();
});
it('does not send discovery after consent is revoked while gtag is still loaded', () => {
    window.gtag = vi.fn();
    document.cookie = `cookie_consent=${encodeURIComponent(JSON.stringify({ analytics: true }))};path=/`;
    trackDiscoveryEvent('home', 'worksheets');
    document.cookie = `cookie_consent=${encodeURIComponent(JSON.stringify({ analytics: false }))};path=/`;
    trackDiscoveryEvent('home', 'games');
    expect(window.gtag).toHaveBeenCalledTimes(1);
});

it('blocks all activity helpers without analytics consent', () => {
    document.cookie = 'cookie_consent=;max-age=0;path=/';
    window.gtag = vi.fn();
    trackDiscoveryEvent('home', 'games');
    trackPrintEvent({ worksheet_type: 'math' });
    trackGenerateEvent({ worksheet_type: 'math' });
    trackGameStart('test');
    trackGameComplete({ gameId: 'test', score: 1, accuracy: 1, durationSec: 10 });
    expect(window.gtag).not.toHaveBeenCalled();
});
