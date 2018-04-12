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

export function log(txt) {
    var args = [].slice.call(arguments);
    var lines = mc.innerText.split("\n");
    mc.innerText = lines.slice(Math.max(lines.length - 30, 0)).join('\n') + args.join(' ') + "\n";
    return args;
}
