import { afterEach, expect, it, vi } from 'vitest';
import { trackDiscoveryEvent } from '../analytics';
afterEach(() => { delete window.gtag; vi.restoreAllMocks(); });
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
