import { range, MIDI, noteLimit } from './helpers.js';
import { log } from './logger.js';
import { Keyboard } from './keyboard.js';

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let master = audioCtx.createGain();
master.connect(audioCtx.destination);

let inst = new Keyboard(master);
inst.gain(0.3);

Array.prototype.randomChoice = function () {
    return this[Math.floor(Math.random() * this.length)];
}

function buildScale(basis, offset) {
    let scale = [];
    let transposed = basis.map((i) => {
        i += offset;
        while (i > 12) { i -= 12 }
        return i;
    });
    range(0, 120).forEach((i) => {
        let cmp = i;
        while (cmp > 12) { cmp -= 12 }
        if (transposed.includes(cmp)) { scale.push(i) }
    });
    return scale;
}

let noteQueue = [0, 0];
let velocity = 80;
let timer = 400;
let scale = buildScale(MAJOR_SCALE, 3).filter((i) => i > 32 && i < 72);
let atonal = scale.map((n) => n + 1).filter((n) => !scale.includes(n));

function mainLoop() {
    let n;

    if (Math.random() > 0.2) {
        n = noteQueue.pop();
        if (n) {
            inst.midi([MIDI.NOTE_OFF, n]);
        }
    }

    if (Math.random() > 0.4 && noteQueue.length < 5) {
        n = scale.randomChoice();
        noteQueue.unshift(n);
        log('MIDI.NOTE_ON', n, velocity);
        inst.midi([MIDI.NOTE_ON, n, velocity]);
    }

    if (Math.random() > 0.95 && noteQueue.length < 3) {
        n = atonal.randomChoice();
        noteQueue.unshift(n);
        log('Atonal      ', n, velocity);
        inst.midi([MIDI.NOTE_ON, n, velocity]);
        setTimeout(() => {
            inst.midi([MIDI.NOTE_ON, n + 1, velocity]);
        }, timer / 2);
    }

    if (Math.random() > 0.7 && noteQueue.length == 1) {
        let repeater = noteQueue[0];
        log('Repeater    ', repeater);
        let octave = noteLimit(repeater + 12);
        let fifth = noteLimit(repeater + 19);
        let repeatSpeed = timer / 3;
        setTimeout(() => {
            let velocity = 90;
            noteQueue.unshift(octave);
            log('MIDI.NOTE_ON', octave, velocity);
            inst.midi([MIDI.NOTE_ON, octave, velocity]);
        }, repeatSpeed);
        setTimeout(() => {
            let velocity = 90;
            noteQueue.unshift(fifth);
            log('MIDI.NOTE_ON', fifth, velocity);
            inst.midi([MIDI.NOTE_ON, fifth, velocity]);
        }, repeatSpeed * 2);
    }
};

export function loop(t) {
    timer = t;
    setInterval(mainLoop, t);
};
