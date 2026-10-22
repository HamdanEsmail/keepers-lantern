import { it, expect } from 'vitest';
import { gatherTime, gatherCount, gatherMode, cookAll, eatFromPack, GATHER_TIME } from '../src/logic/tools.js';
import { foodValue } from '../src/logic/survival.js';

it('the axe makes wood quicker and gives two', () => {
    expect(gatherTime('wood', [])).toBe(GATHER_TIME);
    expect(gatherTime('wood', ['axe'])).toBe(0.5);
    expect(gatherCount('wood', ['axe'])).toBe(2);
    expect(gatherCount('wood', [])).toBe(1);
    // It doesn't help with anything else.
    expect(gatherTime('stone', ['axe'])).toBe(GATHER_TIME);
    expect(gatherCount('stone', ['axe'])).toBe(1);
});

it('the fishing line puts fish in your pack instead of eating them there', () => {
    expect(gatherMode('fish', [])).toBe('eat');
    expect(gatherMode('fish', ['fishing-line'])).toBe('pack');
    expect(gatherMode('berries', ['fishing-line'])).toBe('eat');
    expect(gatherMode('wood', [])).toBe('pack');
});

it('cooks every fish in the pack', () => {
    expect(cookAll(['fish', 'wood', 'fish'])).toEqual({ pack: ['meal', 'wood', 'meal'], cooked: 2 });
    expect(cookAll(['wood'])).toEqual({ pack: ['wood'], cooked: 0 });
});

it('a meal is worth more than a fish, and more again with the cooking fire', () => {
    expect(foodValue('fish')).toBe(35);
    expect(foodValue('meal')).toBe(50);
    expect(foodValue('meal', ['cooking-fire'])).toBe(70);
});

it('eats the best thing in the pack first', () => {
    const m = { food: 20, warmth: 50, fuel: 50 };
    const a = eatFromPack(m, ['fish', 'wood', 'meal'], []);
    expect(a.ate).toBe('meal');
    expect(a.pack).toEqual(['fish', 'wood']);
    expect(a.meters.food).toBe(70);
    const b = eatFromPack(a.meters, a.pack, []);
    expect(b.ate).toBe('fish');
    expect(b.meters.food).toBe(100);
});

it('eats nothing when there is nothing to eat', () => {
    const m = { food: 20, warmth: 50, fuel: 50 };
    const r = eatFromPack(m, ['wood', 'stone'], []);
    expect(r).toEqual({ meters: m, pack: ['wood', 'stone'], ate: null });
});
