import { MathEngine, MathOperation, MathProblem } from '../math-engine';

export type GameMode = 'practice' | 'quiz';
export type GameTopic = 'math' | 'fractions' | 'percentage';
export type FractionDifficulty = 'level1' | 'level2' | 'level3' | 'level4';

export interface Fraction {
    n: number;
    d: number;
    whole?: number;
}

export interface FractionProblem {
    id: string;
    f1: Fraction;
    f2: Fraction;
    op: '+' | '-' | '*' | ':';
    difficulty: FractionDifficulty;
}

export interface PercentProblem {
    id: string;
    percent: number;
    total: number;
}

export interface GameProblem {
    id: string;
    type: GameTopic;
    display: string;
    answer: number;
    // For fractions - store the answer as fraction too
    fractionAnswer?: { n: number; d: number; whole: number };
    // Original data for display
    mathProblem?: MathProblem;
    fractionProblem?: FractionProblem;
    percentProblem?: PercentProblem;
}

export interface GameState {
    mode: GameMode;
    topic: GameTopic;
    score: number;
    streak: number;
    bestStreak: number;
    correctCount: number;
    wrongCount: number;
    currentProblem: GameProblem | null;
    problemHistory: GameProblem[];
    timeRemaining: number | null; // null for practice mode
    isActive: boolean;
    quizDuration: number; // in seconds
    quizProblemCount: number;
}

// GCD helper
function gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    return b === 0 ? a : gcd(b, a % b);
}

// Simplify fraction
function simplify(n: number, d: number): { n: number; d: number; whole: number } {
    if (d === 0) return { n: 0, d: 1, whole: 0 };
    const common = gcd(n, d);
    let sn = Math.floor(n / common);
    const sd = Math.floor(d / common);
    const whole = Math.floor(sn / sd);
    sn = sn % sd;
    return { n: sn, d: sd, whole };
}

// Generate a single fraction problem
function generateFractionProblem(difficulty: FractionDifficulty): FractionProblem {
    let f1: Fraction = { n: 1, d: 2, whole: 0 };
    let f2: Fraction = { n: 1, d: 2, whole: 0 };
    let op: '+' | '-' | '*' | ':' = '+';

    switch (difficulty) {
        case 'level1': { // Same Denominator (+/-)
            const d1 = Math.floor(Math.random() * 6) + 2; // 2-7
            f1 = { n: Math.floor(Math.random() * (d1 - 1)) + 1, d: d1, whole: 0 };
            f2 = { n: Math.floor(Math.random() * (d1 - 1)) + 1, d: d1, whole: 0 };
            op = Math.random() > 0.5 ? '+' : '-';
            break;
        }

        case 'level2': { // Related Denominators (+/-)
            const base = Math.floor(Math.random() * 4) + 2; // 2-5
            f1 = { n: Math.floor(Math.random() * 4) + 1, d: base, whole: 0 };
            f2 = { n: Math.floor(Math.random() * 4) + 1, d: base * 2, whole: 0 };
            if (Math.random() > 0.5) [f1, f2] = [f2, f1];
            op = Math.random() > 0.5 ? '+' : '-';
            break;
        }

        case 'level3': { // Mixed Numbers (+/-)
            const dm = Math.floor(Math.random() * 4) + 2; // 2-5
            f1 = { whole: Math.floor(Math.random() * 3) + 1, n: Math.floor(Math.random() * (dm - 1)) + 1, d: dm };
            f2 = { whole: Math.floor(Math.random() * 2) + 1, n: Math.floor(Math.random() * (dm - 1)) + 1, d: dm };
            op = Math.random() > 0.5 ? '+' : '-';
            break;
        }

        case 'level4': { // Mul/Div - simpler
            f1 = { n: Math.floor(Math.random() * 4) + 1, d: Math.floor(Math.random() * 5) + 2, whole: 0 };
            f2 = { n: Math.floor(Math.random() * 4) + 1, d: Math.floor(Math.random() * 5) + 2, whole: 0 };
            op = Math.random() > 0.5 ? '*' : ':';
            break;
        }
    }

    // Correction for Subtraction to avoid negative
    if (op === '-') {
        const val1 = (f1.whole || 0) + f1.n / f1.d;
        const val2 = (f2.whole || 0) + f2.n / f2.d;
        if (val2 > val1) [f1, f2] = [f2, f1];
    }

    return {
        id: Math.random().toString(36).substr(2, 9),
        f1,
        f2,
        op,
        difficulty
    };
}

