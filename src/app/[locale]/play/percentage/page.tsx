import { Metadata } from 'next';
import PercentageGameClient from './PercentageGameClient';

export const metadata: Metadata = {
    title: 'משחק אחוזים | דפי עבודה חכמים',
    description: 'משחק אחוזים אינטראקטיבי - תרגול חישוב אחוזים מתוך שלם',
};

export default function PercentageGamePage() {
    return <PercentageGameClient />;
}
