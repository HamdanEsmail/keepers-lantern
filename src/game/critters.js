import { spawnCritters, stepCritter } from '../logic/critters.js';
import { makeRng } from '../logic/rng.js';

// The deer, rabbits and birds you see. How they behave is in logic/critters.js;
// this file only draws them.

// A flying bird goes over the treetops.
const IN_THE_AIR = 400;

export class Critters {
    constructor(scene, seed) {
        this.scene = scene;
        this.list = spawnCritters(seed);
        // Their wandering uses its own random numbers, so it's the same every time you play this valley.
        this.rng = makeRng(seed * 13 + 5);
        this.time = 0;
        this.sprites = new Map();
        for (const c of this.list) {
            this.sprites.set(c.id, scene.add.image(c.x, c.y, c.kind).setOrigin(0.5, 0.85).setDepth(c.y));
        }
    }

    // ctx: { px, py, sprinting, phase }
    update(dt, ctx) {
        this.time += dt;
        this.list = this.list.map((c) => stepCritter(c, dt, { ...ctx, rng: this.rng }));
        for (const c of this.list) {
            const s = this.sprites.get(c.id);
            if (!s) continue;
            if (c.state === 'gone') {
                s.destroy();
                this.sprites.delete(c.id);
                continue;
            }
            this.draw(c, s);
        }
    }

    draw(c, s) {
        const t = this.time;
        let bob = 0;
        let depth = c.y;
        // Each animal gets its own beat from where it stands, so they don't all move together.
        const beat = c.home.x * 0.01;
        if (c.kind === 'rabbit' && c.moving) bob = -Math.abs(Math.sin(t * 14 + beat)) * 6;
        if (c.kind === 'deer' && c.moving) bob = -Math.abs(Math.sin(t * 9 + beat)) * 1.5;
        if (c.kind === 'bird') {
            if (c.state === 'flying') {
                if (s.texture.key !== 'bird-fly') s.setTexture('bird-fly');
                // Flap: squash the picture up and down quickly.
                s.scaleY = 0.7 + 0.3 * Math.abs(Math.sin(t * 22 + beat));
                bob = -c.lift;
                depth = c.y + IN_THE_AIR;
                s.setAngle(0);
            } else {
                // Now and then, a peck at the ground.
                const pecking = Math.sin(t * 2.3 + beat * 7) > 0.85;
                s.setAngle(pecking ? 20 * c.facing : 0);
            }
        }
        s.setPosition(c.x, c.y + bob).setDepth(depth).setFlipX(c.facing < 0).setAlpha(c.fade);
    }

    // Where they are and what they're doing, for testing.
    report() {
        return this.list.map((c) => ({ id: c.id, state: c.state, x: Math.round(c.x), y: Math.round(c.y) }));
    }
}
