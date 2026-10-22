import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { ValleyScene } from './scenes/ValleyScene.js';
import { HudScene } from './scenes/HudScene.js';

new Phaser.Game({
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
    scene: [BootScene, ValleyScene, HudScene],
});