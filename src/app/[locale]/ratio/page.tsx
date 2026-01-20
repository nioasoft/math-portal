import type { Metadata } from 'next';
import RatioClient from '@/components/worksheet/RatioClient';

export const metadata: Metadata = {
  title: 'דפי עבודה ביחס ופרופורציה - תרגילים להדפסה',
  description: 'מחולל דפי עבודה ביחס ופרופורציה: בעיות יחס ישר והפוך, פתרון פרופורציות, כלל שלושה. מותאם לכיתה ו.',
  keywords: ['דפי עבודה יחס', 'פרופורציה', 'יחס ישר', 'יחס הפוך', 'כלל שלושה'],
};

export default function RatioPage() {
  return <RatioClient />;
}
