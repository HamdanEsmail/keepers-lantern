import { ITEMS } from '../data/items.js';
import { eat, foodValue } from './survival.js';

// What your tools change about gathering, plus cooking and eating from the pack.

export const GATHER_TIME = 1.2; // seconds of holding E
const AXE_TIME = 0.5;

// How long you hold E to gather this.
export function gatherTime(kind, upgrades) {
    if (kind === 'wood' && upgrades.includes('axe')) return AXE_TIME;
    return GATHER_TIME;
}

// How many you get at once.
export function gatherCount(kind, upgrades) {
    if (kind === 'wood' && upgrades.includes('axe')) return 2;
    return 1;
}

// 'pack' puts it in your pack, 'eat' eats it on the spot.
export function gatherMode(kind, upgrades) {
    if (kind === 'fish' && upgrades.includes('fishing-line')) return 'pack';
    return ITEMS[kind].gather;
}

// At the fire, every raw fish in the pack becomes a meal.
export function cookAll(pack) {
    let cooked = 0;
    const next = pack.map((item) => {
        if (item !== 'fish') return item;
        cooked += 1;
        return 'meal';
    });
    return { pack: next, cooked };
}

// Eat the best food in your pack: a meal before a raw fish.
// ate is what was eaten, or null if there was nothing to eat.
const SNACKS = ['meal', 'fish'];

export function eatFromPack(meters, pack, upgrades) {
    const ate = SNACKS.find((item) => pack.includes(item)) ?? null;
    if (!ate) return { meters, pack, ate };
    const i = pack.indexOf(ate);
    return {
        meters: eat(meters, ate, upgrades),
        pack: [...pack.slice(0, i), ...pack.slice(i + 1)],
        ate,
        value: foodValue(ate, upgrades),
    };
}
