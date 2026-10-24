import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { ValleyScene } from './scenes/ValleyScene.js';
import { HudScene } from './scenes/HudScene.js';
import { EndingScene } from './scenes/EndingScene.js';
import { initAudio, toggleMute } from './audio/sound.js';

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#24372d',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    // Scenes later in the list are drawn on top, so the HUD goes last.
    scene: [BootScene, TitleScene, ValleyScene, HudScene, EndingScene],
});

// Browsers only allow sound after a key press or a click, so it starts on the first one.
window.addEventListener('pointerdown', initAudio);
window.addEventListener('keydown', (event) => {
    initAudio();
    // M turns the sound off and back on, anywhere in the game. It's remembered after a reload.
    if (event.code === 'KeyM' && !event.repeat) {
        const muted = toggleMute();
        if (game.scene.isActive('valley')) {
            game.scene.getScene('valley').toast(muted ? 'Sound off. Press M to turn it back on.' : 'Sound on.');
        }
    }
});