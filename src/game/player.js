// Walking speed in pixels per second. Slow on purpose:
// a trip to the deep woods and back should cost a real part of the day.
export const PLAYER_SPEED = 115;

export function createPlayer(scene, x, y) {
    // A physics sprite, placed by its feet like the trees.
    const player = scene.physics.add.sprite(x, y, 'player').setOrigin(0.5, 0.9);
    // The solid part is a circle around the legs, not the whole picture.
    player.body.setCircle(14, 10, 20);
    player.setCollideWorldBounds(true);
    player.setDepth(y);

    // A little side-to-side sway while walking. It starts paused.
    player.walkTween = scene.tweens.add({
        targets: player,
        angle: { from: -4, to: 4 },
        duration: 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        paused: true,
    });
    return player;
}

// dir comes from readMove. speedMul is 1 normally, less in the stream, more when sprinting.
export function updatePlayer(player, dir, speedMul) {
    const speed = PLAYER_SPEED * speedMul;
    player.setVelocity(dir.x * speed, dir.y * speed);
    // Faster steps sway faster.
    player.walkTween.timeScale = Math.max(0.6, speedMul);

    // The picture faces right, so flip it when walking left.
    if (dir.x !== 0) player.setFlipX(dir.x < 0);

    const moving = dir.x !== 0 || dir.y !== 0;
    if (moving && player.walkTween.isPaused()) {
        player.walkTween.resume();
    } else if (!moving && !player.walkTween.isPaused()) {
        player.walkTween.pause();
        player.angle = 0;
    }

    player.setDepth(player.y);
}
