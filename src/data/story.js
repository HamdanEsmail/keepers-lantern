// The words of the story: the opening, the journal pages and the ending.
// This file isn't typed in a lesson, so the story stays a surprise until you play it.
// For now the journal pages and the ending are placeholders.

export const OPENING = [
    'My father kept the beacon for forty years. While it burned, the woods stayed where they were.',
    "Last winter he walked into the deep woods and didn't come back. The beacon went dark that same night.",
    'Now the forest moves. Every morning the paths are somewhere new.',
    'His lantern still hangs by the tent. It still has oil.',
];

// Every journal page, in the order the journal lists them.
export const PAGE_IDS = ['lens-0', 'lens-1', 'lens-2', 'extra-1', 'extra-2', 'extra-3', 'final'];

export const PAGES = Object.fromEntries(
    PAGE_IDS.map((id) => [id, { title: 'Journal page', body: ['(Written later.)'] }]),
);

export const ENDING = ['(Written later.)'];