// Solve fraction problem
function solveFractionProblem(p: FractionProblem): { n: number; d: number; whole: number } {
    const n1 = (p.f1.whole || 0) * p.f1.d + p.f1.n;
    const n2 = (p.f2.whole || 0) * p.f2.d + p.f2.n;
    const d1 = p.f1.d;
    const d2 = p.f2.d;

    let resN = 0, resD = 0;

    switch (p.op) {
        case '+':
            resD = d1 * d2;
            resN = n1 * d2 + n2 * d1;
            break;
        case '-':
            resD = d1 * d2;
            resN = n1 * d2 - n2 * d1;
            break;
        case '*':
            resN = n1 * n2;
            resD = d1 * d2;
            break;
        case ':':
            resN = n1 * d2;
            resD = d1 * n2;
            break;
    }

    return simplify(resN, resD);
}

// Generate percent problem
function generatePercentProblem(): PercentProblem {
    const easyPercents = [10, 20, 25, 50, 75];
    const isEasy = Math.random() > 0.4;
    const percent = isEasy
        ? easyPercents[Math.floor(Math.random() * easyPercents.length)]
        : (Math.floor(Math.random() * 9) + 1) * 10;

    const total = (Math.floor(Math.random() * 20) + 1) * 10;

    return {
        id: Math.random().toString(36).substr(2, 9),
        percent,
        total
    };
}

// Format fraction for display
function formatFraction(f: Fraction): string {
    if (f.whole && f.whole > 0) {
        return `${f.whole} ${f.n}/${f.d}`;
    }
    return `${f.n}/${f.d}`;
}

// Format fraction answer for display
function formatFractionAnswer(f: { n: number; d: number; whole: number }): string {
    if (f.whole > 0 && f.n > 0) {
        return `${f.whole} ${f.n}/${f.d}`;
    }
    if (f.whole > 0) {
        return `${f.whole}`;
    }
    if (f.n === 0) {
        return '0';
    }
    return `${f.n}/${f.d}`;
}

export class GameEngine {
    private state: GameState;
    private usedProblems: Set<string> = new Set();

    constructor() {
        this.state = this.createInitialState('practice', 'math');
    }

    private createInitialState(mode: GameMode, topic: GameTopic): GameState {
        return {
            mode,
            topic,
            score: 0,
            streak: 0,
            bestStreak: 0,
            correctCount: 0,
            wrongCount: 0,
            currentProblem: null,
            problemHistory: [],
            timeRemaining: mode === 'quiz' ? 60 : null,
            isActive: false,
            quizDuration: 60,
            quizProblemCount: 0
        };
    }

    // Start a new game
    startGame(mode: GameMode, topic: GameTopic, quizDuration: number = 60): GameState {
        this.usedProblems.clear();
        this.state = this.createInitialState(mode, topic);
        this.state.quizDuration = quizDuration;
        this.state.timeRemaining = mode === 'quiz' ? quizDuration : null;
        this.state.isActive = true;
        this.state.currentProblem = this.generateProblem(topic);
        return this.state;
    }

