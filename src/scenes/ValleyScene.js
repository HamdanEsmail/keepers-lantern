import Phaser from 'phaser';
import { generateValley } from '../logic/valley.js';
import { drawValley } from '../game/valleyView.js';
import { WORLD, CAMP } from '../logic/world.js';

export class ValleyScene extends Phaser.Scene {
    constructor() {
        super('valley');
    }

    create() {
        this.valley = generateValley(1);
        this.view = drawValley(this, this.valley);

        const camera = this.cameras.main;
        camera.setBounds(0, 0, WORLD.width, WORLD.height);
        camera.centerOn(CAMP.x, CAMP.y);
    }
}