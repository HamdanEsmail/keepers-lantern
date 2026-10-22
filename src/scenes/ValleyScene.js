import Phaser from 'phaser';
import { generateValley } from '../logic/valley.js';
import { drawValley } from '../game/valleyView.js';
import { createPlayer, updatePlayer } from '../game/player.js';
import { Interactions } from '../game/interactions.js';
import { readMove, inStream, speedFor } from '../logic/move.js';
import { addToPack, takeFromPack, capacity } from '../logic/pack.js';
import { plantTorch, torchRadius, liveTorches, canPlant, inTorchLight, shelterDistance } from '../logic/torches.js';
import { newSave } from '../logic/save.js';
import { afterRun } from '../logic/run.js';
import { newStats, newRunSummary, newMilestones, earn, milestoneLabel, deeper } from '../logic/stats.js';
import { phaseAt, darknessAt } from '../logic/clock.js';
import {
    tickSurvival,
    startMeters,
    maxFuel,
    eat,
    foodValue,
    lightRadius,
    isSpent,
    stepFlare,
    flaredRadius,
} from '../logic/survival.js';
import { Darkness } from '../game/darkness.js';
import { WolfPack } from '../game/wolves.js';
import { ITEMS } from '../data/items.js';
import { WORLD, CAMP, distance, ringAt } from '../logic/world.js';
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
    night: 'Night. Wolves keep to the edge of your light.',
};

const DUSK_HINT = 'Hold Space to flare the lantern. It burns fuel fast.';

// Lantern warnings, as a share of a full lantern. Below DIM_AT the wolves stop waiting.
const LOW_AT = 0.4;
const DIM_AT = 0.25;

