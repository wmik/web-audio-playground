import createSynthesizer from '../lib/synth';

let synth = createSynthesizer({
  master: { volume: 1, pan: 0 },
  oscillator: { wave: 'sine' },
  envelope: { attack: 0.2, decay: 0.02, sustain: 0.5, release: 0.5 }
});

let a4 = document.getElementById('a4');

a4.addEventListener('mousedown', () => {
  synth.start(440, 'a4');
});

a4.addEventListener('mouseup', () => {
  synth.stop('a4');
});
