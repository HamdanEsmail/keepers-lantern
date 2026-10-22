import { CAMP, distance } from './world.js';

// Torches you plant with T. Each one is a pool of light for a while:
// the wolves keep back, your lantern rests, and you get a little warmth.
// Times are in seconds of the run (ValleyScene's this.t).

export const TORCH_RADIUS = 170;
export const TORCH_TIME = 100; // seconds it burns
const FADE_TIME = 20; // it shrinks over its last 20 seconds
const SHELTER = 0.8; // you're sheltered within 80% of its radius
const WOLF_GAP = 30;
const NOT_NEAR_CAMP = CAMP.safeRadius + 60;
const NOT_NEAR_TORCH = 60;

export function plantTorch(torches, x, y, t) {
    return [...torches, { x, y, lit: t, until: t + TORCH_TIME }];
}

export function torchRadius(torch, t) {
    const left = torch.until - t;
    if (left <= 0) return 0;
    return TORCH_RADIUS * (0.35 + 0.65 * Math.min(1, left / FADE_TIME));
}

export function liveTorches(torches, t) {
    return torches.filter((torch) => t < torch.until);
}

// Not at camp (the fire does that job), and not on top of another torch.
export function canPlant(torches, x, y) {
    if (distance(x, y, CAMP.x, CAMP.y) < NOT_NEAR_CAMP) return false;
    return torches.every((torch) => distance(x, y, torch.x, torch.y) >= NOT_NEAR_TORCH);
}

export function inTorchLight(torches, x, y, t) {
    return torches.some((torch) => distance(x, y, torch.x, torch.y) < torchRadius(torch, t) * SHELTER);
}

// How far the wolves must keep from you while you stand in a torch's light, or 0.
// The wolves circle you, so to stay out of the pool on every side
// they wait beyond its far edge: its radius plus your distance from it.
export function shelterDistance(torches, x, y, t) {
    let most = 0;
    for (const torch of torches) {
        const r = torchRadius(torch, t);
        const d = distance(x, y, torch.x, torch.y);
        if (d < r * SHELTER) most = Math.max(most, r + d + WOLF_GAP);
    }
    return most;
}
