import { makeRng, randRange } from '../logic/rng.js';
import { WORLD, CAMP, TENT, BEACON, RINGS, distance, ringAt } from '../logic/world.js';
import { ITEMS } from '../data/items.js';
import { RES } from './view.js';

// Past this distance from camp the forest is too thick to walk through
const WALL_RADIUS = RINGS.deep + 50;

const DEPTH = { ground: -100, shade: -90, stream: -80, wall: -70 };

const WALL_TINTS = [0xb8c4bb, 0x8a978e, 0x66726a];

// Trees in the deep woods are a little darker, so you can tell when you've gone far.
const DEEP_TINT = 0xc6d2ca;

export function drawValley(scene, valley) {
    const rng = makeRng(valley.seed + 1000);
    drawGround(scene, rng);
    drawStream(scene, valley.stream);
    drawWallShadow(scene);

    // Everything solid goes in here, so one collider can stop the player on all of it
    const solids = scene.physics.add.staticGroup();

    // The trees inside the valley, kept so they can sway (see ValleyScene).
    const trees = [];
    for (const t of valley.trees) {
        const tree = addTree(scene, solids, t.x, t.y, t.r, t.variant);
        if (ringAt(t.x, t.y) === 'deep') tree.setTint(DEEP_TINT);
        trees.push(tree);
    }
    addWallTrees(scene, solids, rng);

    // Camp: the tent, and the fire right in the middle.
    scene.add.image(TENT.x, TENT.y, 'tent').setOrigin(0.5, 0.88).setDepth(TENT.y);
    addSolid(scene, solids, TENT.x, TENT.y - 18, 38);
    scene.add.image(CAMP.x, CAMP.y, 'fire').setOrigin(0.5, 0.8).setDepth(CAMP.y);
    addSolid(scene, solids, CAMP.x, CAMP.y, 16);

    // Warm light from the fire. ADD blending brightens whatever is underneath it.
    // Depth 9000 puts it over the trees and you, so they're lit too.
    const glow = scene.add.image(CAMP.x, CAMP.y - 10, 'light')
        .setTint(0xffcf7a)
        .setBlendMode('ADD')
        .setAlpha(0.35)
        .setScale(2.2)
        .setDepth(9000);
    // Make it flicker, gently and forever.
    scene.tweens.add({
        targets: glow,
        alpha: 0.45,
        scale: 2.3,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
    });

    // The father's beacon, still dark.
    const beacon = scene.add.image(BEACON.x, BEACON.y, 'beacon-dark').setOrigin(0.5, 0.87).setDepth(BEACON.y);
    addSolid(scene, solids, BEACON.x, BEACON.y - 12, 34);

    // Things you can Pick up. Each map lets later code find a sprite by its id.
    const nodeSprites = new Map();
    for (const n of valley.nodes) {
        nodeSprites.set(n.id, addThing(scene, n.x, n.y, ITEMS[n.kind].art));
    }
    const lensSprites = new Map();
    for (const l of valley.lenses) {
        lensSprites.set(l.index, addThing(scene, l.x, l.y, 'lens'));
    }
    const pageSprites = new Map();
    for (const p of valley.pages) {
        pageSprites.set(p.id, addThing(scene, p.x, p.y, 'page'));
    }
    return { solids, trees, nodeSprites, lensSprites, pageSprites, beacon };

}

function drawGround(scene, rng) {
    //One 256px tile of grass, repeated across the whole world.
    // It's drawn RES times bigger for sharpness (see BootScene), so the tile is shrunk back here.
    scene.add.tileSprite(0, 0, WORLD.width, WORLD.height, 'ground').setOrigin(0).setDepth(DEPTH.ground).setTileScale(1 / RES);

    //Darker Patches over the deep woods.
    const shade = scene.add.graphics().setDepth(DEPTH.shade);
    shade.fillStyle(0x2c5139, 0.35);
    for (let i = 0; i < 70; i++) {
        const angle = rng() * Math.PI * 2;
        const r = randRange(rng, RINGS.pinewood, RINGS.deep);
        shade.fillEllipse(
            CAMP.x + Math.cos(angle) * r,
            CAMP.y + Math.sin(angle) * r,
            randRange(rng, 160, 320),
            randRange(rng, 90, 180),
        );
    }

    // A worn clearing around camp: lighter grass, with bare earth in the middle.
    // The soft 'light' circle, tinted and squashed, gives it edges that fade out.
    scene.add.image(CAMP.x, CAMP.y, 'light').setTint(0x5d8467).setAlpha(0.7).setScale(2.2, 1.5).setDepth(DEPTH.shade);
    scene.add.image(CAMP.x - 20, CAMP.y + 6, 'light').setTint(0xa88f63).setAlpha(0.35).setScale(1.3, 0.8).setDepth(DEPTH.shade);
}

function drawStream(scene, points) {
    const water = scene.add.graphics().setDepth(DEPTH.stream);
    water.lineStyle(34, 0x6fb3c9, 0.8);
    water.strokePoints(points);
    // A thin pale line along the middle, where the water catches the light
    water.lineStyle(6, 0xcfe8ee, 0.25);
    water.strokePoints(points);
}

// Darkness past the edge of the valley.
function drawWallShadow(scene) {
    const g = scene.add.graphics().setDepth(DEPTH.wall);
    // One very thick ring covers everything outside the valley, all the way to the corners.
    g.lineStyle(1600, 0x132019, 1);
    g.strokeCircle(CAMP.x, CAMP.y, WALL_RADIUS + 800);
    // Two Softer rings insides it, so the dark fades in instead of starting at a hard line.
    g.lineStyle(80, 0x132019, 0.5);
    g.strokeCircle(CAMP.x, CAMP.y, WALL_RADIUS - 40);
    g.lineStyle(80, 0x132019, 0.25);
    g.strokeCircle(CAMP.x, CAMP.y, WALL_RADIUS - 120);
}

// Three rows of trees packed tight around the valley, so there's no way out.
function addWallTrees(scene, solids, rng) {
    const rows = [WALL_RADIUS + 10, WALL_RADIUS + 70, WALL_RADIUS + 130];
    rows.forEach((radius, row) => {
        const count = Math.round((Math.PI * 2 * radius) / 56);
        for (let i = 0; i < count; i++) {
            // Every other row is shifted half a step, like bricks in a wall
            const angle = ((i + (row % 2) * 0.5) / count) * Math.PI * 2;
            const x = CAMP.x + Math.cos(angle) * radius;
            const y = CAMP.y + Math.sin(angle) * radius;
            if (distance(x, y, BEACON.x, BEACON.y) < BEACON.clearRadius) continue;
            const tree = addTree(scene, solids, x, y, 26, 1 + Math.floor(rng() * 3));
            tree.setTint(WALL_TINTS[row]);
        }
    });
}

function addTree(scene, solids, x, y, r, variant) {
    addSolid(scene, solids, x, y, r);
    return scene.add.image(x, y, `tree-${variant}`).setOrigin(0.5, 0.84).setDepth(y);
}

// An Invisible circle that stops you near the tree trunk
function addSolid(scene, solids, x, y, r) {
    const radius = Math.round(r);
    const block = scene.add.zone(x, y, radius * 2, radius * 2);
    solids.add(block);
    block.body.setCircle(radius);
}

function addThing(scene, x, y, key) {
    return scene.add.image(x, y, key).setOrigin(0.5, 0.75).setDepth(y);
}