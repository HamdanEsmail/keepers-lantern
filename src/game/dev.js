// Testing helpers for `npm run dev` only. The live site never includes them,
// because ValleyScene only calls these when import.meta.env.DEV is true.
//
// URL options (add them after the address, e.g. localhost:5173/?at=1000,1200):
//   ?at=x,y       start somewhere else
//   ?walk=dx,dy   keep walking in one direction without touching the keys
//   ?physics      show the invisible solid circles
//   ?pack=a,b     start with these items in your pack
//   ?time=0.7     start at this point in the day (0 dawn, 0.6 dusk, 0.75 night)
//   ?meters=f,w,l start with this much food, warmth and lantern fuel
//   ?seed=3       start a different save, so you get different valleys
//   ?weather=rain,wolf-moon  force the weather on every run (any of rain, fog, clear,
//                 full-moon, wolf-moon, normal; leave one out to keep it normal)
//   ?play         skip the title screen (so do all the options above)
//
// Keys:
//   N             jump to dusk, or from dusk to night
//   U             every upgrade, plus two torches in your pack
//
// From the browser console you can also steer the game while it runs:
//   document.documentElement.dataset.devWalk = '1,0'   walk right ('' to stop)
//   document.documentElement.dataset.devE = '1'        hold E ('' to let go)
//   document.documentElement.dataset.devShift = '1'    hold Shift (sprint)
//   document.documentElement.dataset.devSpace = '1'    hold Space (flare)
//   document.documentElement.dataset.devT = '1'        press T once (plant a torch)
//   document.documentElement.dataset.devF = '1'        press F once (eat from the pack)
//   document.documentElement.dataset.devGrant = '1'    same as the U key
//   document.documentElement.dataset.devTime = '0.75'  jump to that point in the day
//   window.dispatchEvent(new Event('dev-step'))        run one second of game time,
//                                                      even if the tab is hidden
// After every frame, document.documentElement.dataset.devState holds a summary of the game.

import { DAY_LENGTH, DUSK_AT, NIGHT_AT } from '../logic/clock.js';
import { capacity } from '../logic/pack.js';
import { makeWeather, SKIES, MOONS } from '../logic/weather.js';
import { UPGRADES } from '../logic/upgrades.js';
import { isPanelOpen } from '../ui/overlay.js';

const html = document.documentElement;
let current = null;
let clock = 0;

export function setupDev(scene) {
    const q = new URLSearchParams(location.search);
    scene.dev = { dir: null, eDown: null };
    if (q.has('walk') && !html.dataset.devWalk) html.dataset.devWalk = q.get('walk');

    // Only teleport on the first valley, not after every restart.
    if (q.has('at') && !current) {
        const [x, y] = q.get('at').split(',').map(Number);
        scene.player.setPosition(x, y);
        scene.cameras.main.centerOn(x, y);
    }
    // ?pack=wood,stone  start with these in your pack.
    if (q.has('pack') && !current) scene.pack = q.get('pack').split(',').filter(Boolean);
    if (q.has('time') && !current) scene.t = Number(q.get('time')) * DAY_LENGTH;
    // ?meters=50,30,20  start with this much food, warmth and fuel.
    if (q.has('meters') && !current) {
        const [food, warmth, fuel] = q.get('meters').split(',').map(Number);
        scene.meters = { food, warmth, fuel };
    }
    if (q.has('physics')) {
        scene.physics.world.createDebugGraphic();
        scene.physics.world.drawDebug = true;
    }

    // N skips ahead to the evening, so you don't wait five minutes to test the night.
    scene.input.keyboard.on('keydown-N', () => {
        if (scene.t < DUSK_AT) scene.t = DUSK_AT;
        else if (scene.t < NIGHT_AT) scene.t = NIGHT_AT;
    });
    // U gives you every upgrade and two torches, to test them without gathering for them first.
    scene.input.keyboard.on('keydown-U', () => grantAll(scene));

    // Remember the last message, so a test can read it from devState.
    // Scene events outlive a restart, so stop listening when this valley ends.
    const onToast = (message) => {
        scene.devToast = message;
    };
    scene.events.on('toast', onToast);
    scene.events.once('shutdown', () => scene.events.off('toast', onToast));

    // Only one listener for the whole page, pointed at whichever valley is running now.
    if (!current) {
        clock = performance.now();
        window.addEventListener('dev-step', () => {
            const frames = Number(html.dataset.devFrames || 60);
            for (let i = 0; i < frames; i++) {
                clock += 1000 / 60;
                current.game.step(clock, 1000 / 60);
            }
        });
    }
    current = scene;
}

