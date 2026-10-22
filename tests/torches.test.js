import { it, expect } from 'vitest';
import {
    plantTorch,
    torchRadius,
    liveTorches,
    shelterDistance,
    canPlant,
    inTorchLight,
    TORCH_RADIUS,
    TORCH_TIME,
} from '../src/logic/torches.js';
import { CAMP } from '../src/logic/world.js';

const torch = plantTorch([], 1000, 1000, 50)[0];

it('remembers where and when it was planted', () => {
    expect(torch).toEqual({ x: 1000, y: 1000, lit: 50, until: 50 + TORCH_TIME });
});

it('burns full size, shrinks over its last 20 s, then goes out', () => {
    expect(torchRadius(torch, 60)).toBe(TORCH_RADIUS);
    expect(torchRadius(torch, torch.until - 20)).toBe(TORCH_RADIUS);
    expect(torchRadius(torch, torch.until - 10)).toBeCloseTo(TORCH_RADIUS * 0.675);
    expect(torchRadius(torch, torch.until)).toBe(0);
});

it('forgets torches that have gone out', () => {
    const torches = plantTorch(plantTorch([], 1000, 1000, 0), 1500, 1500, 60);
    expect(liveTorches(torches, 50)).toHaveLength(2);
    expect(liveTorches(torches, TORCH_TIME + 1)).toEqual([torches[1]]);
});

it('never changes the list it was given', () => {
    const torches = [];
    plantTorch(torches, 1, 2, 3);
    expect(torches).toEqual([]);
});

it("can't be planted at camp or right beside another torch", () => {
    expect(canPlant([], CAMP.x + 50, CAMP.y)).toBe(false);
    expect(canPlant([], CAMP.x + 400, CAMP.y)).toBe(true);
    expect(canPlant([torch], 1030, 1000)).toBe(false);
    expect(canPlant([torch], 1200, 1000)).toBe(true);
});

it('shelters you while you stand in its light', () => {
    expect(inTorchLight([torch], 1000, 1000, 60)).toBe(true);
    expect(inTorchLight([torch], 1000 + TORCH_RADIUS, 1000, 60)).toBe(false);
    expect(inTorchLight([torch], 1000, 1000, torch.until + 1)).toBe(false);
});

it('keeps the wolves back beyond the far side of its light', () => {
    // Wolves circle you, so they must stay outside the pool in every direction.
    expect(shelterDistance([torch], 1000, 1000, 60)).toBe(TORCH_RADIUS + 30);
    expect(shelterDistance([torch], 1100, 1000, 60)).toBe(TORCH_RADIUS + 100 + 30);
    expect(shelterDistance([torch], 1000 + TORCH_RADIUS, 1000, 60)).toBe(0);
    expect(shelterDistance([], 1000, 1000, 60)).toBe(0);
});
