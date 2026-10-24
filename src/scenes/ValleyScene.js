import Phaser from 'phaser';
import { generateValley } from '../logic/valley.js';
import { drawValley } from '../game/valleyView.js';
import { createPlayer, updatePlayer } from '../game/player.js';
import { Interactions } from '../game/interactions.js';
import { readMove, inStream, speedFor } from '../logic/move.js';
import { addToPack, takeFromPack, capacity } from '../logic/pack.js';
import { plantTorch, torchRadius, liveTorches, canPlant, inTorchLight, shelterDistance } from '../logic/torches.js';
import { gatherTime, gatherCount, gatherMode, cookAll, eatFromPack } from '../logic/tools.js';
import {
    LANDMARKS,
    LANDMARK_REACH,
    placeLandmark,
    clearAround,
    searchLandmark,
    isEmpty,
    sheltersYou,
} from '../logic/landmarks.js';
import { newSave, writeSave, browserStorage } from '../logic/save.js';
import { afterRun, wakeReport } from '../logic/run.js';
import { newStats, newRunSummary, newMilestones, earn, milestoneLabel, deeper } from '../logic/stats.js';
import { phaseAt, darknessAt } from '../logic/clock.js';
import { weatherFor, weatherLabel } from '../logic/weather.js';
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
import { Sky } from '../game/sky.js';
import { Critters } from '../game/critters.js';
import { LandmarkView } from '../game/landmarks.js';
import { ITEMS } from '../data/items.js';
import { WORLD, CAMP, TENT, BEACON, distance, ringAt } from '../logic/world.js';
import { isPanelOpen } from '../ui/overlay.js';
import { openCamp, showMorning } from '../ui/camp.js';
import { showPage, openJournal } from '../ui/journal.js';
import {
    LENS_COUNT,
    missingLenses,
    setLenses,
    beaconMessage,
    compassTarget,
    findPage,
    finishGame,
} from '../logic/lens.js';
import { setupDev, readDevInput, reportDev, devWeather, devSeed } from '../game/dev.js';

// How close you must be to gather something, and how long to hold E.
// (The hold time is in logic/tools.js, since the axe changes it.)
const GATHER_REACH = 56;

// Above this much food, eating would waste it, so the berries stay.
const FULL_ENOUGH = 95;

// The camp fire always lights this far, however dark it gets.
const CAMP_LIGHT = 260;

// How close you must be to use the beacon, and how far its light reaches once it's lit.
const BEACON_REACH = 90;
const BEACON_LIGHT = 560;

// What the valley tells you when the light changes.
const PHASE_TOASTS = {
    dusk: 'The light is going. Your lantern is lit.',
    night: 'Night. Wolves keep to the edge of your light.',
};

const DUSK_HINT = 'Hold Space to flare the lantern. It burns fuel fast.';

// Lantern warnings, as a share of a full lantern. Below DIM_AT the wolves stop waiting.
const LOW_AT = 0.4;
const DIM_AT = 0.25;

// The colour the screen fades to between runs: the night colour.
const FADE = [10, 18, 14];
const STILL = { x: 0, y: 0 };

export class ValleyScene extends Phaser.Scene {
    constructor() {
        super('valley');
    }

    // Runs before create(). The title screen, or a restart, passes the save along.
    init(data) {
        this.save = data?.save ?? newSave(import.meta.env.DEV ? devSeed() : 1);
    }

