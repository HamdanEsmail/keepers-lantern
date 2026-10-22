// Panels: boxes of words and buttons shown over the game, for the camp and for the morning after each run.
// They're plain HTML (the #panel section in index.html, styled in style.css), not Phaser,
// because HTML is much better at text that wraps, and at buttons.
//
// openPanel({ title, body, choices }) shows a panel and returns a Promise.
// The Promise resolves with the value of the button you click, or 'close' if you press Esc.
//   body:       paragraphs (strings), or HTML elements made with el()
//   note:       (optional) a short message just above the buttons, like "Your pack is full."
//   choices:    the buttons along the bottom, e.g. { label: 'Sleep until dawn', value: 'sleep' }
//               add disabled: true to grey one out, or quiet: true for a plainer button
//   focus:      (optional) the value of the button to put the keyboard on
//   keepScroll: (optional) stay scrolled where the last panel was
// Any button inside the body with a data-value works the same way as a choice.

const panel = document.getElementById('panel');

// While a panel is open, this resolves its Promise. null when nothing is open.
let finish = null;
let lastScroll = 0;

export function isPanelOpen() {
    return finish !== null;
}

export function openPanel({ title, body = [], note = '', choices = [], focus = null, keepScroll = false }) {
    // Only one panel at a time: a new one replaces whatever was open.
    if (finish) closePanel('close');

    // The footer stays stuck to the bottom of the panel, even when the rest scrolls.
    const footer = el(
        'div',
        { className: 'footer' },
        note && el('p', { className: 'note' }, note),
        el('div', { className: 'choices' }, ...choices.map(choiceButton)),
    );
    panel.replaceChildren(
        el('h2', { id: 'panel-title' }, title),
        ...body.map((part) => (typeof part === 'string' ? el('p', {}, part) : part)),
        footer,
    );
    panel.hidden = false;
    if (keepScroll) panel.scrollTop = lastScroll;

    // Put the keyboard on a button, so Enter and Tab work straight away.
    const wanted = focus && panel.querySelector(`button[data-value="${focus}"]:not(:disabled)`);
    const first = panel.querySelector('.choices button:not(:disabled)');
    (wanted || first)?.focus({ preventScroll: true });

    return new Promise((resolve) => {
        finish = resolve;
    });
}

// Close whatever panel is open, as if `value` had been picked.
export function closePanel(value = 'close') {
    if (!finish) return;
    const done = finish;
    finish = null;
    lastScroll = panel.scrollTop;
    panel.hidden = true;
    panel.replaceChildren();
    done(value);
}

function choiceButton({ label, value, disabled = false, quiet = false }) {
    return el('button', { type: 'button', className: quiet ? 'quiet' : '', disabled, dataset: { value } }, label);
}

// A click on any button with a value closes the panel with that value.
panel.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-value]');
    if (button && !button.disabled) closePanel(button.dataset.value);
});

// Esc closes it, the same as saying no.
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && finish) closePanel('close');
});

// A small helper for making HTML from code.
//   el('p', { className: 'note' }, 'Hello')   makes   <p class="note">Hello</p>
// props are copied onto the element (className, src, disabled, ...), and dataset adds data-* attributes.
// children can be strings or other elements. Empty ones (null, undefined, false and '') are skipped,
// so you can write  ok && el(...)  to add something only sometimes.
export function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    const { dataset = {}, ...rest } = props;
    Object.assign(node, rest);
    Object.assign(node.dataset, dataset);
    const empty = [null, undefined, false, ''];
    node.append(...children.filter((child) => !empty.includes(child)));
    return node;
}
