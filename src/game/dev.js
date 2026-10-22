// Testing helpers for `npm run dev` only. The live site never includes them,
// because ValleyScene only calls setupDev when import.meta.env.DEV is true.
//
// URL options (add them after the address, e.g. localhost:5173/?at=1000,1200):
//   ?at=x,y       start somewhere else
//   ?walk=dx,dy   keep walking in one direction without touching the keys
//   ?physics      show the invisible solid circles
//
// From the browser console:
//   window.dispatchEvent(new Event('dev-step'))
// runs one second of game time (60 frames), even if the tab is hidden.
// Set document.documentElement.dataset.devFrames to step a different number of frames.
// After every frame, document.documentElement.dataset.devState holds a summary of the game.

let current = null;
let clock = 0;

export function setupDev(scene) {
    const q = new URLSearchParams(location.search);
    scene.dev = { dir: null };

    if (q.has('walk')) {
        const [dx, dy] = q.get('walk').split(',').map(Number);
        const length = Math.hypot(dx, dy) || 1;
        scene.dev.dir = { x: dx / length, y: dy / length };
    }
    if (q.has('at')) {
        const [x, y] = q.get('at').split(',').map(Number);
        scene.player.setPosition(x, y);
        scene.cameras.main.centerOn(x, y);
    }
    if (q.has('physics')) {
        scene.physics.world.createDebugGraphic();
        scene.physics.world.drawDebug = true;
    }

    // Only one listener for the whole page, pointed at whichever valley is running now.
    if (!current) {
        clock = performance.now();
        window.addEventListener('dev-step', () => {
            const frames = Number(document.documentElement.dataset.devFrames || 60);
            for (let i = 0; i < frames; i++) {
                clock += 1000 / 60;
                current.game.step(clock, 1000 / 60);
            }
        });
    }
    current = scene;
}

// Called at the end of every frame in dev builds.
export function reportDev(scene) {
    const p = scene.player;
    const state = {
        x: Math.round(p.x),
        y: Math.round(p.y),
        speed: Math.round(p.body.speed),
        inStream: scene.inStream(),
    };
    // Later systems add their own numbers through scene.devExtra().
    if (scene.devExtra) Object.assign(state, scene.devExtra());
    document.documentElement.dataset.devState = JSON.stringify(state);
}
