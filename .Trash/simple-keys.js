const NOTE_MIN = 0;
const NOTE_MAX = 120;
const MSG_NOTE_ON = 144;
const MSG_NOTE_OFF = 128;
const MSG_CTRL = 176;
const INTERVAL = Math.sqrt(1/12);
const NOTE_FILTER = 74;
const NOTE_RESO = 71;
const C0 = 16.351597831287415;
var accuracy = 0;
const NOTE_RAMP = 2;

var audioCtx, noteDest;
var notes = {};

// negative / positive curvature
var expramp = function(x, curvature) {
    var y = x;
    if (curvature != 0) {
        y = (Math.exp(curvature * x) - 1) / (Math.exp(curvature)-1);
    };
    return y;
}

let veloWidth = () => {
    return Math.floor(window.innerWidth / 128);
}

let inRange = (note, min, max) => {
    return (note >= min && max >= note);
}

let note = (id) => {
    var oscillator, gain;
    let n = bindVal('div');
    let noteid = id - NOTE_MIN;
    let freq = C0 * Math.pow(2, noteid / 12);
    freq = (Math.round(freq * 10000) / 10000.0);
    n.node.setAttribute('data-note', id);
    n.node.style.width = '20px';
    n.node.className = 'note';
    n.text(id);
    gain = audioCtx.createGain();
    gain.connect(noteDest);

    return {
        start: (vel) => {
            var factor = expramp((vel / 128.0), NOTE_RAMP);
            gain.gain.setValueAtTime(factor, audioCtx.currentTime);
            oscillator = audioCtx.createOscillator();
            oscillator.type = 'sawtooth';
            var detune = (Math.random() * accuracy) - (accuracy / 2);
            oscillator.frequency.setValueAtTime(freq + detune, audioCtx.currentTime); // value in hertz
            oscillator.connect(gain);
            oscillator.start();
        },
        stop: () => {
            if (oscillator) {
                oscillator.stop();
                oscillator = false;
            }
        },
        node: n.node,
        id: 'note-'+id
    }
}

function setup() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var filterLo = audioCtx.createBiquadFilter();
    filterLo.type = 'lowpass';
    var filter = audioCtx.createBiquadFilter();
    filter.type = 'peaking';

    filter.connect(filterLo);
    filterLo.connect(audioCtx.destination);
    noteDest = filter;

    var main = document.querySelector('#main');
    var msgP = bindVal('p');
    msgP.node.className = 'stat';
    main.appendChild(msgP.node);

    var noteP = bindVal('p');
    noteP.node.className = 'stat';
    main.appendChild(noteP.node);

    var velP = bindVal('p');
    velP.node.className = 'stat';
    main.appendChild(velP.node);

    for (let i = NOTE_MIN; i <= NOTE_MAX; i++) {
        let n = note(i);
        notes[n.id] = n;
        main.appendChild(n.node);
    }

    function onMIDIMessage(m) {
        var msg = m.data[0];
        var note = m.data[1];
        var vel = m.data[2];
        var note_vel = expramp((vel / 127.0), NOTE_RAMP);
        note_vel = Math.round(note_vel * 10000) / 10000.0;

        if (msg === MSG_NOTE_ON) {
            if (inRange(note, NOTE_MIN, NOTE_MAX)) {
                var n = notes['note-'+note];
                n.node.style.width = (note_vel * 128 * veloWidth()) + 20 + 'px';
                n.start(vel);
            }
        }
        if (msg === MSG_NOTE_OFF) {
            if (inRange(note, NOTE_MIN, NOTE_MAX)) {
                var n = notes['note-'+note];
                n.node.style.width = 20 + 'px';
                n.stop();
            }
        }
        if (msg === MSG_CTRL) {
            if (note === NOTE_FILTER) {
                let a = 60;
                let b = 3000;
                var f = (note_vel * (b-a)) + a;
                filter.frequency.linearRampToValueAtTime(f, audioCtx.currentTime + 0.02);
                filterLo.frequency.linearRampToValueAtTime(f, audioCtx.currentTime + 0.02);
            } else if (note == NOTE_RESO) {
                let a = -3;
                let b = 3.4;
                var f = (note_vel * (b-a)) + a;
                filter.Q.linearRampToValueAtTime(f, audioCtx.currentTime + 0.02);
                filter.gain.linearRampToValueAtTime(f, audioCtx.currentTime + 0.02);
                filterLo.Q.linearRampToValueAtTime(f, audioCtx.currentTime + 0.02);
                console.log(filter.gain);
            }
        }
        msgP.text('msg: ' + msg);
        noteP.text('note: '+note);
        velP.text('vel: '+vel+'-'+note_vel);
    }

    navigator.requestMIDIAccess().then(function(access) {
        // Get lists of available MIDI controllers
        const inputs = access.inputs.values();
        const outputs = access.outputs.values();

        for (var i = inputs.next(); i && !i.done; i = inputs.next()) {
            i.value.onmidimessage = onMIDIMessage;
        }
    });

    window.onkeydown = function(ev) {
        console.log('keydown');
        var note_vel = 80;
        if (ev.code == 'KeyA') {
            var n = notes['note-48'];
            n.node.style.width = (note_vel * 128 * veloWidth()) + 20 + 'px';
            n.start(48);
        }
    }
    window.onkeyup = function(ev) {
        console.log('keyup');
        if (ev.code == 'KeyA') {
            var n = notes['note-48'];
            n.node.style.width = 20 + 'px';
            n.stop();
        }
    }
}

function draw() {

}

function bindVal(elem) {
    var node = document.createElement(elem);
    return {
        text: function(text) {
            node.innerText = text;
        },
        node: node
    };
};

window.addEventListener('load', function() {
    setup();
    function mainLoop() {
        draw();
        requestAnimationFrame(mainLoop);
    };
    mainLoop();
});
