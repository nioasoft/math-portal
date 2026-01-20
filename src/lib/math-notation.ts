import { Locale } from '@/i18n/config';

export interface MathNotation {
  division: string;
  decimal: string;
  thousands: string;
}

/**
 * Math notation configurations for each supported locale.
 * These match the values in messages/{locale}/math.json
 *
 * - Hebrew (he): Uses ":" for division (Israeli notation)
 * - English (en): Uses "÷" for division
 * - Arabic (ar): Uses "÷" for division
 * - German (de): Uses ":" for division, "," for decimals
 * - Spanish (es): Uses "÷" for division, "," for decimals
 */
const notations: Record<Locale, MathNotation> = {
  he: { division: ':', decimal: '.', thousands: ',' },
  en: { division: '÷', decimal: '.', thousands: ',' },
  ar: { division: '÷', decimal: '.', thousands: ',' },
  de: { division: ':', decimal: ',', thousands: '.' },
  es: { division: '÷', decimal: ',', thousands: '.' },
};

/**
 * Get math notation configuration for a given locale
 */
export function getMathNotation(locale: Locale): MathNotation {
  return notations[locale];
}

/**
 * Format a number with the locale-specific decimal and thousands separators
 */
export function formatNumber(num: number, locale: Locale): string {
  const notation = notations[locale];
  const parts = num.toString().split('.');

  // Add thousands separators to integer part
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, notation.thousands);

  // Join with locale-specific decimal separator
  return parts.join(notation.decimal);
}

/**
 * Get the division symbol for a locale
 */
export function getDivisionSymbol(locale: Locale): string {
  return notations[locale].division;
}

/**
 * React hook for using math notation - use this in client components
 * For server components, use getMathNotation directly with the locale param
 */
export function useMathNotation(locale: Locale): MathNotation {
  return notations[locale];
}
