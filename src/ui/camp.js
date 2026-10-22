// The camp panel (E at the tent), and the morning panel after every run.
// The rules are in logic/camp.js and logic/upgrades.js. This file only shows them and reacts to clicks.

import { openPanel, el } from './overlay.js';
import { TORCH_COST, buy, canAfford, upgradeById } from '../logic/upgrades.js';
import { unpack, makeTorch, takeOut, upgradeRows, costRows, countItems, describeCounts, TAKEABLE } from '../logic/camp.js';
import { capacity } from '../logic/pack.js';
import { statLines } from '../logic/stats.js';
import { iconFor, labelFor } from '../data/items.js';

// Opens the camp. Returns a Promise of { action, save, pack }:
//   action:     'sleep' to end the day safely, or 'close' to go back outside
//   save, pack: how they are after everything you did here
export async function openCamp(save, pack) {
    // What you carried home goes into the stash first, so you can build with it straight away.
    const unpacked = unpack(save.stash, pack);
    save = { ...save, stash: unpacked.stash };
    pack = unpacked.pack;
    const moved = describeCounts(unpacked.moved);
    let note = moved ? `Unpacked into the stash: ${moved}` : '';
    let last = null;

    // Show the camp, wait for a click, do it, and show the camp again, until you leave.
    while (true) {
        const choice = await openPanel({
            title: 'Camp',
            body: campBody(save, pack),
            note,
            choices: [
                { label: 'Back outside', value: 'close', quiet: true },
                { label: 'Sleep until dawn', value: 'sleep' },
            ],
            // The keyboard starts on "Back outside", so Enter can't put you to sleep by accident.
            focus: last ?? 'close',
            keepScroll: last !== null,
        });
        if (choice === 'sleep' || choice === 'close') return { action: choice, save, pack };

        last = choice;
        note = '';
        const cap = capacity(save.upgrades);
        // Choices look like 'build:axe', 'torch' or 'take:meal'.
        const [action, id] = choice.split(':');

        if (action === 'build') {
            const result = buy(save.stash, save.upgrades, id);
            if (result) {
                save = { ...save, stash: result.stash, upgrades: result.owned };
                note = upgradeById(id).built;
            }
        } else if (action === 'torch') {
            const result = makeTorch(save.stash, pack, cap);
            if (result) {
                save = { ...save, stash: result.stash };
                pack = result.pack;
                note = "A torch, bound and ready. It's in your pack.";
            } else {
                note = 'Your pack is full.';
            }
        } else if (action === 'take') {
            const result = takeOut(save.stash, pack, cap, id);
            if (result) {
                save = { ...save, stash: result.stash };
                pack = result.pack;
                note = `${labelFor(id)} packed.`;
            } else {
                note = 'Your pack is full.';
            }
        }
    }
}

// After a run: how it went, and a button for the next day.
// report comes from wakeReport() in logic/run.js.
export function showMorning(report) {
    return openPanel({
        title: report.title,
        body: report.lines,
        choices: [{ label: 'Wake up', value: 'wake' }],
    });
}

// Everything in the camp panel above the buttons along the bottom.
function campBody(save, pack) {
    const cap = capacity(save.upgrades);
    const carrying = pack.length ? `: ${describeCounts(countItems(pack))}` : '';
    return [
        el('h3', {}, 'The stash'),
        stashChips(save.stash),
        el('p', { className: 'quiet-text' }, `Carrying ${pack.length} of ${cap}${carrying}.`),

        el('h3', {}, 'Mend and build'),
        el('div', { className: 'cards' }, ...upgradeRows(save.stash, save.upgrades).map(upgradeCard)),

        el('h3', {}, 'For the night'),
        el('div', { className: 'cards' }, torchCard(save.stash), ...takeCards(save.stash)),

        el('h3', {}, 'Your days'),
        el('ul', { className: 'stats' }, ...statLines(save.stats).map((line) => el('li', {}, line))),
    ];
}

// Everything in the stash, as little pictures with numbers.
function stashChips(stash) {
    const items = Object.entries(stash).filter(([, count]) => count > 0);
    if (!items.length) {
        return el('p', { className: 'quiet-text' }, 'Empty. Bring things home and they wait here for you.');
    }
    return el('div', { className: 'chips' }, ...items.map(([item, count]) => chip(item, String(count))));
}

// A little picture and some text: a number, or "have/need" when you're short.
function chip(item, text, short = false) {
    return el(
        'span',
        { className: short ? 'chip short' : 'chip', title: labelFor(item) },
        el('img', { src: `art/${iconFor(item)}.svg`, alt: labelFor(item) }),
        text,
    );
}

// What one thing costs: just the number if you have enough, "3/5" if you only have 3 of the 5.
function costChip({ item, need, have }) {
    return have >= need ? chip(item, String(need)) : chip(item, `${have}/${need}`, true);
}

function upgradeCard(row) {
    if (row.owned) return card(row.name, row.text, el('span', { className: 'done' }, 'Built'), 'card owned');
    const cost = el('div', { className: 'chips' }, ...row.cost.map(costChip));
    const build = button('Build', `build:${row.id}`, !row.canBuild);
    return card(row.name, row.text, el('div', { className: 'side' }, cost, build));
}

function torchCard(stash) {
    const cost = el('div', { className: 'chips' }, ...costRows(stash, TORCH_COST).map(costChip));
    const make = button('Make', 'torch', !canAfford(stash, TORCH_COST));
    const text = 'Plant it with T. The wolves keep out of its light, and your lantern rests.';
    return card('Make a torch', text, el('div', { className: 'side' }, cost, make));
}

// A card for each thing in the stash you can take back out: torches, meals and fish.
function takeCards(stash) {
    const here = TAKEABLE.filter((item) => (stash[item] ?? 0) > 0);
    return here.map((item) => {
        const side = el('div', { className: 'side' }, chip(item, String(stash[item])), button('Take one', `take:${item}`));
        return card(labelFor(item), 'Kept in the stash.', side);
    });
}

// A card: a name and a line about it on the left, and whatever goes on the right.
function card(title, text, side, className = 'card') {
    const about = el('div', { className: 'about' }, el('h4', {}, title), el('p', {}, text));
    return el('div', { className }, about, side);
}

// A button that closes the panel with its value when clicked (see overlay.js).
function button(label, value, disabled = false) {
    return el('button', { type: 'button', disabled, dataset: { value } }, label);
}
