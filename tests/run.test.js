import { it, expect } from 'vitest';
import { afterRun, wakeReport } from '../src/logic/run.js';
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

it('sleeping keeps your pack: it goes into the stash', () => {
    const save = { ...newSave(7), stash: { wood: 2 } };
    const next = afterRun(save, 'slept', ['wood', 'stone', 'torch']);
    expect(next.run).toBe(1);
    expect(next.stash).toEqual({ wood: 3, stone: 1, torch: 1 });
});

it('a lens piece you sleep with counts as brought home, once', () => {
    const save = { ...newSave(7), lensDelivered: [0] };
    const next = afterRun(save, 'slept', ['lens-2', 'lens-0']);
    expect(next.lensDelivered.sort()).toEqual([0, 2]);
    expect(next.stash).toEqual({});
});

it('a night survived only counts when you sleep after dark', () => {
    const summary = { ...newRunSummary(), sawNight: true };
    expect(afterRun(newSave(7), 'slept', [], summary).stats.nightsSurvived).toBe(1);
    expect(afterRun(newSave(7), 'caught', [], summary).stats.nightsSurvived).toBe(0);
});

it('tells you how the day went', () => {
    const summary = { ...newRunSummary(), gathered: 6, eaten: 2, nightTime: 75, deepest: 'pinewood' };
    expect(wakeReport('slept', summary, 3)).toEqual({
        title: 'Morning',
        lines: [
            'You sleep by the fire until dawn. Everything you carried is safe in the stash.',
            'Day 3: you gathered 6 and ate 2.',
            'You spent 1 min 15 s out in the dark.',
            'The furthest you went: the pinewood.',
        ],
    });
});

it('leaves out the dark if you were home before night', () => {
    const report = wakeReport('hunger', newRunSummary(), 1);
    expect(report.title).toBe('Too hungry');
    expect(report.lines).toHaveLength(3);
    expect(report.lines.join(' ')).not.toContain('dark');
});
