import Phaser from 'phaser';
import { ITEMS } from '../data/items.js';

// The heads-up display: day and meters top left, pack top right,
// the E prompt and short messages ("toasts") at the bottom.
// It runs on top of the valley and only draws what the valley tells it each frame.

const TEXT = '#f3e7c9';
const FONT = 'Georgia, "Times New Roman", serif';
const PANEL = 0x0a120e;
const PHASE_LABEL = { dawn: 'Dawn', day: 'Day', dusk: 'Dusk', night: 'Night' };
const METERS = [
    { key: 'food', label: 'Food', color: 0xf0a24a },
    { key: 'warmth', label: 'Warmth', color: 0xe0604a },
    { key: 'fuel', label: 'Lantern', color: 0xffcf7a },
];
const SLOT = 44;
const GAP = 6;

// Which picture shows an item in the pack.
export function iconFor(item) {
    if (item.startsWith('lens-')) return 'lens';
    return ITEMS[item]?.icon ?? ITEMS[item]?.art ?? item;
}

export class HudScene extends Phaser.Scene {
    constructor() {
        super('hud');
    }

    create() {
        this.drawDayPanel();
        this.packSlots = [];
        this.packKey = '';
        this.cap = 0;

        // The prompt sits in a dark pill at the bottom centre.
        this.promptBg = this.add.graphics();
        this.promptText = this.add.text(640, 668, '', this.textStyle(18)).setOrigin(0.5);

        // Toasts appear just above the prompt and fade away.
        // If one arrives while another is showing, it waits its turn.
        this.toastText = this.add.text(640, 612, '', this.textStyle(20, { fontStyle: 'italic' }))
            .setOrigin(0.5)
            .setAlpha(0);
        this.toastQueue = [];
        this.toastBusy = false;

        const valley = this.scene.get('valley');
        valley.events.on('hud', this.onHud, this);
        valley.events.on('toast', this.onToast, this);
        this.events.once('shutdown', () => {
            valley.events.off('hud', this.onHud, this);
            valley.events.off('toast', this.onToast, this);
        });
    }

    textStyle(size, extra = {}) {
        // resolution 2 keeps text sharp when the game is scaled up to fill a big window.
        return { fontFamily: FONT, fontSize: `${size}px`, color: TEXT, resolution: 2, ...extra };
    }

    drawDayPanel() {
        const g = this.add.graphics();
        g.fillStyle(PANEL, 0.6);
        g.fillRoundedRect(16, 16, 290, 124, 12);

        this.dayText = this.add.text(32, 26, '', this.textStyle(22));
        this.bars = METERS.map((m, i) => {
            const y = 66 + i * 24;
            this.add.text(32, y - 9, m.label, this.textStyle(14, { color: '#cdbf9f' }));
            const back = this.add.rectangle(110, y, 180, 9, 0xf3e7c9, 0.12).setOrigin(0, 0.5);
            const bar = this.add.rectangle(110, y, 180, 9, m.color).setOrigin(0, 0.5);
            return { ...m, back, bar };
        });
    }

    onHud(state) {
        this.dayText.setText(`Day ${state.day} · ${PHASE_LABEL[state.phase] ?? ''}`);

        for (const b of this.bars) {
            const value = state.meters ? state.meters[b.key] : null;
            const max = b.key === 'fuel' ? state.maxFuel : 100;
            const show = value !== null && value !== undefined;
            b.bar.setVisible(show);
            if (show) {
                b.bar.scaleX = Math.max(0, value / max);
                // A low meter pulses, so you notice it without reading numbers.
                b.bar.setAlpha(value / max < 0.25 ? 0.55 + 0.45 * Math.abs(Math.sin(this.time.now / 200)) : 1);
            }
        }

        this.updatePack(state.pack, state.cap);
        this.updatePrompt(state.prompt);
    }

    updatePack(pack, cap) {
        const key = `${cap}:${pack.join(',')}`;
        if (key === this.packKey) return;
        this.packKey = key;

        if (cap !== this.cap) {
            this.cap = cap;
            for (const s of this.packSlots) {
                s.box.destroy();
                s.icon.destroy();
            }
            const width = cap * SLOT + (cap - 1) * GAP;
            const left = 1280 - 16 - width;
            this.packSlots = [];
            for (let i = 0; i < cap; i++) {
                const x = left + i * (SLOT + GAP) + SLOT / 2;
                const box = this.add.rectangle(x, 16 + SLOT / 2, SLOT, SLOT, PANEL, 0.6).setStrokeStyle(1, 0xf3e7c9, 0.25);
                const icon = this.add.image(x, 16 + SLOT / 2 + 3, 'branches').setScale(0.75).setVisible(false);
                this.packSlots.push({ box, icon });
            }
        }

        this.packSlots.forEach((s, i) => {
            const item = pack[i];
            s.icon.setVisible(Boolean(item));
            if (item) s.icon.setTexture(iconFor(item));
        });
    }

    updatePrompt(prompt) {
        if (prompt === this.lastPrompt) return;
        this.lastPrompt = prompt;
        this.promptText.setText(prompt ?? '');
        this.promptBg.clear();
        if (!prompt) return;
        const w = this.promptText.width + 36;
        this.promptBg.fillStyle(PANEL, 0.7);
        this.promptBg.fillRoundedRect(640 - w / 2, 668 - 19, w, 38, 19);
    }

    onToast(message) {
        // The same message twice in a row says nothing new.
        if (message === this.toastText.text && this.toastBusy) return;
        if (this.toastQueue.includes(message)) return;
        if (this.toastBusy) {
            this.toastQueue.push(message);
            return;
        }
        this.showToast(message);
    }

    // Each toast gets at least 1.5 s on screen. Then the next one in the queue,
    // or, if there isn't one, it lingers a little and fades.
    showToast(message) {
        this.toastBusy = true;
        this.tweens.killTweensOf(this.toastText);
        this.toastText.setText(message).setAlpha(1).setY(612);
        this.time.delayedCall(1500, () => {
            this.toastBusy = false;
            if (this.toastQueue.length) {
                this.showToast(this.toastQueue.shift());
                return;
            }
            this.tweens.add({
                targets: this.toastText,
                alpha: 0,
                y: 600,
                delay: 700,
                duration: 600,
            });
        });
    }
}
