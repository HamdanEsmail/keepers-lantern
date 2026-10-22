import { it, expect } from 'vitest';
import { weatherFor, makeWeather, weatherLabel, SKIES, MOONS } from '../src/logic/weather.js';
import { MAX_DARKNESS } from '../src/logic/clock.js';

it('keeps the first run clear and calm', () => {
    for (const seed of [1, 2, 99]) {
        const w = weatherFor(seed, 0);
        expect(w.sky).toBe('clear');
        expect(w.moon).toBe('normal');
        expect(w.dawnToast).toBeNull();
        expect(w.duskToast).toBeNull();
    }
});

it('gives the same weather for the same save and run', () => {
    expect(weatherFor(1, 5)).toEqual(weatherFor(1, 5));
    expect(weatherFor(7, 3)).toEqual(weatherFor(7, 3));
});

it('comes up with every sky and every moon over enough runs', () => {
    const skies = new Set();
    const moons = new Set();
    for (let run = 1; run <= 80; run++) {
        const w = weatherFor(1, run);
        skies.add(w.sky);
        moons.add(w.moon);
    }
    expect([...skies].sort()).toEqual(Object.keys(SKIES).sort());
    expect([...moons].sort()).toEqual(Object.keys(MOONS).sort());
});

it('is clear more often than not', () => {
    let clear = 0;
    for (let run = 1; run <= 200; run++) if (weatherFor(1, run).sky === 'clear') clear++;
    expect(clear).toBeGreaterThan(70);
    expect(clear).toBeLessThan(130);
});

it('describes what each kind of weather does', () => {
    expect(makeWeather('rain').cold).toBe(1.5);
    expect(makeWeather('fog').lantern).toBe(0.85);
    expect(makeWeather('clear', 'full-moon')).toMatchObject({ darkness: 0.7, wolves: -1 });
    expect(makeWeather('clear', 'wolf-moon')).toMatchObject({ wolves: 1, wolfGap: 40, wolfSpeed: 75 });
    expect(makeWeather()).toMatchObject({ cold: 1, lantern: 1, darkness: MAX_DARKNESS, wolves: 0 });
});

it('only shows the moon once it is rising', () => {
    const w = makeWeather('rain', 'wolf-moon');
    expect(weatherLabel(w, 'day')).toBe('Rain');
    expect(weatherLabel(w, 'dusk')).toBe('Rain · Wolf moon');
    expect(weatherLabel(makeWeather('clear', 'full-moon'), 'night')).toBe('Full moon');
    expect(weatherLabel(makeWeather(), 'night')).toBe('');
});
