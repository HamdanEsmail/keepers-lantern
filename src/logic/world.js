// The size of the whole valley, in pixels
export const WORLD = { width: 3600, height: 3600 };

// The Camp sits in the middle. Wolves can't come within safeRadius,
// and no trees grow within ClearRadius.
export const CAMP = { x: 1800, y: 1800, safeRadius: 160, clearRadius: 240 };

// The beacon never moves. Only the forest does.
export const BEACON = { x: 2900, y: 700, clearRadius: 200 };

// Each Ring's outer edge, measured from camp.
export const RINGS = { edge: 550, pinewood: 1100, deep: 1650 };

export function distance(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
}

export function ringAt(x, y) {
    const d = distance(x, y, CAMP.x, CAMP.y);
    if (d < RINGS.edge) return 'edge';
    if (d < RINGS.pinewood) return 'pinewood';
    if (d < RINGS.deep) return 'deep';
    return 'outside';
}