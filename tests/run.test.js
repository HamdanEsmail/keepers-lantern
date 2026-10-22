import { it, expect } from 'vitest';
import { afterRun } from '../src/logic/run.js';
import { newSave } from '../src/logic/save.js';
import { newRunSummary } from '../src/logic/stats.js';
import { generateValley } from '../src/logic/valley.js';

it('losing moves on to the next valley and keeps what is safe at camp', () => {
    const save = { ...newSave(7), stash: { wood: 4 }, upgrades: ['coat'], lensDelivered: [0] };
    expect(save.stats.runs).toBe(0);
    for (const reason of ['caught', 'spent']) {
        const next = afterRun(save, reason, ['wood', 'stone']);
        expect(next.run).toBe(1);
        expect(next.stash).toEqual({ wood: 4 });
        expect(next.upgrades).toEqual(['coat']);
        expect(next.lensDelivered).toEqual([0]);
    }
});

it('never changes the save it was given', () => {
    const save = newSave(7);
    const copy = JSON.parse(JSON.stringify(save));
    afterRun(save, 'caught', ['lens-1']);
    expect(save).toEqual(copy);
});

it('adds the run to the stats', () => {
    const summary = { ...newRunSummary(), gathered: 4, nightTime: 30 };
    const next = afterRun(newSave(7), 'caught', ['wood'], summary);
    expect(next.stats).toMatchObject({ runs: 1, caught: 1, gathered: 4, longestNight: 30 });
});

it('copes with an older save that has no stats yet', () => {
    const { stats, ...old } = newSave(7);
    expect(afterRun(old, 'spent', []).stats).toMatchObject({ runs: 1, spent: 1 });
});

it('a lens piece lost with your pack is back in the next valley', () => {
    const save = newSave(7);
    const next = afterRun(save, 'caught', ['lens-1', 'wood']);
    expect(next.lensDelivered).not.toContain(1);
    const valley = generateValley(next.baseSeed + next.run, { lensDelivered: next.lensDelivered });
    expect(valley.lenses.map((l) => l.index)).toContain(1);
});
