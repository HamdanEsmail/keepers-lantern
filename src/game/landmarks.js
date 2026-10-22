import Phaser from 'phaser';
import { landmarkSolids } from '../logic/landmarks.js';

// Draws the valley's landmark and makes it solid. A faint glint shows
// while there's still something inside. The rules are in logic/landmarks.js.

// Where the glint sits, measured from the landmark's middle.
const GLINT = {
    'hollow-tree': { x: 3, y: -12 },
    'standing-stones': { x: 0, y: -6 },
    boulder: { x: 0, y: -6 },
};

export class LandmarkView {
    constructor(scene, solids, landmark) {
        this.scene = scene;
        const { x, y, kind } = landmark;

        if (kind === 'standing-stones') {
            for (const s of landmarkSolids(landmark)) {
                scene.add.image(s.x, s.y + 6, 'standing-stone').setOrigin(0.5, 0.88).setDepth(s.y + 6);
            }
            // Berry bushes in the middle of the ring.
            scene.add.image(x - 12, y + 4, 'bush').setOrigin(0.5, 0.75).setDepth(y + 4);
            scene.add.image(x + 14, y - 2, 'bush').setOrigin(0.5, 0.75).setDepth(y - 2).setScale(0.8).setFlipX(true);
        } else {
            const origin = kind === 'hollow-tree' ? 0.86 : 0.82;
            scene.add.image(x, y, kind).setOrigin(0.5, origin).setDepth(y);
        }
        for (const s of landmarkSolids(landmark)) addSolid(scene, solids, s.x, s.y, s.r);

        const spot = GLINT[kind];
        this.glint = scene.add
            .image(x + spot.x, y + spot.y, 'light')
            .setTint(0xffe6a0)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(0.16)
            .setAlpha(0.35)
            .setDepth(9000);
        scene.tweens.add({
            targets: this.glint,
            alpha: 0.7,
            scale: 0.2,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    // Nothing left inside: the glint fades away.
    emptied() {
        const glint = this.glint;
        if (!glint) return;
        this.glint = null;
        this.scene.tweens.killTweensOf(glint);
        this.scene.tweens.add({ targets: glint, alpha: 0, duration: 600, onComplete: () => glint.destroy() });
    }
}

// An invisible circle you can't walk through (the same as the trees use).
function addSolid(scene, solids, x, y, r) {
    const radius = Math.round(r);
    const block = scene.add.zone(x, y, radius * 2, radius * 2);
    solids.add(block);
    block.body.setCircle(radius);
}
