'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[Global Error]', error);
    }, [error]);

    return (
        <html lang="he" dir="rtl">
            <body className="antialiased font-sans bg-slate-50 text-slate-900">
                <div className="min-h-screen flex items-center justify-center px-4">
                    <div className="text-center max-w-lg">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                            <span className="text-4xl">⚠️</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-3">
                            משהו השתבש
                        </h1>
                        <p className="text-slate-600 mb-8">
                            אירעה שגיאה בלתי צפויה. נסו לרענן את הדף.
                        </p>
                        <button
                            onClick={reset}
                            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl
                                       shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300
                                       transition-all duration-300 hover:-translate-y-0.5 px-6 py-3"
                        >
                            נסו שוב
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
