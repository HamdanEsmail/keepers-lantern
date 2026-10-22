// What you carry. A pack is just a list of item names, e.g. ['wood', 'stone', 'lens-1'].
// Every function here returns a new list instead of changing the old one.

export const PACK_SIZE = 6;

// The mended pack upgrade makes room for 9.
export function capacity(upgrades) {
    return upgrades.includes('pack') ? 9 : PACK_SIZE;
}

export function addToPack(pack, item, cap) {
    if (pack.length >= cap) return { pack, added: false };
    return { pack: [...pack, item], added: true };
}

// Take one of `item` out of the pack, if there is one.
export function takeFromPack(pack, item) {
    const i = pack.indexOf(item);
    if (i === -1) return { pack, taken: false };
    return { pack: [...pack.slice(0, i), ...pack.slice(i + 1)], taken: true };
}

// Back at camp: everything goes into the stash, except lens pieces,
// which come back as their numbers so the beacon can count them.
export function emptyInto(stash, pack) {
    const next = { ...stash };
    const lenses = [];
    for (const item of pack) {
        if (item.startsWith('lens-')) {
            lenses.push(Number(item.slice(5)));
        } else {
            next[item] = (next[item] ?? 0) + 1;
        }
    }
    return { stash: next, lenses };
}