    create() {
        // Every run gets its own valley: the forest has moved overnight.
        const valley = generateValley(this.save.baseSeed + this.save.run, {
            lensDelivered: this.save.lensDelivered,
            pagesFound: this.save.pagesFound,
        });
        // One landmark in each valley, with room cleared around it (see landmarks.js).
        this.landmark = placeLandmark(valley);
        this.valley = clearAround(valley, this.landmark);
        this.view = drawValley(this, this.valley);
        this.landmarkView = this.landmark ? new LandmarkView(this, this.view.solids, this.landmark) : null;
        this.landmarkSeen = false;
        this.searched = false;
        this.toldDry = false;
        this.pack = [];

        // The sky and the night are different every run too (see weather.js).
        this.weather = (import.meta.env.DEV && devWeather()) || weatherFor(this.save.baseSeed, this.save.run);
        // Told once you've woken up, not while the screen is still fading in.
        this.dawnToast = this.weather.dawnToast;
        // Deer, rabbits and birds, until the light goes.
        this.critters = new Critters(this, this.save.baseSeed + this.save.run);

        // Every run starts at dawn, fed and warm, with a full lantern.
        // The day is kept here, because the save moves on to the next one as soon as a run ends.
        this.day = this.save.run + 1;
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
        this.summary = { ...newRunSummary(), moon: this.weather.moon };
        this.milestoneClock = 0;
        this.rushed = false;

        // Start beside the fire, not in it: the fire is solid.
        this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
        this.player = createPlayer(this, CAMP.x + 50, CAMP.y + 40);
        this.physics.add.collider(this.player, this.view.solids);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,E,SHIFT,SPACE,T,F,J');

        this.interactions = new Interactions(this);
        for (const node of this.valley.nodes) this.addNode(node);
        this.addFire();
        this.addTent();
        if (this.landmark) this.addLandmark();
        // The lens pieces still out here, the journal pages, and the beacon.
        this.lensesLeft = [...this.valley.lenses];
        for (const lens of this.valley.lenses) this.addLens(lens);
        for (const page of this.valley.pages) this.addPage(page);
        this.addBeacon();

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
        this.sky = new Sky(this, this.weather);

        // The compass arrow, above the darkness so it shows at night. Hidden until you have the compass.
        this.arrow = this.add.image(0, 0, 'arrow').setDepth(10003).setVisible(false);
        // The forest is never quite still.
        this.swayTrees();
        // How brightly the beacon burns: 0 while it's dark. Once you've relit it, it stays lit.
        this.beaconLight = 0;
        if (this.save.finished) this.lightBeacon(0);

        // Wake up slowly instead of popping in.
        camera.fadeIn(900, ...FADE);

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
            this.sky.update(dt);
            this.updateLight();
            this.emitHud(null);
            if (import.meta.env.DEV) reportDev(this);
            return;
        }

        // While a panel is open, the valley waits: no walking, no clock, no wolves.
        if (isPanelOpen()) {
            updatePlayer(this.player, STILL, 1);
            this.emitHud(null);
            if (import.meta.env.DEV) reportDev(this);
            return;
        }

        this.t += dt;
        if (this.dawnToast && this.t >= 1) {
            this.toast(this.dawnToast);
            this.dawnToast = null;
        }
        const phase = phaseAt(this.t);
        if (phase !== this.phase) {
            this.phase = phase;
            if (PHASE_TOASTS[phase]) this.toast(PHASE_TOASTS[phase]);
            // A strange night is told at dusk, so you have time to get ready for it.
            if (phase === 'dusk' && this.weather.duskToast) this.toast(this.weather.duskToast);
            // For the first few runs, remind new players what they can do about the dark.
            if (phase === 'dusk' && this.save.stats.runs < 3) this.toast(DUSK_HINT);
        }
        // Shift to sprint, but only while you're actually moving.
        const dir = this.dev?.dir ?? readMove(this.keys);
        const moving = dir.x !== 0 || dir.y !== 0;
        const sprinting = moving && (this.dev?.shift ?? this.keys.SHIFT.isDown);
        updatePlayer(this.player, dir, speedFor({ inStream: this.inStream(), sprinting }));
        this.critters.update(dt, { px: this.player.x, py: this.player.y, sprinting, phase });

