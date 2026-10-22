import { describe, it, expect } from 'vitest';
import { addToPack, emptyInto, capacity, PACK_SIZE } from '../src/logic/pack.js';

describe('the pack', () => {
    it('adds until full, then refuses without changing the pack', () => {
        let p = [];
        for (let i = 0; i < PACK_SIZE; i++) p = addToPack(p, 'wood', PACK_SIZE).pack;
        const r = addToPack(p, 'stone', PACK_SIZE);
        expect(r.added).toBe(false);
        expect(r.pack).toEqual(p);
        expect(r.pack).toHaveLength(6);
    });

    it('never changes the pack it was given', () => {
        const p = ['wood'];
        addToPack(p, 'stone', 6);
        expect(p).toEqual(['wood']);
    });

    it('holds 9 with the mended pack', () => {
        expect(capacity(['pack'])).toBe(9);
        expect(capacity([])).toBe(6);
    });

    it('empties into the stash and hands back lens pieces', () => {
        expect(emptyInto({ wood: 2 }, ['wood', 'stone', 'lens-1'])).toEqual({ stash: { wood: 3, stone: 1 }, lenses: [1] });
    });
});
