'use client';

import { useRef, useState } from 'react';
import { trackPrintEvent, type PrintEventParams } from './analytics';

/** Wait for embedded fonts, avoid duplicate dialogs, and report print preparation failures. */
export function useWorksheetPrint(params: PrintEventParams): {
    onPrint: () => Promise<void>;
    printing: boolean;
    printError: boolean;
} {
    const pending = useRef(false);
    const [printing, setPrinting] = useState(false);
    const [printError, setPrintError] = useState(false);
    const onPrint = async () => {
        if (pending.current) return;
        pending.current = true;
        setPrinting(true);
        setPrintError(false);
        const start = performance.now();
        try {
            await document.fonts.ready;
            // Analytics records a dialog request, not proof of a completed physical print.
            try {
                trackPrintEvent({ ...params,
                    page_count: document.querySelectorAll('.worksheet-page').length,
                    answer_pages: document.querySelectorAll('.worksheet-page[data-answers="true"]').length,
                    preparation_ms: Math.round(performance.now() - start),
                });
            } catch (error) {
                console.error('Worksheet print analytics failed', { type: params.worksheet_type, error });
            }
            window.print();
        } catch (error) {
            console.error('Worksheet print preparation failed', { type: params.worksheet_type, error });
            setPrintError(true);
        } finally {
            pending.current = false;
            setPrinting(false);
        }
    };
    return { onPrint, printing, printError };
}
