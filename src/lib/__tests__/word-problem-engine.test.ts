import { describe, expect, it } from 'vitest';
import { WordProblemEngine, type Operation, type WordProblemCopy } from '../word-problem-engine';
import he from '../../../messages/he/worksheet.json';
import en from '../../../messages/en/worksheet.json';

describe('localized word problems', () => {
    const copy: WordProblemCopy = {
        addition: ['{a}|{b}'], subtraction: ['{a}|{b}'],
        multiplication: ['{a}|{b}'], division: ['{a}|{b}'],
    };
    for (const op of ['+', '-', '*', ':'] as Operation[]) {
        it(`computes ${op} from exactly the printed operands`, () => {
            for (let i = 0; i < 100; i++) {
                const result = WordProblemEngine.generateProblem(3, op, copy);
                const [a, b] = result.question.split('|').map(Number);
                const answer = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b;
                expect(result.answer).toBe(answer);
                expect(Number.isInteger(answer)).toBe(true);
                expect(answer).toBeGreaterThanOrEqual(0);
            }
        });
    }
    it('keeps grade-one addition within 20', () => {
        for (let i = 0; i < 100; i++) expect(WordProblemEngine.generateProblem(1, '+', copy).answer).toBeLessThanOrEqual(20);
    });
    it('uses the selected language and fills all template placeholders', () => {
        const english = WordProblemEngine.generateProblem(1, '+', en.wordProblems.engine).question;
        const hebrew = WordProblemEngine.generateProblem(1, '+', he.wordProblems.engine).question;
        expect(english).not.toMatch(/[א-ת{}]/);
        expect(hebrew).toMatch(/[א-ת]/);
        expect(hebrew).not.toContain('{');
    });
});
