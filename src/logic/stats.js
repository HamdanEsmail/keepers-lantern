// Numbers kept across every run, and milestones you earn once.
// Like the rest of logic/, these functions return new objects instead of changing old ones.

export function newStats() {
    return {
        runs: 0,
        nightsSurvived: 0,
        caught: 0,
        spent: 0,
        longestNight: 0, // the most seconds of night spent away from camp in one run
        gathered: 0,
        eaten: 0,
        milestones: [],
    };
}

// What happened during the run you're on. ValleyScene fills it in as you play.
export function newRunSummary() {
    return {
        gathered: 0,
        eaten: 0,
        nightTime: 0, // seconds of night away from camp
        sawNight: false,
        deepest: 'edge',
        closeCalls: 0, // made it back to camp (or a torch) while the wolves were rushing you
        packFilled: false,
        torches: 0, // planted at dusk or night
        cooked: 0, // fish cooked at the fire
        moon: 'normal', // tonight's moon (see weather.js)
    };
}

const RING_ORDER = ['edge', 'pinewood', 'deep', 'outside'];

// Whichever of two rings is further from camp.
export function deeper(a, b) {
    return RING_ORDER.indexOf(b) > RING_ORDER.indexOf(a) ? b : a;
}

export function recordRun(stats, summary, reason) {
    return {
        ...stats,
        runs: stats.runs + 1,
        caught: stats.caught + (reason === 'caught' ? 1 : 0),
        spent: stats.spent + (reason === 'spent' ? 1 : 0),
        nightsSurvived: stats.nightsSurvived + (reason === 'slept' && summary.sawNight ? 1 : 0),
        longestNight: Math.max(stats.longestNight, Math.round(summary.nightTime)),
        gathered: stats.gathered + summary.gathered,
        eaten: stats.eaten + summary.eaten,
        milestones: [...stats.milestones],
    };
}

// check(stats, run): stats are the totals before this run, run is this run so far.
export const MILESTONES = [
    { id: 'full-pack', label: 'A full pack', check: (s, r) => r.packFilled },
    { id: 'deep-woods', label: 'Into the deep woods', check: (s, r) => r.deepest === 'deep' || r.deepest === 'outside' },
    { id: 'after-dark', label: 'Out after dark', check: (s, r) => r.nightTime > 0 },
    { id: 'long-night', label: 'A whole minute in the dark', check: (s, r) => r.nightTime >= 60 },
    { id: 'close-call', label: 'Close call', check: (s, r) => r.closeCalls > 0 },
    { id: 'torch-night', label: 'A torch in the dark', check: (s, r) => r.torches > 0 },
    { id: 'hot-meal', label: 'A hot meal', check: (s, r) => r.cooked > 0 },
    { id: 'wolf-moon', label: 'Out under a wolf moon', check: (s, r) => r.moon === 'wolf-moon' && r.nightTime >= 30 },
    { id: 'forager', label: 'Fifty things gathered', check: (s, r) => s.gathered + r.gathered >= 50 },
    { id: 'well-fed', label: 'Fifteen good meals', check: (s, r) => s.eaten + r.eaten >= 15 },
    { id: 'first-dawn', label: 'You made it to morning', check: (s) => s.nightsSurvived >= 1 },
];

// The ids of milestones you've just earned and didn't have before.
export function newMilestones(stats, run) {
    return MILESTONES.filter((m) => !stats.milestones.includes(m.id) && m.check(stats, run)).map((m) => m.id);
}

export function earn(stats, ids) {
    return { ...stats, milestones: [...stats.milestones, ...ids] };
}

export function milestoneLabel(id) {
    return MILESTONES.find((m) => m.id === id)?.label ?? id;
}
