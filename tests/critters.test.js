import { it, expect } from 'vitest';
import {
    spawnCritters,
    stepCritter,
    CRITTERS,
    SPRINT_SCARE,
    FLY_TIME,
    HIDE_TIME,
    KEEP_FROM_CAMP,
} from '../src/logic/critters.js';
import { makeRng } from '../src/logic/rng.js';
import { CAMP, WORLD, ringAt, distance } from '../src/logic/world.js';

const FAR = { px: 0, py: 0, sprinting: false, phase: 'day' };

// Runs a critter for some seconds, with the player standing still.
function run(c, secs, ctx = FAR) {
    const rng = makeRng(3);
    for (let i = 0; i < secs * 10; i++) c = stepCritter(c, 0.1, { ...ctx, rng });
    return c;
}

const one = (kind, x = 2600, y = 1800) => ({
    ...spawnCritters(1).find((c) => c.kind === kind),
    x,
    y,
    home: { x, y },
    state: 'idle',
    timer: 1,
});

it('puts every kind in its own part of the valley', () => {
    const all = spawnCritters(1);
    for (const [kind, info] of Object.entries(CRITTERS)) {
        const these = all.filter((c) => c.kind === kind);
        expect(these).toHaveLength(info.count);
        for (const c of these) expect(info.rings).toContain(ringAt(c.x, c.y));
    }
    for (const c of all) expect(distance(c.x, c.y, CAMP.x, CAMP.y)).toBeGreaterThan(KEEP_FROM_CAMP);
});

it('puts them in the same places for the same seed', () => {
    expect(spawnCritters(4)).toEqual(spawnCritters(4));
    expect(spawnCritters(4)).not.toEqual(spawnCritters(5));
});

it('wanders near home when left alone', () => {
    const deer = run(one('deer'), 120);
    expect(deer.state).not.toBe('fleeing');
    expect(distance(deer.x, deer.y, 2600, 1800)).toBeLessThanOrEqual(CRITTERS.deer.roam + 1);
});

it('runs from you when you get close, then calms down further off', () => {
    const near = { ...FAR, px: 2600 - 60, py: 1800 };
    const rabbit = run(one('rabbit'), 0.5, near);
    expect(rabbit.state).toBe('fleeing');
    expect(rabbit.x).toBeGreaterThan(2600);
    const calm = run(rabbit, 3, near);
    expect(calm.state).not.toBe('fleeing');
    expect(distance(calm.x, calm.y, near.px, near.py)).toBeGreaterThan(CRITTERS.rabbit.scare);
});

it('hears you from further away when you sprint', () => {
    const gap = CRITTERS.rabbit.scare * 1.3;
    expect(gap).toBeLessThan(CRITTERS.rabbit.scare * SPRINT_SCARE);
    const ctx = { ...FAR, px: 2600 - gap, py: 1800 };
    expect(run(one('rabbit'), 0.2, ctx).state).not.toBe('fleeing');
    expect(run(one('rabbit'), 0.2, { ...ctx, sprinting: true }).state).toBe('fleeing');
});

it('a startled bird flies off and is gone', () => {
    const near = { ...FAR, px: 2600 - 50, py: 1800 };
    const bird = run(one('bird'), 0.2, near);
    expect(bird.state).toBe('flying');
    expect(run(bird, FLY_TIME + 0.2, near).state).toBe('gone');
});

it('everyone has gone by the time night falls', () => {
    const dusk = { ...FAR, phase: 'dusk' };
    for (const c of spawnCritters(2)) {
        expect(run(c, Math.max(HIDE_TIME, FLY_TIME) + 0.3, dusk).state).toBe('gone');
    }
});

it('never runs into the camp or off the map', () => {
    // A deer just outside camp, with you on the far side, runs toward the fire... and stops short.
    const deer = one('deer', CAMP.x + KEEP_FROM_CAMP + 5, CAMP.y);
    const fled = run(deer, 1.5, { ...FAR, px: CAMP.x + KEEP_FROM_CAMP + 80, py: CAMP.y });
    expect(distance(fled.x, fled.y, CAMP.x, CAMP.y)).toBeGreaterThanOrEqual(KEEP_FROM_CAMP - 0.01);
    const edge = run(one('rabbit', 70, 70), 1.5, { ...FAR, px: 120, py: 120 });
    expect(edge.x).toBeGreaterThanOrEqual(60);
    expect(edge.y).toBeGreaterThanOrEqual(60);
    expect(edge.x).toBeLessThanOrEqual(WORLD.width);
});

it('never changes the critter it was given', () => {
    const c = one('rabbit');
    const copy = structuredClone(c);
    stepCritter(c, 0.1, { ...FAR, px: 2590, py: 1800, rng: makeRng(1) });
    expect(c).toEqual(copy);
});
