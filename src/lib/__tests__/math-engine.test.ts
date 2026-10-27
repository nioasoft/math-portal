import { afterEach, describe, expect, it, vi } from 'vitest';
import { MathEngine, type MathOperation } from '../math-engine';

const levels = [[10, 1], [20, 10], [100, 10], [1000, 100], [10000, 1000], [100000, 10000], [1000000, 100000]];
afterEach(() => vi.restoreAllMocks());

describe('arithmetic difficulty contracts', () => {
    for (const [range, floor] of levels) {
        for (const operation of ['+', '-', '*', ':', '/'] as MathOperation[]) {
            it(`${operation} matches level ${range}, including random endpoints`, () => {
                for (const random of [0, 0.01, 0.49, 0.99, 0.999999, undefined]) {
                    if (random !== undefined) vi.spyOn(Math, 'random').mockReturnValue(random);
                    const problems = MathEngine.generateProblems(20, operation, range);
                    expect(problems.length).toBeGreaterThan(0);
                    expect(new Set(problems.map(p => `${p.num1}:${p.num2}`)).size).toBe(problems.length);
                    for (const { num1, num2 } of problems) {
                        expect(Number.isInteger(num1) && Number.isInteger(num2)).toBe(true);
                        expect(num1).toBeGreaterThan(0);
                        expect(num2).toBeGreaterThan(0);
                        expect(Math.max(num1, num2)).toBeLessThanOrEqual(range);
                        const answer = operation === '+' ? num1 + num2 : operation === '-' ? num1 - num2 : operation === '*' ? num1 * num2 : num1 / num2;
                        expect(Number.isInteger(answer)).toBe(true);
                        expect(answer).toBeGreaterThanOrEqual(0);
                        expect(answer).toBeLessThanOrEqual(range);
                        if (operation === '+') expect(Math.max(num1, num2)).toBeGreaterThanOrEqual(floor);
                        else if (operation === '-') expect(num1).toBeGreaterThanOrEqual(floor);
                        else {
                            expect(operation === '*' ? answer : num1).toBeGreaterThanOrEqual(floor);
                            expect(num2).toBeGreaterThanOrEqual(2);
                            expect(operation === '*' ? num1 : answer).toBeGreaterThanOrEqual(2);
                            if (range <= 100) expect(Math.max(num2, operation === '*' ? num1 : answer)).toBeLessThanOrEqual(10);
                        }
                    }
                    vi.restoreAllMocks();
                }
            });
        }
    }
    it('never generates the reported 9 − 7 at level 100', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(MathEngine.generateProblems(1, '-', 100)[0].num1).toBe(10);
    });
    it('rejects invalid input', () => {
        for (const range of [NaN, -1, 0, 1, Infinity, 10.5, 1000001]) expect(() => MathEngine.generateProblems(20, '+', range)).toThrow();
        for (const count of [0, -1, 101, NaN, 1.5]) expect(() => MathEngine.generateProblems(count, '+', 100)).toThrow();
    });
    it('supports small ranges used by legacy games', () => {
        for (const range of [2, 3, 4, 5]) for (const op of ['+', '-', '*', '/'] as MathOperation[]) {
            const [p] = MathEngine.generateProblems(1, op, range);
            expect(p.num1).toBeGreaterThan(0);
            expect(p.num2).toBeGreaterThan(0);
        }
    });
});


it('every accepted small range and narrow large interval has feasible multiplication facts', () => {
    const ranges = [...Array.from({ length: 1100 }, (_, i) => i + 2), 10001, 100001, 999999];
    for (const random of [0, 0.5, 0.999999]) {
        vi.spyOn(Math, 'random').mockReturnValue(random);
        for (const range of ranges) for (const operation of ['*', '/'] as MathOperation[]) {
            const [p] = MathEngine.generateProblems(1, operation, range);
            const anchor = operation === '*' ? p.num1 * p.num2 : p.num1;
            expect(anchor, `${operation} at ${range}`).toBeGreaterThanOrEqual(MathEngine.difficultyFloor(range));
            expect(anchor, `${operation} at ${range}`).toBeLessThanOrEqual(range);
            expect(Number.isInteger(p.num1 / (operation === '/' ? p.num2 : 1))).toBe(true);
        }
        vi.restoreAllMocks();
    }
});
