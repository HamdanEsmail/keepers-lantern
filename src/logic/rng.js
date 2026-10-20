// A Tiny random number generator you can "seed"
// The same seed always gives the same numbers, so a whole
// forest can be rebuilt from a single number.

export function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t / 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// A Random decimal between min (included) and max (not included)
export function randRange(rng, min, max) {
    return min + rng() * (max - min);
}

// A Random item from an Array
export function pick(rng, array) {
    return array[Math.floor(rng() * array.length)];
}