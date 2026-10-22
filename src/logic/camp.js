// The rules of the camp: unpacking, making torches, taking things back out,
// and what the camp panel shows for each upgrade.
// No Phaser and no HTML here, so it can all be tested. The panel itself is in ui/camp.js.

import { labelFor } from '../data/items.js';
import { UPGRADES, TORCH_COST, canAfford, canBuy, spend } from './upgrades.js';

// Building materials: the things you find and carry home to build with.
export const MATERIALS = ['wood', 'stone', 'mushroom', 'amber'];

// Things you can take back out of the stash and carry with you.
export const TAKEABLE = ['torch', 'meal', 'fish'];

// Coming into camp: the materials in your pack go into the stash, so you can build with them straight away.
// Everything else (torches, food, lens pieces) stays in your pack.
// moved counts what was unpacked, e.g. { wood: 3, stone: 1 }.
export function unpack(stash, pack) {
    const next = { ...stash };
    const kept = [];
    const moved = {};
    for (const item of pack) {
        if (MATERIALS.includes(item)) {
            next[item] = (next[item] ?? 0) + 1;
            moved[item] = (moved[item] ?? 0) + 1;
        } else {
            kept.push(item);
        }
    }
    return { stash: next, pack: kept, moved };
}

// Make a torch from the stash and put it in your pack.
// null if you can't pay for it, or there's no room in the pack.
export function makeTorch(stash, pack, cap) {
    if (!canAfford(stash, TORCH_COST) || pack.length >= cap) return null;
    return { stash: spend(stash, TORCH_COST), pack: [...pack, 'torch'] };
}

// Take one of something out of the stash and put it in your pack.
// null if it isn't something you can take, there's none left, or there's no room.
export function takeOut(stash, pack, cap, item) {
    if (!TAKEABLE.includes(item)) return null;
    if ((stash[item] ?? 0) <= 0 || pack.length >= cap) return null;
    return { stash: { ...stash, [item]: stash[item] - 1 }, pack: [...pack, item] };
}

// One row for each upgrade, with everything the panel needs to draw its card:
// is it yours, can you build it, and for each thing it costs, how many it needs and how many you have.
export function upgradeRows(stash, owned) {
    return UPGRADES.map((upgrade) => ({
        id: upgrade.id,
        name: upgrade.name,
        text: upgrade.text,
        owned: owned.includes(upgrade.id),
        canBuild: canBuy(stash, owned, upgrade.id),
        cost: costRows(stash, upgrade.cost),
    }));
}

// { wood: 5, stone: 2 } becomes [{ item: 'wood', need: 5, have: 3 }, { item: 'stone', need: 2, have: 2 }].
export function costRows(stash, cost) {
    return Object.entries(cost).map(([item, need]) => ({ item, need, have: stash[item] ?? 0 }));
}

// How many of each thing are in a list: ['wood', 'torch', 'wood'] becomes { wood: 2, torch: 1 }.
export function countItems(list) {
    const counts = {};
    for (const item of list) counts[item] = (counts[item] ?? 0) + 1;
    return counts;
}

// { wood: 3, stone: 2 } becomes "Wood ×3 · Stone ×2". Anything at 0 is left out.
export function describeCounts(counts) {
    return Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([item, count]) => `${labelFor(item)} ×${count}`)
        .join(' · ');
}
