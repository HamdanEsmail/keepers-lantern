// Food, warmth and lantern fuel. Every function here returns new meters
// instead of changing the old ones, so they're easy to test.

const FOOD_LOSS = 0.2; // per second
const SPRINT_HUNGER = 3; // running makes you hungry three times as fast
const WARMTH_LOSS = { dawn: 0.1, day: 0.1, dusk: 0.2, night: 0.3 };
const FIRE_WARMTH = 5; // per second, near the camp fire
const FUEL_BURN = 0.5; // per second, at dusk and night

// What each food is worth.
const FOOD_VALUE = { berries: 20, fish: 35 };

export function maxFuel(upgrades) {
    return upgrades.includes('lantern') ? 150 : 100;
}

export function startMeters(upgrades) {
    return { food: 100, warmth: 100, fuel: maxFuel(upgrades) };
}

function clamp(value, max) {
    return Math.min(max, Math.max(0, value));
}

export function tickSurvival(meters, dt, { phase, nearFire, upgrades, sprinting = false }) {
    // A hidden tab can leave a huge gap between frames. Don't punish it.
    dt = Math.min(dt, 0.1);

    const hungerMul = (upgrades.includes('cooking-fire') ? 0.75 : 1) * (sprinting ? SPRINT_HUNGER : 1);
    const coldMul = upgrades.includes('coat') ? 0.6 : 1;

    const food = meters.food - FOOD_LOSS * hungerMul * dt;
    const warmth = nearFire
        ? meters.warmth + FIRE_WARMTH * dt
        : meters.warmth - WARMTH_LOSS[phase] * coldMul * dt;

    // The lantern is only lit once the light starts going, and rests by the fire.
    const lit = (phase === 'dusk' || phase === 'night') && !nearFire;
    const fuel = lit ? meters.fuel - FUEL_BURN * dt : meters.fuel;

    return {
        food: clamp(food, 100),
        warmth: clamp(warmth, 100),
        fuel: clamp(fuel, maxFuel(upgrades)),
    };
}

export function foodValue(kind) {
    return FOOD_VALUE[kind] ?? 0;
}

export function eat(meters, kind) {
    return { ...meters, food: Math.min(100, meters.food + foodValue(kind)) };
}

// Running out of food or warmth ends the run. Running out of fuel doesn't,
// but in the dark the wolves come.
export function isSpent(meters) {
    return meters.food <= 0 || meters.warmth <= 0;
}

export function lightRadius(fuel, upgrades) {
    const base = upgrades.includes('lantern') ? 300 : 220;
    return base * (0.35 + (0.65 * fuel) / maxFuel(upgrades));
}
