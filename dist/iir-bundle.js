(function () {
    'use strict';

    const MIDI = {
        NOTE_ON: 144,
        NOTE_OFF: 128,
        MSG_CTRL: 176
    };

    function noteLimit(note) {
        while (note < 0) {
            note += 12;
        }
        while (note > 120) {
            note -= 12;
        }
        return note;
    }

    function range(start, end, step) {
        // step defaults to 1
        step = step ? step : 1;
        var out = [];
        for (let i = start; i <= end; i += step) {
            out.push(i);
        }
        return out;
    }

    let s = document.createElement('style');
    let mc = document.createElement('div');

    document.head.insertBefore(s, document.head.firstChild);

    s.innerHTML = `.midi-console {
    margin: 1em 0;
    padding: 1em;
    font-family: monospace;
    white-space: pre;
    font-size: 0.75em;
    background-color: #f2f2f2;
}`;

    mc.className = 'midi-console';

    document.querySelector('#main').appendChild(mc);

    function log(txt) {
        var args = [].slice.call(arguments);
        var lines = mc.innerText.split("\n");
        mc.innerText = lines.slice(Math.max(lines.length - 30, 0)).join('\n') + args.join(' ') + "\n";
        return args;
    }

    let noteCounter = 0;

    class Voice {
        constructor(delegate) {
            this.delegate = delegate;
            this.playing = false;
            this.counter = -1;
            this.note = -1;
        }

        start(note, velocity) {
            this.note = note;
            noteCounter++;
            this.counter = noteCounter;
            this.playing = true;
            this.delegate.start(note, velocity);
        }

        end() {
            this.delegate.end();
            this.playing = false;
        }
    }

    class Instrument {
        constructor(master) {
            this.master = master;
            this.audioCtx = master.context;
            this.channel = this.audioCtx.createGain();
            this.attack = 0;
            this.sustain = 0;
            this.decay = 0.5;
            this.release = 0;
            var filter = this.filter(master);
            this.channel.connect(filter);
            this.voices = (Array(10).fill(false)).map((i) => {
                return new Voice(this.voice());
            });
        }

        static get C0() {
            return 16.351597831287415;
        }

        static noteToFrequency(note) {
            let f = Instrument.C0 * Math.pow(2, note / 12);
            return Instrument.roundDecimals(f, 10000);
        }

        static roundDecimals(num, precision) {
            return Math.round(num * precision) / precision;
        }

        get attack() { return this._attack }
        set attack(n) { this._attack = n; }

        get sustain() { return this._sustain }
        set sustain(n) { this._sustain = n; }

        get decay() { return this._decay }
        set decay(n) { this._decay = n; }

        get release() { return this._release }
        set release(n) { this._release = n; }

        filter(connection) {
            var gain = this.audioCtx.createGain();
            gain.connect(connection);
            return gain;
        }

        generator(connection) {
            let osc = this.audioCtx.createOscillator();
            osc.type = 'sine';
            osc.connect(connection);
            osc.start();
            return osc;
        }

        voice() {
            return {
                start: (note, velocity) => { },
                end: () => { }
            }
        }

        voice() {
            let voiceGain = this.audioCtx.createGain();
            voiceGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
            voiceGain.connect(this.channel);
            let osc = this.generator(voiceGain);
            return {
                start: (note, velocity) => {
                    var freq = Instrument.noteToFrequency(note);
                    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
                    voiceGain.gain.setValueAtTime(1, this.audioCtx.currentTime + this.attack);
                    setTimeout(() => {
                        voiceGain.gain.linearRampToValueAtTime(this.sustain, this.audioCtx.currentTime + this.decay);
                    }, this.attack * 1000);
                },
                end: () => {
                    voiceGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + this.release);
                }
            }
        }

        // Sets the gain for the entire instrument
        gain(val) {
            this.channel.gain.linearRampToValueAtTime(val, this.audioCtx.currentTime + 0.05);
        }

        midi(packet) {
            let msg = packet[0];
            let note = packet[1];
            let vel = packet[2];
            if (msg == MIDI.NOTE_ON) {
                this.start(note, vel);
            } else if (msg == MIDI.NOTE_OFF) {
                this.end(note);
            }
        }

        start(note, velocity) {
            this.voices[0].start(note, velocity);
            this.sortVoices();
        }

        end(note) {
            this.voices.map((v) => (v.note == note) ? v.end() : false);
        }

        sortVoices() {
            this.voices.sort((a, b) => {
                // neither playing
                if (!(a.playing || b.playing)) {
                    return 0;
                }
                // both playing
                if (a.playing && b.playing) {
                    return a.counter < b.counter ? -1 : 1;
                }
                return a.playing ? 1 : -1;
            });
        }
    }

    class Keyboard extends Instrument {
        constructor(master) {
            super(master);
            this.attack = 0;
            this.sustain = 0.4;
            this.decay = 0.3;
            this.release = 0.5;
        }

        generator(connection) {
            let osc = this.audioCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.connect(connection);
            osc.start();
            return osc;
        }

        filter(connection) {
            var biquadFilter = this.audioCtx.createBiquadFilter();
            biquadFilter.type = "lowpass";
            biquadFilter.frequency.setValueAtTime(550, this.audioCtx.currentTime);
            biquadFilter.Q.setValueAtTime(8, this.audioCtx.currentTime);

            let compressor = this.audioCtx.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-30, this.audioCtx.currentTime);
            compressor.knee.setValueAtTime(10, this.audioCtx.currentTime);
            compressor.ratio.setValueAtTime(1.5, this.audioCtx.currentTime);
            compressor.attack.setValueAtTime(0.005, this.audioCtx.currentTime);
            compressor.release.setValueAtTime(0.05, this.audioCtx.currentTime);

            biquadFilter.connect(compressor);
            compressor.connect(connection);
            return biquadFilter;
        }
    }

    const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
    let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let master = audioCtx.createGain();
    master.connect(audioCtx.destination);

    let inst = new Keyboard(master);
    inst.gain(0.3);

    Array.prototype.randomChoice = function () {
        return this[Math.floor(Math.random() * this.length)];
    };

    function buildScale(basis, offset) {
        let scale = [];
        let transposed = basis.map((i) => {
            i += offset;
            while (i > 12) { i -= 12; }
            return i;
        });
        range(0, 120).forEach((i) => {
            let cmp = i;
            while (cmp > 12) { cmp -= 12; }
            if (transposed.includes(cmp)) { scale.push(i); }
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
    }
    function loop(t) {
        timer = t;
        setInterval(mainLoop, t);
    }

    loop(400);

}());
