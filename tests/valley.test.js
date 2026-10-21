import { describe, it, expect } from 'vitest';
import { generateValley, NODE_COUNTS } from '../src/logic/valley.js';
import { ITEMS } from '../src/data/items.js';
import { ringAt, distance, CAMP, BEACON } from '../src/logic/world.js';

const seeds = Array.from({ length: 20 }, (_ , i) => i * 101 + 3);

describe('generateValley', () => {
    it('is the same for the same seed', () => {
        expect(generateValley(5)).toEqual(generateValley(5));
    });

    it('moves the forest for a new seed', () => {
        expect(generateValley(5).trees).not.toEqual(generateValley(6).trees);
    });

    it.each(seeds)('places every node in its ring (seed %i)', (s) => {
        const v = generateValley(s);
        for (const [kind, n] of Object.entries(NODE_COUNTS)) {
            expect(v.nodes.filter((o) => o.kind === kind)).toHaveLength(n);
        }
        for (const o of v.nodes) {
            expect(ringAt(o.x, o.y)).toBe(ITEMS[o.kind].ring);
        }
    });

    it.each(seeds)('keeps camp, beacon and things clear of trees (seed %i)', (s) => {
        const v = generateValley(s);
        const things = [...v.nodes, ...v.lenses, ...v.pages];
        for (const t of v.trees) {
            expect(distance(t.x, t.y, CAMP.x, CAMP.y)).toBeGreaterThanOrEqual(CAMP.clearRadius);
            expect(distance(t.x, t.y, BEACON.x, BEACON.y)).toBeGreaterThanOrEqual(BEACON.clearRadius);
            for (const o of things) {
                expect(distance(t.x, t.y, o.x, o.y)).toBeGreaterThanOrEqual(60);
            }
        }
        for (const p of v.stream) {
            expect(distance(p.x, p.y, CAMP.x, CAMP.y)).toBeGreaterThanOrEqual(CAMP.clearRadius);
        }
    });
    it('only places underlivered lenses, deep and apart', () => {
        const v = generateValley(9, { lensDelivered: [1] });
        expect(v.lenses.map((l) => l.index)).toEqual([0, 2]);
        for (const l of v.lenses) {
            expect(ringAt(l.x, l.y)).toBe('deep');
        }
        expect(distance(v.lenses[0].x, v.lenses[0].y, v.lenses[1].x, v.lenses[1].y)).toBeGreaterThanOrEqual(400);
        expect(generateValley(9, { lensDelivered: [0, 1, 2]}).lenses).toEqual([]);
    });
    it('skips pages already found', () => {
        expect(generateValley(9, { pagesFound: ['extra-2'] }).pages.map((p) => p.id)).toEqual(['extra-1', 'extra-3']);
    });
});