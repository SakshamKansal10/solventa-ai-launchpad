import { mulberry32 } from "../math";
import type { Cue, Mix } from "./score";

/**
 * The soundtrack, synthesised live with the Web Audio API — no audio files.
 * A quiet machine in a large space: an ambient bed, low tension, a spatial
 * harmonic pad, fine computation ticks and a forward pulse (continuous layers
 * driven by the score's Mix), plus restrained one-shot cues (activation,
 * mechanical locks, signal pings, the reveal, resolution, evidence, rerouting,
 * the finale). Everything runs through one generated reverb and a gentle
 * compressor. Works on any BaseAudioContext, so it can be rendered offline
 * for level checks exactly as it plays live.
 */

/** D-lydian palette (Hz). */
const N = {
  E1: 41.2,
  A1: 55,
  D2: 73.42,
  E2: 82.41,
  A2: 110,
  D3: 146.83,
  Fs3: 185,
  A3: 220,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  A4: 440,
  B4: 493.88,
  Cs5: 554.37,
  D5: 587.33,
  E5: 659.26,
  Fs5: 739.99,
  A5: 880,
  B5: 987.77,
  D6: 1174.66,
} as const;

const TAU = 0.25;
const LOOKAHEAD = 0.15;

export class SoundEngine {
  readonly ctx: BaseAudioContext;
  private out: GainNode;
  private dry: GainNode;
  private send: GainNode;
  private verbOut: GainNode;
  private bedGain: GainNode;
  private bedFilter: BiquadFilterNode;
  private tensionGain: GainNode;
  private padGain: GainNode;
  private padPans: { pan: StereoPannerNode; side: number }[] = [];
  private noise: AudioBuffer;
  private rand = mulberry32(2026);
  private nextPulse = 0;
  /** End times of the one-shot voices still sounding (polyphony cap). */
  private busy: number[] = [];
  /** Post-compressor tap: lets tests measure what actually reaches the speakers. */
  readonly analyser: AnalyserNode;
  private probe = new Float32Array(2048);
  private mix: Mix | null = null;
  private sources: AudioScheduledSourceNode[] = [];

