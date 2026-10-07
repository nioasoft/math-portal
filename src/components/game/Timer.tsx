'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';

interface TimerProps {
    timeRemaining: number;
    onTick: () => void;
    isActive: boolean;
}

export default function Timer({ timeRemaining, onTick, isActive }: TimerProps) {
    const t = useTranslations('games');
    // Read through a ref so the interval below can depend on `isActive` alone.
    // Depending on `timeRemaining` tore the interval down and rebuilt it every
    // tick, so each second lasted a second plus a render and the countdown
    // drifted late.
    const onTickRef = useRef(onTick);

    useEffect(() => {
        onTickRef.current = onTick;
    }, [onTick]);

    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => onTickRef.current(), 1000);
        return () => clearInterval(interval);
    }, [isActive]);

    // Format time as MM:SS
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Color based on time remaining
    const isLow = timeRemaining <= 10;
    const isMedium = timeRemaining <= 30 && timeRemaining > 10;

    return (
        <div
            role="timer"
            className={`
                flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xl font-bold transition-colors
                ${isLow ? 'bg-red-500/20 text-red-400 animate-pulse' : ''}
                ${isMedium ? 'bg-orange-500/20 text-orange-400' : ''}
                ${!isLow && !isMedium ? 'bg-slate-700/50 text-white' : ''}
            `}
        >
            <Clock className={`w-5 h-5 ${isLow ? 'animate-bounce' : ''}`} aria-hidden="true" />
            <span className="sr-only font-sans">{t('timer.timeLeft')}: </span>
            <span>{formattedTime}</span>
        </div>
    );
}
