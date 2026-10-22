import { it, expect } from 'vitest';
import { stepWolf, isCaught, wolfTarget, WOLF_CATCH_DIST } from '../src/logic/wolfai.js';
import { CAMP } from '../src/logic/world.js';

const run = (ctx, secs, w = { angle: 0, dist: 600 }) => {
    for (let i = 0; i < secs * 10; i++) w = stepWolf(w, 0.1, ctx);
    return w;
};
const ctx = (o) => ({ lightRadius: 220, dim: false, playerAtCamp: false, ...o });

it('circles just outside a bright light', () => expect(run(ctx(), 20).dist).toBeCloseTo(290, 0));
it('follows a shrinking light', () => expect(run(ctx({ lightRadius: 100 }), 20).dist).toBeCloseTo(170, 0));
it('rushes in when the lantern runs low', () => expect(isCaught(run(ctx({ lightRadius: 90, dim: true }), 30))).toBe(true));
it('never catches you at camp', () => expect(isCaught(run(ctx({ dim: true, playerAtCamp: true }), 30))).toBe(false));
it('ignores huge frame gaps', () => expect(stepWolf({ angle: 0, dist: 600 }, 30, ctx()).dist).toBeCloseTo(594));

it('picks where to stand: camp beats a dim lantern', () => {
    expect(wolfTarget(ctx())).toBe(290);
    expect(wolfTarget(ctx({ dim: true }))).toBe(0);
    expect(wolfTarget(ctx({ dim: true, playerAtCamp: true }))).toBe(CAMP.safeRadius + 200);
});

it('keeps back from a torch you stand by, and never rushes there', () => {
    expect(wolfTarget(ctx({ shelter: 250 }))).toBe(290);
    expect(wolfTarget(ctx({ shelter: 400, dim: true }))).toBe(400);
    expect(wolfTarget(ctx({ shelter: 400, playerAtCamp: true }))).toBe(CAMP.safeRadius + 200);
    expect(isCaught(run(ctx({ shelter: 220, dim: true, lightRadius: 80 }), 30))).toBe(false);
});

it('backs off again when the light grows', () => {
    const close = run(ctx({ lightRadius: 100 }), 20);
    expect(run(ctx({ lightRadius: 220 }), 20, close).dist).toBeCloseTo(290, 0);
});

it('keeps circling the whole time', () => {
    const w = run(ctx(), 5);
    expect(w.angle).toBeCloseTo(2);
});

it('gives you a few seconds of warning before it reaches you', () => {
    // From the edge of a full lantern, a rush takes more than four seconds.
    let w = { angle: 0, dist: 290 };
    let secs = 0;
    while (!isCaught(w)) {
        w = stepWolf(w, 0.1, ctx({ dim: true }));
        secs += 0.1;
    }
    expect(secs).toBeGreaterThan(4);
    expect(w.dist).toBeLessThan(WOLF_CATCH_DIST);
});

it('a wolf moon brings them closer, and faster', () => {
    expect(run(ctx({ gap: 40 }), 20).dist).toBeCloseTo(260, 0);
    // A torch still holds them back, at the closer gap.
    expect(wolfTarget(ctx({ gap: 40, shelter: 100 }))).toBe(260);
    const slow = run(ctx(), 2);
    const fast = run(ctx({ speed: 75 }), 2);
    expect(600 - fast.dist).toBeCloseTo((600 - slow.dist) * 1.25);
});
