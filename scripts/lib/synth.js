const THRESHOLD = 0.0001;
const MINIMUM = 0.000001;

/**
 *
 * @param {AudioContext} ctx
 * @param {GainOptions} config
 */
function createAmplifier(ctx, config) {
  let node = new GainNode(ctx, config);

  function connect(next) {
    node.connect(next.node);
  }

  return { connect, node };
}

/**
 *
 * @param {AudioContext} ctx
 * @param {StereoPannerOptions} config
 */
function createPanner(ctx, config) {
  let node = new StereoPannerNode(ctx, config);

  function connect(next) {
    node.connect(next.node);
  }

  return { connect, node };
}

/**
 *
 * @param {AudioContext} ctx
 * @param {OscillatorOptions} config
 */
function createOscillator(ctx, config) {
  let node = new OscillatorNode(ctx, config);

  function start(frequency) {
    node.frequency.setValueAtTime(frequency, ctx.currentTime);
    node.start();
  }

  function stop(time) {
    node.stop(time);
  }

  function connect(next) {
    node.connect(next.node);
  }

  return { start, stop, connect, node };
}

/**
 * @typedef {Object} EnvelopeOptions
 * @property {number} attack
 * @property {number} decay
 * @property {number} sustain
 * @property {number} release
 *
 * @param {AudioContext} ctx
 * @param {EnvelopeOptions} config
 */
function createEnvelope(ctx, config) {
  let node = new GainNode(ctx, { gain: MINIMUM });

  function start() {
    let peakTime = ctx.currentTime + config.attack + THRESHOLD;

    node.gain.exponentialRampToValueAtTime(1.0, peakTime);
    node.gain.exponentialRampToValueAtTime(
      config.sustain + THRESHOLD,
      peakTime + config.decay
    );
  }

  function stop() {
    // uses logarithmic scale - minimum can't be 0 (get very close to 0)
    // log scale mimics human ear perception of sound (i.e. pitches)
    // also trying to eliminate annoying click at end of note release 🤦‍♂️
    node.gain.setValueAtTime(node.gain.value, ctx.currentTime);
    node.gain.exponentialRampToValueAtTime(
      MINIMUM,
      ctx.currentTime + Math.max(config.release, THRESHOLD)
    );
  }

  function connect(next) {
    node.connect(next.node);
  }

  return { start, stop, connect, node };
}

/**
 * @typedef {Object} MasterOptions
 * @property {number} volume
 * @property {number} pan
 *
 * @typedef {Object} EnvelopeOptions
 * @property {number} attack
 * @property {number} decay
 * @property {number} sustain
 * @property {number} release
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
    let amp = createAmplifier(ctx, { gain: config.master.volume });
    let envelope = createEnvelope(ctx, config.envelope);
    let osc = createOscillator(ctx, { type: config.oscillator.wave });

    osc.connect(amp);
    amp.connect(envelope);
    envelope.connect(pan);
    pan.connect({ node: ctx.destination });

    envelope.start();
    osc.start(frequency);

    // components aka nodes are single use only - create & cache for each note
    nodes[key] = { osc, ctx, envelope };
  }

  function stop(key) {
    let node = nodes[key];

    if (node) {
      node.envelope.stop();
      node.osc.stop(node.ctx.currentTime + config.envelope.release);

      setTimeout(() => {
        node.ctx.close();
      }, 1000 * Math.max(config.envelope.release, THRESHOLD));
    }

    delete nodes[key];
  }

  return { start, stop };
}
