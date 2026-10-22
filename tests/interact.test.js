import { describe, it, expect } from 'vitest';
import { pickTarget, stepHold, newHold } from '../src/logic/interact.js';

describe('pickTarget', () => {
    const things = [
        { id: 'a', x: 100, y: 0, radius: 56 },
        { id: 'b', x: 30, y: 0, radius: 56 },
        { id: 'c', x: 0, y: 200, radius: 300 },
    ];

    it('picks the closest thing in reach', () => {
        expect(pickTarget(things, 0, 0).id).toBe('b');
    });

    it('ignores things out of their reach', () => {
        expect(pickTarget([things[0]], 0, 0)).toBeNull();
    });

    it('lets big things be used from further away', () => {
        expect(pickTarget([things[0], things[2]], 0, 0).id).toBe('c');
    });
});

describe('holding E', () => {
    const run = (steps) => {
        let hold = newHold();
        let done = 0;
        for (const [down, id] of steps) {
            const r = stepHold(hold, 0.1, down, id, 1.2);
            hold = r.hold;
            if (r.done) done++;
        }
        return { hold, done };
    };

    it('finishes after holding long enough', () => {
        expect(run(Array(12).fill([true, 'a'])).done).toBe(1);
    });

    it('does nothing if released early', () => {
        expect(run([...Array(11).fill([true, 'a']), [false, null], [true, 'a']]).done).toBe(0);
    });

    it('starts over when you move to something else', () => {
        expect(run([...Array(6).fill([true, 'a']), ...Array(6).fill([true, 'b'])]).done).toBe(0);
    });

    it('needs a fresh press for the next one', () => {
        expect(run(Array(30).fill([true, 'a'])).done).toBe(1);
    });
});
