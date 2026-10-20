import { it, expect } from 'vitest';
import { ringAt, CAMP, BEACON } from '../src/logic/world.js';

it ('rings by distance from camp', () => {
    expect(ringAt(CAMP.x, CAMP.y)).toBe('edge');
    expect(ringAt(CAMP.x + 800, CAMP.y)).toBe('pinewood');
    expect(ringAt(CAMP.x + 1300, CAMP.y)).toBe('deep');
    expect(ringAt(CAMP.x + 1700, CAMP.y)).toBe('outside');
    expect(ringAt(BEACON.x, BEACON.y)).toBe('deep');
});