import { describe, expect, it } from 'vitest';
import { MathEngine, type MathOperation } from '../math-engine';

describe('printable arithmetic ranges', () => {
    for (const range of [10, 20, 100, 1000, 1000000]) {
        for (const operation of ['+', '-', '*', ':'] as MathOperation[]) {
            it(`${operation} respects the selected upper bound ${range}`, () => {
                for (let run = 0; run < 20; run++) {
                    const problems = MathEngine.generateProblems(20, operation, range);
                    expect(problems.length).toBeGreaterThan(0);
                    for (const { num1, num2 } of problems) {
                        expect(Number.isInteger(num1) && Number.isInteger(num2)).toBe(true);
                        expect(num1).toBeGreaterThanOrEqual(0);
                        expect(num1).toBeLessThanOrEqual(range);
                        expect(num2).toBeGreaterThan(0);
                        expect(num2).toBeLessThanOrEqual(range);
                        const answer = operation === '+' ? num1 + num2 : operation === '-' ? num1 - num2 : operation === '*' ? num1 * num2 : num1 / num2;
                        expect(Number.isInteger(answer)).toBe(true);
                        expect(answer).toBeGreaterThanOrEqual(0);
                        expect(answer).toBeLessThanOrEqual(range);
                    }
                }
            });
        }
    }
    it('rejects invalid input without producing NaN problems', () => {
        expect(() => MathEngine.generateProblems(20, '+', NaN)).toThrow();
        expect(() => MathEngine.generateProblems(20, '+', -1)).toThrow();
    });
});
