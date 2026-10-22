import { it, expect } from 'vitest';
import {
    LANDMARKS,
    placeLandmark,
    clearAround,
    landmarkSolids,
    searchLandmark,
    isEmpty,
    sheltersYou,
} from '../src/logic/landmarks.js';
import { generateValley } from '../src/logic/valley.js';
import { BEACON, ringAt, distance } from '../src/logic/world.js';

const valleys = Array.from({ length: 30 }, (_, i) => generateValley(i + 1));

it('finds room for a landmark in every valley, out in the woods', () => {
    for (const v of valleys) {
        const l = placeLandmark(v);
        expect(l).not.toBeNull();
        expect(['pinewood', 'deep']).toContain(ringAt(l.x, l.y));
        expect(distance(l.x, l.y, BEACON.x, BEACON.y)).toBeGreaterThan(BEACON.clearRadius + 100);
        for (const s of v.stream) expect(distance(l.x, l.y, s.x, s.y)).toBeGreaterThan(100);
    }
});

it('puts it in the same place for the same valley, and uses every kind', () => {
    expect(placeLandmark(valleys[0])).toEqual(placeLandmark(generateValley(1)));
    const kinds = new Set(valleys.map((v) => placeLandmark(v).kind));
    expect([...kinds].sort()).toEqual(Object.keys(LANDMARKS).sort());
    // Never the same one two nights running.
    for (let i = 1; i < valleys.length; i++) {
        expect(placeLandmark(valleys[i]).kind).not.toBe(placeLandmark(valleys[i - 1]).kind);
    }
});

it('clears trees and gatherables off it, but never a lens or a page', () => {
    for (const v of valleys) {
        const l = placeLandmark(v);
        const cleared = clearAround(v, l);
        for (const t of cleared.trees) expect(distance(t.x, t.y, l.x, l.y)).toBeGreaterThanOrEqual(140);
        for (const n of cleared.nodes) expect(distance(n.x, n.y, l.x, l.y)).toBeGreaterThanOrEqual(90);
        expect(cleared.lenses).toEqual(v.lenses);
        expect(cleared.pages).toEqual(v.pages);
        expect(cleared.stream).toEqual(v.stream);
    }
});

it('leaves the valley alone when there is no landmark', () => {
    expect(clearAround(valleys[0], null)).toBe(valleys[0]);
});

it('puts the solid parts where the landmark is', () => {
    const l = { kind: 'standing-stones', x: 1000, y: 1000, items: [], food: 0 };
    const stones = landmarkSolids(l);
    expect(stones).toHaveLength(5);
    for (const s of stones) expect(distance(s.x, s.y, 1000, 1000)).toBeGreaterThan(40);
});

it('gives you what fits and keeps the rest', () => {
    const l = { kind: 'hollow-tree', x: 0, y: 0, items: ['torch', 'amber', 'amber'], food: 0 };
    const first = searchLandmark(l, 2, true);
    expect(first.take).toEqual(['torch', 'amber']);
    expect(isEmpty(first.landmark)).toBe(false);
    const second = searchLandmark(first.landmark, 5, true);
    expect(second.take).toEqual(['amber']);
    expect(isEmpty(second.landmark)).toBe(true);
    expect(searchLandmark(l, 0, true).take).toEqual([]);
});

it("saves the food for when you're hungry", () => {
    const l = { kind: 'standing-stones', x: 0, y: 0, items: [], food: 30 };
    const full = searchLandmark(l, 3, false);
    expect(full.food).toBe(0);
    expect(full.landmark.food).toBe(30);
    const hungry = searchLandmark(l, 3, true);
    expect(hungry.food).toBe(30);
    expect(isEmpty(hungry.landmark)).toBe(true);
});

it('only the tree and the boulder keep the rain off', () => {
    const at = (kind) => ({ kind, x: 500, y: 500, items: [], food: 0 });
    expect(sheltersYou(at('hollow-tree'), 560, 520)).toBe(true);
    expect(sheltersYou(at('boulder'), 500, 590)).toBe(true);
    expect(sheltersYou(at('boulder'), 500, 700)).toBe(false);
    expect(sheltersYou(at('standing-stones'), 500, 500)).toBe(false);
    expect(sheltersYou(null, 0, 0)).toBe(false);
});

it('never changes the landmark it was given', () => {
    const l = { kind: 'boulder', x: 0, y: 0, items: ['stone', 'stone', 'amber'], food: 0 };
    searchLandmark(l, 3, true);
    expect(l.items).toEqual(['stone', 'stone', 'amber']);
});
