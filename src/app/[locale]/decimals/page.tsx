import type { Metadata } from 'next';
import DecimalsClient from '@/components/worksheet/DecimalsClient';

export const metadata: Metadata = {
  title: 'דפי עבודה במספרים עשרוניים - תרגילים להדפסה',
  description: 'מחולל דפי עבודה במספרים עשרוניים: חיבור, חיסור, כפל וחילוק. תרגול עשרוניות והמרה לשברים. מותאם לכיתות ה-ו.',
  keywords: ['דפי עבודה עשרוניים', 'מספרים עשרוניים', 'תרגילי עשרוניים', 'עשרוניים להדפסה'],
};

export default function DecimalsPage() {
  return <DecimalsClient />;
}
