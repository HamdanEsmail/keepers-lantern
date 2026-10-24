import { it, expect } from 'vitest';
import {
    lensesIn,
    missingLenses,
    setLenses,
    beaconMessage,
    compassTarget,
    journalOrder,
    findPage,
    finishGame,
} from '../src/logic/lens.js';
import { newSave } from '../src/logic/save.js';
import { BEACON } from '../src/logic/world.js';

it('finds the lens pieces in a pack', () => {
    expect(lensesIn(['wood', 'lens-2', 'torch', 'lens-0'])).toEqual([2, 0]);
    expect(lensesIn(['wood'])).toEqual([]);
});

it('counts what the beacon still needs, with the pieces you carry', () => {
    expect(missingLenses([], [])).toBe(3);
    expect(missingLenses([0], ['lens-2'])).toBe(1);
    expect(missingLenses([0, 1], ['wood', 'lens-2'])).toBe(0);
    // The same piece twice still only counts once.
    expect(missingLenses([1], ['lens-1'])).toBe(2);
});

it('sets the pieces you carry in the beacon, for good', () => {
    const save = { ...newSave(7), lensDelivered: [0] };
    const result = setLenses(save, ['wood', 'lens-2']);
    expect(result.save.lensDelivered).toEqual([0, 2]);
    expect(result.pack).toEqual(['wood']);
    expect(result.set).toBe(1);
    expect(result.missing).toBe(1);
    // The save it was given is left as it was.
    expect(save.lensDelivered).toEqual([0]);
});

it('says how many pieces the beacon is missing', () => {
    expect(beaconMessage(0, 3)).toBe("The beacon is cold. It's missing 3 pieces of its lens.");
    expect(beaconMessage(0, 1)).toBe("The beacon is cold. It's missing 1 piece of its lens.");
    expect(beaconMessage(1, 2)).toBe('The piece fits. The lens is still missing 2 pieces.');
    expect(beaconMessage(2, 1)).toBe('The pieces fit. The lens is still missing 1 piece.');
});

it('points the compass at the nearest lens piece', () => {
    const lenses = [
        { index: 0, x: 100, y: 100 },
        { index: 1, x: 500, y: 500 },
    ];
    expect(compassTarget(lenses, 450, 450)).toEqual({ x: 500, y: 500 });
    expect(compassTarget(lenses, 0, 0)).toEqual({ x: 100, y: 100 });
});

it('points the compass at the beacon when there are no pieces left to find', () => {
    expect(compassTarget([], 0, 0)).toEqual({ x: BEACON.x, y: BEACON.y });
});

it('lists the journal pages in order, whatever order you found them in', () => {
    expect(journalOrder(['extra-2', 'lens-1', 'final', 'lens-0'])).toEqual(['lens-0', 'lens-1', 'extra-2', 'final']);
    expect(journalOrder(['not-a-page'])).toEqual([]);
});

it('a page is only new the first time', () => {
    const first = findPage(newSave(7), 'extra-1');
    expect(first.isNew).toBe(true);
    expect(first.save.pagesFound).toEqual(['extra-1']);
    const again = findPage(first.save, 'extra-1');
    expect(again.isNew).toBe(false);
    expect(again.save.pagesFound).toEqual(['extra-1']);
});

it('relighting the beacon finishes the game, and keeps what you carried', () => {
    const save = { ...newSave(7), lensDelivered: [0, 1, 2], stash: { wood: 1 } };
    const done = finishGame(save, ['wood', 'amber']);
    expect(done.finished).toBe(true);
    expect(done.pagesFound).toContain('final');
    expect(done.stash).toEqual({ wood: 2, amber: 1 });
    expect(done.run).toBe(1);
});
