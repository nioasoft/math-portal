import type { Metadata } from 'next';
import FractionsClient from '@/components/worksheet/FractionsClient';

export const metadata: Metadata = {
  title: 'דפי עבודה בשברים - תרגילים להדפסה',
  description: 'מחולל דפי עבודה בשברים: חיבור, חיסור, כפל וחילוק שברים. מכנים שווים וזרים, שברים מעורבים. מותאם לכיתות ד-ו.',
  keywords: ['דפי עבודה שברים', 'תרגילי שברים', 'שברים לכיתה ה', 'חיבור שברים'],
};

export default function FractionsPage() {
  return <FractionsClient />;
}
