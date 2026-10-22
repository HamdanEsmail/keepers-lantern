import { newStats, newRunSummary, recordRun } from './stats.js';

// What carries over from one run to the next.
// Returns a new save and never changes the one it was given.
//
// reason:
//   'caught' - the wolves found you
//   'spent'  - you ran out of food or warmth
// Either way you lose your pack, lens pieces included, so they're back in the next valley.
// What's already at camp (the stash, upgrades, lens pieces brought home) is safe.
// Sleeping at camp, which keeps the pack, comes with the camp panel.
//
// summary is what happened this run (see newRunSummary in stats.js). It goes into the stats.
export function afterRun(save, reason, pack, summary = newRunSummary()) {
    const stats = recordRun(save.stats ?? newStats(), summary, reason);
    return { ...save, run: save.run + 1, stats };
}
