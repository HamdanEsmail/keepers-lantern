// Every sound in the game, made in code with the Web Audio API. There are no sound files.
//
// Browsers only allow sound after you've pressed a key or clicked, so nothing here touches
// the browser until initAudio() is called from the first key press or click (see main.js).
// Before that, playSfx and setAmbience quietly do nothing (setAmbience remembers what you asked for).

import { browserStorage } from '../logic/save.js';

const MUTE_KEY = 'keepers-lantern:muted';
const VOLUME = 0.8;

let ctx = null;
let master = null;
let noise = null;
// The looping background sounds: wind, rain and the camp fire.
const loops = {};
// What the background should sound like right now (see setAmbience).
let wanted = { phase: 'day', fire: 0, rain: false };

// How loud each background sound is, for a moment of the game.
//   phase: 'dawn', 'day', 'dusk' or 'night'
//   fire:  0 (far away) to 1 (sitting by it)
//   rain:  true on a rainy day
export function ambienceLevels({ phase = 'day', fire = 0, rain = false } = {}) {
    const wind = { dawn: 0.05, day: 0.04, dusk: 0.07, night: 0.11 }[phase] ?? 0.05;
    return {
        wind,
        rain: rain ? 0.05 : 0,
        fire: Math.max(0, Math.min(1, fire)),
    };
}

// Whether sound is off. It's kept in the browser, so it stays off after a reload.
export function isMuted(storage = browserStorage()) {
    try {
        return storage?.getItem(MUTE_KEY) === '1';
    } catch {
        return false;
    }
}

// M: sound off, or back on. Returns true if it's now off.
export function toggleMute(storage = browserStorage()) {
    const muted = !isMuted(storage);
    try {
        storage?.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
        // Storage can be blocked. Sound still toggles for this visit.
    }
    if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.05);
    return muted;
}

// Called on the first key press or click. Safe to call again: after the first time it only wakes the sound up.
export function initAudio() {
    if (ctx) {
        if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
        return;
    }
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return;
    ctx = new AudioContext();

    // Everything goes through one volume and a compressor, so lots of sounds at once can't crackle.
    const compressor = ctx.createDynamicsCompressor();
    compressor.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = isMuted() ? 0 : VOLUME;
    master.connect(compressor);

    // Two seconds of white noise, reused by the wind, the rain, the fire and the footsteps.
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    startWind();
    startRain();
    startFire();
    setAmbience(wanted);

    // A hidden tab goes quiet, the same as the game pauses.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) ctx.suspend();
        else ctx.resume();
    });
}

// What the background should sound like. Cheap to call every frame: it only changes things that changed.
export function setAmbience(state) {
    wanted = { ...wanted, ...state };
    if (!ctx) return;
    const levels = ambienceLevels(wanted);
    for (const name of ['wind', 'rain']) fade(loops[name], levels[name]);
    loops.fire.level = levels.fire;
}

// One sound effect. Names: pickup, page, eat, step, wade, howl, caught, buy, torch, beacon.
export function playSfx(name) {
    if (!ctx || ctx.state !== 'running') return;
    const sound = SOUNDS[name];
    if (sound) sound(ctx.currentTime);
}

// ---- The background ----

// Wind: noise through a low filter that drifts up and down, so it comes in gusts.
function startWind() {
    const source = loopNoise();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    const gust = ctx.createOscillator();
    const gustDepth = ctx.createGain();
    gust.frequency.value = 0.09;
    gustDepth.gain.value = 160;
    gust.connect(gustDepth).connect(filter.frequency);
    gust.start();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(master);
    loops.wind = { gain, level: -1 };
}

// Rain: brighter noise, steady.
function startRain() {
    const source = loopNoise();
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 1200;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 6000;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(high).connect(low).connect(gain).connect(master);
    loops.rain = { gain, level: -1 };
}

// The fire: a soft low roar, and little crackles at random moments. Louder the closer you are.
function startFire() {
    const source = loopNoise();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    const roar = ctx.createGain();
    roar.gain.value = 0;
    source.connect(filter).connect(roar).connect(master);
    loops.fire = { gain: roar, level: 0, shown: -1 };

    setInterval(() => {
        if (!ctx || ctx.state !== 'running') return;
        const level = loops.fire.level;
        if (level !== loops.fire.shown) {
            loops.fire.shown = level;
            roar.gain.setTargetAtTime(level * 0.12, ctx.currentTime, 0.3);
        }
        if (level > 0.05 && Math.random() < 0.35) crackle(ctx.currentTime + Math.random() * 0.05, level);
    }, 60);
}

function crackle(at, level) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500 + Math.random() * 2500;
    filter.Q.value = 1.5;
    burst(at, 0.01 + Math.random() * 0.03, 0.12 * level * (0.4 + Math.random()), filter);
}

