// The journal: the pages you've found, and each page on its own. J opens it.
// The words are in data/story.js, which isn't typed in a lesson, so they stay a surprise.

import { openPanel, el } from './overlay.js';
import { PAGES, PAGE_IDS } from '../data/story.js';
import { journalOrder } from '../logic/lens.js';

// Shows one page. Returns a Promise of the value of the button you click ('close' for Esc).
//   choices: the buttons under it. Just "Close", unless you ask for others.
export function showPage(id, choices = [{ label: 'Close', value: 'close' }]) {
    const page = PAGES[id];
    return openPanel({
        title: page.title,
        body: [el('div', { className: 'journal-page' }, ...page.body.map((line) => el('p', {}, line)))],
        choices,
    });
}

// The list of pages you've found. Click one to read it, then go back to the list or close it.
export async function openJournal(pagesFound) {
    let last = null;
    while (true) {
        const found = journalOrder(pagesFound);
        const list = found.length
            ? el('div', { className: 'pages' }, ...found.map(pageButton))
            : el('p', { className: 'quiet-text' }, "No pages yet. They're somewhere out in the valley.");
        const choice = await openPanel({
            title: 'Journal',
            body: [list],
            note: `${found.length} of ${PAGE_IDS.length} pages found.`,
            choices: [{ label: 'Close', value: 'close' }],
            // Back from a page, the keyboard is on the page you just read.
            focus: last,
            keepScroll: last !== null,
        });
        if (choice === 'close') return;

        last = choice;
        const answer = await showPage(choice, [
            { label: 'Back to the journal', value: 'back', quiet: true },
            { label: 'Close', value: 'close' },
        ]);
        if (answer === 'close') return;
    }
}

// One page in the list: a button that opens it (see overlay.js for how data-value works).
function pageButton(id, i) {
    return el('button', { type: 'button', dataset: { value: id } }, `${i + 1}.  ${PAGES[id].title}`);
}
