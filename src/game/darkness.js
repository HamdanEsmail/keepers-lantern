import Phaser from 'phaser';
import { MAX_DARKNESS } from '../logic/clock.js';
import { screenCorner } from './view.js';

// The night, laid over the valley: a dark sheet with soft holes cut out of it
// wherever there is light (your lantern, the camp fire, and later torches).

const NIGHT_COLOR = 0x0a120e;
// Early dusk is a warm brown rather than black, so the evening looks like evening.
const DUSK_COLOR = 0x3b2a1c;
// The sheet is a little bigger than the screen, so its edge never shows while the camera moves.
const MARGIN = 64;
// Lamp light is warm: a thin orange wash is painted back into the hole.
const WARM_COLOR = 0xff9a3c;
const WARM_STRENGTH = 0.16;

export class Darkness {
    constructor(scene) {
        this.scene = scene;
        makeLampTexture(scene);

        // displayWidth is how much of the world the camera shows, after its zoom.
        const cam = scene.cameras.main;
        this.sheet = scene.add
            .renderTexture(0, 0, cam.displayWidth + MARGIN * 2, cam.displayHeight + MARGIN * 2)
            .setOrigin(0)
            .setDepth(10000)
            .setVisible(false);

        // Reused every frame instead of making new ones: a hole brush and a warm brush per light.
        // They're never added to the scene, so the scene won't clean them up by itself.
        this.brushes = [];
        this.warmBrushes = [];
        scene.events.once('shutdown', () => {
            for (const b of [...this.brushes, ...this.warmBrushes]) b.destroy();
        });
    }

    // alpha: how dark it is, 0 to max.
    // lights: [{ x, y, r, warm }] in world positions. r is where the light fades to nothing.
    // warm (optional, 0 to 1) tints the ground orange inside that light, like a flame would.
    // max and color (optional) are how dark tonight gets and its colour: the moon changes both.
    update(alpha, lights, { max = MAX_DARKNESS, color = NIGHT_COLOR } = {}) {
        const dark = alpha > 0.001;
        this.sheet.setVisible(dark);
        if (!dark) return;
        this.grow(lights.length);

        // Line the sheet up with what the camera sees, plus the margin.
        const corner = screenCorner(this.scene.cameras.main);
        const left = corner.x - MARGIN;
        const top = corner.y - MARGIN;
        this.sheet.setPosition(left, top);

        const night = Math.min(1, alpha / max);
        this.sheet.clear();
        this.sheet.fill(mixColor(DUSK_COLOR, color, night), alpha);

        // Brushes draw onto the sheet, whose top-left corner is at (left, top) in the world.
        const holes = [];
        const washes = [];
        lights.forEach((light, i) => {
            const x = light.x - left;
            const y = light.y - top;
            const size = light.r * 2;
            holes.push(this.brushes[i].setPosition(x, y).setDisplaySize(size, size));
            if (light.warm) {
                const wash = this.warmBrushes[i];
                wash.setPosition(x, y).setDisplaySize(size * 0.85, size * 0.85);
                wash.setAlpha(WARM_STRENGTH * light.warm * night);
                washes.push(wash);
            }
        });
        if (holes.length) this.sheet.erase(holes);
        if (washes.length) this.sheet.draw(washes);
    }

    grow(count) {
        while (this.brushes.length < count) {
            this.brushes.push(this.scene.make.image({ key: 'lamp' }, false));
            this.warmBrushes.push(this.scene.make.image({ key: 'lamp' }, false).setTint(WARM_COLOR));
        }
    }
}

// A soft round brush: fully clear for the inner half, then fading out to the edge.
// (The plain 'light' texture fades from the very centre, which makes a lantern feel tiny.)
function makeLampTexture(scene) {
    if (scene.textures.exists('lamp')) return;
    const texture = scene.textures.createCanvas('lamp', 256, 256);
    const ctx = texture.getContext();
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.5, 'rgba(255, 255, 255, 0.96)');
    g.addColorStop(0.8, 'rgba(255, 255, 255, 0.4)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    texture.refresh();
}

function mixColor(a, b, amount) {
    const from = Phaser.Display.Color.IntegerToColor(a);
    const to = Phaser.Display.Color.IntegerToColor(b);
    const mixed = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, Math.round(amount * 100));
    return Phaser.Display.Color.GetColor(mixed.r, mixed.g, mixed.b);
}
