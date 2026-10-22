import { it, expect } from 'vitest';
import { tickSurvival, startMeters, maxFuel, eat, isSpent, lightRadius } from '../src/logic/survival.js';

const env = (o) => ({ phase: 'night', nearFire: false, upgrades: [], ...o });

it('starts full, with a bigger lantern after the upgrade', () => {
    expect(startMeters([])).toEqual({ food: 100, warmth: 100, fuel: 100 });
    expect(startMeters(['lantern']).fuel).toBe(150);
    expect(maxFuel([])).toBe(100);
});

it('drains at night, coat helps, fire warms', () => {
    const m = startMeters([]);
    expect(tickSurvival(m, 0.1, env()).warmth).toBeCloseTo(99.97);
    expect(tickSurvival(m, 0.1, env({ upgrades: ['coat'] })).warmth).toBeCloseTo(99.982);
    expect(tickSurvival({ ...m, warmth: 50 }, 0.1, env({ nearFire: true })).warmth).toBeCloseTo(50.5);
});

it('loses warmth faster as the day ends', () => {
    const m = startMeters([]);
    const lost = (phase) => 100 - tickSurvival(m, 0.1, env({ phase })).warmth;
    expect(lost('day')).toBeCloseTo(0.01);
    expect(lost('dusk')).toBeCloseTo(0.02);
    expect(lost('night')).toBeCloseTo(0.03);
});

it('gets hungry, a little slower with the cooking fire', () => {
    const m = startMeters([]);
    expect(tickSurvival(m, 0.1, env()).food).toBeCloseTo(99.98);
    expect(tickSurvival(m, 0.1, env({ upgrades: ['cooking-fire'] })).food).toBeCloseTo(99.985);
});

it('sprinting makes you hungry three times as fast', () => {
    const m = startMeters([]);
    expect(tickSurvival(m, 0.1, env({ sprinting: true })).food).toBeCloseTo(99.94);
    expect(tickSurvival(m, 0.1, env({ sprinting: true, upgrades: ['cooking-fire'] })).food).toBeCloseTo(99.955);
    // Only food: warmth and fuel don't care.
    expect(tickSurvival(m, 0.1, env({ sprinting: true })).warmth).toBeCloseTo(99.97);
});

it('clamps big frame gaps (hidden tab)', () => {
    const m = startMeters([]);
    expect(tickSurvival(m, 30, env())).toEqual(tickSurvival(m, 0.1, env()));
});

it('keeps every meter between empty and full', () => {
    const low = tickSurvival({ food: 0.001, warmth: 0.001, fuel: 0.001 }, 0.1, env());
    expect(low).toEqual({ food: 0, warmth: 0, fuel: 0 });
    const warm = tickSurvival({ food: 50, warmth: 99.9, fuel: 50 }, 0.1, env({ nearFire: true }));
    expect(warm.warmth).toBe(100);
});

it('fuel only burns after dusk, away from the fire', () => {
    const m = startMeters([]);
    expect(tickSurvival(m, 0.1, env({ phase: 'day' })).fuel).toBe(100);
    expect(tickSurvival(m, 0.1, env({ nearFire: true })).fuel).toBe(100);
    expect(tickSurvival(m, 0.1, env()).fuel).toBeCloseTo(99.95);
    expect(tickSurvival(m, 0.1, env({ phase: 'dusk' })).fuel).toBeCloseTo(99.95);
});

it('matches the plan: the lantern dims before the cold or hunger win', () => {
    // A whole run with no upgrades and no eating, never going back to camp.
    let m = startMeters([]);
    const phases = [['dawn', 36], ['day', 144], ['dusk', 45]];
    for (const [phase, secs] of phases) {
        for (let i = 0; i < secs * 10; i++) m = tickSurvival(m, 0.1, env({ phase }));
    }
    let dimAt = null;
    let coldAt = null;
    let hungryAt = null;
    for (let i = 1; i <= 400 * 10; i++) {
        m = tickSurvival(m, 0.1, env());
        const s = i / 10;
        if (dimAt === null && m.fuel < 25) dimAt = s;
        if (coldAt === null && m.warmth <= 0) coldAt = s;
        if (hungryAt === null && m.food <= 0) hungryAt = s;
    }
    expect(dimAt).toBeCloseTo(105, -1);
    expect(coldAt).toBeCloseTo(245, -1);
    expect(hungryAt).toBeCloseTo(275, -1);
    expect(dimAt).toBeLessThan(coldAt);
    expect(coldAt).toBeLessThan(hungryAt);
});

it('eating fills food up to full and nothing else', () => {
    expect(eat({ food: 90, warmth: 1, fuel: 1 }, 'fish').food).toBe(100);
    expect(eat({ food: 50, warmth: 1, fuel: 1 }, 'berries')).toEqual({ food: 70, warmth: 1, fuel: 1 });
    expect(eat({ food: 50, warmth: 1, fuel: 1 }, 'fish').food).toBe(85);
    expect(eat({ food: 50, warmth: 1, fuel: 1 }, 'stone').food).toBe(50);
});

it('is spent when food or warmth runs out, but not fuel', () => {
    expect(isSpent({ food: 0, warmth: 50, fuel: 5 })).toBe(true);
    expect(isSpent({ food: 50, warmth: 0, fuel: 5 })).toBe(true);
    expect(isSpent({ food: 50, warmth: 50, fuel: 0 })).toBe(false);
});

it('the light shrinks with the fuel', () => {
    expect(lightRadius(100, [])).toBe(220);
    expect(lightRadius(0, [])).toBeCloseTo(77);
    expect(lightRadius(150, ['lantern'])).toBe(300);
    expect(lightRadius(50, [])).toBeLessThan(lightRadius(60, []));
});
