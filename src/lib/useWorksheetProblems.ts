'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/** Random problems must be generated after hydration, never during SSR. */
export function useWorksheetProblems<T>(create: () => T[]): [T[], Dispatch<SetStateAction<T[]>>] {
    const [problems, setProblems] = useState<T[]>([]);
    useEffect(() => {
        setProblems(create());
        // The initial factory runs once; controls explicitly generate later sets.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return [problems, setProblems];
}