  constructor(ctx: BaseAudioContext, destination: AudioNode = ctx.destination) {
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 14;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.3;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    comp.connect(this.analyser);
    this.analyser.connect(destination);
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(comp);
    this.dry = ctx.createGain();
    this.dry.gain.value = 0.9;
    this.dry.connect(this.out);
    // One shared space: a generated, slowly decaying stereo room.
    const verb = ctx.createConvolver();
    verb.buffer = this.impulse(3.4, 2.6);
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.55;
    this.verbOut = verbOut;
    verb.connect(verbOut).connect(this.out);
    this.send = ctx.createGain();
    this.send.gain.value = 1;
    this.send.connect(verb);
    this.noise = this.noiseBuffer(4);

    // Bed: low partials and air through one slowly breathing low-pass.
    this.bedFilter = ctx.createBiquadFilter();
    this.bedFilter.type = "lowpass";
    this.bedFilter.frequency.value = 300;
    this.bedFilter.Q.value = 0.6;
    this.bedGain = ctx.createGain();
    this.bedGain.gain.value = 0;
    this.bedFilter.connect(this.bedGain);
    this.bedGain.connect(this.dry);
    this.wet(this.bedGain, 0.35);
    for (const [f, type, g, detune] of [
      [N.A1, "sine", 0.32, 0],
      [N.E2, "sine", 0.2, 4],
      [N.A2, "triangle", 0.07, -3],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = detune;
      const gg = ctx.createGain();
      gg.gain.value = g;
      o.connect(gg).connect(this.bedFilter);
      this.start(o);
    }
    const air = ctx.createBufferSource();
    air.buffer = this.noise;
    air.loop = true;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.05;
    air.connect(airGain).connect(this.bedFilter);
    this.start(air);
    // Field resonance: the filter drifts very slowly.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const depth = ctx.createGain();
    depth.gain.value = 60;
    lfo.connect(depth).connect(this.bedFilter.frequency);
    this.start(lfo);

    // Tension: two close sub tones beating slowly under a low-pass.
    this.tensionGain = ctx.createGain();
    this.tensionGain.gain.value = 0;
    const tLp = ctx.createBiquadFilter();
    tLp.type = "lowpass";
    tLp.frequency.value = 140;
    tLp.connect(this.tensionGain).connect(this.dry);
    for (const f of [N.E1, N.E1 * 1.018, N.E2 * 0.999]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      o.connect(tLp);
      this.start(o);
    }

    // Pad: an open D chord, voices spread across the stereo field.
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    const padLp = ctx.createBiquadFilter();
    padLp.type = "lowpass";
    padLp.frequency.value = 2400;
    padLp.connect(this.padGain);
    this.padGain.connect(this.dry);
    this.wet(this.padGain, 0.9);
    [N.D3, N.A3, N.E4, N.Fs4, N.A4].forEach((f, i) => {
      const side = i % 2 ? 1 : -1;
      for (const det of [-5, 5]) {
        const o = ctx.createOscillator();
        o.type = i === 0 ? "sine" : "triangle";
        o.frequency.value = f;
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.value = 0.05;
        const pan = ctx.createStereoPanner();
        pan.pan.value = 0;
        o.connect(g).connect(pan).connect(padLp);
        this.padPans.push({ pan, side: side * (0.35 + i * 0.13) * (det > 0 ? 1 : 0.7) });
        this.start(o);
      }
    });
  }

  /** Fade the whole soundtrack in or out (mute). */
  setLevel(level: number, time: number, tau = 0.4) {
    this.out.gain.setTargetAtTime(level * 0.6, time, tau);
  }

  /** Follow the score: smooth every continuous layer toward the mix, schedule textures ahead. */
  update(mix: Mix, time: number) {
    this.mix = mix;
    const m = mix.master;
    // Breaths reach the tails too: a near-silence is not filled by ringing reverb.
    this.dry.gain.setTargetAtTime(0.9 * (0.2 + 0.8 * m), time, TAU);
    this.verbOut.gain.setTargetAtTime(0.55 * (0.12 + 0.88 * m), time, TAU);
    this.bedGain.gain.setTargetAtTime(mix.bed * 0.5 * m, time, TAU);
    this.bedFilter.frequency.setTargetAtTime(mix.cutoff, time, TAU * 1.6);
    this.tensionGain.gain.setTargetAtTime(mix.tension * 0.42 * m, time, TAU * 1.4);
    this.padGain.gain.setTargetAtTime(mix.pad * 0.55 * m, time, TAU * 2);
    for (const { pan, side } of this.padPans) pan.pan.setTargetAtTime(side * mix.width, time, 0.6);

    // The path: a soft, steady forward pulse.
    if (mix.pulse > 0.01) {
      if (this.nextPulse < time) this.nextPulse = time;
      while (this.nextPulse < time + LOOKAHEAD) {
        this.thump(this.nextPulse, mix.pulse * 0.5 * m);
        this.nextPulse += 0.86;
      }
    }
  }

  /** Output level right now (RMS of what reaches the destination; 0 = silence). */
  level(): number {
    this.analyser.getFloatTimeDomainData(this.probe);
    let sum = 0;
    for (let k = 0; k < this.probe.length; k++) sum += this.probe[k] * this.probe[k];
    return Math.sqrt(sum / this.probe.length);
  }

  /** A soft confirmation for a real interface interaction (tabs in the product preview). */
  ui(time: number) {
    this.click(time, 0.05, 4200, 0);
    this.tone(N.E5, time, 0.025, { decay: 0.35, wet: 0.3 });
  }

  /** One-shot cue at `time`. Minor cues yield when too many voices already sound. */
  play(cue: Cue, time: number) {
    this.busy = this.busy.filter((end) => end > time);
    if (!cue.major && this.busy.length >= 24) return;
    this.busy.push(time + (cue.major ? 8 : 1.6));
    const i = cue.index;
    const m = this.mix?.master ?? 1;
    switch (cue.kind) {
      case "motif":
        // The signature motif: two delicate bell tones, a fifth apart, in a large space
        // (index 1: its return in scene 22 — the same phrase, quieter, further away).
        this.bell(N.D5, time, 0.06 * (1 - 0.35 * i), 3.8, -0.25);
        this.bell(N.A5, time + 0.42, 0.045 * (1 - 0.35 * i), 4.2, 0.25);
        this.tone(N.D2, time, 0.06, { attack: 2, decay: 5, wet: 0.5 + 0.3 * i });
        break;
      case "kernel":
        // The Engine is complete: a deep, refined harmonic activation.
        this.tone(N.D2, time, 0.18 * m, { attack: 0.9, decay: 5.5, wet: 0.45 });
        [N.D3, N.A3, N.D4].forEach((f, k) =>
          this.tone(f, time + k * 0.05, 0.05 * m, {
            attack: 0.7,
            decay: 5,
            wet: 0.8,
            pan: (k - 1) * 0.35,
          }),
        );
        this.bell(N.D6, time + 0.5, 0.025 * m, 3.4, 0.2);
        break;
      case "evaluate": {
        // One evaluation: a short, pitched information event per territory as a wave reaches it.
        const notes = [N.A4, N.Cs5, N.E5, N.Fs5, N.A5];
        this.click(time, 0.05 * m, 3000 + i * 1600, i * 1.4 - 0.7);
        this.tone(notes[Math.round(i * 4)], time, 0.022 * m, {
          decay: 0.45,
          wet: 0.6,
          pan: i * 1.4 - 0.7,
        });
        break;
      }
      case "compare":
        // The comparison: a focused processing pulse where each future stands (left → right).
        this.click(time, 0.04 * m, 2200 + i * 900, i * 1.2 - 0.6);
        this.tone(N.D3, time, 0.03 * m, { decay: 0.7, wet: 0.5, pan: i * 1.2 - 0.6 });
        this.tone(N.A3, time + 0.02, 0.018 * m, { decay: 0.6, wet: 0.6, pan: i * 1.2 - 0.6 });
        break;
      case "stabilize":
        // The revised direction holds: a gentle, resolved chord.
        [N.D4, N.Fs4, N.A4].forEach((f, k) =>
          this.tone(f, time + k * 0.04, 0.045 * m, {
            attack: 0.3,
            decay: 3.6,
            wet: 0.75,
            pan: (k - 1) * 0.4,
            type: "triangle",
          }),
        );
        break;
      case "flyby":
        this.sweep(time, 0.12 * m, [380, 2600, 700], 1.2, -0.7 + 1.4 * i);
        break;
      case "lock":
        this.click(time, 0.22 * m, 2400, 0);
        this.tone(N.A5 * Math.pow(2, (-i * 5) / 12), time, 0.05 * m, { decay: 0.35, wet: 0.5 });
        break;
      case "signal": {
        const notes = [N.D5, N.E5, N.Fs5, N.A5, N.B5, N.D6];
        this.bell(notes[Math.round(i * 5)], time, 0.07 * m, 1.6, -0.6 + 1.2 * i);
        break;
      }
      case "align":
        this.click(time, 0.16 * m, 1100 - i * 300, (i - 0.5) * 0.4);
        this.tone(N.A3 * Math.pow(2, (-i * 7) / 12), time, 0.05 * m, { decay: 0.16, wet: 0.2 });
        break;
      case "unlock":
        this.drop(time, 0.34 * m, 92, 40, 0.4);
        this.sweep(time + 0.12, 0.06 * m, [2600, 700], 1.4, 0);
        break;
      case "reveal":
        this.tone(N.A1, time, 0.24 * m, { attack: 0.4, decay: 4, wet: 0.3 });
        [N.D3, N.A3, N.D4, N.Fs4, N.A4, N.E5].forEach((f, k) =>
          this.tone(f, time + k * 0.06, 0.045 * m, {
            attack: 1.6,
            decay: 6,
            pan: (k % 2 ? 1 : -1) * (0.2 + k * 0.12),
            wet: 0.9,
            type: "triangle",
          }),
        );
        break;
      case "narrow":
        this.tone(N.E4, time, 0.045 * m, { decay: 0.7, wet: 0.6, pan: -0.2 });
        this.tone(N.D4, time + 0.16, 0.05 * m, { decay: 1.1, wet: 0.6, pan: 0.2 });
        break;
      case "resolve":
        // The one: a restrained resolution, then a single gold harmonic.
        [N.D4, N.A4, N.D5].forEach((f, k) =>
          this.tone(f, time + k * 0.03, 0.065 * m, {
            attack: 0.06,
            decay: 5,
            wet: 0.7,
            type: k ? "triangle" : "sine",
          }),
        );
        this.bell(N.D6 * 2, time + 0.4, 0.02 * m, 3, 0.3);
        break;
      case "unfold":
        this.sweep(time, 0.08 * m, [260, 1600], 1.8, 0);
        this.tone(N.D3, time + 0.3, 0.06 * m, { attack: 0.5, decay: 2.5, wet: 0.6 });
        break;
      case "gate":
        if (cue.phase === "validate") {
          this.bell(N.A5 * 2, time, 0.022 * m, 0.9, i - 0.5);
        } else if (cue.phase === "build") {
          this.click(time, 0.14 * m, 1500, i * 0.6 - 0.3);
          this.tone(N.D3 * 1.335, time, 0.07 * m, { decay: 0.2, wet: 0.2 });
        } else {
          this.tone(N.D4, time, 0.04 * m, { decay: 1.6, wet: 0.8, pan: -0.6, type: "triangle" });
          this.tone(N.A4, time + 0.04, 0.035 * m, {
            decay: 1.6,
            wet: 0.8,
            pan: 0.6,
            type: "triangle",
          });
        }
        break;
      case "disruption":
        // A clean intelligent interruption: a held tone that loses its footing. Never an alarm.
        this.bend(N.Fs4, N.F4, time, 0.08 * m, 2.2);
        this.sweep(time, 0.05 * m, [900, 260], 1.6, 0);
        break;
      case "reroute": {
        const notes = [N.D4, N.Fs4, N.A4, N.Cs5, N.E5];
        this.tone(notes[Math.round(i * 4)], time, 0.05 * m, {
          decay: 0.9,
          wet: 0.7,
          pan: (Math.round(i * 4) % 2 ? 1 : -1) * 0.4,
          type: "triangle",
        });
        break;
      }
      case "handoff":
        this.click(time, 0.07 * m, 3200, 0);
        this.tone(N.A3, time, 0.05 * m, { attack: 0.01, decay: 1.4, wet: 0.35 });
        this.tone(N.E4, time + 0.05, 0.04 * m, { attack: 0.01, decay: 1.4, wet: 0.35 });
        break;
      case "link": {
        const notes = [N.D5, N.E5, N.Fs5, N.A5, N.B5];
        this.bell(notes[Math.round(i * 4)], time, 0.035 * m, 1.1, i * 1.2 - 0.6);
        break;
      }
      case "signature":
        // The emblem resolves: the opening motif returns, now complete — over the full chord.
        this.bell(N.D5, time, 0.07, 4.5, -0.25);
        this.bell(N.A5, time + 0.42, 0.055, 5, 0.25);
        this.bell(N.D6, time + 0.84, 0.035, 5.5, 0);
        this.tone(N.D2, time, 0.15 * m, { attack: 1.4, decay: 9, wet: 0.5 });
        [N.D3, N.A3, N.Fs4, N.A4, N.E5].forEach((f, k) =>
          this.tone(f, time + k * 0.08, 0.05 * m, {
            attack: 1.2,
            decay: 9,
            pan: (k % 2 ? 1 : -1) * (0.15 + k * 0.1),
            wet: 0.9,
            type: k > 2 ? "triangle" : "sine",
          }),
        );
        break;
    }
  }

  /** Stop every scheduled source (the context itself is owned by the caller). */
  dispose() {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.sources = [];
    this.out.disconnect();
  }

  // ---- voices -------------------------------------------------------------

  private start(node: AudioScheduledSourceNode, when = 0) {
    node.start(when);
    this.sources.push(node);
  }

  private wet(node: AudioNode, amount: number) {
    const g = this.ctx.createGain();
    g.gain.value = amount;
    node.connect(g).connect(this.send);
  }

  private voiceOut(gain: GainNode, pan: number, wet: number) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    gain.connect(p);
    p.connect(this.dry);
    this.wet(p, wet);
  }

