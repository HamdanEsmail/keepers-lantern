// The rules for the lens pieces, the beacon, the compass and the journal.
// No Phaser and no HTML here, so it can all be tested. The words of the pages are in data/story.js.

import { BEACON, distance } from './world.js';
import { PAGE_IDS } from '../data/story.js';
import { afterRun } from './run.js';
import { newRunSummary } from './stats.js';

// The beacon's lens broke into this many pieces.
export const LENS_COUNT = 3;

// The numbers of the lens pieces in a pack: ['wood', 'lens-2'] gives [2].
export function lensesIn(pack) {
    return pack.filter((item) => item.startsWith('lens-')).map((item) => Number(item.slice(5)));
}

// How many pieces the beacon still needs: the ones already home and the ones you carry both count.
export function missingLenses(lensDelivered, pack) {
    const have = new Set([...lensDelivered, ...lensesIn(pack)]);
    return LENS_COUNT - have.size;
}

// E at the beacon: any pieces you carry are set in it, and stay there for good.
// Returns the new save and pack, how many pieces you just set, and how many are still missing.
export function setLenses(save, pack) {
    const carried = lensesIn(pack);
    // A Set drops repeats, the same as when you sleep with a piece (see run.js).
    const lensDelivered = [...new Set([...save.lensDelivered, ...carried])];
    return {
        save: { ...save, lensDelivered },
        pack: pack.filter((item) => !item.startsWith('lens-')),
        set: carried.length,
        missing: LENS_COUNT - lensDelivered.length,
    };
}

// What the beacon says when it isn't whole yet.
//   set: how many pieces you just put in. missing: how many it still needs.
export function beaconMessage(set, missing) {
    const pieces = `${missing} ${missing === 1 ? 'piece' : 'pieces'}`;
    if (set === 0) return `The beacon is cold. It's missing ${pieces} of its lens.`;
    return `${set === 1 ? 'The piece fits.' : 'The pieces fit.'} The lens is still missing ${pieces}.`;
}

// Where the compass points: the nearest lens piece still lying in this valley.
// When there are none left to find, it points to the beacon, where they go.
export function compassTarget(lenses, x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const lens of lenses) {
        const d = distance(x, y, lens.x, lens.y);
        if (d < bestDist) {
            best = lens;
            bestDist = d;
        }
    }
    return best ? { x: best.x, y: best.y } : { x: BEACON.x, y: BEACON.y };
}

// The pages you've found, in the order the journal lists them.
export function journalOrder(pagesFound) {
    return PAGE_IDS.filter((id) => pagesFound.includes(id));
}

// Finding a page: the new save, and whether you'd never found it before.
export function findPage(save, id) {
    if (save.pagesFound.includes(id)) return { save, isNew: false };
    return { save: { ...save, pagesFound: [...save.pagesFound, id] }, isNew: true };
}

// The beacon burns again: the end of the game.
// Like sleeping, what you carry goes into the stash. The last page is found inside the beacon.
export function finishGame(save, pack, summary = newRunSummary()) {
    const next = afterRun(save, 'slept', pack, summary);
    return { ...findPage(next, 'final').save, finished: true };
}
