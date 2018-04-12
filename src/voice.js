let noteCounter = 0;

export class Voice {
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
