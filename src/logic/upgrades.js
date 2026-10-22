// Things you can build at camp, paid for with what's in your stash.
// Each one is a piece of the old camp gear, mended.
//   cost:  how many of each thing it takes
//   text:  what it does, shown on its card
//   built: what the camp says once it's done
// Like the rest of logic/, these functions return new objects instead of changing old ones.

export const UPGRADES = [
    {
        id: 'pack',
        name: 'Mended pack',
        text: 'Carry 9 things instead of 6.',
        built: 'The pack is mended. It holds 9 now.',
        cost: { wood: 5, stone: 2 },
    },
    {
        id: 'axe',
        name: 'Stone axe',
        text: 'Gather wood two at a time, and faster.',
        built: 'A good sharp edge. Wood comes two at a time now.',
        cost: { stone: 3, wood: 2 },
    },
    {
        id: 'fishing-line',
        name: 'Fishing line',
        text: 'Catch fish to carry home and cook.',
        built: 'The line is ready. Fish go in your pack now.',
        cost: { wood: 2, mushroom: 2 },
    },
    {
        id: 'coat',
        name: 'Warm coat',
        text: 'The cold gets to you more slowly.',
        built: 'The coat is patched and warm again.',
        cost: { wood: 3, mushroom: 3 },
    },
    {
        id: 'cooking-fire',
        name: 'Cooking fire',
        text: 'Get hungry more slowly, and meals fill you up more.',
        built: 'A ring of stones holds the heat. Meals fill you up more.',
        cost: { stone: 4, wood: 2 },
    },
    {
        id: 'lantern',
        name: 'Polished lantern',
        text: 'A wider light, and more fuel.',
        built: 'The glass is clean. The light reaches further.',
        cost: { stone: 3, amber: 2 },
    },
];

// A torch is made at camp too, as many as you can pay for.
export const TORCH_COST = { wood: 2, stone: 1 };

export function upgradeById(id) {
    return UPGRADES.find((u) => u.id === id);
}

// Is there enough of everything in the cost?
export function canAfford(stash, cost) {
    return Object.entries(cost).every(([item, count]) => (stash[item] ?? 0) >= count);
}

// The stash after paying. Only call this when you can afford it.
export function spend(stash, cost) {
    const next = { ...stash };
    for (const [item, count] of Object.entries(cost)) {
        next[item] = (next[item] ?? 0) - count;
    }
    return next;
}

export function canBuy(stash, owned, id) {
    const upgrade = upgradeById(id);
    return Boolean(upgrade) && !owned.includes(id) && canAfford(stash, upgrade.cost);
}

// Returns the new stash and the new list of upgrades you own,
// or null if it's already yours or you can't pay for it.
export function buy(stash, owned, id) {
    if (!canBuy(stash, owned, id)) return null;
    return { stash: spend(stash, upgradeById(id).cost), owned: [...owned, id] };
}