function loopNoise() {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    source.start(0, Math.random() * 2);
    return source;
}

function fade(loop, level) {
    if (!loop || loop.level === level) return;
    loop.level = level;
    loop.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.8);
}

// ---- The effects ----

const SOUNDS = {
    // Something goes in your pack: two quick notes, up.
    pickup: (t) => {
        tone(t, 660, 0.18, 0.09, 'triangle');
        tone(t + 0.07, 880, 0.22, 0.08, 'triangle');
    },
    // A page: a rustle of paper, then two soft low notes.
    page: (t) => {
        burst(t, 0.18, 0.05, filtered('bandpass', 3200, 0.8));
        tone(t + 0.12, 523, 0.6, 0.07, 'sine');
        tone(t + 0.3, 784, 0.8, 0.06, 'sine');
    },
    // Eating: two small, muffled bites.
    eat: (t) => {
        burst(t, 0.06, 0.16, filtered('lowpass', 900));
        burst(t + 0.13, 0.06, 0.13, filtered('lowpass', 800));
    },
    // A footstep on the ground: a short, soft thump.
    step: (t) => {
        burst(t, 0.04, 0.09, filtered('lowpass', 300 + Math.random() * 80));
    },
    // A footstep in the stream: a little splash.
    wade: (t) => {
        burst(t, 0.09, 0.07, filtered('bandpass', 900 + Math.random() * 300, 1.2));
    },
    // A wolf howling somewhere out in the dark: a gliding note with a waver, and an echo.
    howl: (t) => {
        const pitch = 0.92 + Math.random() * 0.16;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300 * pitch, t);
        osc.frequency.linearRampToValueAtTime(520 * pitch, t + 0.5);
        osc.frequency.linearRampToValueAtTime(380 * pitch, t + 1.6);
        const vibrato = ctx.createOscillator();
        const depth = ctx.createGain();
        vibrato.frequency.value = 5;
        depth.gain.value = 7;
        vibrato.connect(depth).connect(osc.frequency);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.07, t + 0.35);
        gain.gain.setValueAtTime(0.07, t + 1.1);
        gain.gain.linearRampToValueAtTime(0, t + 1.7);
        const filter = filtered('lowpass', 1400);
        osc.connect(gain).connect(filter);
        filter.connect(master);
        echo(filter, 0.28, 0.35);
        osc.start(t);
        vibrato.start(t);
        osc.stop(t + 1.8);
        vibrato.stop(t + 1.8);
    },
    // Caught: a rush of noise falling away, and a low thud.
    caught: (t) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, t);
        filter.frequency.exponentialRampToValueAtTime(160, t + 0.5);
        burst(t, 0.5, 0.25, filter);
        tone(t, 70, 0.5, 0.25, 'sine', 40);
    },
    // Building at camp: a wooden knock and three notes, up.
    buy: (t) => {
        burst(t, 0.05, 0.14, filtered('bandpass', 500, 2));
        [523, 659, 784].forEach((f, i) => tone(t + 0.06 + i * 0.09, f, 0.35, 0.07, 'triangle'));
    },
    // Planting a torch: a whoosh as it catches.
    torch: (t) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 0.9;
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.exponentialRampToValueAtTime(2200, t + 0.35);
        burst(t, 0.4, 0.12, filter);
    },
    // The beacon: a warm chord that rises and rings out.
    beacon: (t) => {
        [131, 262, 330, 392, 523].forEach((f, i) => {
            tone(t + i * 0.22, f, 4.5 - i * 0.3, i === 0 ? 0.08 : 0.05, 'sine', null, 0.6);
            tone(t + i * 0.22, f * 1.003, 4.5 - i * 0.3, 0.025, 'triangle', null, 0.6);
        });
    },
};

// ---- Building blocks ----

// A note: a wave at a frequency (falling to `to`, if given) that fades out over `length` seconds.
function tone(t, freq, length, volume, type = 'sine', to = null, attack = 0.01) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + length);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + length + 0.05);
}

// A short burst of noise through a filter: steps, crackles, rustles.
function burst(t, length, volume, filter) {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    source.connect(filter).connect(gain).connect(master);
    source.start(t, Math.random() * 1.5, length + 0.05);
}

function filtered(type, frequency, q = 1) {
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    return filter;
}

// A faint echo, as if the sound came from far off between the trees.
function echo(input, delay, amount) {
    const line = ctx.createDelay(1);
    line.delayTime.value = delay;
    const back = ctx.createGain();
    back.gain.value = amount;
    input.connect(line).connect(back).connect(line);
    back.connect(master);
    // The echo loops back into itself, so unplug it once it has died away.
    setTimeout(() => {
        back.disconnect();
        line.disconnect();
    }, 5000);
}
