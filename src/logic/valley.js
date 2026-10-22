import { makeRng, randRange, pick } from './rng.js';
import { distance, ringAt, CAMP, BEACON, RINGS } from './world.js';
import { ITEMS } from '../data/items.js';

// How Many of each thing grows in one valley.
export const NODE_COUNTS = { wood: 14, berries: 10, stone: 10, mushroom: 8, fish: 6, amber: 6 };

// Journal pages hidden around the valley, apart from the lens pages
export const EXTRA_PAGES = ['extra-1', 'extra-2', 'extra-3'];

// Groves sit mostly further out, so the forest closes in as you walk away from camp.
const GROVE_RINGS = ['edge', 'pinewood', 'pinewood', 'deep', 'deep', 'deep'];

// The chance that a tree which fits actually grows there, in each ring.
const TREE_CHANCE = { edge: 0.45, pinewood: 0.8, deep: 1 };

// Which tree pictures grow where. 2 is the pines, 1 and 3 are leafy trees.
const TREE_KINDS = { edge: [1, 1, 3], pinewood: [2, 2, 2, 1], deep: [1, 2, 3, 3] };

// The inner and outer edge of each ring, measured from Camp.
const RING_SPAN = {
    edge: [CAMP.clearRadius, RINGS.edge],
    pinewood: [RINGS.edge, RINGS.pinewood],
    deep: [RINGS.pinewood, RINGS.deep],
};

// Is point P at least 'min' away from every point in 'list'?
function farFrom(p, list, min) {
    return list.every((o) => distance(p.x, p.y, o.x, o.y) >= min);
}

// Not too close to the camp fire or the beacon.

function clearOfLandmarks(p) {
    return distance(p.x, p.y, CAMP.x, CAMP.y) >= CAMP.clearRadius
    && distance(p.x, p.y, BEACON.x, BEACON.y) >= BEACON.clearRadius;
}

// A random spot inside a ring, kept 30px away from its edgess.
function pointInRing(rng, ring) {
    const [inner, outer] = RING_SPAN[ring];
    const angle = rng() * Math.PI * 2;
    const r = randRange(rng, inner + 30, outer - 30);
    return { x: CAMP.x + Math.cos(angle) * r, y: CAMP.y + Math.sin(angle) * r };
}

// Keep trying random spots until one fits, Give up after 200 tries.
function place(seed, makePoint, fits) {
    for (let i = 0; i < 200; i++) {
        const p = makePoint();
        if (fits(p)) return p;
    }
    throw new Error(`Valley ${seed}: no room left to place something`);
}

// The Stream: a Curve that enters the valley on one side,
// bends through the pinewood, and leaves on the far side.
function makeStream(rng, seed) {
    for (let attempt = 0; attempt < 200; attempt++) {
        const a0 = rng() * Math.PI * 2;
        const a2 = a0 + Math.PI + randRange(rng, -0.7, 0.7);
        const am = rng() * Math.PI * 2;
        const rm = randRange(rng, 700, 1000);

        const p0 = { x: CAMP.x + Math.cos(a0) * 1700, y: CAMP.y + Math.sin(a0) * 1700 };
        const p2 = { x: CAMP.x + Math.cos(a2) * 1700, y: CAMP.y + Math.sin(a2) * 1700 };
        const m = { x: CAMP.x + Math.cos(am) * rm, y: CAMP.y + Math.sin(am) * rm };
        // The Control point that makes the curve pass through m halfway along.
        const c = { x: 2 * m.x - (p0.x + p2.x) / 2, y: 2 * m.y - (p0.y + p2.y) / 2 };

        const points = [];
        for (let i = 0; i < 60; i++) {
            const t = i / 59;
            const u = 1 - t;
            points.push({
                x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x,
                y: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y,
            });
        }
        if (points.every(clearOfLandmarks)) return points;
    }
    throw new Error(`Valley ${seed}: the stream kept running through camp or the beacon`);
}

export function generateValley(seed, { lensDelivered = [], pagesFound = [] } = {}) {
    const rng = makeRng(seed);
    const stream = makeStream(rng, seed);

    // 1. Things to gather, each in its own ring.
    const nodes = [];
    const pinewoodWater = stream.filter((p) => ringAt(p.x, p.y) === 'pinewood');
    for (const [kind, count] of Object.entries(NODE_COUNTS)) {
        for (let i = 0; i < count; i++) {
            const makePoint = kind === 'fish' 
            ? () => ({ ...pick(rng, pinewoodWater)})
            : () => pointInRing(rng, ITEMS[kind].ring);
            const p = place(seed, makePoint, (q) => clearOfLandmarks(q) && farFrom(q, nodes, 50));
            nodes.push({ id: `${kind}-${i}`, kind, x: p.x, y: p.y });
        }
    }

    // 2. The Lens pieces you haven't brought home yet, deep and far apart.
    const lenses = [];
    for (const index of [0, 1, 2]) {
        if (lensDelivered.includes(index)) continue;
        const p= place(seed, () => pointInRing(rng, 'deep'),
            (q) => clearOfLandmarks(q) && farFrom(q, lenses, 400) && farFrom(q, nodes, 50));
        lenses.push({ index, x: p.x, y: p.y });
    }
    
    // 3. Journal pages you haven't found yet
    const pages = [];
    for (const id of EXTRA_PAGES) {
        if (pagesFound.includes(id)) continue;
        const p = place(seed, () => pointInRing(rng, pick(rng, ['pinewood', 'deep'])),
            (q) => clearOfLandmarks(q) && farFrom(q, [...nodes, ...lenses, ...pages], 50));
        pages.push({ id, x: p.x, y: p.y });
    }

    // 4. Trees. Most grow in groves with open glades between them,
    //    and the forest gets thicker the further you are from camp.
    const groves = [];
    for (let i = 0; i < 40; i++) {
        groves.push(pointInRing(rng, pick(rng, GROVE_RINGS)));
    }
    const things = [...nodes, ...lenses, ...pages];
    const trees = [];
    for (let i = 0; i < 1400; i++) {
        const p = rng() < 0.7 ? nearGrove(rng, pick(rng, groves)) : anywhere(rng);
        const ring = ringAt(p.x, p.y);
        if (ring === 'outside' || rng() > TREE_CHANCE[ring]) continue;
        if (clearOfLandmarks(p) && farFrom(p, trees, 64) && farFrom(p, things, 60) && farFrom(p, stream, 40)) {
            trees.push({ x: p.x, y: p.y, r: randRange(rng, 22, 30), variant: pick(rng, TREE_KINDS[ring]) });
        }
    }
    return { seed, trees, stream, nodes, lenses, pages };
}

// A random spot within 240px of a grove's centre.
function nearGrove(rng, grove) {
    const angle = rng() * Math.PI * 2;
    const r = 240 * Math.sqrt(rng());
    return { x: grove.x + Math.cos(angle) * r, y: grove.y + Math.sin(angle) * r };
}

// A random spot anywhere in the valley, spread evenly.
function anywhere(rng) {
    const angle = rng() * Math.PI * 2;
    const r = RINGS.deep * Math.sqrt(rng());
    return { x: CAMP.x + Math.cos(angle) * r, y: CAMP.y + Math.sin(angle) * r };
}