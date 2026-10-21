import Phaser from 'phaser';

// Every picture in public/art, and the size in pixels to draw it at.
const ART = {
    ground: 256,
    'tree-1': 96, 'tree-2': 96, 'tree-3': 96,
    bush: 48, branches: 48, rock: 48, mushrooms: 48, ripple: 48, amber: 48,
    lens: 48, page: 48,
    tent: 120, fire: 64,
    'beacon-dark': 160, 'beacon-lit': 160,
    player: 48, wolf: 64, 'wolf-lying': 64, arrow: 32,
};

export class BootScene extends Phaser.Scene {
    constructor() {
        super('boot');
    }
    preload() {
        // A thin loading bar that fills up while the art downlaods
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, 400, 6).setStrokeStyle(1, 0xf3e7c9, 0.4);
        const bar = this.add.rectangle(width / 2 - 200, height / 2, 400, 6, 0xffcf7a).setOrigin(0, 0.5);
        bar.scaleX = 0;
        this.load.on('progress', (amount) => {
            bar.scaleX = amount;
        });
        for (const [key, size] of Object.entries(ART)) {
            this.load.svg(key, `art/${key}.svg`, { width: size, height: size });
        }
    }
    create() {
        this.makeLightTexture();
        this.scene.start('valley');
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
}