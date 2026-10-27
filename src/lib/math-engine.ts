export type MathOperation = '+' | '-' | '*' | '/' | ':';

export interface MathProblem {
    num1: number;
    num2: number;
    operator: MathOperation;
    id: string; // unique id for React keys
}

export class MathEngine {
    /**
     * Generates a random integer between min and max (inclusive)
     */
    static getRandomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Generates a single math problem based on configuration
     */
    private static generateSingleProblem(
        operation: MathOperation,
        range: number
    ): { num1: number; num2: number } {
        const floor = this.difficultyFloor(range);
        switch (operation) {
            case '+': {
                const larger = this.getRandomInt(floor, range - 1);
                const smaller = this.getRandomInt(1, Math.min(larger, range - larger));
                return Math.random() < 0.5 ? { num1: larger, num2: smaller } : { num1: smaller, num2: larger };
            }
            case '-': {
                const num1 = this.getRandomInt(Math.max(2, floor), range);
                return { num1, num2: this.getRandomInt(1, num1 - 1) };
            }
            default: {
                const { factor, other } = this.generateFactors(range, floor);
                return operation === '*'
                    ? { num1: factor, num2: other }
                    : { num1: factor * other, num2: factor };
            }
        }
    }

    /** Anchor the selected level to a place value, with 10–20 as its own early level. */
    static difficultyFloor(range: number): number {
        return range <= 10 ? 1 : 10 ** Math.floor(Math.log10(range - 1));
    }

    /** Inverse operations share a bounded fact family; up to 100 uses the times tables. */
    private static generateFactors(range: number, floor: number): { factor: number; other: number } {
        // Tiny legacy game ranges cannot contain a non-identity multiplication fact.
        if (range < 4) return { factor: 1, other: range };
        const factor = this.getRandomInt(2, Math.floor(Math.sqrt(range)));
        const cap = range <= 100 ? 10 : Math.ceil(range / 10);
        const other = this.getRandomInt(Math.max(2, Math.ceil(floor / factor)), Math.min(cap, Math.floor(range / factor)));
        return Math.random() < 0.5 ? { factor, other } : { factor: other, other: factor };
    }

    /**
     * Generates a set of math problems based on configuration (no duplicates)
     */
    static generateProblems(
        count: number,
        operation: MathOperation,
        range: number
    ): MathProblem[] {
        if (!Number.isInteger(range) || range < 2 || range > 1000000 ||
            !Number.isInteger(count) || count < 1 || count > 100 ||
            !['+', '-', '*', '/', ':'].includes(operation)) {
            throw new RangeError('Invalid worksheet arithmetic settings');
        }
        const problems: MathProblem[] = [];
        const generated = new Set<string>();
        const maxAttempts = count * 10; // Prevent infinite loops
        let attempts = 0;

        while (problems.length < count && attempts < maxAttempts) {
            attempts++;
            const { num1, num2 } = this.generateSingleProblem(operation, range);
            const key = `${num1}-${operation}-${num2}`;

            if (!generated.has(key)) {
                generated.add(key);
                problems.push({
                    num1,
                    num2,
                    operator: operation === ':' ? ':' : operation, // Use colon for display in IL
                    id: Math.random().toString(36).substr(2, 9),
                });
            }
        }

        return problems;
    }
}
