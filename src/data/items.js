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