
export type Gender = 'male' | 'female';
export type Operation = '+' | '-' | '*' | ':';

export interface VocabularyItem {
    singular: string;
    plural: string;
    gender: Gender;
}

export interface WordProblemTemplate {
    id: string;
    text: string; // "ל{name} היו {num1} {item}. {pronoun} {verb} {num2} ל{name2}."
    op: Operation;
    constraints: {
        minNum?: number;
        maxNum?: number;
        mustBeEven?: boolean;
        resultMin?: number;
        resultMax?: number;
    };
    gradeLevel: number;
    verbs: {
        male: string;   // נתן
        female: string; // נתנה
    };
}

export const VOCABULARY: Record<string, VocabularyItem[]> = {
    food: [
        { singular: 'תפוח', plural: 'תפוחים', gender: 'male' },
        { singular: 'סוכריה', plural: 'סוכריות', gender: 'female' },
        { singular: 'עוגייה', plural: 'עוגיות', gender: 'female' },
        { singular: 'בננה', plural: 'בננות', gender: 'female' },
        { singular: 'אגוז', plural: 'אגוזים', gender: 'male' },
        { singular: 'תפוז', plural: 'תפוזים', gender: 'male' },
        { singular: 'פיצה', plural: 'מגשי פיצה', gender: 'female' },
    ],
    toys: [
        { singular: 'כדור', plural: 'כדורים', gender: 'male' },
        { singular: 'בובה', plural: 'בובות', gender: 'female' },
        { singular: 'מכונית', plural: 'מכוניות', gender: 'female' },
        { singular: 'קוביה', plural: 'קוביות', gender: 'female' },
        { singular: 'קלף', plural: 'קלפים', gender: 'male' },
        { singular: 'בלון', plural: 'בלונים', gender: 'male' },
    ],
    school: [
        { singular: 'עיפרון', plural: 'עפרונות', gender: 'male' },
        { singular: 'מחברת', plural: 'מחברות', gender: 'female' },
        { singular: 'מחק', plural: 'מחקים', gender: 'male' },
        { singular: 'ספר', plural: 'ספרים', gender: 'male' },
        { singular: 'טוש', plural: 'טושים', gender: 'male' },
    ]
};

export const NAMES = {
    male: ['דני', 'יוסי', 'רון', 'איתי', 'עומר', 'טל', 'עידו', 'נועם', 'אורי', 'גיא'],
    female: ['רוני', 'נועה', 'יעל', 'מאיה', 'טליה', 'עדי', 'שירה', 'גלי', 'מיכל', 'תמר']
};

const TEMPLATES: WordProblemTemplate[] = [
    // --- Addition (Grade 1-2) ---
    {
        id: 'add_simple',
        text: "ל{name} היו {num1} {item}. {name2} {verb} {pronoun_dative} עוד {num2} {item}. כמה {item} יש ל{name} עכשיו?",
        op: '+',
        gradeLevel: 1,
        constraints: { minNum: 2, maxNum: 10 },
        verbs: { male: 'נתן', female: 'נתנה' } // Name2 gave Name1
    },
    {
        id: 'add_collection',
        text: "בארגז יש {num1} {item} אדומים ו-{num2} {item} כחולים. סך הכל, כמה {item} יש בארגז?",
        op: '+',
        gradeLevel: 1,
        constraints: { minNum: 2, maxNum: 15 },
        verbs: { male: '', female: '' } // No dynamic verb needed here
    },
    // --- Subtraction (Grade 1-2) ---
    {
        id: 'sub_eating',
        text: "ל{name} היו {num1} {item}. {pronoun} {verb} {num2} {item}. כמה {item} נשארו ל{name}?",
        op: '-',
        gradeLevel: 1,
        constraints: { minNum: 5, maxNum: 15 },
        verbs: { male: 'אכל', female: 'אכלה' }
    },
    {
        id: 'sub_giving',
        text: "ל{name} היו {num1} {item}. {pronoun} {verb} {num2} {item} ל{name2}. כמה {item} נשארו ל{name}?",
        op: '-',
        gradeLevel: 1,
        constraints: { minNum: 5, maxNum: 20 },
        verbs: { male: 'נתן', female: 'נתנה' }
    },
    // --- Multiplication (Grade 2-3) ---
    {
        id: 'mul_groups',
        text: "בכל קופסה יש {num1} {item}. כמה {item} יש ב-{num2} קופסאות?",
        op: '*',
        gradeLevel: 2,
        constraints: { minNum: 2, maxNum: 10 },
        verbs: { male: '', female: '' }
    },
    {
        id: 'mul_price',
        text: "{item_singular} אחד עולה {num1} שקלים. כמה יעלו {num2} {item}?",
        op: '*',
        gradeLevel: 2,
        constraints: { minNum: 2, maxNum: 10 },
        verbs: { male: '', female: '' }
    },
    // --- Division (Grade 3-4) ---
    {
        id: 'div_distribution',
        text: "ל{name} יש {num1} {item}. {pronoun} {verb} לחלק אותם שווה בשווה בין {num2} חברים. כמה {item} יקבל כל חבר?",
        op: ':',
        gradeLevel: 3,
        constraints: { minNum: 10, maxNum: 50 }, // num1 will be result*num2 really
        verbs: { male: 'רוצה', female: 'רוצה' }
    }
];

