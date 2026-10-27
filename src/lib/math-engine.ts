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
        const min = range > 100 ? Math.floor(range / 10) : 1;
        switch (operation) {
            case '+': {
                const num1 = this.getRandomInt(min, range - min);
                return { num1, num2: this.getRandomInt(min, range - num1) };
            }
            case '-': {
                const num1 = this.getRandomInt(min + 1, range);
                return { num1, num2: this.getRandomInt(1, num1) };
            }
            case '*': {
                const num1 = this.getRandomInt(1, Math.floor(Math.sqrt(range)));
                return { num1, num2: this.getRandomInt(1, Math.floor(range / num1)) };
            }
            case ':':
            case '/': {
                const num2 = this.getRandomInt(1, Math.min(30, range));
                const answer = this.getRandomInt(1, Math.floor(range / num2));
                return { num1: answer * num2, num2 };
            }
        }
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
