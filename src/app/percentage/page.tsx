import type { Metadata } from 'next';
import PercentageClient from '@/components/worksheet/PercentageClient';

export const metadata: Metadata = {
  title: 'דפי עבודה באחוזים - תרגילים להדפסה',
  description: 'מחולל דפי עבודה באחוזים: חישוב אחוז מכמות, מציאת השלם, אחוזי שינוי. בעיות מילוליות ותרגילים מעשיים. מותאם לכיתה ו.',
  keywords: ['דפי עבודה אחוזים', 'תרגילי אחוזים', 'אחוזים לכיתה ו', 'חישוב אחוזים'],
};

export default function PercentagePage() {
  return <PercentageClient />;
}
