// Everything you can find in the valley
// ring: where it grows. gather: 'pack' goes in your pack, 'eat' is eaten on the spot.

export const ITEMS = {
    wood: { label: 'Wood', ring: 'edge', gather: 'pack', art: 'branches' },
    berries: { label: 'Berries', ring: 'edge', gather: 'eat', art: 'bush' },
    stone: { label: 'Stone', ring: 'pinewood', gather: 'pack', art: 'rock' },
    mushroom: { label: 'Mushrooms', ring: 'pinewood', gather: 'pack', art: 'mushrooms'},
    fish: { label: 'Fish', ring: 'pinewood', gather: 'eat', art: 'ripple', icon: 'fish' },
    amber: { label: 'Amber', ring: 'deep', gather: 'pack', art: 'amber'},

    // Things you make rather than find (added by Claude with the torches). They never grow in the valley.
    torch: { label: 'Torch', ring: null, gather: 'pack', art: 'torch' },
    meal: { label: 'Meal', ring: null, gather: 'pack', art: 'meal' },
};
// icon (optional): the picture in your pack, when it isn't the same as the one in the valley.

// Which picture shows an item: in the pack, and on the camp panel.
// Lens pieces ('lens-0', 'lens-1', ...) all share one picture.
export function iconFor(item) {
    if (item.startsWith('lens-')) return 'lens';
    return ITEMS[item]?.icon ?? ITEMS[item]?.art ?? item;
}

// The name of an item, in words. Lens pieces all have the same one.
export function labelFor(item) {
    if (item.startsWith('lens-')) return 'Lens piece';
    return ITEMS[item]?.label ?? item;
}
