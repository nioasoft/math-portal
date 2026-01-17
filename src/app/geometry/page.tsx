import { Suspense } from 'react';
import GeometryClient from '@/components/worksheet/GeometryClient';

export const metadata = {
    title: 'מחולל דפי עבודה - הנדסה',
    description: 'תרגול שטחים והיקפים',
};

export default function GeometryWorksheetPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">טוען מחולל הנדסה...</div>}>
            <GeometryClient />
        </Suspense>
    );
}
