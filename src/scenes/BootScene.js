import Phaser from 'phaser';
import { skipTitle } from '../game/dev.js';
import { VIEW, RES, fitCamera } from '../game/view.js';

// Every picture in public/art, and the size in pixels to draw it at.
const ART = {
    ground: 256,
    'tree-1': 96, 'tree-2': 96, 'tree-3': 96,
    bush: 48, branches: 48, rock: 48, mushrooms: 48, ripple: 48, amber: 48,
    lens: 48, page: 48,
    tent: 120, fire: 64,
    'beacon-dark': 160, 'beacon-lit': 160,
    player: 48, wolf: 64, 'wolf-lying': 64, arrow: 32,
    torch: 48, 'torch-lit': 64, fish: 48, meal: 48,
    deer: 64, rabbit: 40, bird: 36, 'bird-fly': 36,
    'hollow-tree': 144, 'standing-stone': 64, boulder: 128,
};

export class BootScene extends Phaser.Scene {
    constructor() {
        super('boot');
    }
    preload() {
        fitCamera(this);
        // A thin loading bar that fills up while the art downlaods
        const { width, height } = VIEW;
        this.add.rectangle(width / 2, height / 2, 400, 6).setStrokeStyle(1, 0xf3e7c9, 0.4);
        const bar = this.add.rectangle(width / 2 - 200, height / 2, 400, 6, 0xffcf7a).setOrigin(0, 0.5);
        bar.scaleX = 0;
        this.load.on('progress', (amount) => {
            bar.scaleX = amount;
        });
        // Each picture is drawn RES times bigger than it shows, so it's still sharp once the camera zooms in.
        for (const [key, size] of Object.entries(ART)) {
            this.load.svg(key, `art/${key}.svg`, { width: size * RES, height: size * RES });
        }
    }
    create() {
        // Give every picture its normal size back. The ground is the exception:
        // it's a repeating tile, so it's shrunk with setTileScale where it's used instead.
        if (RES !== 1) {
            for (const key of Object.keys(ART)) {
                if (key !== 'ground') shrinkFrame(this.textures.getFrame(key), RES);
            }
        }
        this.makeLightTexture();
        this.makeVignetteTexture();
        // On to the title screen. While testing, an option in the address skips it (see dev.js).
        this.scene.start(import.meta.env.DEV && skipTitle() ? 'valley' : 'title');
    }
    makeLightTexture() {
        const texture = this.textures.createCanvas('light', 256, 256);
        const ctx = texture.getContext();
        const glow = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 256, 256);
        texture.refresh();
    }

    // Clear in the middle and darker towards the corners, like the painted mockup.
    makeVignetteTexture() {
        const { width, height } = VIEW;
        const texture = this.textures.createCanvas('vignette', width, height);
        const ctx = texture.getContext();
        const cx = width / 2;
        const cy = height * 0.55;
        const shade = ctx.createRadialGradient(cx, cy, height * 0.35, cx, cy, width * 0.65);
        shade.addColorStop(0, 'rgba(10, 18, 14, 0)');
        shade.addColorStop(1, 'rgba(10, 18, 14, 0.7)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, width, height);
        texture.refresh();
    }
}

// Make a picture that was drawn `by` times too big show at its normal size, without losing detail.
// setSize makes the frame (and so the sprite, its origin and its physics body) the normal size,
// but it also points the frame at just the top-left corner of the image. The last two lines
// point it back at the whole image, so the full picture is squeezed into the smaller frame.
function shrinkFrame(frame, by) {
    frame.setSize(frame.cutWidth / by, frame.cutHeight / by);
    frame.u1 = 1;
    frame.v1 = 1;
}