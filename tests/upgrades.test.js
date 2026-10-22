import { it, expect } from 'vitest';
import { UPGRADES, TORCH_COST, buy, canBuy, canAfford, spend, upgradeById } from '../src/logic/upgrades.js';

it('buys and spends', () => {
    expect(buy({ wood: 6, stone: 2 }, [], 'pack')).toEqual({ stash: { wood: 1, stone: 0 }, owned: ['pack'] });
});

it('refuses when short', () => {
    expect(canBuy({ wood: 4, stone: 2 }, [], 'pack')).toBe(false);
    expect(buy({ wood: 4 }, [], 'pack')).toBeNull();
});

it('refuses twice', () => {
    expect(buy({ wood: 9, stone: 9 }, ['pack'], 'pack')).toBeNull();
});

it('refuses something that does not exist', () => {
    expect(upgradeById('jetpack')).toBeUndefined();
    expect(buy({ wood: 99 }, [], 'jetpack')).toBeNull();
});

it('never changes the stash it was given', () => {
    const stash = { wood: 6, stone: 2 };
    buy(stash, [], 'pack');
    expect(stash).toEqual({ wood: 6, stone: 2 });
});

it('pays for a torch', () => {
    expect(canAfford({ wood: 2, stone: 1 }, TORCH_COST)).toBe(true);
    expect(canAfford({ wood: 2 }, TORCH_COST)).toBe(false);
    expect(spend({ wood: 3, stone: 1 }, TORCH_COST)).toEqual({ wood: 1, stone: 0 });
});

it('has every upgrade the game already knows how to use', () => {
    const ids = UPGRADES.map((u) => u.id).sort();
    expect(ids).toEqual(['axe', 'coat', 'cooking-fire', 'fishing-line', 'lantern', 'pack']);
    for (const u of UPGRADES) {
        expect(u.name && u.text && u.built).toBeTruthy();
    }
});
