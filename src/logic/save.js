// Your progress between runs: what's in the stash, what you've built, what you've found.
// For now it only lives in memory. Lesson 10 adds loading and saving it in the browser.

export const SAVE_VERSION = 1;

export function newSave(seed) {
    return {
        version: SAVE_VERSION,
        baseSeed: seed,
        run: 0,
        stash: {},
        upgrades: [],
        lensDelivered: [],
        pagesFound: [],
        finished: false,
    };
}
