// Food, warmth and lantern fuel. Every function here returns new meters
// instead of changing the old ones, so they're easy to test.

const FOOD_LOSS = 0.2; // per second
const SPRINT_HUNGER = 3; // running makes you hungry three times as fast
const WARMTH_LOSS = { dawn: 0.1, day: 0.1, dusk: 0.2, night: 0.3 };
const FIRE_WARMTH = 5; // per second, near the camp fire
const FUEL_BURN = 0.5; // per second, at dusk and night
const FLARE_BURN = 4; // extra fuel per second at a full flare
const FLARE_GROWTH = 0.5; // a full flare makes the light this much bigger
const FLARE_UP = 4; // how fast a flare swells, per second (full in 0.25 s)
const FLARE_DOWN = 3; // and how fast it dies down

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

// flare (0 to 1) is how hard you're flaring the lantern with Space. See stepFlare.
export function tickSurvival(meters, dt, { phase, nearFire, upgrades, sprinting = false, flare = 0 }) {
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
    const fuel = lit ? meters.fuel - (FUEL_BURN + FLARE_BURN * flare) * dt : meters.fuel;

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

// The flare swells while you hold Space and dies down when you let go.
export function stepFlare(amount, dt, holding) {
    dt = Math.min(dt, 0.1);
    const next = holding ? amount + FLARE_UP * dt : amount - FLARE_DOWN * dt;
    return Math.min(1, Math.max(0, next));
}

export function flaredRadius(radius, flare) {
    return radius * (1 + FLARE_GROWTH * flare);
}