  private tone(
    f: number,
    t: number,
    g: number,
    o: { attack?: number; decay?: number; pan?: number; wet?: number; type?: OscillatorType } = {},
  ) {
    const { attack = 0.008, decay = 1, pan = 0, wet = 0.5, type = "sine" } = o;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(g, t + attack);
    env.gain.setTargetAtTime(0, t + attack, decay / 4.5);
    osc.connect(env);
    this.voiceOut(env, pan, wet);
    osc.start(t);
    osc.stop(t + attack + decay + 0.1);
  }

  /** A soft FM bell: metallic but warm. */
  private bell(f: number, t: number, g: number, decay: number, pan: number) {
    const car = this.ctx.createOscillator();
    car.frequency.value = f;
    const mod = this.ctx.createOscillator();
    mod.frequency.value = f * 2.01;
    const idx = this.ctx.createGain();
    idx.gain.setValueAtTime(f * 1.2, t);
    idx.gain.setTargetAtTime(0, t, decay / 6);
    mod.connect(idx).connect(car.frequency);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(g, t + 0.006);
    env.gain.setTargetAtTime(0, t + 0.006, decay / 4.5);
    car.connect(env);
    this.voiceOut(env, pan, 0.7);
    car.start(t);
    mod.start(t);
    car.stop(t + decay + 0.2);
    mod.stop(t + decay + 0.2);
  }

