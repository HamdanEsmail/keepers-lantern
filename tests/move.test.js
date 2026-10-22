import { describe, it, expect } from 'vitest';
import { readMove, distanceToSegment, inStream, speedFor } from '../src/logic/move.js';

describe('speedFor', () => {
    it('walks at full speed on land', () => expect(speedFor({ inStream: false, sprinting: false })).toBe(1));
    it('wades slower in the stream', () => expect(speedFor({ inStream: true, sprinting: false })).toBeCloseTo(0.6));
    it('sprints faster', () => expect(speedFor({ inStream: false, sprinting: true })).toBeCloseTo(1.55));
    it('sprinting in the stream is still slower than walking on land', () => {
        expect(speedFor({ inStream: true, sprinting: true })).toBeLessThan(1);
    });
});

// Pretend keyboard: only the keys listed are held down.
function keys(...held) {
    const all = {};
    for (const k of ['W', 'A', 'S', 'D', 'UP', 'LEFT', 'DOWN', 'RIGHT']) {
        all[k] = { isDown: held.includes(k) };
    }
    return all;
}

describe('readMove', () => {
    it('stands still with no keys', () => {
        expect(readMove(keys())).toEqual({ x: 0, y: 0 });
    });

    it('works with WASD and the arrows', () => {
        expect(readMove(keys('D'))).toEqual({ x: 1, y: 0 });
        expect(readMove(keys('UP'))).toEqual({ x: 0, y: -1 });
    });

    it('is not faster on a diagonal', () => {
        const d = readMove(keys('W', 'D'));
        expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
    });

    it('cancels out opposite keys', () => {
        expect(readMove(keys('A', 'D'))).toEqual({ x: 0, y: 0 });
    });
});

describe('the stream', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 0 };

    it('measures distance to a line, not just its ends', () => {
        expect(distanceToSegment({ x: 50, y: 10 }, a, b)).toBeCloseTo(10);
        expect(distanceToSegment({ x: 130, y: 40 }, a, b)).toBeCloseTo(50);
    });

    it('knows when you are in the water', () => {
        const stream = [a, b, { x: 100, y: 100 }];
        expect(inStream(stream, 50, 5)).toBe(true);
        expect(inStream(stream, 50, 40)).toBe(false);
        expect(inStream(stream, 105, 60)).toBe(true);
    });
});
