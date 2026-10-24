import { it, expect } from 'vitest';
import { ambienceLevels, isMuted, toggleMute, playSfx, setAmbience } from '../src/audio/sound.js';

// A pretend localStorage.
function fakeStorage() {
    const items = new Map();
    return {
        getItem: (key) => (items.has(key) ? items.get(key) : null),
        setItem: (key, value) => items.set(key, String(value)),
    };
}

it('makes the wind louder at night', () => {
    expect(ambienceLevels({ phase: 'night' }).wind).toBeGreaterThan(ambienceLevels({ phase: 'day' }).wind);
});

it('only rains on a rainy day, and keeps the fire between 0 and 1', () => {
    expect(ambienceLevels({ rain: false }).rain).toBe(0);
    expect(ambienceLevels({ rain: true }).rain).toBeGreaterThan(0);
    expect(ambienceLevels({ fire: -3 }).fire).toBe(0);
    expect(ambienceLevels({ fire: 0.5 }).fire).toBe(0.5);
    expect(ambienceLevels({ fire: 2 }).fire).toBe(1);
});

it('remembers whether the sound is off', () => {
    const storage = fakeStorage();
    expect(isMuted(storage)).toBe(false);
    expect(toggleMute(storage)).toBe(true);
    expect(isMuted(storage)).toBe(true);
    expect(toggleMute(storage)).toBe(false);
    expect(isMuted(storage)).toBe(false);
});

it('stays quiet, without errors, until the first key press or click', () => {
    expect(() => playSfx('howl')).not.toThrow();
    expect(() => setAmbience({ phase: 'night', fire: 1 })).not.toThrow();
    expect(isMuted(null)).toBe(false);
});
