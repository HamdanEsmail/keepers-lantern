import { describe, it, expect } from 'vitest';
import { makeRng, randRange } from '../src/logic/rng.js';

describe('makeRng', () => {
    it('repeats for the same seed', () => {
        const a = makeRng(42);
        const b = makeRng(42);
        expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    });
    it('stays in [0, 1)', () => {
        const r = makeRng(7);
        for (let i= 0; i < 1000; i++) {
            const v = r();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });
    it('randRange stays in range', () => {
        const r = makeRng(1);
        for (let i = 0; i< 200; i++) {
            const v = randRange(r, 5, 9);
            expect(v >= 5 && v < 9).toBe(true);
        }
    });
});