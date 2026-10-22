import { CAMP } from './world.js';

// The wolves circle you at night. Each wolf is just an angle and a distance from you.
// They keep just outside your light, close in as it shrinks,
// and rush you when the lantern is almost out. They never come near the camp fire.

export const WOLF_CATCH_DIST = 28;
const SPIN = 0.4; // radians per second around you
const SPEED = 60; // pixels per second, in or out
const EDGE_GAP = 70; // how far outside the light they wait

// Where a wolf wants to be, as a distance from you.
// shelter (optional) is how far a torch you're standing by keeps them back (see torches.js).
// gap (optional) is how far outside your light they wait. A wolf moon brings them closer.
export function wolfTarget({ lightRadius, dim, playerAtCamp, shelter = 0, gap = EDGE_GAP }) {
    if (playerAtCamp) return CAMP.safeRadius + 200;
    if (shelter) return Math.max(shelter, lightRadius + gap);
    if (dim) return 0;
    return lightRadius + gap;
}

// ctx.speed (optional) is how fast they move in or out.
export function stepWolf(wolf, dt, ctx) {
    // A hidden tab can leave a huge gap between frames. Don't let the wolves jump.
    dt = Math.min(dt, 0.1);
    const gap = wolfTarget(ctx) - wolf.dist;
    const most = (ctx.speed ?? SPEED) * dt;
    const move = Math.max(-most, Math.min(most, gap));
    return { angle: wolf.angle + SPIN * dt, dist: wolf.dist + move };
}

export function isCaught(wolf) {
    return wolf.dist < WOLF_CATCH_DIST;
}
