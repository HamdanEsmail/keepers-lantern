import Phaser from 'phaser';
import { OPENING } from '../data/story.js';
import { newSave, loadSave, writeSave, clearSave, browserStorage } from '../logic/save.js';
import { makeRng, randRange, pick } from '../logic/rng.js';
import { Darkness } from '../game/darkness.js';
import { openPanel, isPanelOpen } from '../ui/overlay.js';

// The title screen: the camp at night, the name of the game, and Continue or New game.
// A new game tells the opening first, one paragraph at a time. Then the first morning begins.

const TEXT = '#f3e7c9';
const FIRE = '#ffcf7a';
const DIM = '#cdbf9f';
const FONT = 'Georgia, "Times New Roman", serif';
// The colour to fade from and to: the night.
const NIGHT = [10, 18, 14];
// A moonlit night, so the trees and the beacon still show a little.
const MOON = 0x17222c;
// Above the darkness (10000), so the words are always easy to read.
const TOP = 10001;

// Where the camp fire is on the title screen.
const FIRE_AT = { x: 640, y: 540 };

const CONTROLS = 'WASD or arrows: walk  ·  E: use  ·  Shift: run  ·  Space: flare  ·  T: torch  ·  F: eat  ·  J: journal';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super('title');
    }

    create() {
        this.storage = browserStorage();
        this.saved = loadSave(this.storage);
        // 'menu' while you choose, 'opening' while the story is told, 'leaving' once the game starts.
        this.mode = 'menu';
        this.panelClosedAt = 0;
        this.t = 0;
        // How dark the night is. It gets darker while the opening is told.
        this.dark = 0.72;

        this.drawCamp();
        this.darkness = new Darkness(this);
        this.drawTitle();
        this.makeMenu();
        this.listen();

        this.cameras.main.fadeIn(900, ...NIGHT);
    }

    update(time, delta) {
        this.t += Math.min(delta / 1000, 0.1);
        // The fire's light flickers, like it does in the valley.
        const flicker = 1 + 0.03 * Math.sin(this.t * 7 + 1) + 0.015 * Math.sin(this.t * 17);
        const lights = [{ x: FIRE_AT.x, y: FIRE_AT.y - 10, r: 300 * flicker, warm: 1 }];
        // Once you've relit the beacon, its light shows here too.
        if (this.saved?.finished) lights.push({ x: 1050, y: 150, r: 260, warm: 1 });
        this.darkness.update(this.dark, lights, { max: 0.7, color: MOON });
    }

    // The camp at night: grass, trees all around, the tent, the fire, you, and the dark beacon far off.
    drawCamp() {
        const { width, height } = this.scale;
        this.add.tileSprite(0, 0, width, height, 'ground').setOrigin(0);

        // The same seed every time, so the title always looks the same.
        const rng = makeRng(7);
        for (let i = 0; i < 90; i++) {
            const x = randRange(rng, -40, width + 40);
            const y = randRange(rng, 40, height + 80);
            // Keep a clearing around the fire, wider than it is tall.
            if (Math.hypot((x - FIRE_AT.x) / 1.8, y - FIRE_AT.y) < 170) continue;
            const tree = pick(rng, ['tree-1', 'tree-2', 'tree-3']);
            const scale = randRange(rng, 1.1, 1.6);
            this.add.image(x, y, tree).setOrigin(0.5, 0.9).setScale(scale).setDepth(y);
        }

        // Things further down the screen are nearer, so they're drawn on top (depth = y).
        // Once you've relit it, it stays lit.
        const beacon = this.saved?.finished ? 'beacon-lit' : 'beacon-dark';
        this.add.image(1050, 230, beacon).setOrigin(0.5, 0.87).setScale(0.8).setDepth(230);
        this.add.image(FIRE_AT.x - 110, FIRE_AT.y - 20, 'tent').setOrigin(0.5, 0.88).setDepth(FIRE_AT.y - 20);
        this.add.image(FIRE_AT.x, FIRE_AT.y, 'fire').setOrigin(0.5, 0.8).setDepth(FIRE_AT.y);
        this.add.image(FIRE_AT.x + 64, FIRE_AT.y + 12, 'player').setOrigin(0.5, 0.9).setDepth(FIRE_AT.y + 12);

        // Two wolves' eyes at the edge of the firelight, blinking now and then.
        this.addEyes(330, 610);
        this.addEyes(960, 575);
    }

    addEyes(x, y) {
        const eyes = this.add.container(x, y).setDepth(TOP).setAlpha(0.85);
        eyes.add([this.add.circle(-6, 0, 2.5, 0xffe9a8), this.add.circle(6, 0, 2.5, 0xffe9a8)]);
        // A blink: squash to a line and back, then wait a few seconds.
        this.tweens.add({
            targets: eyes,
            scaleY: 0.1,
            duration: 90,
            yoyo: true,
            repeat: -1,
            repeatDelay: Phaser.Math.Between(2500, 4500),
        });
    }

    drawTitle() {
        const title = this.add.text(640, 140, "The Keeper's Lantern", this.style(64));
        title.setShadow(0, 3, '#0a120e', 14, false, true);
        const line = 'The forest moves every night. Find the lens. Relight the beacon.';
        const subtitle = this.add.text(640, 205, line, this.style(20, { color: DIM, fontStyle: 'italic' }));
        const controls = this.add.text(640, 692, CONTROLS, this.style(14, { color: DIM }));
        this.titleParts = [title, subtitle, controls];
        for (const part of this.titleParts) part.setOrigin(0.5).setDepth(TOP);
    }

    // The text style used everywhere on this screen. resolution 2 keeps it sharp when scaled up.
    style(size, extra = {}) {
        return { fontFamily: FONT, fontSize: `${size}px`, color: TEXT, resolution: 2, ...extra };
    }

    // Continue (only if there's a saved game) and New game.
    makeMenu() {
        this.options = [];
        if (this.saved) this.options.push({ label: `Continue  ·  Day ${this.saved.run + 1}`, action: 'continue' });
        this.options.push({ label: 'New game', action: 'new' });

        this.options.forEach((option, i) => {
            option.text = this.add.text(640, 320 + i * 58, option.label, this.style(30));
            option.text.setOrigin(0.5).setDepth(TOP).setShadow(0, 2, '#0a120e', 10, false, true);
            option.text.setInteractive({ useHandCursor: true });
            option.text.on('pointerover', () => this.select(i));
            option.text.on('pointerdown', () => this.choose(i));
        });
        this.select(0);
    }

    // Light up one choice and dim the rest.
    select(index) {
        if (this.mode !== 'menu') return;
        this.selected = index;
        this.options.forEach((option, i) => {
            const on = i === index;
            option.text.setText(on ? `›  ${option.label}  ‹` : option.label);
            option.text.setColor(on ? FIRE : TEXT).setAlpha(on ? 1 : 0.7);
        });
    }

    move(step) {
        const count = this.options.length;
        this.select((this.selected + step + count) % count);
    }

    // The keys, and clicks during the opening.
    listen() {
        const actions = {
            UP: () => this.move(-1),
            W: () => this.move(-1),
            DOWN: () => this.move(1),
            S: () => this.move(1),
            ENTER: () => this.confirm(),
            SPACE: () => this.confirm(),
            E: () => this.confirm(),
            ESC: () => this.skipOpening(),
        };
        for (const [key, action] of Object.entries(actions)) {
            this.input.keyboard.on(`keydown-${key}`, (event) => {
                // Phaser hands key presses over a frame late. A key pressed while a panel
                // was open belongs to the panel, so it's skipped here.
                if (isPanelOpen() || event.timeStamp <= this.panelClosedAt) return;
                action();
            });
        }
        // A click anywhere moves the opening on.
        this.input.on('pointerdown', () => {
            if (this.mode === 'opening') this.nextParagraph();
        });
    }

    // Enter, Space or E: pick the lit-up choice, or go on to the next paragraph.
    confirm() {
        if (this.mode === 'menu') this.choose(this.selected);
        else if (this.mode === 'opening') this.nextParagraph();
    }

    async choose(index) {
        if (this.mode !== 'menu' || isPanelOpen()) return;
        if (this.options[index].action === 'continue') {
            this.begin(this.saved);
            return;
        }
        // A new game forgets the saved one, so ask first.
        if (this.saved) {
            const answer = await openPanel({
                title: 'Start a new game?',
                body: [
                    `Your game on day ${this.saved.run + 1} will be gone: the stash, the upgrades, and everything you've found.`,
                ],
                choices: [
                    { label: 'Keep my game', value: 'close', quiet: true },
                    { label: 'Start again', value: 'new' },
                ],
            });
            this.panelClosedAt = performance.now();
            if (answer !== 'new') return;
            clearSave(this.storage);
        }
        this.startOpening();
    }

    // Fade the title away, and tell the opening one paragraph at a time.
    startOpening() {
        this.mode = 'opening';
        this.save = newSave(Date.now() % 1e9);
        const parts = [...this.titleParts, ...this.options.map((option) => option.text)];
        this.tweens.add({ targets: parts, alpha: 0, duration: 600 });
        // The night closes in while the story is told.
        this.tweens.add({ targets: this, dark: 0.9, duration: 1600 });

        const style = this.style(28, { align: 'center', lineSpacing: 10, wordWrap: { width: 820 } });
        this.paragraph = this.add.text(640, 320, '', style).setOrigin(0.5).setDepth(TOP).setAlpha(0);
        this.paragraph.setShadow(0, 2, '#0a120e', 10, false, true);
        const hint = 'Space or click to go on  ·  Esc to skip';
        this.hint = this.add.text(640, 692, hint, this.style(14, { color: DIM })).setOrigin(0.5).setDepth(TOP);
        this.hint.setAlpha(0);
        this.tweens.add({ targets: this.hint, alpha: 0.8, delay: 2000, duration: 800 });

        this.index = -1;
        this.nextParagraph(true);
    }

    nextParagraph(first = false) {
        if (this.mode !== 'opening') return;
        // A quick double press shouldn't skip a paragraph before you've read it.
        if (!first && this.time.now - this.shownAt < 400) return;
        this.index += 1;
        if (this.index >= OPENING.length) {
            this.begin(this.save);
            return;
        }
        this.shownAt = this.time.now;
        this.tweens.killTweensOf(this.paragraph);
        this.paragraph.setText(OPENING[this.index]).setAlpha(0);
        this.tweens.add({ targets: this.paragraph, alpha: 1, duration: 900, delay: first ? 700 : 0 });
    }

    skipOpening() {
        if (this.mode === 'opening') this.begin(this.save);
    }

    // Save, fade to night, and wake up in the valley.
    begin(save) {
        this.mode = 'leaving';
        writeSave(this.storage, save);
        const camera = this.cameras.main;
        camera.fadeOut(900, ...NIGHT);
        camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('valley', { save });
        });
    }
}
