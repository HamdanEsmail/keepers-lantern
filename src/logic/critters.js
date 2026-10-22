import { makeRng } from './rng.js';
import { WORLD, CAMP, RINGS, distance } from './world.js';

// Deer, rabbits and birds. They live in the valley by day, run if you get too close,
// and hide when the light goes. They never hurt you: they're there so the forest feels alive.
// Like the rest of logic/, stepCritter returns a new critter instead of changing the old one.

// rings:  where they live
// scare:  how close you can get before they run (further if you're sprinting)
// flee:   how fast they run (or fly)
// wander: how fast they walk about, and roam: how far from home they go
export const CRITTERS = {
    deer: { count: 3, rings: ['pinewood', 'deep'], scare: 160, flee: 170, wander: 24, roam: 150 },
    rabbit: { count: 5, rings: ['edge', 'pinewood'], scare: 110, flee: 200, wander: 40, roam: 80 },
    bird: { count: 6, rings: ['edge', 'pinewood', 'deep'], scare: 120, flee: 230, wander: 0, roam: 0 },
};

export const SPRINT_SCARE = 1.6; // running footsteps carry further
export const FLEE_TIME = 1.6; // seconds a startled animal runs before it calms down
export const FLY_TIME = 1.4; // seconds for a bird to fly out of sight
export const HIDE_TIME = 2; // seconds to slip away at dusk
const FLY_UP = 60; // how fast a bird climbs, in pixels per second
const EDGE = 60; // they keep this far from the edge of the world
export const KEEP_FROM_CAMP = CAMP.clearRadius + 40; // and away from the fire

const RING_RANGE = {
    edge: [CAMP.clearRadius + 60, RINGS.edge],
    pinewood: [RINGS.edge, RINGS.pinewood],
    deep: [RINGS.pinewood, RINGS.deep],
};

function pointInRing(rng, ring) {
    const [inner, outer] = RING_RANGE[ring];
    const angle = rng() * Math.PI * 2;
    const r = inner + rng() * (outer - inner);
    return { x: CAMP.x + Math.cos(angle) * r, y: CAMP.y + Math.sin(angle) * r };
}

// Everyone who lives in this valley. They have their own seed,
// so adding them didn't change where anything else grows.
export function spawnCritters(seed) {
    const rng = makeRng(seed * 3571 + 7);
    const critters = [];
    for (const [kind, info] of Object.entries(CRITTERS)) {
        for (let i = 0; i < info.count; i++) {
            const ring = info.rings[Math.floor(rng() * info.rings.length)];
            const home = pointInRing(rng, ring);
            critters.push({
                id: `${kind}-${i}`,
                kind,
                x: home.x,
                y: home.y,
                home,
                state: 'idle', // idle, walking, fleeing, flying, hiding or gone
                timer: 1 + rng() * 4,
                target: null,
                dir: null,
                facing: rng() < 0.5 ? -1 : 1,
                fade: 1, // 1 = fully there, 0 = gone
                lift: 0, // how high a flying bird is
                moving: false,
            });
        }
    }
    return critters;
}

// ctx: { px, py, sprinting, phase, rng }
export function stepCritter(c, dt, ctx) {
    dt = Math.min(dt, 0.1);
    const info = CRITTERS[c.kind];
    const next = { ...c, moving: false };
    if (c.state === 'gone') return next;

    // The light is going: the deer and rabbits slip away, and the birds fly off.
    const evening = ctx.phase === 'dusk' || ctx.phase === 'night';
    if (evening && c.state !== 'hiding' && c.state !== 'flying') {
        return c.kind === 'bird' ? takeOff(next, ctx) : { ...next, state: 'hiding' };
    }

    if (c.state === 'hiding') {
        next.fade = c.fade - dt / HIDE_TIME;
        return next.fade <= 0 ? { ...next, fade: 0, state: 'gone' } : next;
    }

    if (c.state === 'flying') {
        moveAlong(next, c.dir, info.flee * dt);
        next.lift = c.lift + FLY_UP * dt;
        next.fade = c.fade - dt / FLY_TIME;
        next.moving = true;
        return next.fade <= 0 ? { ...next, fade: 0, state: 'gone' } : next;
    }

    // Too close: run, or fly, away from you.
    const scare = info.scare * (ctx.sprinting ? SPRINT_SCARE : 1);
    if (c.state !== 'fleeing' && distance(c.x, c.y, ctx.px, ctx.py) < scare) {
        if (c.kind === 'bird') return takeOff(next, ctx);
        return { ...next, state: 'fleeing', timer: FLEE_TIME, dir: awayFrom(c, ctx) };
    }

    if (c.state === 'fleeing') {
        moveAlong(next, c.dir, info.flee * dt);
        next.moving = true;
        next.timer = c.timer - dt;
        // Once it has run far enough, wherever it stopped is its new home.
        if (next.timer > 0) return next;
        return { ...next, state: 'idle', timer: 1 + ctx.rng() * 3, home: { x: next.x, y: next.y } };
    }

    if (c.state === 'walking') {
        const d = distance(c.x, c.y, c.target.x, c.target.y);
        const step = info.wander * dt;
        if (d <= step) return { ...next, x: c.target.x, y: c.target.y, state: 'idle', timer: 2 + ctx.rng() * 4 };
        moveAlong(next, { x: (c.target.x - c.x) / d, y: (c.target.y - c.y) / d }, step);
        next.moving = true;
        return next;
    }

    // Idle: stand a while, then wander somewhere near home. Birds stay put and peck at the ground.
    next.timer = c.timer - dt;
    if (next.timer > 0) return next;
    if (info.roam === 0) return { ...next, timer: 1 + ctx.rng() * 3 };
    const angle = ctx.rng() * Math.PI * 2;
    const r = ctx.rng() * info.roam;
    const target = keepInside({ x: c.home.x + Math.cos(angle) * r, y: c.home.y + Math.sin(angle) * r });
    return { ...next, state: 'walking', target };
}

// Only used on the fresh copy inside stepCritter, never on the critter that was passed in.
function moveAlong(c, dir, amount) {
    const p = keepInside({ x: c.x + dir.x * amount, y: c.y + dir.y * amount });
    c.x = p.x;
    c.y = p.y;
    if (Math.abs(dir.x) > 0.05) c.facing = dir.x < 0 ? -1 : 1;
}

// Inside the world, and not too near the fire.
function keepInside({ x, y }) {
    x = Math.min(WORLD.width - EDGE, Math.max(EDGE, x));
    y = Math.min(WORLD.height - EDGE, Math.max(EDGE, y));
    const d = distance(x, y, CAMP.x, CAMP.y);
    if (d < KEEP_FROM_CAMP) {
        const push = KEEP_FROM_CAMP / (d || 1);
        x = CAMP.x + (x - CAMP.x) * push;
        y = CAMP.y + (y - CAMP.y) * push;
    }
    return { x, y };
}

// Straight away from you, give or take a little.
function awayFrom(c, ctx) {
    const angle = Math.atan2(c.y - ctx.py, c.x - ctx.px) + (ctx.rng() - 0.5) * 0.8;
    return { x: Math.cos(angle), y: Math.sin(angle) };
}

function takeOff(c, ctx) {
    return { ...c, state: 'flying', dir: awayFrom(c, ctx), moving: true };
}
