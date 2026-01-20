import { Metadata } from 'next';
import FractionsGameClient from './FractionsGameClient';

export const metadata: Metadata = {
    title: 'משחק שברים | דפי עבודה חכמים',
    description: 'משחק שברים אינטראקטיבי - תרגול חיבור, חיסור, כפל וחילוק שברים',
};

export default function FractionsGamePage() {
    return <FractionsGameClient />;
}
