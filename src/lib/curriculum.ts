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

// Icon mapping for topics - used to get the correct icon for a topic ID
export const TOPIC_ICONS: Record<string, LucideIcon> = {
    'add-10': Calculator,
    'sub-10': Calculator,
    'add-20': Calculator,
    'sub-20': Calculator,
    'word-1': BookOpen,
    'add-100': Calculator,
    'sub-100': Calculator,
    'mul-basic': X,
    'mul-table': Grip,
    'word-2': BookOpen,
    'series-easy': TrendingUp,
    'add-1000': Calculator,
    'sub-1000': Calculator,
    'mul-100': Grip,
    'div-basic': Percent,
    'units-length': Ruler,
    'word-3': BookOpen,
    'series-medium': TrendingUp,
    'add-10000': Calculator,
    'sub-10000': Calculator,
    'mul-1000': X,
    'long-div': Scale,
    'area-rect': Shapes,
    'units-time': Clock,
    'series-4': TrendingUp,
    'add-large': Hash,
    'mul-large': X,
    'fractions': PieChart,
    'decimals': Hash,
    'units-adv': Ruler,
    'triangle-area': Triangle,
    'series-hard': TrendingUp,
    'percentage': Percent,
    'ratio': Scale,
    'angles': Triangle,
    'circle': Circle,
    'word-adv': BookOpen,
};

// Topic href mapping - used to get the correct URL for a topic ID
export const TOPIC_HREFS: Record<string, string> = {
    'add-10': '/worksheet/math?op=add&range=10',
    'sub-10': '/worksheet/math?op=sub&range=10',
    'add-20': '/worksheet/math?op=add&range=20',
    'sub-20': '/worksheet/math?op=sub&range=20',
    'word-1': '/word-problems',
    'add-100': '/worksheet/math?op=add&range=100',
    'sub-100': '/worksheet/math?op=sub&range=100',
    'mul-basic': '/worksheet/math?op=mul&range=20',
    'mul-table': '/worksheet/math?op=mul&range=5',
    'word-2': '/word-problems',
    'series-easy': '/series',
    'add-1000': '/worksheet/math?op=add&range=1000',
    'sub-1000': '/worksheet/math?op=sub&range=1000',
    'mul-100': '/worksheet/math?op=mul&range=10',
    'div-basic': '/worksheet/math?op=div&range=100',
    'units-length': '/units',
    'word-3': '/word-problems',
    'series-medium': '/series',
    'add-10000': '/worksheet/math?op=add&range=10000',
    'sub-10000': '/worksheet/math?op=sub&range=10000',
    'mul-1000': '/worksheet/math?op=mul&range=1000',
    'long-div': '/worksheet/math?op=div&range=1000',
    'area-rect': '/geometry',
    'units-time': '/units',
    'series-4': '/series',
    'add-large': '/worksheet/math?op=add&range=1000000',
    'mul-large': '/worksheet/math?op=mul&range=10000',
    'fractions': '/fractions',
    'decimals': '/decimals',
    'units-adv': '/units',
    'triangle-area': '/geometry',
    'series-hard': '/series',
    'percentage': '/percentage',
    'ratio': '/ratio',
    'angles': '/geometry',
    'circle': '/geometry',
    'word-adv': '/word-problems',
};

// Grade topic order - defines which topics are in which grade
export const GRADE_TOPICS: Record<string, string[]> = {
    '1': ['add-10', 'sub-10', 'add-20', 'sub-20', 'word-1'],
    '2': ['add-100', 'sub-100', 'mul-basic', 'mul-table', 'word-2', 'series-easy'],
    '3': ['add-1000', 'sub-1000', 'mul-100', 'div-basic', 'units-length', 'word-3', 'series-medium'],
    '4': ['add-10000', 'sub-10000', 'mul-1000', 'long-div', 'area-rect', 'units-time', 'series-4'],
    '5': ['add-large', 'mul-large', 'fractions', 'decimals', 'units-adv', 'triangle-area', 'series-hard'],
    '6': ['percentage', 'ratio', 'angles', 'circle', 'word-adv'],
};

// All grade IDs for static generation
export const GRADE_IDS = ['1', '2', '3', '4', '5', '6'] as const;

// Legacy CURRICULUM export for backwards compatibility
// This uses Hebrew text directly - prefer using translations in new code
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
