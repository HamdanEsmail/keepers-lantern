import { it, expect } from 'vitest';
import { unpack, makeTorch, takeOut, upgradeRows, costRows, countItems, describeCounts } from '../src/logic/camp.js';

it('unpacks materials into the stash and keeps everything else in the pack', () => {
    const result = unpack({ wood: 1 }, ['wood', 'torch', 'stone', 'lens-2', 'wood', 'meal']);
    expect(result.stash).toEqual({ wood: 3, stone: 1 });
    expect(result.pack).toEqual(['torch', 'lens-2', 'meal']);
    expect(result.moved).toEqual({ wood: 2, stone: 1 });
});

it('never changes the stash or pack it was given', () => {
    const stash = { wood: 1 };
    const pack = ['wood', 'torch'];
    unpack(stash, pack);
    makeTorch({ wood: 2, stone: 1 }, pack, 6);
    expect(stash).toEqual({ wood: 1 });
    expect(pack).toEqual(['wood', 'torch']);
});

it('makes a torch from the stash, straight into the pack', () => {
    expect(makeTorch({ wood: 3, stone: 1 }, ['meal'], 6)).toEqual({ stash: { wood: 1, stone: 0 }, pack: ['meal', 'torch'] });
});

it('will not make a torch when short or when the pack is full', () => {
    expect(makeTorch({ wood: 1, stone: 1 }, [], 6)).toBeNull();
    expect(makeTorch({ wood: 9, stone: 9 }, ['a', 'b', 'c'], 3)).toBeNull();
});

it('takes a torch or a meal back out of the stash', () => {
    expect(takeOut({ torch: 2 }, [], 6, 'torch')).toEqual({ stash: { torch: 1 }, pack: ['torch'] });
    expect(takeOut({ meal: 1 }, ['wood'], 6, 'meal')).toEqual({ stash: { meal: 0 }, pack: ['wood', 'meal'] });
});

it('only takes what is there, what fits, and what can be carried out', () => {
    expect(takeOut({ torch: 0 }, [], 6, 'torch')).toBeNull();
    expect(takeOut({}, [], 6, 'meal')).toBeNull();
    expect(takeOut({ torch: 1 }, ['a'], 1, 'torch')).toBeNull();
    // Materials stay at camp: you build with them, you don't carry them back out.
    expect(takeOut({ wood: 5 }, [], 6, 'wood')).toBeNull();
});

it('describes each upgrade for the panel', () => {
    const rows = upgradeRows({ wood: 5, stone: 2 }, ['axe']);
    const pack = rows.find((r) => r.id === 'pack');
    expect(pack).toMatchObject({ name: 'Mended pack', owned: false, canBuild: true });
    expect(pack.cost).toEqual([
        { item: 'wood', need: 5, have: 5 },
        { item: 'stone', need: 2, have: 2 },
    ]);
    expect(rows.find((r) => r.id === 'axe')).toMatchObject({ owned: true, canBuild: false });
    expect(rows.find((r) => r.id === 'lantern').cost).toContainEqual({ item: 'amber', need: 2, have: 0 });
});

it('says how many of each thing you have, against what it costs', () => {
    expect(costRows({ wood: 1 }, { wood: 2, stone: 1 })).toEqual([
        { item: 'wood', need: 2, have: 1 },
        { item: 'stone', need: 1, have: 0 },
    ]);
});

it('counts a pack and describes it in words', () => {
    expect(countItems(['wood', 'torch', 'wood'])).toEqual({ wood: 2, torch: 1 });
    expect(describeCounts({ wood: 3, stone: 0, amber: 1 })).toBe('Wood ×3 · Amber ×1');
    expect(describeCounts(countItems(['lens-1', 'meal']))).toBe('Lens piece ×1 · Meal ×1');
    expect(describeCounts({})).toBe('');
});
