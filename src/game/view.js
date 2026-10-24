// The game is laid out for a 1280×720 screen. On a bigger or sharper screen it draws
// RES times bigger than that and each scene's camera zooms in to match, so the picture
// stays sharp instead of being stretched. Every position in the game stays in 1280×720.

export const VIEW = { width: 1280, height: 720 };

export const RES = renderScale();

// Enough to fill this screen at full size (rounded up to a quarter), and never more than 2×.
// Without WebGL it stays at 1: the sharp art in BootScene only works with WebGL.
function renderScale() {
    if (!hasWebGL()) return 1;
    const fit = Math.min(window.screen.width / VIEW.width, window.screen.height / VIEW.height);
    const scale = Math.ceil(fit * (window.devicePixelRatio || 1) * 4) / 4;
    return Math.min(2, Math.max(1, scale));
}

// The same check Phaser makes before it picks WebGL over the plain canvas.
function hasWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
        return false;
    }
}

// Zoom a scene's camera so the 1280×720 layout fills the whole canvas.
export function fitCamera(scene) {
    const camera = scene.cameras.main;
    camera.setZoom(RES);
    camera.centerOn(VIEW.width / 2, VIEW.height / 2);
    return camera;
}

// The world position of the screen's top-left corner.
// The camera zooms around its middle, so once it's zoomed that isn't scrollX any more.
export function screenCorner(camera) {
    return {
        x: camera.scrollX + (camera.width - camera.displayWidth) / 2,
        y: camera.scrollY + (camera.height - camera.displayHeight) / 2,
    };
}

// Where to put something fixed to the screen (scroll factor 0) so it starts at the top-left corner.
// It ignores the camera's scroll but not its zoom, so it needs the same nudge as above.
export function fixedCorner(camera) {
    return {
        x: (camera.width - camera.displayWidth) / 2,
        y: (camera.height - camera.displayHeight) / 2,
    };
}
