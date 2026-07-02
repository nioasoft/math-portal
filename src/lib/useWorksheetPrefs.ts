'use client';

import { useEffect, useState } from 'react';
import { getWorksheetPref, setWorksheetPref } from '@/lib/game/storage';

/**
 * Boolean worksheet preference persisted to localStorage, SSR-safe.
 *
 * Initial render (server + first client render) always returns `defaultValue`
 * so server and client markup match; the stored value hydrates in an effect
 * after mount. Writes on every change.
 */
export function usePersistentToggle(
    key: string,
    defaultValue = false,
): [boolean, (value: boolean) => void] {
    const [value, setValue] = useState<boolean>(defaultValue);

    // Hydrate from storage after mount (avoids hydration mismatch).
    useEffect(() => {
        const stored = getWorksheetPref(key);
        if (stored === '1' || stored === '0') {
            setValue(stored === '1');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const set = (next: boolean): void => {
        setValue(next);
        setWorksheetPref(key, next ? '1' : '0');
    };

    return [value, set];
}
