import { it, expect } from 'vitest';
import { phaseAt, darknessAt, DAY_LENGTH, DUSK_AT, NIGHT_AT, MAX_DARKNESS } from '../src/logic/clock.js';

const D = DAY_LENGTH;

it('goes dawn, day, dusk, then stays night', () => {
    expect(phaseAt(0)).toBe('dawn');
    expect(phaseAt(D * 0.3)).toBe('day');
    expect(phaseAt(D * 0.7)).toBe('dusk');
    expect(phaseAt(D * 5)).toBe('night');
});

it('changes phase exactly at the edges', () => {
    expect(phaseAt(D * 0.12 - 0.01)).toBe('dawn');
    expect(phaseAt(D * 0.12)).toBe('day');
    expect(phaseAt(DUSK_AT - 0.01)).toBe('day');
    expect(phaseAt(DUSK_AT)).toBe('dusk');
    expect(phaseAt(NIGHT_AT - 0.01)).toBe('dusk');
    expect(phaseAt(NIGHT_AT)).toBe('night');
});

it('darkens only across dusk', () => {
    expect(darknessAt(0)).toBe(0);
    expect(darknessAt(D * 0.3)).toBe(0);
    expect(darknessAt(D * 0.675)).toBeCloseTo(0.425);
    expect(darknessAt(D)).toBeCloseTo(0.85);
    expect(darknessAt(D * 9)).toBe(MAX_DARKNESS);
});

it('never gets lighter as dusk goes on', () => {
    let last = 0;
    for (let t = DUSK_AT; t <= NIGHT_AT + 5; t += 0.5) {
        const d = darknessAt(t);
        expect(d).toBeGreaterThanOrEqual(last);
        last = d;
    }
});
