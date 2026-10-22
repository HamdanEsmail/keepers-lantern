import { makeRng, randRange } from './rng.js';
import { CAMP, BEACON, RINGS, distance } from './world.js';

// One landmark in every valley: something big and old you can find your way by,
// with a few useful things in it the first time you search it.
// Like everything else, it's somewhere new each night.

// seen:    what you're told the first time you come near
// found:   what you're told when you search it
// items:   what goes into your pack. food is eaten on the spot.
// solids:  the circles you can't walk through, measured from the landmark's middle
// shelter: standing close keeps the rain off
export const LANDMARKS = {
    'hollow-tree': {
        label: 'Hollow Tree',
        seen: 'An old hollow tree, older than the forest around it.',
        found: 'Its heart is full of resin. One knot will burn like a torch.',
        items: ['torch', 'amber', 'amber'],
        food: 0,
        solids: [{ x: 0, y: -8, r: 30 }],
        shelter: true,
    },
    'standing-stones': {
        label: 'Standing Stones',
        seen: 'A ring of standing stones, grey with moss.',
        found: 'Berries grow thick between the stones, and mushrooms in their shade.',
        items: ['mushroom', 'mushroom'],
        food: 30,
        solids: stoneRing(),
        shelter: false,
    },
    boulder: {
        label: 'Great Boulder',
        seen: 'A great boulder, split down the middle.',
        found: 'Loose stone, and a vein of amber, dry under the overhang.',
        items: ['stone', 'stone', 'amber'],
        food: 0,
        solids: [{ x: 0, y: -20, r: 40 }],
        shelter: true,
    },
};

// Five stones in a ring, squashed a little because we look at it from above and to the side.
function stoneRing() {
    const stones = [];
    for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        stones.push({ x: Math.cos(angle) * 66, y: Math.sin(angle) * 66 * 0.72, r: 14 });
    }
    return stones;
}

export const LANDMARK_REACH = 90; // how close you stand to search it
const SHELTER_REACH = 110; // and to keep out of the rain
const CLEAR = 140; // no trees this close
const NODE_CLEAR = 90; // or things to gather

// Where it can go: the pinewood or the deep woods, not too near the wall of trees at the edge.
const SPAN = {
    pinewood: [RINGS.edge + 80, RINGS.pinewood - 40],
    deep: [RINGS.pinewood + 40, RINGS.deep - 160],
};

// It has its own seed, so placing it doesn't change where anything else grows.
// The kind takes turns, so you find a different one each night.
// Returns null in the (very unlikely) case there's no room.
export function placeLandmark(valley) {
    const rng = makeRng(valley.seed * 4241 + 11);
    const kinds = Object.keys(LANDMARKS);
    const kind = kinds[valley.seed % kinds.length];
    for (let i = 0; i < 300; i++) {
        const [inner, outer] = SPAN[rng() < 0.5 ? 'pinewood' : 'deep'];
        const angle = rng() * Math.PI * 2;
        const r = randRange(rng, inner, outer);
        const p = { x: CAMP.x + Math.cos(angle) * r, y: CAMP.y + Math.sin(angle) * r };
        if (fits(p, valley)) {
            const info = LANDMARKS[kind];
            return { kind, x: p.x, y: p.y, items: [...info.items], food: info.food };
        }
    }
    return null;
}

// Away from the stream and the beacon, and never on top of a lens or a journal page.
function fits(p, valley) {
    const far = (o, min) => distance(p.x, p.y, o.x, o.y) >= min;
    return (
        far(BEACON, BEACON.clearRadius + CLEAR) &&
        valley.stream.every((s) => far(s, CLEAR)) &&
        [...valley.lenses, ...valley.pages].every((o) => far(o, CLEAR + 30))
    );
}

// The valley with room made for the landmark: no trees on it, and nothing to gather inside it.
export function clearAround(valley, landmark) {
    if (!landmark) return valley;
    const far = (o, min) => distance(o.x, o.y, landmark.x, landmark.y) >= min;
    return {
        ...valley,
        trees: valley.trees.filter((t) => far(t, CLEAR)),
        nodes: valley.nodes.filter((n) => far(n, NODE_CLEAR)),
    };
}

// The solid circles, in world positions.
export function landmarkSolids(landmark) {
    return LANDMARKS[landmark.kind].solids.map((s) => ({ x: landmark.x + s.x, y: landmark.y + s.y, r: s.r }));
}

export function isEmpty(landmark) {
    return landmark.items.length === 0 && landmark.food === 0;
}

// Take what fits in your pack (space is how many more things it holds),
// and eat the food if you're hungry. Whatever's left stays for later.
export function searchLandmark(landmark, space, hungry) {
    const take = landmark.items.slice(0, Math.max(0, space));
    const food = hungry ? landmark.food : 0;
    return {
        take,
        food,
        landmark: { ...landmark, items: landmark.items.slice(take.length), food: landmark.food - food },
    };
}

// Close enough to keep out of the rain.
export function sheltersYou(landmark, x, y) {
    if (!landmark || !LANDMARKS[landmark.kind].shelter) return false;
    return distance(x, y, landmark.x, landmark.y) < SHELTER_REACH;
}