        // T plants a torch from your pack.
        const plantPressed = this.dev?.tPressed || Phaser.Input.Keyboard.JustDown(this.keys.T);
        if (plantPressed) this.plantTorchHere();
        // F eats from the pack.
        if (this.dev?.fPressed || Phaser.Input.Keyboard.JustDown(this.keys.F)) this.eatSnack();
        // J opens the journal.
        if (Phaser.Input.Keyboard.JustDown(this.keys.J)) this.openJournalHere();
        this.updateTorches();
        const sheltered = inTorchLight(this.torches, this.player.x, this.player.y, this.t);
        // The hollow tree and the boulder keep the rain off.
        const dry = sheltersYou(this.landmark, this.player.x, this.player.y);
        this.updateLandmark(dry);

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
            cold: dry ? 1 : this.weather.cold,
        });

        const eDown = this.dev?.eDown ?? this.keys.E.isDown;
        const prompt = this.interactions.update(dt, eDown, this.player.x, this.player.y);
        // Lighting the beacon ends the game right here (see relight), so nothing else moves this frame.
        if (this.ending) return;

        this.sky.update(dt);
        this.updateLight();
        this.updateCompass();
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
            day: this.day,
            phase: this.phase,
            meters: this.meters,
            maxFuel: maxFuel(upgrades),
            pack: this.pack,
            cap: capacity(upgrades),
            prompt,
            lenses: LENS_COUNT - missingLenses(this.save.lensDelivered, this.pack),
            weather: weatherLabel(this.weather, this.phase),
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
            // More of them, the further out you are when night falls, and the moon changes it too.
            const ring = ringAt(x, y);
            const count = (ring === 'deep' || ring === 'outside' ? 3 : 2) + this.weather.wolves;
            this.wolves.spawn(Math.max(1, count), this.player);
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
            gap: this.weather.wolfGap,
            speed: this.weather.wolfSpeed,
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
        this.persist();
        for (const id of ids) this.toast(`Milestone · ${milestoneLabel(id)}`);
    }

    // The end of a run: caught, worn out, or asleep by the fire.
    // The screen fades, the morning panel says how it went, and you wake in a new valley.
    endRun(reason) {
        if (this.ending) return;
        this.ending = true;
        // Being spent is either hunger or cold, whichever ran out.
        let end = reason;
        if (reason === 'spent') end = this.meters.food <= 0 ? 'hunger' : 'cold';
        const report = wakeReport(end, this.summary, this.day);

        this.save = afterRun(this.save, reason, this.pack, this.summary);
        this.pack = [];
        this.persist();

        const camera = this.cameras.main;
        if (reason === 'caught') camera.shake(300, 0.008);
        // Falling asleep is slower than being caught.
        camera.fadeOut(reason === 'slept' ? 2600 : 1800, ...FADE);
        camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, async () => {
            await showMorning(report);
            this.scene.restart({ save: this.save });
        });
    }

    // Keep the game in the browser, so it's still there after you close the tab.
    persist() {
        writeSave(browserStorage(), this.save);
    }

    inStream() {
        return inStream(this.valley.stream, this.player.x, this.player.y);
    }

    // The lantern shrinks as its fuel runs down, and fog swallows some of it. The flames flicker a little.
    updateLight() {
        const t = this.t;
        const lantern = lightRadius(this.meters.fuel, this.save.upgrades) * this.weather.lantern;
        this.lightR = flaredRadius(lantern, this.flare);
        const lanternFlicker = 1 + 0.02 * Math.sin(t * 9) + 0.012 * Math.sin(t * 23);
        const fireFlicker = 1 + 0.03 * Math.sin(t * 7 + 1) + 0.015 * Math.sin(t * 17);
        // Each torch flickers on its own beat.
        const torchLights = this.torches.map((torch) => ({
            x: torch.x,
            y: torch.y - 30,
            r: torchRadius(torch, t) * (1 + 0.035 * Math.sin(t * 8 + torch.lit)),
            warm: 0.9,
        }));
        const { darkness, nightColor } = this.weather;
        this.darkness.update(darknessAt(t, darkness), [
            // The lantern is carried at chest height, not at the feet.
            { x: this.player.x, y: this.player.y - 20, r: this.lightR * lanternFlicker, warm: 1 + this.flare },
            { x: CAMP.x, y: CAMP.y - 10, r: CAMP_LIGHT * fireFlicker, warm: 1 },
            ...torchLights,
            // The beacon, once it's lit. beaconLight goes from 0 (dark) to 1.
            { x: BEACON.x, y: BEACON.y - 100, r: BEACON_LIGHT * this.beaconLight, warm: 1 },
        ], { max: darkness, color: nightColor });
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
    // The hold time and the words depend on your tools, which can change during a run.
    addNode(node) {
        const item = ITEMS[node.kind];
        const upgrades = () => this.save.upgrades;
        this.interactions.add({
            id: node.id,
            x: node.x,
            y: node.y,
            radius: GATHER_REACH,
            hold: () => gatherTime(node.kind, upgrades()),
            prompt: () => {
                if (gatherMode(node.kind, upgrades()) === 'eat') return `Eat ${item.label}`;
                return `${node.kind === 'fish' ? 'Catch' : 'Gather'} ${item.label}`;
            },
            use: () => this.gather(node),
        });
    }

    gather(node) {
        const item = ITEMS[node.kind];
        const upgrades = this.save.upgrades;
        if (gatherMode(node.kind, upgrades) === 'eat') {
            if (this.meters.food >= FULL_ENOUGH) {
                // Leave it for later instead of wasting it.
                this.toast('Not hungry yet.');
                return;
            }
            this.meters = eat(this.meters, node.kind, upgrades);
            this.summary.eaten += 1;
            this.removeNode(node, `+${foodValue(node.kind, upgrades)} Food`);
            return;
        }

        // With the axe, wood comes two at a time (or one, if that's all the room you have).
        const cap = capacity(upgrades);
        let added = 0;
        for (let i = 0; i < gatherCount(node.kind, upgrades); i++) {
            const result = addToPack(this.pack, node.kind, cap);
            if (!result.added) break;
            this.pack = result.pack;
            added += 1;
        }
        if (!added) {
            // The node stays where it is, so nothing is lost.
            this.toast('Your pack is full.');
            return;
        }
        this.summary.gathered += added;
        if (this.pack.length >= cap) this.summary.packFilled = true;
        this.removeNode(node, `+${added} ${item.label}`);
    }

    // The camp fire: E cooks every raw fish in your pack.
    addFire() {
        const fishCount = () => this.pack.filter((item) => item === 'fish').length;
        this.interactions.add({
            id: 'fire',
            x: CAMP.x,
            y: CAMP.y,
            radius: 80,
            hold: 1,
            prompt: () => `Cook ${fishCount()} Fish`,
            isActive: () => fishCount() > 0,
            use: () => {
                const result = cookAll(this.pack);
                this.pack = result.pack;
                this.summary.cooked += result.cooked;
                this.floatText(CAMP.x, CAMP.y - 40, `${result.cooked} ${result.cooked === 1 ? 'meal' : 'meals'}`);
                if (this.save.stats.runs < 3) this.toast('Press F to eat from your pack.');
            },
        });
    }

    // The tent: E opens the camp.
    addTent() {
        this.interactions.add({
            id: 'tent',
            x: TENT.x,
            y: TENT.y,
            radius: TENT.reach,
            hold: 0,
            prompt: 'Camp',
            use: () => this.openCampHere(),
        });
    }

    // async lets this wait for the camp panel to close (await) without stopping the game.
    async openCampHere() {
        if (this.ending || isPanelOpen()) return;
        const result = await openCamp(this.save, this.pack);
        this.save = result.save;
        this.pack = result.pack;
        // Anything you unpacked or built is kept, even if you close the tab now.
        this.persist();
        // Keys pressed while the panel was open shouldn't count once it closes. T would plant a torch.
        this.input.keyboard.resetKeys();
        if (result.action === 'sleep') this.endRun('slept');
    }

    // A lens piece: hold E to pick it up. It's only safe once you sleep with it, or set it in the beacon.
    addLens(lens) {
        this.interactions.add({
            id: `lens-${lens.index}`,
            x: lens.x,
            y: lens.y,
            radius: GATHER_REACH,
            hold: 1,
            prompt: 'Take the lens piece',
            use: () => this.takeLens(lens),
        });
    }

    takeLens(lens) {
        const item = `lens-${lens.index}`;
        const result = addToPack(this.pack, item, capacity(this.save.upgrades));
        if (!result.added) {
            this.toast('Your pack is full.');
            return;
        }
        this.pack = result.pack;
        this.removeLens(lens);
        this.floatText(lens.x, lens.y - 30, 'A piece of the lens');
        // Each piece was found with a page of the journal. The first time, you read it.
        this.readPage(item);
    }

    // Take a lens piece out of the valley: no more E on it, the compass forgets it, and the picture goes.
    removeLens(lens) {
        this.interactions.remove(`lens-${lens.index}`);
        this.lensesLeft = this.lensesLeft.filter((l) => l !== lens);
        this.pop(this.view.lensSprites.get(lens.index));
        this.view.lensSprites.delete(lens.index);
    }

    // A journal page lying in the valley: E picks it up and reads it.
    addPage(page) {
        this.interactions.add({
            id: page.id,
            x: page.x,
            y: page.y,
            radius: GATHER_REACH,
            hold: 0,
            prompt: 'Pick up the page',
            use: () => {
                this.interactions.remove(page.id);
                this.pop(this.view.pageSprites.get(page.id));
                this.view.pageSprites.delete(page.id);
                this.readPage(page.id);
            },
        });
    }

    // A page you've never read before goes in the journal, is saved, and opens.
    async readPage(id) {
        const found = findPage(this.save, id);
        if (!found.isNew) return;
        this.save = found.save;
        this.persist();
        await showPage(id);
        this.input.keyboard.resetKeys();
        if (this.save.pagesFound.length === 1) this.toast('Press J to read the journal again.');
    }

    // J: the journal. The valley waits while it's open, the same as for the camp.
    async openJournalHere() {
        if (this.ending || isPanelOpen()) return;
        await openJournal(this.save.pagesFound);
        this.input.keyboard.resetKeys();
    }

    // The beacon: E sets the lens pieces you carry. With all three, hold E to light it.
    addBeacon() {
        const ready = () => missingLenses(this.save.lensDelivered, this.pack) === 0;
        this.interactions.add({
            id: 'beacon',
            x: BEACON.x,
            y: BEACON.y,
            radius: BEACON_REACH,
            hold: () => (ready() ? 1.5 : 0),
            prompt: () => (ready() ? 'Light the beacon' : 'Look at the beacon'),
            // Once it's lit, there's nothing more to do here.
            isActive: () => !this.save.finished,
            use: () => this.useBeacon(),
        });
    }

    useBeacon() {
        const result = setLenses(this.save, this.pack);
        this.save = result.save;
        this.pack = result.pack;
        if (result.set) this.persist();
        if (result.missing > 0) {
            this.toast(beaconMessage(result.set, result.missing));
            return;
        }
        this.relight();
    }

    // All three pieces are in. The beacon burns again, the forest goes still, and the wolves lie down.
    relight() {
        this.ending = true;
        this.save = finishGame(this.save, this.pack, this.summary);
        this.pack = [];
        this.persist();
        // The HUD and the compass aren't needed any more.
        this.scene.sleep('hud');
        this.arrow.setVisible(false);

        this.cameras.main.flash(1200, 255, 244, 214);
        this.lightBeacon(1500);
        for (const tree of this.view.trees) {
            this.tweens.killTweensOf(tree);
            this.tweens.add({ targets: tree, angle: 0, duration: 2000, ease: 'Sine.easeOut' });
        }
        this.wolves.lieDown(this.player);

        // A few moments to watch it. Then the last page, and the end (see EndingScene).
        this.time.delayedCall(4500, () => this.scene.launch('ending', { save: this.save }));
    }

    // The lit beacon fades in over the dark one, with a glow, and its light spreads into the night.
    //   duration: how long that takes, in milliseconds (0 for straight away)
    lightBeacon(duration) {
        const lit = this.add.image(BEACON.x, BEACON.y, 'beacon-lit').setOrigin(0.5, 0.87).setDepth(BEACON.y + 1);
        const glow = this.add.image(BEACON.x, BEACON.y - 110, 'light')
            .setTint(0xffe2a0)
            .setBlendMode('ADD')
            .setScale(3)
            .setDepth(9000);
        lit.setAlpha(0);
        glow.setAlpha(0);
        this.tweens.add({ targets: lit, alpha: 1, duration });
        this.tweens.add({ targets: glow, alpha: 0.45, duration });
        this.tweens.add({ targets: this, beaconLight: 1, duration });
    }

    // The forest is never quite still: every tree sways a little, each at its own pace.
    swayTrees() {
        for (const tree of this.view.trees) {
            this.tweens.add({
                targets: tree,
                angle: { from: -1.5, to: 1.5 },
                // One way takes 1.5 to 2.5 seconds, so a whole sway takes 3 to 5.
                duration: Phaser.Math.Between(1500, 2500),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }
    }

    // With the compass, an arrow beside you points to the nearest lens piece, or to the beacon.
    updateCompass() {
        const show = this.save.upgrades.includes('compass');
        this.arrow.setVisible(show);
        if (!show) return;
        const { x, y } = this.player;
        const target = compassTarget(this.lensesLeft, x, y);
        const angle = Phaser.Math.Angle.Between(x, y, target.x, target.y);
        // 40 px out from your chest, turned to face the way to go.
        this.arrow.setPosition(x + Math.cos(angle) * 40, y - 20 + Math.sin(angle) * 40).setRotation(angle);
    }

    // A lens piece or a page leaves the valley with the same little pop as gathering.
    pop(sprite) {
        if (!sprite) return;
        this.tweens.add({ targets: sprite, scale: 1.3, alpha: 0, duration: 250, onComplete: () => sprite.destroy() });
    }

    // The landmark: hold E to search it for what's inside.
    addLandmark() {
        const info = LANDMARKS[this.landmark.kind];
        this.interactions.add({
            id: 'landmark',
            x: this.landmark.x,
            y: this.landmark.y,
            radius: LANDMARK_REACH,
            hold: 1.2,
            prompt: `Search the ${info.label}`,
            isActive: () => !isEmpty(this.landmark),
            use: () => this.searchHere(),
        });
    }

    searchHere() {
        const info = LANDMARKS[this.landmark.kind];
        const cap = capacity(this.save.upgrades);
        const space = cap - this.pack.length;
        const result = searchLandmark(this.landmark, space, this.meters.food < FULL_ENOUGH);
        if (!result.take.length && !result.food) {
            this.toast(space <= 0 ? 'Your pack is full.' : 'Not hungry yet.');
            return;
        }
        this.landmark = result.landmark;
        this.pack = [...this.pack, ...result.take];
        if (result.food) {
            this.meters = { ...this.meters, food: Math.min(100, this.meters.food + result.food) };
            this.summary.eaten += 1;
        }
        this.summary.gathered += result.take.length;
        if (this.pack.length >= cap) this.summary.packFilled = true;
        if (!this.searched) {
            this.searched = true;
            this.summary.landmarks += 1;
            this.toast(info.found);
        }
        this.floatText(this.landmark.x, this.landmark.y - 70, describeFind(result));
        if (isEmpty(this.landmark)) this.landmarkView.emptied();
        else this.toast("There's more here, if you make room.");
    }

    // The first time you come near the landmark, and the first time it keeps the rain off you.
    updateLandmark(dry) {
        if (!this.landmark) return;
        const { x, y } = this.player;
        if (!this.landmarkSeen && distance(x, y, this.landmark.x, this.landmark.y) < 260) {
            this.landmarkSeen = true;
            this.toast(LANDMARKS[this.landmark.kind].seen);
        }
        if (dry && !this.toldDry && this.weather.cold > 1) {
            this.toldDry = true;
            this.toast('Out of the rain for a while.');
        }
    }

    // F eats the best food in your pack.
    eatSnack() {
        const upgrades = this.save.upgrades;
        if (!this.pack.some((item) => item === 'meal' || item === 'fish')) {
            this.toast('Nothing to eat in your pack.');
            return;
        }
        if (this.meters.food >= FULL_ENOUGH) {
            this.toast('Not hungry yet.');
            return;
        }
        const result = eatFromPack(this.meters, this.pack, upgrades);
        this.meters = result.meters;
        this.pack = result.pack;
        this.summary.eaten += 1;
        this.floatText(this.player.x, this.player.y - 50, `+${result.value} Food`);
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

// "+1 Torch · +2 Amber · +30 Food"
function describeFind({ take, food }) {
    const counts = new Map();
    for (const item of take) counts.set(item, (counts.get(item) ?? 0) + 1);
    const parts = [...counts].map(([item, n]) => `+${n} ${ITEMS[item].label}`);
    if (food) parts.push(`+${food} Food`);
    return parts.join(' · ');
}
