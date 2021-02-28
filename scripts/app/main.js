import createSynthesizer from '../lib/synth';

let synth = createSynthesizer({
  master: { volume: 1, pan: 0 },
  oscillator: { wave: 'sine' }
});

let a4 = document.getElementById('a4');

a4.addEventListener('mousedown', () => {
  synth.start(440);
});

a4.addEventListener('mouseup', () => {
  synth.stop();
});