const END_TOASTS = {
    caught: 'The wolves found you. You wake by the fire. Your pack is gone.',
    cold: 'The cold took the last of you. You wake by the fire. Your pack is gone.',
    hunger: 'Hunger took the last of you. You wake by the fire. Your pack is gone.',
};
// The colour the screen fades to between runs: the night colour.
const FADE = [10, 18, 14];
const STILL = { x: 0, y: 0 };

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
        this.ending = false;
        this.warned = { low: false, dim: false };
        this.flare = 0;
        // Planted torches (plain data, see torches.js) and the picture for each one.
        this.torches = [];
        this.torchViews = new Map();

        // What happens this run, for the stats and milestones.
        if (!this.save.stats) this.save = { ...this.save, stats: newStats() };
        this.summary = newRunSummary();
        this.milestoneClock = 0;
        this.rushed = false;

        // Start beside the fire, not in it: the fire is solid.
        this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
        this.player = createPlayer(this, CAMP.x + 50, CAMP.y + 40);
        this.physics.add.collider(this.player, this.view.solids);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,E,SHIFT,SPACE,T');

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
        this.wolves = new WolfPack(this);

        // After a lost run, wake up slowly instead of popping in.
        if (this.save.run > 0) camera.fadeIn(900, ...FADE);

        // The HUD is its own scene, drawn on top of this one.
        if (!this.scene.isActive('hud')) this.scene.launch('hud');

        if (import.meta.env.DEV) setupDev(this);
    }

    update(time, delta) {
        // Seconds since the last frame. Capped, so a long pause (like a hidden tab) can't jump the game ahead.
        const dt = Math.min(delta / 1000, 0.1);

        if (import.meta.env.DEV) readDevInput(this);

        if (this.ending) {
            // The run is over. Stand still while the screen fades out.
            updatePlayer(this.player, STILL, 1);
            this.updateLight();
            this.emitHud(null);
            if (import.meta.env.DEV) reportDev(this);
            return;
        }

        this.t += dt;
        const phase = phaseAt(this.t);
        if (phase !== this.phase) {
            this.phase = phase;
            if (PHASE_TOASTS[phase]) this.toast(PHASE_TOASTS[phase]);
            // For the first few runs, remind new players what they can do about the dark.
            if (phase === 'dusk' && this.save.stats.runs < 3) this.toast(DUSK_HINT);
        }
        // Shift to sprint, but only while you're actually moving.
        const dir = this.dev?.dir ?? readMove(this.keys);
        const moving = dir.x !== 0 || dir.y !== 0;
        const sprinting = moving && (this.dev?.shift ?? this.keys.SHIFT.isDown);
        updatePlayer(this.player, dir, speedFor({ inStream: this.inStream(), sprinting }));

        // T plants a torch from your pack.
        const plantPressed = this.dev?.tPressed || Phaser.Input.Keyboard.JustDown(this.keys.T);
        if (plantPressed) this.plantTorchHere();
        this.updateTorches();
        const sheltered = inTorchLight(this.torches, this.player.x, this.player.y, this.t);

        // Space flares the lantern, but only while it's lit (dusk and night, away from fire and torches).
        const lit = (phase === 'dusk' || phase === 'night') && !this.nearFire() && !sheltered;
        const flaring = lit && this.meters.fuel > 0 && (this.dev?.space ?? this.keys.SPACE.isDown);
        this.flare = stepFlare(this.flare, dt, flaring);

        const upgrades = this.save.upgrades;
        this.meters = tickSurvival(this.meters, dt, {
            phase,
            nearFire: this.nearFire(),
            upgrades,
            sprinting,
            flare: this.flare,
            sheltered,
        });

        const eDown = this.dev?.eDown ?? this.keys.E.isDown;
        const prompt = this.interactions.update(dt, eDown, this.player.x, this.player.y);

        this.updateLight();
        this.updateNight(dt, phase);
        if (!this.ending && isSpent(this.meters)) this.endRun('spent');

        this.summary.deepest = deeper(this.summary.deepest, ringAt(this.player.x, this.player.y));
        this.updateMilestones(dt);

        this.emitHud(this.ending ? null : prompt);
        if (import.meta.env.DEV) reportDev(this);
    }

    emitHud(prompt) {
        const upgrades = this.save.upgrades;
        this.events.emit('hud', {
            day: this.save.run + 1,
            phase: this.phase,
            meters: this.meters,
            maxFuel: maxFuel(upgrades),
            pack: this.pack,
            cap: capacity(upgrades),
            prompt,
            lenses: this.save.lensDelivered.length,
        });
    }

    // Lantern warnings, and the wolves once night falls.
    updateNight(dt, phase) {
        const fuelShare = this.meters.fuel / maxFuel(this.save.upgrades);
        const dim = fuelShare < DIM_AT;
        const atCamp = this.nearFire();
        const { x, y } = this.player;
        const sheltered = inTorchLight(this.torches, x, y, this.t);

        // You always get told before the wolves stop waiting.
        if ((phase === 'dusk' || phase === 'night') && !atCamp && !sheltered) {
            if (!this.warned.low && fuelShare < LOW_AT) {
                this.warned.low = true;
                this.toast('Your lantern is burning low. Head back to camp.');
            }
            if (!this.warned.dim && dim) {
                this.warned.dim = true;
                this.toast('The lantern gutters. The wolves are coming in.');
            }
        }

        if (phase === 'night' && !this.wolves.active) {
            // More of them, the further out you are when night falls.
            const ring = ringAt(x, y);
            this.wolves.spawn(ring === 'deep' || ring === 'outside' ? 3 : 2, this.player);
            if (this.pack.includes('torch')) this.toast('Press T to plant a torch.');
        }
        if (phase === 'night') {
            this.summary.sawNight = true;
            if (!atCamp) this.summary.nightTime += dt;
        }
        if (!this.wolves.active) return;

        // A flare holds them off even when the lantern is low: they back away from the bigger light.
        // So does a torch you're standing by.
        const caught = this.wolves.update(dt, this.player, {
            lightRadius: this.lightR,
            dim: dim && this.flare < 0.5,
            playerAtCamp: atCamp,
            shelter: shelterDistance(this.torches, x, y, this.t),
        });
        if (caught) {
            this.endRun('caught');
            return;
        }

        // A close call: the wolves were rushing you, and you made it to the fire or a torch.
        const safe = atCamp || sheltered;
        if (dim && !safe && this.wolves.closest() < this.lightR) this.rushed = true;
        if (safe && this.rushed) {
            this.rushed = false;
            this.summary.closeCalls += 1;
            this.toast('You made it. The wolves fall back.');
        }
    }

    // Twice a second, see if you've earned anything new.
    updateMilestones(dt) {
        this.milestoneClock += dt;
        if (this.milestoneClock < 0.5 || this.ending) return;
        this.milestoneClock = 0;
        const ids = newMilestones(this.save.stats, this.summary);
        if (!ids.length) return;
        this.save = { ...this.save, stats: earn(this.save.stats, ids) };
        for (const id of ids) this.toast(`Milestone · ${milestoneLabel(id)}`);
    }

    // Losing: the pack is gone, and you wake by the fire in a new valley.
    endRun(reason) {
        if (this.ending) return;
        this.ending = true;
        let message = END_TOASTS.caught;
        if (reason === 'spent') message = this.meters.food <= 0 ? END_TOASTS.hunger : END_TOASTS.cold;

        this.save = afterRun(this.save, reason, this.pack, this.summary);
        this.pack = [];
        this.toast(message);

        const camera = this.cameras.main;
        if (reason === 'caught') camera.shake(300, 0.008);
        camera.fadeOut(1800, ...FADE);
        camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.restart({ save: this.save });
        });
    }

    inStream() {
        return inStream(this.valley.stream, this.player.x, this.player.y);
    }

    // The lantern shrinks as its fuel runs down. Both flames flicker a little.
    updateLight() {
        const t = this.t;
        this.lightR = flaredRadius(lightRadius(this.meters.fuel, this.save.upgrades), this.flare);
        const lanternFlicker = 1 + 0.02 * Math.sin(t * 9) + 0.012 * Math.sin(t * 23);
        const fireFlicker = 1 + 0.03 * Math.sin(t * 7 + 1) + 0.015 * Math.sin(t * 17);
        // Each torch flickers on its own beat.
        const torchLights = this.torches.map((torch) => ({
            x: torch.x,
            y: torch.y - 30,
            r: torchRadius(torch, t) * (1 + 0.035 * Math.sin(t * 8 + torch.lit)),
            warm: 0.9,
        }));
        this.darkness.update(darknessAt(t), [
            // The lantern is carried at chest height, not at the feet.
            { x: this.player.x, y: this.player.y - 20, r: this.lightR * lanternFlicker, warm: 1 + this.flare },
            { x: CAMP.x, y: CAMP.y - 10, r: CAMP_LIGHT * fireFlicker, warm: 1 },
            ...torchLights,
        ]);
    }

    // Plant a torch from the pack, just in front of you.
    plantTorchHere() {
        if (!this.pack.includes('torch')) {
            this.toast('You have no torches.');
            return;
        }
        const side = this.player.flipX ? -1 : 1;
        const x = this.player.x + 22 * side;
        const y = this.player.y + 4;
        if (!canPlant(this.torches, x, y)) {
            this.toast(this.nearFire() ? 'The fire already lights the camp.' : "There's a torch here already.");
            return;
        }
        this.pack = takeFromPack(this.pack, 'torch').pack;
        this.torches = plantTorch(this.torches, x, y, this.t);
        const torch = this.torches[this.torches.length - 1];

        const sprite = this.add.image(x, y, 'torch-lit').setOrigin(0.5, 0.9).setDepth(y);
        // The flame wavers a little.
        this.tweens.add({
            targets: sprite,
            scaleY: { from: 0.97, to: 1.04 },
            duration: 260 + Math.random() * 120,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
        this.torchViews.set(torch, sprite);
        if (this.phase === 'dusk' || this.phase === 'night') this.summary.torches += 1;
        if (this.save.stats.runs < 3) this.toast('Stand in its light: the wolves keep back and your lantern rests.');
    }

    // Burnt-out torches fade away.
    updateTorches() {
        const live = liveTorches(this.torches, this.t);
        if (live.length === this.torches.length) return;
        for (const torch of this.torches) {
            if (live.includes(torch)) continue;
            const sprite = this.torchViews.get(torch);
            this.torchViews.delete(torch);
            if (!sprite) continue;
            this.tweens.killTweensOf(sprite);
            this.tweens.add({ targets: sprite, alpha: 0, duration: 800, onComplete: () => sprite.destroy() });
        }
        this.torches = live;
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
            this.summary.eaten += 1;
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
        this.summary.gathered += 1;
        if (this.pack.length >= capacity(this.save.upgrades)) this.summary.packFilled = true;
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
