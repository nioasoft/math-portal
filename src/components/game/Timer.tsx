'use client';

import { useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
    timeRemaining: number;
    onTick: () => void;
    isActive: boolean;
}

export default function Timer({ timeRemaining, onTick, isActive }: TimerProps) {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isActive && timeRemaining > 0) {
            intervalRef.current = setInterval(() => {
                onTick();
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isActive, timeRemaining, onTick]);

    // Format time as MM:SS
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Color based on time remaining
    const isLow = timeRemaining <= 10;
    const isMedium = timeRemaining <= 30 && timeRemaining > 10;

    return (
        <div
            className={`
                flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xl font-bold transition-colors
                ${isLow ? 'bg-red-500/20 text-red-400 animate-pulse' : ''}
                ${isMedium ? 'bg-orange-500/20 text-orange-400' : ''}
                ${!isLow && !isMedium ? 'bg-slate-700/50 text-white' : ''}
            `}
        >
            <Clock className={`w-5 h-5 ${isLow ? 'animate-bounce' : ''}`} />
            <span>{formattedTime}</span>
        </div>
    );
}
