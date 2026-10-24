import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { ValleyScene } from './scenes/ValleyScene.js';
import { HudScene } from './scenes/HudScene.js';
import { EndingScene } from './scenes/EndingScene.js';

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
    scene: [BootScene, TitleScene, ValleyScene, HudScene, EndingScene],
});