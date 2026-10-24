import Phaser from 'phaser';
import { ENDING } from '../data/story.js';
import { statLines } from '../logic/stats.js';
import { showPage } from '../ui/journal.js';
import { isPanelOpen } from '../ui/overlay.js';
import { VIEW, fitCamera } from '../game/view.js';

// The end of the game. It runs on top of the valley, where the beacon has just been lit.
// First the last page, found inside the beacon. Then the night closes in, the ending is told
// one line at a time, like the opening, and then the credits. Then back to the title screen.

const TEXT = '#f3e7c9';
const FIRE = '#ffcf7a';
const DIM = '#cdbf9f';
const FONT = 'Georgia, "Times New Roman", serif';
const NIGHT = [10, 18, 14];

const CREDITS = ['Made by Hamdan Esmail for Hack Club Terra', 'Thanks to the Hack Club Terra team'];

export class EndingScene extends Phaser.Scene {
    constructor() {
        super('ending');
    }

    // data.save is the finished game, already saved by the valley.
    create(data) {
        fitCamera(this);
        this.save = data.save;
        // 'page' while the last page is open, 'lines' while the ending is told,
        // 'credits' at the end, and 'leaving' once you've gone back to the title.
        this.mode = 'page';
        this.panelClosedAt = 0;

        // A curtain of night over the valley. It closes once the last page has been read.
        const { width, height } = VIEW;
        this.curtain = this.add.rectangle(0, 0, width, height, 0x0a120e).setOrigin(0).setAlpha(0);

        const style = this.style(28, { align: 'center', lineSpacing: 10, wordWrap: { width: 820 } });
        this.line = this.add.text(640, 330, '', style).setOrigin(0.5).setAlpha(0);
        this.line.setShadow(0, 2, '#0a120e', 10, false, true);
        this.hint = this.add.text(640, 692, 'Space or click to go on', this.style(14, { color: DIM }));
        this.hint.setOrigin(0.5).setAlpha(0);

        this.listen();
        this.readLastPage();
    }

    style(size, extra = {}) {
        return { fontFamily: FONT, fontSize: `${size}px`, color: TEXT, resolution: 2, ...extra };
    }

    listen() {
        for (const key of ['ENTER', 'SPACE', 'E']) {
            this.input.keyboard.on(`keydown-${key}`, (event) => {
                // The key that closed the page belongs to the page (see TitleScene for why).
                if (isPanelOpen() || event.timeStamp <= this.panelClosedAt) return;
                this.next();
            });
        }
        this.input.on('pointerdown', () => {
            if (!isPanelOpen()) this.next();
        });
    }

    // The last page was waiting inside the beacon.
    async readLastPage() {
        await showPage('final', [{ label: 'Go on', value: 'close' }]);
        this.panelClosedAt = performance.now();

        this.mode = 'lines';
        this.tweens.add({ targets: this.curtain, alpha: 0.9, duration: 1800 });
        this.tweens.add({ targets: this.hint, alpha: 0.8, delay: 2500, duration: 800 });
        this.index = -1;
        this.next(true);
    }

    // Space, Enter, E or a click: the next line, then the credits, then back to the title.
    next(first = false) {
        if (this.mode === 'credits') {
            this.leave();
            return;
        }
        if (this.mode !== 'lines') return;
        // A quick double press shouldn't skip a line before you've read it.
        if (!first && this.time.now - this.shownAt < 400) return;
        this.index += 1;
        if (this.index >= ENDING.length) {
            this.showCredits();
            return;
        }
        this.shownAt = this.time.now;
        this.tweens.killTweensOf(this.line);
        this.line.setText(ENDING[this.index]).setAlpha(0);
        this.tweens.add({ targets: this.line, alpha: 1, duration: 900, delay: first ? 1200 : 0 });
    }

    // The name of the game, who made it, and how your days went.
    showCredits() {
        this.mode = 'credits';
        this.tweens.add({ targets: this.line, alpha: 0, duration: 600 });
        this.tweens.add({ targets: this.curtain, alpha: 0.96, duration: 600 });
        this.hint.setText('Space or click: back to the title');

        const parts = [
            this.add.text(640, 170, "The Keeper's Lantern", this.style(52, { color: FIRE })),
            ...CREDITS.map((line, i) => this.add.text(640, 245 + i * 34, line, this.style(20))),
            ...statLines(this.save.stats).map((line, i) => {
                return this.add.text(640, 360 + i * 26, line, this.style(16, { color: DIM }));
            }),
        ];
        for (const part of parts) {
            part.setOrigin(0.5).setAlpha(0);
            this.tweens.add({ targets: part, alpha: 1, delay: 700, duration: 1200 });
        }
    }

    // Fade out, close the valley and the HUD, and start the title screen again.
    leave() {
        this.mode = 'leaving';
        const camera = this.cameras.main;
        camera.fadeOut(1200, ...NIGHT);
        camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.stop('valley');
            this.scene.stop('hud');
            this.scene.start('title');
        });
    }
}