  /** A held tone that slides down a semitone as its filter closes. */
  private bend(f0: number, f1: number, t: number, g: number, dur: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.setTargetAtTime(f1, t + dur * 0.35, dur * 0.2);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(2400, t);
    lp.frequency.setTargetAtTime(500, t + dur * 0.3, dur * 0.3);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(g, t + 0.25);
    env.gain.setTargetAtTime(0, t + dur * 0.6, dur * 0.25);
    osc.connect(lp).connect(env);
    this.voiceOut(env, 0, 0.6);
    osc.start(t);
    osc.stop(t + dur * 2);
  }

  /** A short filtered-noise transient: machined contact. */
  private click(t: number, g: number, freq: number, pan: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 2.2;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(g, t);
    env.gain.setTargetAtTime(0, t, 0.012);
    src.connect(bp).connect(env);
    this.voiceOut(env, pan, 0.25);
    src.start(t, this.rand() * 3);
    src.stop(t + 0.12);
  }

  /** The path's pulse: a soft low thump, felt more than heard. */
  private thump(t: number, g: number) {
    this.drop(t, g, 70, 46, 0.22);
  }

  private drop(t: number, g: number, f0: number, f1: number, dur: number) {
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(g, t + 0.01);
    env.gain.setTargetAtTime(0, t + 0.01, dur / 3);
    osc.connect(env);
    this.voiceOut(env, 0, 0.15);
    osc.start(t);
    osc.stop(t + dur * 2.5);
  }

