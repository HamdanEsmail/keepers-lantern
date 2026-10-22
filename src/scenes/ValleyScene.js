import Phaser from 'phaser';
import { generateValley } from '../logic/valley.js';
import { drawValley } from '../game/valleyView.js';
import { createPlayer, updatePlayer } from '../game/player.js';
import { Interactions } from '../game/interactions.js';
import { readMove, inStream } from '../logic/move.js';
import { addToPack, capacity } from '../logic/pack.js';
import { newSave } from '../logic/save.js';
import { phaseAt, darknessAt } from '../logic/clock.js';
import { tickSurvival, startMeters, maxFuel, eat, foodValue, lightRadius } from '../logic/survival.js';
import { Darkness } from '../game/darkness.js';
import { ITEMS } from '../data/items.js';
import { WORLD, CAMP, distance } from '../logic/world.js';
import { setupDev, readDevInput, reportDev } from '../game/dev.js';

// How close you must be to gather something, and how long to hold E.
const GATHER_REACH = 56;
const GATHER_TIME = 1.2;

// Above this much food, eating would waste it, so the berries stay.
const FULL_ENOUGH = 95;

// The camp fire always lights this far, however dark it gets.
const CAMP_LIGHT = 260;

// What the valley tells you when the light changes.
const PHASE_TOASTS = {
    dusk: 'The light is going. Your lantern is lit.',
    night: 'Night. Stay inside the light.',
};

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

        // Every run starts at dawn, fed and warm, with a full lantern.
        this.t = 0;
        this.phase = phaseAt(0);
        this.meters = startMeters(this.save.upgrades);

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

        // The night goes on top of everything in the valley.
        this.darkness = new Darkness(this);
        this.lightR = lightRadius(this.meters.fuel, this.save.upgrades);

        // The HUD is its own scene, drawn on top of this one.
        if (!this.scene.isActive('hud')) this.scene.launch('hud');

        if (import.meta.env.DEV) setupDev(this);
    }

    update(time, delta) {
        // Seconds since the last frame. Capped, so a long pause (like a hidden tab) can't jump the game ahead.
        const dt = Math.min(delta / 1000, 0.1);

        if (import.meta.env.DEV) readDevInput(this);

        this.t += dt;
        const phase = phaseAt(this.t);
        if (phase !== this.phase) {
            this.phase = phase;
            if (PHASE_TOASTS[phase]) this.toast(PHASE_TOASTS[phase]);
        }
        const upgrades = this.save.upgrades;
        this.meters = tickSurvival(this.meters, dt, { phase, nearFire: this.nearFire(), upgrades });

        const dir = this.dev?.dir ?? readMove(this.keys);
        const speedMul = this.inStream() ? 0.6 : 1;
        updatePlayer(this.player, dir, speedMul);

        const eDown = this.dev?.eDown ?? this.keys.E.isDown;
        const prompt = this.interactions.update(dt, eDown, this.player.x, this.player.y);

        this.updateLight();

        this.events.emit('hud', {
            day: this.save.run + 1,
            phase,
            meters: this.meters,
            maxFuel: maxFuel(upgrades),
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

    // The lantern shrinks as its fuel runs down. Both flames flicker a little.
    updateLight() {
        const t = this.t;
        this.lightR = lightRadius(this.meters.fuel, this.save.upgrades);
        const lanternFlicker = 1 + 0.02 * Math.sin(t * 9) + 0.012 * Math.sin(t * 23);
        const fireFlicker = 1 + 0.03 * Math.sin(t * 7 + 1) + 0.015 * Math.sin(t * 17);
        this.darkness.update(darknessAt(t), [
            // The lantern is carried at chest height, not at the feet.
            { x: this.player.x, y: this.player.y - 20, r: this.lightR * lanternFlicker, warm: 1 },
            { x: CAMP.x, y: CAMP.y - 10, r: CAMP_LIGHT * fireFlicker, warm: 1 },
        ]);
    }

    // Close enough to the camp fire to warm up. The wolves won't come this close either.
    nearFire() {
        return distance(this.player.x, this.player.y, CAMP.x, CAMP.y) < CAMP.safeRadius;
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
            if (this.meters.food >= FULL_ENOUGH) {
                // Leave it for later instead of wasting it.
                this.toast('Not hungry yet.');
                return;
            }
            this.meters = eat(this.meters, node.kind);
            this.removeNode(node, `+${foodValue(node.kind)} Food`);
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
