import Phaser from 'phaser';

// Placeholder so the first deploy has something to show.
// Lesson 1 replaces this with the real game setup.
class Placeholder extends Phaser.Scene {
    create() {
        this.add.text(480, 270, "The Keeper's Lantern", {
            fontFamily: 'Georgia, serif',
            fontSize: '40px',
            color: '#f3e7c9',
        }).setOrigin(0.5);
    }
}

new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 960,
    height: 540,
    backgroundColor: '#24372d',
    scene: Placeholder,
});