export class WordProblemEngine {

    static getRandomItem<T>(arr: T[]): T {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    static generateProblem(grade: number, op: Operation | 'mixed'): { question: string, answer: number, id: string } {
        // 1. Filter templates
        let availableTemplates = TEMPLATES.filter(t => t.gradeLevel <= grade);
        if (op !== 'mixed') {
            availableTemplates = availableTemplates.filter(t => t.op === op);
        }

        if (availableTemplates.length === 0) {
            // Fallback if no specific template found
            availableTemplates = TEMPLATES.filter(t => t.gradeLevel === 1);
        }

        const template = this.getRandomItem(availableTemplates);

        // 2. Setup Data
        const isMale = Math.random() > 0.5;
        const name1 = this.getRandomItem(isMale ? NAMES.male : NAMES.female);

        // Name 2 is opposite gender for variety usually, or random? Let's random but ensure different.
        let name2 = this.getRandomItem([...NAMES.male, ...NAMES.female]);
        while (name2 === name1) {
            name2 = this.getRandomItem([...NAMES.male, ...NAMES.female]);
        }
        // name2IsMale available for future verb conjugation: NAMES.male.includes(name2)

        // Pick Vocabulary
        const allVocab = [...VOCABULARY.food, ...VOCABULARY.toys, ...VOCABULARY.school];
        const itemObj = this.getRandomItem(allVocab);

        // 3. Generate Numbers
        let num1 = 0, num2 = 0, answer = 0;
        const min = template.constraints.minNum || 1;
        const max = template.constraints.maxNum || 10;

        switch (template.op) {
            case '+':
                num1 = Math.floor(Math.random() * (max - min + 1)) + min;
                num2 = Math.floor(Math.random() * (max - min + 1)) + min;
                answer = num1 + num2;
                break;
            case '-':
                num1 = Math.floor(Math.random() * (max - min + 1)) + min;
                // Ensure positive result
                num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
                answer = num1 - num2;
                break;
            case '*':
                num1 = Math.floor(Math.random() * (max - min + 1)) + min;
                num2 = Math.floor(Math.random() * (max - min + 1)) + min;
                answer = num1 * num2;
                break;
            case ':':
                // For division, we generate answer and divisor first to have clean dividend
                const divisor = Math.floor(Math.random() * 8) + 2; // 2-9
                const res = Math.floor(Math.random() * 9) + 1;
                num2 = divisor;
                num1 = res * divisor;
                answer = res;
                break;
        }

        // 4. Construct String
        let text = template.text;

        // Replace Names
        text = text.replace(/{name}/g, name1);
        text = text.replace(/{name2}/g, name2);

        // Replace Numbers
        text = text.replace(/{num1}/g, num1.toString());
        text = text.replace(/{num2}/g, num2.toString());

        // Replace Items (Plural/Singular logic could be refined but Plural works for most)
        // "{item}" -> Plural usually in these templates ("5 apples")
        // Template can specify {item_singular} if needed
        text = text.replace(/{item}/g, itemObj.plural);
        text = text.replace(/{item_plural}/g, itemObj.plural);
        text = text.replace(/{item_singular}/g, itemObj.singular);

        // Replace Verbs/Pronouns based on Name1 gender
        text = text.replace(/{verb}/g, isMale ? template.verbs.male : template.verbs.female);
        text = text.replace(/{pronoun}/g, isMale ? 'הוא' : 'היא');
        text = text.replace(/{pronoun_dative}/g, isMale ? 'לו' : 'לה'); // "נתן לו"/"נתן לה"

        return {
            id: Math.random().toString(36).substr(2, 9),
            question: text,
            answer: answer
        };
    }
}
