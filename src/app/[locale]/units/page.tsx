
import UnitsClient from '@/components/worksheet/UnitsClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "דפי עבודה בהמרת מידות להדפסה - אורך, משקל וזמן",
    description: "מחולל דפי עבודה לתרגול המרת מידות (אורך, משקל, זמן). מתאים לכיתות ג׳-ו׳.",
};

export default function UnitsPage() {
    return <UnitsClient />;
}
