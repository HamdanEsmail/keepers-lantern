import { it, expect } from 'vitest';
import { ringAt, distance, CAMP, TENT, BEACON } from '../src/logic/world.js';

it ('rings by distance from camp', () => {
    expect(ringAt(CAMP.x, CAMP.y)).toBe('edge');
    expect(ringAt(CAMP.x + 800, CAMP.y)).toBe('pinewood');
    expect(ringAt(CAMP.x + 1300, CAMP.y)).toBe('deep');
    expect(ringAt(CAMP.x + 1700, CAMP.y)).toBe('outside');
    expect(ringAt(BEACON.x, BEACON.y)).toBe('deep');
});

it('puts the tent in the camp clearing, out of the fire', () => {
    const d = distance(TENT.x, TENT.y, CAMP.x, CAMP.y);
    expect(d).toBeLessThan(CAMP.clearRadius);
    expect(d).toBeGreaterThan(TENT.reach);
});
