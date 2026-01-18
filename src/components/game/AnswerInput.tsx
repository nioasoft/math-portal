'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Delete, CornerDownLeft } from 'lucide-react';

interface AnswerInputProps {
    onSubmit: (answer: number) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    showFractionInput?: boolean;
}

export default function AnswerInput({ onSubmit, disabled = false, autoFocus = true, showFractionInput = false }: AnswerInputProps) {
    const [value, setValue] = useState('');
    const [numerator, setNumerator] = useState('');
    const [denominator, setDenominator] = useState('');
    const [whole, setWhole] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    // Reset when disabled changes (new problem)
    useEffect(() => {
        if (!disabled) {
            setValue('');
            setNumerator('');
            setDenominator('');
            setWhole('');
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    }, [disabled]);

    const handleSubmit = () => {
        if (disabled) return;

        if (showFractionInput) {
            // Calculate fraction value
            const w = parseInt(whole) || 0;
            const n = parseInt(numerator) || 0;
            const d = parseInt(denominator) || 1;
            if (d === 0) return;
            const answer = w + (n / d);
            if (!isNaN(answer)) {
                onSubmit(answer);
            }
        } else {
            const answer = parseFloat(value);
            if (!isNaN(answer)) {
                onSubmit(answer);
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    const handleNumberClick = (num: string) => {
        if (disabled) return;
        setValue(prev => prev + num);
        inputRef.current?.focus();
    };

    const handleBackspace = () => {
        if (disabled) return;
        setValue(prev => prev.slice(0, -1));
        inputRef.current?.focus();
    };

    const handleClear = () => {
        setValue('');
        inputRef.current?.focus();
    };

    // Simple number input (for math and percentage)
    if (!showFractionInput) {
        return (
            <div className="w-full max-w-sm mx-auto">
                {/* Input Field */}
                <div className="mb-4">
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="none"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        placeholder="הקלידו תשובה"
                        className="w-full text-center text-4xl font-bold py-4 px-6 bg-slate-700/50 border-2 border-slate-600 rounded-xl focus:border-yellow-400 focus:outline-none transition disabled:opacity-50 placeholder:text-slate-500"
                        dir="ltr"
                    />
                </div>

                {/* Number Pad (for mobile) - Standard calculator layout */}
                <div className="grid grid-cols-4 gap-2 mb-4" dir="ltr">
                    {/* Row 1: 7 8 9 ⌫ */}
                    {['7', '8', '9'].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            disabled={disabled}
                            className="p-4 text-2xl font-bold bg-slate-700/50 rounded-xl hover:bg-slate-600 active:bg-slate-500 transition disabled:opacity-50"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={handleBackspace}
                        disabled={disabled}
                        className="p-4 bg-slate-700/50 rounded-xl hover:bg-slate-600 active:bg-slate-500 transition disabled:opacity-50 flex items-center justify-center"
                        aria-label="מחק"
                    >
                        <Delete className="w-6 h-6" aria-hidden="true" />
                    </button>

                    {/* Row 2: 4 5 6 C */}
                    {['4', '5', '6'].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            disabled={disabled}
                            className="p-4 text-2xl font-bold bg-slate-700/50 rounded-xl hover:bg-slate-600 active:bg-slate-500 transition disabled:opacity-50"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={handleClear}
                        disabled={disabled}
                        className="p-4 text-xl font-bold bg-slate-700/50 rounded-xl hover:bg-slate-600 active:bg-slate-500 transition disabled:opacity-50"
                        aria-label="נקה"
                    >
                        C
                    </button>

                    {/* Row 3: 1 2 3 . */}
                    {['1', '2', '3', '.'].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            disabled={disabled}
                            className="p-4 text-2xl font-bold bg-slate-700/50 rounded-xl hover:bg-slate-600 active:bg-slate-500 transition disabled:opacity-50"
                        >
                            {num}
                        </button>
                    ))}

                    {/* Row 4: 0 - [בדוק] */}
                    <button
                        onClick={() => handleNumberClick('0')}
                        disabled={disabled}
                        className="p-4 text-2xl font-bold bg-slate-700/50 rounded-xl hover:bg-slate-600 active:bg-slate-500 transition disabled:opacity-50"
                    >
                        0
                    </button>
                    <button
                        onClick={() => handleNumberClick('-')}
                        disabled={disabled}
                        className="p-4 text-2xl font-bold bg-slate-700/50 rounded-xl hover:bg-slate-600 active:bg-slate-500 transition disabled:opacity-50"
                    >
                        -
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={disabled || !value}
                        className="col-span-2 p-4 text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 active:from-green-700 active:to-emerald-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <span>בדוק</span>
                        <CornerDownLeft className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    // Fraction input
    return (
        <div className="w-full max-w-md mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
                {/* Fraction */}
                <div className="flex flex-col items-center">
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="none"
                        value={numerator}
                        onChange={(e) => setNumerator(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        placeholder="מונה"
                        className="w-16 md:w-20 text-center text-xl md:text-2xl font-bold py-1.5 md:py-2 px-2 bg-slate-700/50 border-2 border-slate-600 rounded-lg focus:border-yellow-400 focus:outline-none transition disabled:opacity-50"
                        dir="ltr"
                    />
                    <div className="w-16 md:w-20 h-0.5 md:h-1 bg-white my-0.5 md:my-1"></div>
                    <input
                        type="text"
                        inputMode="none"
                        value={denominator}
                        onChange={(e) => setDenominator(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        placeholder="מכנה"
                        className="w-16 md:w-20 text-center text-xl md:text-2xl font-bold py-1.5 md:py-2 px-2 bg-slate-700/50 border-2 border-slate-600 rounded-lg focus:border-yellow-400 focus:outline-none transition disabled:opacity-50"
                        dir="ltr"
                    />
                </div>

                {/* Whole number */}
                <input
                    type="text"
                    inputMode="none"
                    value={whole}
                    onChange={(e) => setWhole(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder="שלם"
                    className="w-16 md:w-20 text-center text-2xl md:text-3xl font-bold py-2 md:py-3 px-2 bg-slate-700/50 border-2 border-slate-600 rounded-xl focus:border-yellow-400 focus:outline-none transition disabled:opacity-50"
                    dir="ltr"
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={disabled || (!numerator && !whole)}
                className="w-full p-3 md:p-4 text-lg md:text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 active:from-green-700 active:to-emerald-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
                <span>בדוק תשובה</span>
                <CornerDownLeft className="w-5 h-5" />
            </button>
        </div>
    );
}
