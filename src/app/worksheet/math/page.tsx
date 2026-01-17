import { Suspense } from 'react';
import WorksheetClient from '@/components/worksheet/WorksheetClient';

export const metadata = {
    title: 'מחולל דפי עבודה - חשבון',
    description: 'צור והדפס דפי עבודה בחשבון בחינם',
};

export default function MathWorksheetPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">טוען מחולל...</div>}>
            <WorksheetClient />
        </Suspense>
    );
}
