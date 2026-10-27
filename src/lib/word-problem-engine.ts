export type Operation = '+' | '-' | '*' | ':';
export type WordProblemCopy = Record<'addition' | 'subtraction' | 'multiplication' | 'division', string[]>;
export interface WordProblem {
    question: string;
    answer: number;
    id: string;
}

const keys = { '+': 'addition', '-': 'subtraction', '*': 'multiplication', ':': 'division' } as const;

/** Numbers and answers share one calculation; translated templates contain no arithmetic. */
export class WordProblemEngine {
    static generateProblem(grade: number, op: Operation, copy: WordProblemCopy): WordProblem {
        const max = grade === 1 ? 20 : 100;
        const random = (min: number, upper: number) => Math.floor(Math.random() * (upper - min + 1)) + min;
        let a = random(4, max);
        let b = random(2, a - 2);
        let answer = a - b;
        if (op === '+') {
            a = random(2, max - 2);
            b = random(2, max - a);
            answer = a + b;
        } else if (op === '*' || op === ':') {
            a = random(2, 10);
            b = random(2, 10);
            answer = a * b;
            if (op === ':') [a, answer] = [answer, a];
        }
        const templates = copy[keys[op]];
        const template = templates[random(0, templates.length - 1)];
        return {
            question: template.replaceAll('{a}', String(a)).replaceAll('{b}', String(b)),
            answer,
            id: `${op}-${a}-${b}-${template}`,
        };
    }
}
