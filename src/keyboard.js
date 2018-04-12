import { Instrument } from './instrument.js';

export class Keyboard extends Instrument {
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