// In dev, ?play or any of the options above skips the title screen and starts a fresh test game,
// so testing stays quick. It still saves, so the title's Continue picks up that test game afterwards.
const TITLE_SKIPPERS = ['play', 'at', 'walk', 'physics', 'pack', 'time', 'meters', 'seed', 'weather'];

export function skipTitle() {
    const q = new URLSearchParams(location.search);
    return TITLE_SKIPPERS.some((option) => q.has(option));
}

// ?seed=3 starts a different save. 1 (the normal one) if not asked for.
export function devSeed() {
    const seed = Number(new URLSearchParams(location.search).get('seed'));
    return Number.isInteger(seed) && seed > 0 ? seed : 1;
}

// ?weather=fog,full-moon gives that weather, on every run while testing. null if not asked for.
export function devWeather() {
    const q = new URLSearchParams(location.search);
    if (!q.has('weather')) return null;
    const asked = q.get('weather').split(',');
    const sky = asked.find((w) => w in SKIES) ?? 'clear';
    const moon = asked.find((w) => w in MOONS) ?? 'normal';
    return makeWeather(sky, moon);
}

const ALL_UPGRADES = UPGRADES.map((u) => u.id);

function grantAll(scene) {
    scene.save = { ...scene.save, upgrades: [...ALL_UPGRADES] };
    scene.pack = [...scene.pack, 'torch', 'torch'].slice(0, capacity(ALL_UPGRADES));
    scene.toast('Dev: every upgrade, and two torches.');
}

// Called at the start of every frame: fake keys from the console, if any.
export function readDevInput(scene) {
    const walk = html.dataset.devWalk;
    if (walk) {
        const [dx, dy] = walk.split(',').map(Number);
        const length = Math.hypot(dx, dy) || 1;
        scene.dev.dir = { x: dx / length, y: dy / length };
    } else {
        scene.dev.dir = null;
    }
    scene.dev.eDown = html.dataset.devE ? true : null;
    scene.dev.shift = html.dataset.devShift ? true : null;
    scene.dev.space = html.dataset.devSpace ? true : null;
    // One-shot presses: they happen once, then clear themselves.
    scene.dev.tPressed = Boolean(html.dataset.devT);
    delete html.dataset.devT;
    scene.dev.fPressed = Boolean(html.dataset.devF);
    delete html.dataset.devF;
    if (html.dataset.devGrant) {
        delete html.dataset.devGrant;
        grantAll(scene);
    }

    if (html.dataset.devTime) {
        scene.t = Number(html.dataset.devTime) * DAY_LENGTH;
        delete html.dataset.devTime;
    }
}

// Called at the end of every frame.
export function reportDev(scene) {
    const p = scene.player;
    const round = (n) => Math.round(n * 10) / 10;
    const m = scene.meters;
    const state = {
        x: Math.round(p.x),
        y: Math.round(p.y),
        speed: Math.round(p.body.speed),
        inStream: scene.inStream(),
        t: round(scene.t),
        phase: scene.phase,
        meters: { food: round(m.food), warmth: round(m.warmth), fuel: round(m.fuel) },
        nearFire: scene.nearFire(),
        light: Math.round(scene.lightR),
        flare: round(scene.flare),
        torches: scene.torches.map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), left: round(t.until - scene.t) })),
        upgrades: scene.save.upgrades,
        stash: scene.save.stash,
        panel: isPanelOpen(),
        wolves: scene.wolves.distances(),
        run: scene.save.run,
        ending: scene.ending,
        summary: scene.summary,
        stats: scene.save.stats,
        pack: scene.pack,
        toast: scene.devToast ?? null,
        target: scene.interactions.target?.id ?? null,
        weather: `${scene.weather.sky},${scene.weather.moon}`,
        critters: scene.critters.report(),
        landmark: scene.landmark && {
            kind: scene.landmark.kind,
            x: Math.round(scene.landmark.x),
            y: Math.round(scene.landmark.y),
            items: scene.landmark.items,
            food: scene.landmark.food,
        },
    };
    // Later systems add their own numbers through scene.devExtra().
    if (scene.devExtra) Object.assign(state, scene.devExtra());
    html.dataset.devState = JSON.stringify(state);
}
