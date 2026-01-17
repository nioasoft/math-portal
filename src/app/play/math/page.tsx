import { Metadata } from 'next';
import MathGameClient from './MathGameClient';

export const metadata: Metadata = {
    title: 'משחק חשבון | דפי עבודה חכמים',
    description: 'משחק חשבון אינטראקטיבי - תרגול חיבור, חיסור, כפל וחילוק',
};

export default function MathGamePage() {
    return <MathGameClient />;
}
