import Phaser from 'phaser';
import { generateValley } from '../logic/valley.js';
import { drawValley } from '../game/valleyView.js';
import { createPlayer, updatePlayer } from '../game/player.js';
import { readMove, inStream } from '../logic/move.js';
import { WORLD, CAMP } from '../logic/world.js';
import { setupDev, reportDev } from '../game/dev.js';

export class ValleyScene extends Phaser.Scene {
    constructor() {
        super('valley');
    }

    create() {
        // Seed 1 for now. Lesson 10 gives every night a new seed.
        this.valley = generateValley(1);
        this.view = drawValley(this, this.valley);

        // Start beside the fire, not in it: the fire is solid.
        this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
        this.player = createPlayer(this, CAMP.x + 50, CAMP.y + 40);
        this.physics.add.collider(this.player, this.view.solids);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT');

        const camera = this.cameras.main;
        camera.setBounds(0, 0, WORLD.width, WORLD.height);
        // Follow the player, catching up 10% of the way each frame, so it feels smooth.
        camera.startFollow(this.player, true, 0.1, 0.1);

        // Darker corners, fixed to the screen instead of the world.
        this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(9500);

        if (import.meta.env.DEV) setupDev(this);
    }

    update() {
        const dir = this.dev?.dir ?? readMove(this.keys);
        const speedMul = this.inStream() ? 0.6 : 1;
        updatePlayer(this.player, dir, speedMul);

        if (import.meta.env.DEV) reportDev(this);
    }

    inStream() {
        return inStream(this.valley.stream, this.player.x, this.player.y);
    }
}
