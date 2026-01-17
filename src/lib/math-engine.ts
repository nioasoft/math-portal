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
        let num1 = 0;
        let num2 = 0;

        switch (operation) {
            case '+':
                if (range <= 100) {
                    num1 = this.getRandomInt(10, range - 10);
                    num2 = this.getRandomInt(1, range - num1);
                } else {
                    // For larger ranges, ensure we don't just get small numbers
                    const minStart = range / 10;
                    num1 = this.getRandomInt(minStart, range - minStart);
                    num2 = this.getRandomInt(minStart, range - num1);
                }
                break;

            case '-':
                // Ensure positive result
                if (range <= 100) {
                    num1 = this.getRandomInt(20, range);
                    num2 = this.getRandomInt(1, num1 - 1);
                } else {
                    const minStart = range / 10;
                    num1 = this.getRandomInt(minStart, range);
                    num2 = this.getRandomInt(minStart, num1 - minStart);
                }
                break;

            case '*':
                // Multiplication
                // Range acts as "up to X table" or "result up to X"
                // Let's assume for Grade 2-3, range 100 means result up to 100
                if (range <= 100) {
                    num1 = this.getRandomInt(2, 10);
                    num2 = this.getRandomInt(1, 10); // 10x10=100
                } else {
                    // Larger multiplication
                    num1 = this.getRandomInt(10, Math.sqrt(range));
                    num2 = this.getRandomInt(2, range / num1);
                }
                break;

            case ':':
            case '/':
                // Division (Exact division for now)
                // Generate multiplication first then flip
                if (range <= 100) {
                    const res = this.getRandomInt(2, 10);
                    const factor = this.getRandomInt(2, 10);
                    num1 = res * factor;
                    num2 = factor;
                } else {
                    // Division for larger numbers
                    // We want the Dividend (num1) to be large, up to Range.
                    // Divisor (num2/factor) should be reasonable (e.g., 2-20 or 2-100 depending on complexity).
                    // Let's keep one number relatively small (2-50) so it's solvable
                    const factor = this.getRandomInt(2, 30);
                    const maxRes = Math.floor(range / factor);
                    const minRes = Math.floor(maxRes / 10);
                    const res = this.getRandomInt(Math.max(2, minRes), maxRes);

                    num1 = res * factor;
                    num2 = factor;
                }
                break;
        }

        return { num1, num2 };
    }

    /**
     * Generates a set of math problems based on configuration (no duplicates)
     */
    static generateProblems(
        count: number,
        operation: MathOperation,
        range: number
    ): MathProblem[] {
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
