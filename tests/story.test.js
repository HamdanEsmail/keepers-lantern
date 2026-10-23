import { it, expect } from 'vitest';
import { OPENING, PAGE_IDS, PAGES, ENDING } from '../src/data/story.js';

it('opens with four paragraphs', () => {
    expect(OPENING).toHaveLength(4);
    for (const paragraph of OPENING) expect(paragraph.length).toBeGreaterThan(20);
});

it('has a page for every journal entry, and an ending', () => {
    expect(PAGE_IDS).toHaveLength(7);
    for (const id of PAGE_IDS) {
        expect(PAGES[id].title).toBeTruthy();
        expect(PAGES[id].body.length).toBeGreaterThan(0);
    }
    expect(ENDING.length).toBeGreaterThan(0);
});
