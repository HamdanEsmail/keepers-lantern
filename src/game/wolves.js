import Phaser from 'phaser';
import { stepWolf, isCaught } from '../logic/wolfai.js';

// The wolves you see at night. The thinking is in logic/wolfai.js;
// this file only draws them around the player.

const START_DIST = 600;
// Where the eye sits on the wolf picture, measured from its feet, when it faces right.
const EYE = { x: 23, y: -31 };
// Eyeshine: pale green normally, orange once they've stopped waiting.
const EYE_CALM = 0xe8f5a8;
const EYE_HUNTING = 0xffa060;
// A faint outline of each wolf is drawn over the darkness, so you can make out their shapes.
const GHOST_ALPHA = 0.2;
const GHOST_TINT = 0x8a9aa8;

export class WolfPack {
    constructor(scene) {
        this.scene = scene;
        this.wolves = [];
        this.time = 0;
        makeEyeTexture(scene);
    }

    get active() {
        return this.wolves.length > 0;
    }

    // Evenly spread around you, far out in the dark.
    spawn(count, player) {
        const start = Math.random() * Math.PI * 2;
        for (let i = 0; i < count; i++) {
            const sprite = this.scene.add.image(0, 0, 'wolf').setOrigin(0.5, 0.82);
            // The ghost and the eyes go above the darkness, so you can always see where the wolves are.
            const ghost = this.scene.add.image(0, 0, 'wolf').setOrigin(0.5, 0.82).setTint(GHOST_TINT).setDepth(10001);
            const eye = this.scene.add
                .image(0, 0, 'eyeshine')
                .setScale(1.4)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setDepth(10002);
            this.wolves.push({
                angle: start + (i / count) * Math.PI * 2,
                dist: START_DIST,
                sprite,
                ghost,
                eye,
                lastX: null,
                // Each wolf blinks on its own clock.
                blinkAt: 1 + Math.random() * 4,
            });
        }
        this.place(player, 0, { dim: false, lightRadius: 0 });
    }

    // Moves the pack. Returns true if a wolf reached you.
    update(dt, player, ctx) {
        let caught = false;
        for (const w of this.wolves) {
            const next = stepWolf(w, dt, ctx);
            w.angle = next.angle;
            w.dist = next.dist;
            if (isCaught(w)) caught = true;
        }
        this.place(player, dt, ctx);
        return caught;
    }

    place(player, dt, { dim, lightRadius }) {
        this.time += dt;
        for (const w of this.wolves) {
            const x = player.x + Math.cos(w.angle) * w.dist;
            const y = player.y + Math.sin(w.angle) * w.dist;
            const s = w.sprite;

            // Face the way it's going. Small moves are ignored, so it doesn't twitch.
            if (w.lastX !== null && Math.abs(x - w.lastX) > 0.3) s.setFlipX(x < w.lastX);
            const moved = w.lastX !== null && Math.abs(x - w.lastX) > 0.1;
            w.lastX = x;

            s.setPosition(x, y).setDepth(y);
            s.setAngle(moved ? Math.sin(this.time * 12 + w.blinkAt) * 3 : 0);

            // The ghost fades out once the wolf is inside your light and you can see it anyway.
            const inDark = Math.min(1, Math.max(0, (w.dist - lightRadius * 0.6) / (lightRadius * 0.4 || 1)));
            w.ghost
                .setPosition(x, y)
                .setFlipX(s.flipX)
                .setAngle(s.angle)
                .setAlpha(GHOST_ALPHA * inDark);

            // Blink now and then: the eye goes out for a moment.
            w.blinkAt -= dt;
            if (w.blinkAt < -0.12) w.blinkAt = 2 + Math.random() * 4;
            const side = s.flipX ? -1 : 1;
            w.eye
                .setPosition(x + EYE.x * side, y + EYE.y)
                .setVisible(w.blinkAt > 0)
                .setTint(dim ? EYE_HUNTING : EYE_CALM);
        }
    }

    // Where each wolf is, for testing.
    distances() {
        return this.wolves.map((w) => Math.round(w.dist));
    }

    clear() {
        for (const w of this.wolves) {
            w.sprite.destroy();
            w.ghost.destroy();
            w.eye.destroy();
        }
        this.wolves = [];
    }
}

// A small soft dot of light.
function makeEyeTexture(scene) {
    if (scene.textures.exists('eyeshine')) return;
    const texture = scene.textures.createCanvas('eyeshine', 16, 16);
    const ctx = texture.getContext();
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.3, 'rgba(255, 255, 255, 0.75)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
    texture.refresh();
}