  /** Air moving: band-passed noise sweeping through `freqs` (Hz) over `dur`. */
  private sweep(t: number, g: number, freqs: number[], dur: number, pan: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.3;
    bp.frequency.setValueAtTime(freqs[0], t);
    freqs.slice(1).forEach((f, k) => {
      bp.frequency.exponentialRampToValueAtTime(f, t + (dur * (k + 1)) / (freqs.length - 1));
    });
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(g, t + dur * 0.4);
    env.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(bp).connect(env);
    this.voiceOut(env, pan, 0.6);
    src.start(t, this.rand() * 2);
    src.stop(t + dur + 0.05);
  }

  private noiseBuffer(seconds: number) {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(rate * seconds), rate);
    const d = buf.getChannelData(0);
    const r = mulberry32(7);
    // Gently pinked (one-pole) so it reads as air, not hiss.
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      last = last * 0.82 + (r() * 2 - 1) * 0.18;
      d[i] = last * 2.6;
    }
    return buf;
  }

  private impulse(seconds: number, decay: number) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    const r = mulberry32(11);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        // Darker as it decays: a large, soft room.
        const k = 0.35 + 0.6 * (i / len);
        lp = lp * k + (r() * 2 - 1) * (1 - k);
        d[i] = lp * Math.pow(1 - i / len, decay) * 1.8;
      }
    }
    return buf;
  }
}
