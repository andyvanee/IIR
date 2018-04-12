import { Voice } from './voice.js';
import { MIDI } from './helpers.js';

export class Instrument {
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
    set attack(n) { this._attack = n }

    get sustain() { return this._sustain }
    set sustain(n) { this._sustain = n }

    get decay() { return this._decay }
    set decay(n) { this._decay = n }

    get release() { return this._release }
    set release(n) { this._release = n }

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
                    voiceGain.gain.linearRampToValueAtTime(this.sustain, this.audioCtx.currentTime + this.decay)
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
