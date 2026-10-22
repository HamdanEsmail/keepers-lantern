// One run is one day and the night after it. `t` is seconds since dawn.
// The night has no end: you leave it by sleeping at camp, or by losing.

export const DAY_LENGTH = 300;

// Where each phase ends, as a fraction of the day.
const DAWN_END = 0.12;
const DAY_END = 0.6;
const DUSK_END = 0.75;

export const DUSK_AT = DAY_LENGTH * DAY_END;
export const NIGHT_AT = DAY_LENGTH * DUSK_END;

// How dark the night gets. 1 would be pitch black, which isn't fair.
export const MAX_DARKNESS = 0.85;

export function phaseAt(t) {
    if (t < DAY_LENGTH * DAWN_END) return 'dawn';
    if (t < DUSK_AT) return 'day';
    if (t < NIGHT_AT) return 'dusk';
    return 'night';
}

// 0 in daylight, rising evenly through dusk, then MAX_DARKNESS all night.
export function darknessAt(t) {
    if (t < DUSK_AT) return 0;
    if (t >= NIGHT_AT) return MAX_DARKNESS;
    return (MAX_DARKNESS * (t - DUSK_AT)) / (NIGHT_AT - DUSK_AT);
}
