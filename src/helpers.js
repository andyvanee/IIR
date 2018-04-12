export const MIDI = {
    NOTE_ON: 144,
    NOTE_OFF: 128,
    MSG_CTRL: 176
};

export function noteLimit(note) {
    while (note < 0) {
        note += 12;
    }
    while (note > 120) {
        note -= 12;
    }
    return note;
}

export function range(start, end, step) {
    // step defaults to 1
    step = step ? step : 1;
    var out = [];
    for (let i = start; i <= end; i += step) {
        out.push(i);
    }
    return out;
}