    // Generate a problem based on topic
    private generateProblem(topic: GameTopic, operation?: MathOperation, range?: number, fractionDifficulty?: FractionDifficulty): GameProblem {
        let problem: GameProblem;
        let attempts = 0;
        const maxAttempts = 50;

        do {
            attempts++;
            switch (topic) {
                case 'math': {
                    const op = operation || ['+', '-', '*', ':'][Math.floor(Math.random() * 4)] as MathOperation;
                    const r = range || 100;
                    const [mathProblem] = MathEngine.generateProblems(1, op, r);
                    const answer = this.calculateMathAnswer(mathProblem);
                    problem = {
                        id: mathProblem.id,
                        type: 'math',
                        display: `${mathProblem.num1} ${mathProblem.operator} ${mathProblem.num2}`,
                        answer,
                        mathProblem
                    };
                    break;
                }

                case 'fractions': {
                    const difficulty = fractionDifficulty || ['level1', 'level2', 'level3'][Math.floor(Math.random() * 3)] as FractionDifficulty;
                    const fractionProblem = generateFractionProblem(difficulty);
                    const fractionAnswer = solveFractionProblem(fractionProblem);
                    // For simplicity, we accept the numeric value as answer
                    const numericAnswer = fractionAnswer.whole + (fractionAnswer.n / fractionAnswer.d);
                    problem = {
                        id: fractionProblem.id,
                        type: 'fractions',
                        display: `${formatFraction(fractionProblem.f1)} ${fractionProblem.op} ${formatFraction(fractionProblem.f2)}`,
                        answer: Math.round(numericAnswer * 1000) / 1000, // Round to avoid floating point issues
                        fractionAnswer,
                        fractionProblem
                    };
                    break;
                }

                case 'percentage': {
                    const percentProblem = generatePercentProblem();
                    const answer = (percentProblem.percent / 100) * percentProblem.total;
                    problem = {
                        id: percentProblem.id,
                        type: 'percentage',
                        display: `${percentProblem.percent}% מתוך ${percentProblem.total}`,
                        answer,
                        percentProblem
                    };
                    break;
                }
            }
        } while (this.usedProblems.has(problem!.id) && attempts < maxAttempts);

        this.usedProblems.add(problem!.id);
        return problem!;
    }

    private calculateMathAnswer(problem: MathProblem): number {
        switch (problem.operator) {
            case '+':
                return problem.num1 + problem.num2;
            case '-':
                return problem.num1 - problem.num2;
            case '*':
                return problem.num1 * problem.num2;
            case ':':
            case '/':
                return problem.num1 / problem.num2;
            default:
                return 0;
        }
    }

    // Check answer and update state
    checkAnswer(userAnswer: number): { correct: boolean; correctAnswer: number; state: GameState } {
        if (!this.state.currentProblem) {
            return { correct: false, correctAnswer: 0, state: this.state };
        }

        const correctAnswer = this.state.currentProblem.answer;
        // Allow small margin for floating point errors
        const correct = Math.abs(userAnswer - correctAnswer) < 0.01;

        if (correct) {
            this.state.score += 10 + this.state.streak; // Bonus for streak
            this.state.streak++;
            this.state.correctCount++;
            if (this.state.streak > this.state.bestStreak) {
                this.state.bestStreak = this.state.streak;
            }
        } else {
            this.state.streak = 0;
            this.state.wrongCount++;
        }

        // Store in history
        this.state.problemHistory.push(this.state.currentProblem);
        this.state.quizProblemCount++;

        return { correct, correctAnswer, state: this.state };
    }

    // Get next problem
    nextProblem(operation?: MathOperation, range?: number, fractionDifficulty?: FractionDifficulty): GameState {
        this.state.currentProblem = this.generateProblem(this.state.topic, operation, range, fractionDifficulty);
        return this.state;
    }

    // Update timer (called every second)
    tick(): GameState {
        if (this.state.mode === 'quiz' && this.state.timeRemaining !== null && this.state.timeRemaining > 0) {
            this.state.timeRemaining--;
            if (this.state.timeRemaining === 0) {
                this.state.isActive = false;
            }
        }
        return this.state;
    }

    // End game
    endGame(): GameState {
        this.state.isActive = false;
        return this.state;
    }

    // Get current state
    getState(): GameState {
        return this.state;
    }

    // Add time bonus for quiz mode (on correct answer)
    addTimeBonus(seconds: number = 2): void {
        if (this.state.mode === 'quiz' && this.state.timeRemaining !== null) {
            this.state.timeRemaining += seconds;
        }
    }
}

// Export helper functions
export { formatFraction, formatFractionAnswer, solveFractionProblem };
