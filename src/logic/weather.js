import { makeRng } from './rng.js';
import { MAX_DARKNESS } from './clock.js';

// Every run has its own sky (for the whole run) and its own night.
// The first run is always clear and calm, so you learn the valley
// before it starts changing on you.

// cold:    how much faster you lose warmth
// lantern: how far your lantern reaches, compared with a clear sky
export const SKIES = {
    clear: { label: null, cold: 1, lantern: 1, toast: null },
    rain: {
        label: 'Rain',
        cold: 1.5,
        lantern: 1,
        toast: 'Rain today. It soaks through, so you lose warmth faster.',
    },
    fog: {
        label: 'Fog',
        cold: 1,
        lantern: 0.85,
        toast: "Fog in the valley. Tonight your lantern won't reach as far.",
    },
};

// darkness:   how dark the night gets (see clock.js)
// nightColor: the colour of the dark
// wolves:     how many more (or fewer) wolves come
// gap, speed: how far outside your light they wait, and how fast they move (see wolfai.js)
export const MOONS = {
    normal: { label: null, darkness: MAX_DARKNESS, nightColor: 0x0a120e, wolves: 0, gap: 70, speed: 60, toast: null },
    'full-moon': {
        label: 'Full moon',
        darkness: 0.7,
        nightColor: 0x17222c,
        wolves: -1,
        gap: 70,
        speed: 60,
        toast: 'A full moon is rising. The night will be brighter, and fewer wolves will come.',
    },
    'wolf-moon': {
        label: 'Wolf moon',
        darkness: MAX_DARKNESS,
        nightColor: 0x1e0f0c,
        wolves: 1,
        gap: 40,
        speed: 75,
        toast: 'A wolf moon is rising. More wolves tonight, and they will come closer.',
    },
};

// How often each one comes up. A clear sky and a normal night are the most common,
// so the strange ones stay strange.
const SKY_CHANCES = [
    ['clear', 0.5],
    ['rain', 0.3],
    ['fog', 0.2],
];
const MOON_CHANCES = [
    ['normal', 0.6],
    ['full-moon', 0.2],
    ['wolf-moon', 0.2],
];

function choose(rng, chances) {
    let roll = rng();
    for (const [kind, chance] of chances) {
        if (roll < chance) return kind;
        roll -= chance;
    }
    return chances[0][0];
}

// The same save and run always give the same weather.
// It has its own seed, so it doesn't change how the valley is laid out.
export function weatherFor(baseSeed, run) {
    if (run === 0) return makeWeather('clear', 'normal');
    const rng = makeRng(baseSeed * 7919 + run * 131 + 1000);
    return makeWeather(choose(rng, SKY_CHANCES), choose(rng, MOON_CHANCES));
}

// Everything the valley needs to know about one run's weather, in one plain object.
export function makeWeather(sky = 'clear', moon = 'normal') {
    const s = SKIES[sky];
    const m = MOONS[moon];
    return {
        sky,
        moon,
        cold: s.cold,
        lantern: s.lantern,
        darkness: m.darkness,
        nightColor: m.nightColor,
        wolves: m.wolves,
        wolfGap: m.gap,
        wolfSpeed: m.speed,
        dawnToast: s.toast,
        duskToast: m.toast,
    };
}

// What the HUD shows next to the day. The moon only shows once it's rising.
export function weatherLabel(weather, phase) {
    const parts = [SKIES[weather.sky].label];
    if (phase === 'dusk' || phase === 'night') parts.push(MOONS[weather.moon].label);
    return parts.filter(Boolean).join(' · ');
}
