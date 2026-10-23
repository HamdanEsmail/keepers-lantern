// Your progress between runs: what's in the stash, what you've built, what you've found.
// It's kept in the browser's localStorage, so it's still there after you close the tab.
// Nothing here can crash the game. A missing, broken or old save just means a new game.

import { newStats } from './stats.js';

// The name it's stored under. Every key this game uses starts with 'keepers-lantern:'.
export const SAVE_KEY = 'keepers-lantern:save';
// Bump this if the save ever changes shape, so old saves aren't read the wrong way.
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
        stats: newStats(),
    };
}

// The browser's storage, or null if it isn't allowed (some private windows block it).
export function browserStorage() {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

// The saved game, or null if there isn't one that's safe to play from.
export function loadSave(storage) {
    try {
        const text = storage?.getItem(SAVE_KEY);
        if (!text) return null;
        const save = JSON.parse(text);
        if (!isSave(save)) return null;
        // An older save may be missing newer parts, like the stats. Those come from a new save.
        return { ...newSave(save.baseSeed), ...save, stats: { ...newStats(), ...save.stats } };
    } catch {
        // Broken JSON, or storage that refuses to be read.
        return null;
    }
}

// Saves the game. Returns true if it worked.
export function writeSave(storage, save) {
    try {
        if (!storage) return false;
        storage.setItem(SAVE_KEY, JSON.stringify(save));
        return true;
    } catch {
        // Storage that refuses to be written, or is full.
        return false;
    }
}

// Forgets the saved game, for a new game.
export function clearSave(storage) {
    try {
        storage?.removeItem(SAVE_KEY);
    } catch {
        // If storage is blocked, there's no save to forget.
    }
}

// Is this a save we can play from? Every part has to be the right kind of thing.
export function isSave(value) {
    return (
        isObject(value) &&
        value.version === SAVE_VERSION &&
        Number.isInteger(value.baseSeed) &&
        Number.isInteger(value.run) &&
        value.run >= 0 &&
        isCounts(value.stash) &&
        Array.isArray(value.upgrades) &&
        Array.isArray(value.lensDelivered) &&
        Array.isArray(value.pagesFound)
    );
}

// A plain object like { wood: 2 }, not null and not a list.
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Counts like { wood: 3, stone: 0 }: every value is a whole number, 0 or more.
function isCounts(value) {
    return isObject(value) && Object.values(value).every((count) => Number.isInteger(count) && count >= 0);
}
