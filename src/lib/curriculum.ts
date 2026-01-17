import { Calculator, Grip, Hash, Percent, PieChart, Scale, Shapes, X, BookOpen, TrendingUp, Ruler, Clock, Triangle, Circle } from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface Topic {
    id: string;
    title: string;
    icon: LucideIcon;
    description: string;
    href: string; // URL with params for the generator
}

export interface GradeConfig {
    id: string;
    title: string;
    description: string;
    topics: Topic[];
}

export const CURRICULUM: Record<string, GradeConfig> = {
    '1': {
        id: '1',
        title: "כיתה א'",
        description: "צעדים ראשונים בעולם המספרים.",
        topics: [
            { id: 'add-10', title: 'חיבור עד 10', icon: Calculator, description: 'תרגילי חיבור פשוטים', href: '/worksheet/math?op=add&range=10' },
            { id: 'sub-10', title: 'חיסור עד 10', icon: Calculator, description: 'תרגילי חיסור פשוטים', href: '/worksheet/math?op=sub&range=10' },
            { id: 'add-20', title: 'חיבור עד 20', icon: Calculator, description: 'כולל גלישה לעשרת הבאה', href: '/worksheet/math?op=add&range=20' },
            { id: 'sub-20', title: 'חיסור עד 20', icon: Calculator, description: 'תרגול חיסור מתקדם', href: '/worksheet/math?op=sub&range=20' },
            { id: 'word-1', title: 'בעיות מילוליות', icon: BookOpen, description: 'חיבור וחיסור פשוט', href: '/word-problems' },
        ]
    },
    '2': {
        id: '2',
        title: "כיתה ב'",
        description: "מרחיבים את תחום המספרים למאה ולומדים כפל.",
        topics: [
            { id: 'add-100', title: 'חיבור עד 100', icon: Calculator, description: 'חיבור ללא המרה', href: '/worksheet/math?op=add&range=100' },
            { id: 'sub-100', title: 'חיסור עד 100', icon: Calculator, description: 'חיסור ללא המרה', href: '/worksheet/math?op=sub&range=100' },
            { id: 'mul-basic', title: 'הכרת הכפל', icon: X, description: 'תרגילי כפל ראשונים', href: '/worksheet/math?op=mul&range=20' },
            { id: 'mul-table', title: 'לוח הכפל (1-5)', icon: Grip, description: 'כפולות 1 עד 5', href: '/worksheet/math?op=mul&range=5' },
            { id: 'word-2', title: 'בעיות מילוליות', icon: BookOpen, description: 'כולל כפל', href: '/word-problems' },
            { id: 'series-easy', title: 'סדרות קלות', icon: TrendingUp, description: 'זיהוי חוקיות פשוטה', href: '/series' },
        ]
    },
    '3': {
        id: '3',
        title: "כיתה ג'",
        description: "מספרים עד 1000, כפל וחילוק.",
        topics: [
            { id: 'add-1000', title: 'חיבור עד 1,000', icon: Calculator, description: 'חיבור במאונך', href: '/worksheet/math?op=add&range=1000' },
            { id: 'sub-1000', title: 'חיסור עד 1,000', icon: Calculator, description: 'חיסור במאונך', href: '/worksheet/math?op=sub&range=1000' },
            { id: 'mul-100', title: 'לוח הכפל המלא', icon: Grip, description: 'כפל עד 100', href: '/worksheet/math?op=mul&range=10' },
            { id: 'div-basic', title: 'חילוק בלי שארית', icon: Percent, description: 'הכרת פעולת החילוק', href: '/worksheet/math?op=div&range=100' },
            { id: 'units-length', title: 'המרת מידות אורך', icon: Ruler, description: 'מטר, ס"מ, מ"מ', href: '/units' },
            { id: 'word-3', title: 'בעיות מילוליות', icon: BookOpen, description: 'כולל חילוק', href: '/word-problems' },
            { id: 'series-medium', title: 'סדרות חשבוניות', icon: TrendingUp, description: 'רמה בינונית', href: '/series' },
        ]
    },
    '4': {
        id: '4',
        title: "כיתה ד'",
        description: "מספרים גדולים, שברים ופעולות חשבון מתקדמות.",
        topics: [
            { id: 'add-10000', title: 'חיבור עד 10,000', icon: Calculator, description: 'מספרים רב-ספרתיים', href: '/worksheet/math?op=add&range=10000' },
            { id: 'sub-10000', title: 'חיסור עד 10,000', icon: Calculator, description: 'חיסור רב-ספרתי', href: '/worksheet/math?op=sub&range=10000' },
            { id: 'mul-1000', title: 'כפל עד 1,000', icon: X, description: 'כפל מספרים גדולים', href: '/worksheet/math?op=mul&range=1000' },
            { id: 'long-div', title: 'חילוק ארוך', icon: Scale, description: 'תרגול חילוק ארוך', href: '/worksheet/math?op=div&range=1000' },
            { id: 'area-rect', title: 'שטח מלבן', icon: Shapes, description: 'חישוב שטח והיקף', href: '/geometry' },
            { id: 'units-time', title: 'המרת זמן', icon: Clock, description: 'שעות, דקות, שניות', href: '/units' },
            { id: 'series-4', title: 'סדרות חשבוניות', icon: TrendingUp, description: 'חיבור וחיסור', href: '/series' },
        ]
    },
    '5': {
        id: '5',
        title: "כיתה ה'",
        description: "שברים, מספרים עשרוניים והרחבת ההנדסה.",
        topics: [
            { id: 'add-large', title: 'חיבור מספרים גדולים', icon: Hash, description: 'עד מיליון', href: '/worksheet/math?op=add&range=1000000' },
            { id: 'mul-large', title: 'כפל וחילוק גדולים', icon: X, description: 'מספרים רב-ספרתיים', href: '/worksheet/math?op=mul&range=10000' },
            { id: 'fractions', title: 'חיבור שברים', icon: PieChart, description: 'מכנים שווים/זרים', href: '/fractions' },
            { id: 'decimals', title: 'מספרים עשרוניים', icon: Hash, description: 'חיבור וחיסור', href: '/decimals' },
            { id: 'units-adv', title: 'המרת מידות', icon: Ruler, description: 'אורך, משקל וזמן', href: '/units' },
            { id: 'triangle-area', title: 'שטח משולש', icon: Triangle, description: 'בסיס כפול גובה חלקי 2', href: '/geometry' },
            { id: 'series-hard', title: 'סדרות מתקדמות', icon: TrendingUp, description: 'כולל כפל', href: '/series' },
        ]
    },
    '6': {
        id: '6',
        title: "כיתה ו'",
        description: "הכנה לחטיבה: אחוזים, יחס ומשוואות.",
        topics: [
            { id: 'percentage', title: 'אחוזים', icon: Percent, description: 'חישוב אחוז מכמות', href: '/percentage' },
            { id: 'ratio', title: 'יחס ופרופורציה', icon: Scale, description: 'בעיות יחס', href: '/ratio' },
            { id: 'angles', title: 'זוויות', icon: Triangle, description: 'זיהוי סוגי זוויות', href: '/geometry' },
            { id: 'circle', title: 'מעגלים', icon: Circle, description: 'שטח והיקף מעגל', href: '/geometry' },
            { id: 'word-adv', title: 'בעיות מילוליות', icon: BookOpen, description: 'בעיות מורכבות', href: '/word-problems' },
        ]
    }
};
