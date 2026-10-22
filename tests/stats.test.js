import { it, expect } from 'vitest';
import {
    newStats,
    newRunSummary,
    recordRun,
    newMilestones,
    earn,
    milestoneLabel,
    deeper,
    MILESTONES,
} from '../src/logic/stats.js';

const run = (o) => ({ ...newRunSummary(), ...o });

it('starts at zero', () => {
    expect(newStats()).toEqual({
        runs: 0,
        nightsSurvived: 0,
        caught: 0,
        spent: 0,
        longestNight: 0,
        gathered: 0,
        eaten: 0,
        milestones: [],
    });
});

it('adds a lost run to the totals', () => {
    const s = recordRun(newStats(), run({ gathered: 5, eaten: 2, nightTime: 42.6 }), 'caught');
    expect(s).toMatchObject({ runs: 1, caught: 1, spent: 0, gathered: 5, eaten: 2, longestNight: 43 });
    const t = recordRun(s, run({ gathered: 1, nightTime: 10 }), 'spent');
    expect(t).toMatchObject({ runs: 2, caught: 1, spent: 1, gathered: 6, longestNight: 43 });
});

it('only counts a night survived when you slept after night fell', () => {
    expect(recordRun(newStats(), run({ sawNight: true }), 'slept').nightsSurvived).toBe(1);
    expect(recordRun(newStats(), run({ sawNight: false }), 'slept').nightsSurvived).toBe(0);
    expect(recordRun(newStats(), run({ sawNight: true }), 'caught').nightsSurvived).toBe(0);
});

it('never changes the stats it was given', () => {
    const s = newStats();
    recordRun(s, run({ gathered: 3 }), 'caught');
    earn(s, ['full-pack']);
    expect(s).toEqual(newStats());
});

it('keeps track of the deepest ring', () => {
    expect(deeper('edge', 'pinewood')).toBe('pinewood');
    expect(deeper('deep', 'edge')).toBe('deep');
    expect(deeper('deep', 'outside')).toBe('outside');
});

it('earns each milestone once', () => {
    const r = run({ deepest: 'deep' });
    expect(newMilestones(newStats(), r)).toEqual(['deep-woods']);
    const s = earn(newStats(), ['deep-woods']);
    expect(newMilestones(s, r)).toEqual([]);
});

it('counts totals across runs for the big milestones', () => {
    const s = { ...newStats(), gathered: 48 };
    expect(newMilestones(s, run({ gathered: 1 }))).not.toContain('forager');
    expect(newMilestones(s, run({ gathered: 2 }))).toContain('forager');
});

it('notices nights, close calls and a full pack', () => {
    const ids = newMilestones(newStats(), run({ nightTime: 61, closeCalls: 1, packFilled: true }));
    expect(ids).toEqual(expect.arrayContaining(['after-dark', 'long-night', 'close-call', 'full-pack']));
    expect(newMilestones({ ...newStats(), nightsSurvived: 1 }, run())).toContain('first-dawn');
});

it('earns nothing on a quiet first morning', () => {
    expect(newMilestones(newStats(), run())).toEqual([]);
});

it('has a label for every milestone and unique ids', () => {
    const ids = MILESTONES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(milestoneLabel(id).length).toBeGreaterThan(3);
});
