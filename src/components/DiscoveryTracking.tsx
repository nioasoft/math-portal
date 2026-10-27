'use client';

import { useEffect } from 'react';
import { trackDiscoveryEvent } from '@/lib/analytics';

/** Only explicit static identifiers are tracked, never link text or user input. */
export function DiscoveryTracking(): null {
    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (!(event.target instanceof Element)) return;
            const link = event.target.closest<HTMLAnchorElement>('a[data-discovery-source][data-discovery-target]');
            if (link) trackDiscoveryEvent(link.dataset.discoverySource || '', link.dataset.discoveryTarget || '');
        };
        document.addEventListener('click', onClick);
        return () => document.removeEventListener('click', onClick);
    }, []);
    return null;
}
