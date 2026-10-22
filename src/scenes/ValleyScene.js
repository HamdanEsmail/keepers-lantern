import Phaser from 'phaser';
import { generateValley } from '../logic/valley.js';
import { drawValley } from '../game/valleyView.js';
import { createPlayer, updatePlayer } from '../game/player.js';
import { Interactions } from '../game/interactions.js';
import { readMove, inStream } from '../logic/move.js';
import { addToPack, capacity } from '../logic/pack.js';
import { newSave } from '../logic/save.js';
import { ITEMS } from '../data/items.js';
import { WORLD, CAMP } from '../logic/world.js';
import { setupDev, readDevInput, reportDev } from '../game/dev.js';

// How close you must be to gather something, and how long to hold E.
const GATHER_REACH = 56;
const GATHER_TIME = 1.2;

export class ValleyScene extends Phaser.Scene {
    constructor() {
        super('valley');
    }

    // Runs before create(). A restart passes the save along, so progress is kept.
    init(data) {
        this.save = data?.save ?? newSave(1);
    }

    create() {
        // Every run gets its own valley: the forest has moved overnight.
        this.valley = generateValley(this.save.baseSeed + this.save.run, {
            lensDelivered: this.save.lensDelivered,
            pagesFound: this.save.pagesFound,
        });
        this.view = drawValley(this, this.valley);
        this.pack = [];

        // Start beside the fire, not in it: the fire is solid.
        this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
        this.player = createPlayer(this, CAMP.x + 50, CAMP.y + 40);
        this.physics.add.collider(this.player, this.view.solids);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,E');

        this.interactions = new Interactions(this);
        for (const node of this.valley.nodes) this.addNode(node);

        const camera = this.cameras.main;
        camera.setBounds(0, 0, WORLD.width, WORLD.height);
        // Follow the player, catching up 10% of the way each frame, so it feels smooth.
        camera.startFollow(this.player, true, 0.1, 0.1);

        // Darker corners, fixed to the screen instead of the world.
        this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(9500);

        // The HUD is its own scene, drawn on top of this one.
        if (!this.scene.isActive('hud')) this.scene.launch('hud');

        if (import.meta.env.DEV) setupDev(this);
    }

    update(time, delta) {
        // Seconds since the last frame. Capped, so a long pause (like a hidden tab) can't jump the game ahead.
        const dt = Math.min(delta / 1000, 0.1);

        if (import.meta.env.DEV) readDevInput(this);
        const dir = this.dev?.dir ?? readMove(this.keys);
        const speedMul = this.inStream() ? 0.6 : 1;
        updatePlayer(this.player, dir, speedMul);

        const eDown = this.dev?.eDown ?? this.keys.E.isDown;
        const prompt = this.interactions.update(dt, eDown, this.player.x, this.player.y);

        this.events.emit('hud', {
            day: this.save.run + 1,
            phase: 'day',
            meters: null,
            maxFuel: 100,
            pack: this.pack,
            cap: capacity(this.save.upgrades),
            prompt,
            lenses: this.save.lensDelivered.length,
        });

        if (import.meta.env.DEV) reportDev(this);
    }

    inStream() {
        return inStream(this.valley.stream, this.player.x, this.player.y);
    }

    toast(message) {
        this.events.emit('toast', message);
    }

    // Something growing in the valley that you can gather.
    addNode(node) {
        const item = ITEMS[node.kind];
        this.interactions.add({
            id: node.id,
            x: node.x,
            y: node.y,
            radius: GATHER_REACH,
            hold: GATHER_TIME,
            prompt: `${item.gather === 'eat' ? 'Eat' : 'Gather'} ${item.label}`,
            use: () => this.gather(node),
        });
    }

    gather(node) {
        const item = ITEMS[node.kind];
        if (item.gather === 'eat') {
            // Lesson 6 (food) replaces this.
            this.toast('Not hungry yet.');
            return;
        }
        const result = addToPack(this.pack, node.kind, capacity(this.save.upgrades));
        if (!result.added) {
            // The node stays where it is, so nothing is lost.
            this.toast('Your pack is full.');
            return;
        }
        this.pack = result.pack;
        this.removeNode(node, `+1 ${item.label}`);
    }

    // Take a node out of the valley with a little pop and a floating label.
    removeNode(node, label) {
        this.interactions.remove(node.id);
        const sprite = this.view.nodeSprites.get(node.id);
        this.view.nodeSprites.delete(node.id);
        if (sprite) {
            this.tweens.add({
                targets: sprite,
                scale: 1.3,
                alpha: 0,
                duration: 250,
                onComplete: () => sprite.destroy(),
            });
        }
        if (label) this.floatText(node.x, node.y - 30, label);
    }

    floatText(x, y, message) {
        const text = this.add.text(x, y, message, {
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            color: '#f3e7c9',
            stroke: '#0a120e',
            strokeThickness: 4,
            resolution: 2,
        }).setOrigin(0.5).setDepth(9200);
        this.tweens.add({
            targets: text,
            y: y - 30,
            alpha: 0,
            duration: 900,
            onComplete: () => text.destroy(),
        });
    }
}
