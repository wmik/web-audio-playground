/**
 *
 * @param {AudioContext} ctx
 * @param {GainOptions} config
 */
function createAmplifier(ctx, config) {
  return new GainNode(ctx, config);
}

/**
 *
 * @param {AudioContext} ctx
 * @param {StereoPannerOptions} config
 */
function createPanner(ctx, config) {
  return new StereoPannerNode(ctx, config);
}

/**
 *
 * @param {AudioContext} ctx
 * @param {OscillatorOptions} config
 */
function createOscillator(ctx, config) {
  return new OscillatorNode(ctx, config);
}

/**
 * @typedef {Object} MasterOptions
 * @property {number} volume
 * @property {number} pan
 *
 * @typedef {Object} OscillatorOptions
 * @property {('sine'|'triangle'|'sawtooth'|'square')} wave
 *
 * @typedef {Object} SynthOptions
 * @property {MasterOptions} master
 * @property {OscillatorOptions} oscillator
 *
 * @param {SynthOptions} config
 */
export default function createSynthesizer(config) {
  let nodes = {};

  function start(frequency, key) {
    let ctx = new AudioContext();
    let pan = createPanner(ctx, { pan: config.master.pan });
    let amp = createAmplifier(ctx, { gain: 0.0 });
    let osc = createOscillator(ctx, { type: config.oscillator.wave });

    osc.connect(amp);
    amp.connect(pan);
    pan.connect(ctx.destination);
    osc.start();

    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(
      config.master.volume,
      ctx.currentTime
    );

    // components aka nodes are single use only - create & cache for each note
    nodes[key] = { osc, amp, ctx };
  }

  function stop(time, key) {
    const THRESHOLD = 0.0001;

    let node = nodes[key];

    if (node) {
      node.amp.gain.setValueAtTime(node.amp.gain.value, node.ctx.currentTime);
      // uses logarithmic scale - minimum can't be 0 (get very close to 0)
      // log scales mimics human ear perception of sound (i.e. pitches)
      // also trying to eliminate annoying click at end of note release 🤦‍♂️
      node.amp.gain.exponentialRampToValueAtTime(
        0.000001,
        node.ctx.currentTime
      );
      node.osc.stop(node.ctx.currentTime + (time ?? 0));
    }

    delete nodes[key];

    setTimeout(() => {
      node.ctx.close();
    }, 1000 * Math.min(time, THRESHOLD));
  }

  return { start, stop };
}
