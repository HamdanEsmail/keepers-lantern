import { it, expect } from 'vitest';
import { newSave, loadSave, writeSave, clearSave, isSave, SAVE_KEY } from '../src/logic/save.js';

// A pretend localStorage, so the tests don't need a browser.
function memoryStorage() {
    const items = {};
    return {
        getItem: (key) => (key in items ? items[key] : null),
        setItem: (key, value) => {
            items[key] = String(value);
        },
        removeItem: (key) => {
            delete items[key];
        },
    };
}

// Storage that refuses everything, like a private window that blocks it.
const blocked = {
    getItem() {
        throw new Error('denied');
    },
    setItem() {
        throw new Error('denied');
    },
    removeItem() {
        throw new Error('denied');
    },
};

it('saves and loads the same game', () => {
    const storage = memoryStorage();
    const save = { ...newSave(7), run: 3, stash: { wood: 4 }, upgrades: ['coat'], lensDelivered: [1] };
    expect(writeSave(storage, save)).toBe(true);
    expect(loadSave(storage)).toEqual(save);
});

it('has nothing to load before the first save', () => {
    expect(loadSave(memoryStorage())).toBeNull();
});

it('treats a broken, old or strange save as no save', () => {
    const storage = memoryStorage();
    const tryLoading = (text) => {
        storage.setItem(SAVE_KEY, text);
        return loadSave(storage);
    };
    expect(tryLoading('{oops')).toBeNull();
    expect(tryLoading('null')).toBeNull();
    expect(tryLoading(JSON.stringify({ ...newSave(1), version: 0 }))).toBeNull();
    expect(tryLoading(JSON.stringify({ ...newSave(1), run: -1 }))).toBeNull();
    expect(tryLoading(JSON.stringify({ ...newSave(1), stash: { wood: 'lots' } }))).toBeNull();
    expect(tryLoading(JSON.stringify({ ...newSave(1), upgrades: 'coat' }))).toBeNull();
});

it('fills in what an older save is missing', () => {
    const storage = memoryStorage();
    const { stats, ...older } = newSave(5);
    storage.setItem(SAVE_KEY, JSON.stringify(older));
    expect(loadSave(storage)).toEqual(newSave(5));
});

it('never crashes when storage is blocked or missing', () => {
    expect(loadSave(blocked)).toBeNull();
    expect(writeSave(blocked, newSave(1))).toBe(false);
    expect(() => clearSave(blocked)).not.toThrow();
    expect(loadSave(null)).toBeNull();
    expect(writeSave(null, newSave(1))).toBe(false);
});

it('forgets the save for a new game', () => {
    const storage = memoryStorage();
    writeSave(storage, newSave(2));
    clearSave(storage);
    expect(loadSave(storage)).toBeNull();
});

it('knows a new save is a good one', () => {
    expect(isSave(newSave(9))).toBe(true);
    expect(isSave([])).toBe(false);
});
