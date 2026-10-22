import { newStats, newRunSummary, recordRun, formatSeconds } from './stats.js';
import { emptyInto } from './pack.js';

// What carries over from one run to the next.
// Returns a new save and never changes the one it was given.
//
// reason:
//   'caught' - the wolves found you
//   'spent'  - you ran out of food or warmth
//   'slept'  - you went to sleep at camp
// Caught or spent, you lose your pack, lens pieces included, so they're back in the next valley.
// Sleeping keeps it: everything goes into the stash, and lens pieces count as brought home.
// What's already at camp (the stash, upgrades, lens pieces brought home) is always safe.
//
// summary is what happened this run (see newRunSummary in stats.js). It goes into the stats.
export function afterRun(save, reason, pack, summary = newRunSummary()) {
    const stats = recordRun(save.stats ?? newStats(), summary, reason);
    const next = { ...save, run: save.run + 1, stats };
    if (reason !== 'slept') return next;

    const { stash, lenses } = emptyInto(save.stash, pack);
    // A Set drops repeats, in case the same piece somehow comes home twice.
    const lensDelivered = [...new Set([...save.lensDelivered, ...lenses])];
    return { ...next, stash, lensDelivered };
}

// How each run can end. 'hunger' and 'cold' are the two ways of being 'spent'.
const ENDS = {
    caught: { title: 'Caught', text: 'The wolves found you. You wake by the fire. Your pack is gone.' },
    hunger: { title: 'Too hungry', text: 'Hunger took the last of you. You wake by the fire. Your pack is gone.' },
    cold: { title: 'Too cold', text: 'The cold took the last of you. You wake by the fire. Your pack is gone.' },
    slept: { title: 'Morning', text: 'You sleep by the fire until dawn. Everything you carried is safe in the stash.' },
};

const RING_NAMES = {
    edge: 'the edge of the woods',
    pinewood: 'the pinewood',
    deep: 'the deep woods',
    outside: 'the far end of the valley',
};

// What the morning panel says after a run: a title and a few lines.
//   end: 'caught', 'hunger', 'cold' or 'slept'
//   day: which day just ended (the first one is 1)
export function wakeReport(end, summary, day) {
    const { title, text } = ENDS[end] ?? ENDS.caught;
    const lines = [text, `Day ${day}: you gathered ${summary.gathered} and ate ${summary.eaten}.`];
    if (summary.nightTime >= 1) lines.push(`You spent ${formatSeconds(summary.nightTime)} out in the dark.`);
    lines.push(`The furthest you went: ${RING_NAMES[summary.deepest] ?? RING_NAMES.edge}.`);
    return { title, lines };
}
