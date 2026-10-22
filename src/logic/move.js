// Movement maths. No Phaser in here, so it can be tested.

// The stream is drawn 34px wide, so you're in it within 17px of its middle line.
export const STREAM_HALF_WIDTH = 17;

// Speed multipliers: wading slows you down, sprinting (Shift) speeds you up.
const STREAM_SLOW = 0.6;
const SPRINT = 1.55;

export function speedFor({ inStream, sprinting }) {
    return (inStream ? STREAM_SLOW : 1) * (sprinting ? SPRINT : 1);
}

// Which way the keys point, as a direction of length 1 (or 0 when nothing is pressed).
// keys holds Phaser key objects, each with an isDown flag.
export function readMove(keys) {
    let x = 0;
    let y = 0;
    if (keys.A.isDown || keys.LEFT.isDown) x -= 1;
    if (keys.D.isDown || keys.RIGHT.isDown) x += 1;
    if (keys.W.isDown || keys.UP.isDown) y -= 1;
    if (keys.S.isDown || keys.DOWN.isDown) y += 1;

    // Without this, holding W and D would move you about 1.4 times faster.
    const length = Math.hypot(x, y);
    if (length === 0) return { x: 0, y: 0 };
    return { x: x / length, y: y / length };
}

// How far point p is from the straight line between a and b.
export function distanceToSegment(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    // How far along the line (0 = at a, 1 = at b) the closest point is.
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Is (x, y) standing in the water?
export function inStream(stream, x, y) {
    for (let i = 0; i < stream.length - 1; i++) {
        if (distanceToSegment({ x, y }, stream[i], stream[i + 1]) < STREAM_HALF_WIDTH) return true;
    }
    return false;
}
