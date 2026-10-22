// Choosing what E acts on, and timing how long it's held.
import { distance } from './world.js';

// The closest thing whose reach (radius) you're inside, or null.
export function pickTarget(things, x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const t of things) {
        const d = distance(x, y, t.x, t.y);
        if (d <= t.radius && d < bestDist) {
            best = t;
            bestDist = d;
        }
    }
    return best;
}

export function newHold() {
    return { id: null, time: 0, locked: false };
}

// One frame of holding E.
//   down: is E held this frame?   id: what you're aiming at (or null)
//   needed: seconds it takes.     Returns the new hold and whether it just finished.
// After finishing, E must be let go before the next one can start ("locked").
export function stepHold(hold, dt, down, id, needed) {
    if (!down) return { hold: newHold(), done: false };
    if (hold.locked || id === null) return { hold: { id: null, time: 0, locked: hold.locked }, done: false };

    const time = hold.id === id ? hold.time + dt : dt;
    if (time >= needed - 1e-9) return { hold: { id: null, time: 0, locked: true }, done: true };
    return { hold: { id, time, locked: false }, done: false };
}
