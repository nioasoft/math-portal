import WordProblemsClient from '@/components/worksheet/WordProblemsClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'בעיות מילוליות בחשבון - דפי עבודה להדפסה',
    description: 'מחולל בעיות מילוליות בחשבון לכיתות א-ג. שאלות מילוליות בחיבור, חיסור, כפל וחילוק המותאמות אוטומטית לרמת הילד.',
};

export default function WordProblemsPage() {
    return <WordProblemsClient />;
}
