
import SeriesClient from '@/components/worksheet/SeriesClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "דפי עבודה בסדרות חשבוניות להדפסה - השלמת מספרים",
    description: "מחולל דפי עבודה לתרגול סדרות חשבוניות, זיהוי חוקיות והשלמת דפוסים. מתאים לכיתות א׳-ו׳.",
};

export default function SeriesPage() {
    return <SeriesClient />;
}
