import { it, expect } from 'vitest';
import { ITEMS, iconFor, labelFor } from '../src/data/items.js';

it('finds the picture and the name for each item', () => {
    expect(iconFor('wood')).toBe('branches');
    // Fish have their own picture in the pack, not the ripple you see in the stream.
    expect(iconFor('fish')).toBe('fish');
    expect(iconFor('lens-2')).toBe('lens');
    expect(labelFor('mushroom')).toBe('Mushrooms');
    expect(labelFor('lens-0')).toBe('Lens piece');
});

it('gives every item a label and a picture', () => {
    for (const item of Object.values(ITEMS)) {
        expect(item.label).toBeTruthy();
        expect(item.art).toBeTruthy();
    }
});
