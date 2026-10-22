import { pickTarget, stepHold, newHold } from '../logic/interact.js';

function holdOf(thing) {
    return typeof thing.hold === 'function' ? thing.hold() : thing.hold;
}

// Everything you can use with E. Each thing is a plain object:
//   { id, x, y, radius, hold, prompt, use, isActive }
//   radius:   how close you must be
//   hold:     seconds to hold E (0 = a single press), or a function that returns it
//   prompt:   the words after "E ·", e.g. 'Gather Wood'
//   use():    what happens when it's done
//   isActive: optional function; when it returns false the thing is skipped
export class Interactions {
    constructor(scene) {
        this.scene = scene;
        this.list = [];
        this.hold = newHold();
        this.target = null;
        // The ring that fills up around whatever you're holding E on.
        this.ring = scene.add.graphics().setDepth(9100);
    }

    add(thing) {
        this.list.push(thing);
    }

    remove(id) {
        this.list = this.list.filter((t) => t.id !== id);
        if (this.target?.id === id) this.target = null;
    }

    // Returns the prompt to show at the bottom of the screen, or null.
    update(dt, eDown, x, y) {
        const usable = this.list.filter((t) => !t.isActive || t.isActive());
        this.target = pickTarget(usable, x, y);

        const target = this.target;
        const needed = target ? holdOf(target) : 0;
        const result = stepHold(this.hold, dt, eDown, target ? target.id : null, needed);
        this.hold = result.hold;
        this.drawRing(needed);
        if (result.done) target.use();

        if (!target) return null;
        return `${needed > 0 ? 'Hold E' : 'E'} · ${typeof target.prompt === 'function' ? target.prompt() : target.prompt}`;
    }

    drawRing(needed) {
        this.ring.clear();
        const t = this.target;
        if (!t || !needed || this.hold.id !== t.id) return;
        const amount = Math.min(1, this.hold.time / needed);
        // A faint full circle, then the filled part on top, starting from the top.
        this.ring.lineStyle(4, 0x0a120e, 0.5);
        this.ring.strokeCircle(t.x, t.y - 8, 26);
        this.ring.lineStyle(4, 0xffcf7a, 1);
        this.ring.beginPath();
        this.ring.arc(t.x, t.y - 8, 26, -Math.PI / 2, -Math.PI / 2 + amount * Math.PI * 2);
        this.ring.strokePath();
    }
}
