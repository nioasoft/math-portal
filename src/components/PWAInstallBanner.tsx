'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Cached server snapshots to avoid infinite loops with useSyncExternalStore
const serverIsIOS = false;
const serverBannerState = { shouldShow: false, isStandalone: false };

// Cached client snapshots (computed once)
let cachedIsIOS: boolean | null = null;
function getClientIsIOS(): boolean {
    if (cachedIsIOS === null) {
        cachedIsIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    }
    return cachedIsIOS;
}

let cachedBannerState: { shouldShow: boolean; isStandalone: boolean } | null = null;
function getClientBannerState(): { shouldShow: boolean; isStandalone: boolean } {
    if (cachedBannerState === null) {
        // Only show on mobile devices
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || (window.innerWidth <= 768 && 'ontouchstart' in window);

        if (!isMobile) {
            cachedBannerState = { shouldShow: false, isStandalone: false };
            return cachedBannerState;
        }

        // Check if already installed (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

        if (isStandalone) {
            cachedBannerState = { shouldShow: false, isStandalone: true };
            return cachedBannerState;
        }

        // Check if user dismissed the banner today
        const dismissed = localStorage.getItem('pwa-banner-dismissed');
        if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const today = new Date();
            if (dismissedDate.toDateString() === today.toDateString()) {
                cachedBannerState = { shouldShow: false, isStandalone: false };
                return cachedBannerState;
            }
        }

        cachedBannerState = { shouldShow: true, isStandalone: false };
    }
    return cachedBannerState;
}

// Detect iOS device - client-only detection using useSyncExternalStore
function useIsIOS(): boolean {
    return useSyncExternalStore(
        () => () => {}, // subscribe - no-op
        getClientIsIOS, // client - cached
        () => serverIsIOS // server - cached
    );
}

// Detect if should show banner - client-only
function useShouldShowBanner(): { shouldShow: boolean; isStandalone: boolean } {
    return useSyncExternalStore(
        () => () => {},
        getClientBannerState, // client - cached
        () => serverBannerState // server - cached
    );
}

export function PWAInstallBanner() {
    const [showBanner, setShowBanner] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const t = useTranslations('common');

    const isIOS = useIsIOS();
    const { shouldShow, isStandalone } = useShouldShowBanner();

    useEffect(() => {
        if (!shouldShow || isStandalone) {
            return;
        }

        // For iOS, show banner after a delay
        if (isIOS) {
            const timer = setTimeout(() => setShowBanner(true), 3000);
            return () => clearTimeout(timer);
        }

        // For Android/Chrome, listen for install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setTimeout(() => setShowBanner(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, [shouldShow, isStandalone, isIOS]);

    const handleInstallClick = useCallback(async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowBanner(false);
            }
            setDeferredPrompt(null);
        }
    }, [isIOS, deferredPrompt]);

    const handleDismiss = useCallback(() => {
        setShowBanner(false);
        setShowIOSInstructions(false);
        localStorage.setItem('pwa-banner-dismissed', new Date().toISOString());
    }, []);

    if (!showBanner) return null;

    // iOS Instructions Modal
    if (showIOSInstructions) {
        return (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-md bg-white rounded-t-3xl rounded-b-xl p-6 shadow-2xl animate-slide-up">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-800">{t('pwa.installOnIphone')}</h3>
                        <button
                            onClick={handleDismiss}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            aria-label={t('pwa.close')}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                            <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-sky-600 font-bold">1</span>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 mb-1">{t('pwa.step1Title')}</p>
                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                    <Share size={18} className="text-sky-500" />
                                    <span>{t('pwa.step1Desc')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                            <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-sky-600 font-bold">2</span>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 mb-1">{t('pwa.step2Title')}</p>
                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                    <Plus size={18} className="text-sky-500" />
                                    <span>{t('pwa.step2Desc')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                            <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-sky-600 font-bold">3</span>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 mb-1">{t('pwa.step3Title')}</p>
                                <p className="text-slate-500 text-sm">{t('pwa.step3Desc')}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="w-full mt-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        {t('pwa.gotIt')}
                    </button>
                </div>
            </div>
        );
    }

    // Main Banner
    return (
        <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 pb-safe">
            <div className="max-w-md mx-auto bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-2xl shadow-orange-500/30 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Download size={24} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm">{t('pwa.installApp')}</p>
                    <p className="text-white/80 text-xs">{t('pwa.quickAccess')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleInstallClick}
                        className="px-4 py-2 bg-white text-orange-600 font-bold text-sm rounded-xl hover:bg-orange-50 transition-colors"
                    >
                        {t('pwa.install')}
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        aria-label={t('pwa.close')}
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
