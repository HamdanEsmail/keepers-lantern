// Rain and fog, drawn over the valley but under the night,
// so after dark you only see them inside your light.
// What the weather does to you is in logic/weather.js; this file only draws it.

// Just below the vignette (9500) and the darkness (10000).
const DEPTH = 9400;

const DROPS = 150;
const DROP_COLOR = 0xc8d6e0;
// Rain falls a little slanted, as if the wind comes from the right.
const SLANT = 0.18;
// The sky goes grey while it rains.
const RAIN_WASH = 0x2c3a44;

const FOG_SIZE = 512;

export class Sky {
    constructor(scene, weather) {
        this.scene = scene;
        this.time = 0;
        const cam = scene.cameras.main;
        this.width = cam.width;
        this.height = cam.height;

        if (weather.sky === 'rain') {
            // Fixed to the screen: rain falls past you wherever you go.
            scene.add.rectangle(0, 0, cam.width, cam.height, RAIN_WASH, 0.2).setOrigin(0).setScrollFactor(0).setDepth(DEPTH);
            this.rain = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH);
            this.drops = Array.from({ length: DROPS }, () => this.newDrop(Math.random() * cam.height));
        }

        if (weather.sky === 'fog') {
            makeFogTexture(scene);
            // Two layers drifting at different speeds, so the fog seems to roll.
            this.fog = [
                { sprite: this.fogLayer(0.55), drift: { x: 9, y: 3 }, depth: 1 },
                { sprite: this.fogLayer(0.35).setTileScale(1.6), drift: { x: -5, y: 2 }, depth: 0.8 },
            ];
        }
    }

    fogLayer(alpha) {
        return this.scene.add
            .tileSprite(0, 0, this.width, this.height, 'fog')
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(DEPTH)
            .setAlpha(alpha);
    }

    newDrop(y) {
        return {
            x: Math.random() * (this.width + 200),
            y,
            speed: 650 + Math.random() * 350,
            length: 12 + Math.random() * 12,
        };
    }

    update(dt) {
        this.time += dt;

        if (this.rain) {
            this.rain.clear();
            this.rain.lineStyle(1.5, DROP_COLOR, 0.4);
            for (let i = 0; i < this.drops.length; i++) {
                const d = this.drops[i];
                d.y += d.speed * dt;
                d.x -= d.speed * SLANT * dt;
                // Off the bottom: start again somewhere along the top.
                if (d.y - d.length > this.height) this.drops[i] = this.newDrop(-Math.random() * 40);
                this.rain.lineBetween(d.x, d.y, d.x + d.length * SLANT, d.y - d.length);
            }
        }

        if (this.fog) {
            // The fog belongs to the valley, not the screen: it stays put as you walk through it.
            const cam = this.scene.cameras.main;
            for (const layer of this.fog) {
                const s = layer.sprite;
                s.tilePositionX = cam.scrollX * layer.depth + this.time * layer.drift.x;
                s.tilePositionY = cam.scrollY * layer.depth + this.time * layer.drift.y;
            }
        }
    }
}

// Soft pale patches that tile without a seam: each patch near an edge is drawn again on the far side.
function makeFogTexture(scene) {
    if (scene.textures.exists('fog')) return;
    const texture = scene.textures.createCanvas('fog', FOG_SIZE, FOG_SIZE);
    const ctx = texture.getContext();
    for (let i = 0; i < 18; i++) {
        const x = Math.random() * FOG_SIZE;
        const y = Math.random() * FOG_SIZE;
        const r = 60 + Math.random() * 110;
        for (const dx of [-FOG_SIZE, 0, FOG_SIZE]) {
            for (const dy of [-FOG_SIZE, 0, FOG_SIZE]) {
                const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
                g.addColorStop(0, 'rgba(214, 222, 212, 0.55)');
                g.addColorStop(1, 'rgba(214, 222, 212, 0)');
                ctx.fillStyle = g;
                ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
            }
        }
    }
    texture.refresh();
}
