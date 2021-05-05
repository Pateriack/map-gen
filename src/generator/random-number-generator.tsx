import seedrandom from 'seedrandom';

export class RandomNumberGenerator {
    private prng: ReturnType<seedrandom>;

    constructor(private seed?: string) {
        this.prng = seedrandom(seed);
    }

    getNumber(a: number = 1, b: number = 0) {
        const lower = Math.min(a, b);
        const upper = Math.max(a, b);

        return (this.prng() * (upper - lower)) + lower;
    }

    getInt(a: number = 1, b: number = 0) {
        const lower = Math.min(a, b);
        const upper = Math.max(a, b);

        return Math.round(this.getNumber(a-0.499999, b+0.499999));
    }
}