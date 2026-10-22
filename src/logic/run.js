// What carries over from one run to the next.
// Returns a new save and never changes the one it was given.
//
// reason:
//   'caught' - the wolves found you
//   'spent'  - you ran out of food or warmth
// Either way you lose your pack, lens pieces included, so they're back in the next valley.
// What's already at camp (the stash, upgrades, lens pieces brought home) is safe.
// Sleeping at camp, which keeps the pack, comes with the camp panel.
export function afterRun(save, reason, pack) {
    return { ...save, run: save.run + 1 };
}
