import { useEffect, useRef, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────
type SoundMode = 'lofi' | 'gamma' | 'off';

interface SoundscapeProps {
  isDrowsy: boolean;
  initialMode?: SoundMode;
}

// ── Component ──────────────────────────────────────────────────────────
export const Soundscape = ({ isDrowsy, initialMode = 'off' }: SoundscapeProps) => {
  const [mode, setMode]         = useState<SoundMode>(initialMode);
  const [initialized, setInit]  = useState(false);

  const audioCtx  = useRef<AudioContext | null>(null);
  const gainNode  = useRef<GainNode | null>(null);
  const oscs      = useRef<OscillatorNode[]>([]);

  // ── Audio builders ──────────────────────────────────────────────────
  const stopAll = () => {
    oscs.current.forEach(o => { try { o.stop(); } catch (_) {} });
    oscs.current = [];
  };

  /**
   * Lo-Fi ambient pad: stacked sine + triangle oscillators at harmonic
   * intervals with a slow LFO tremolo on each voice.
   */
  const buildLofi = (ctx: AudioContext, master: GainNode) => {
    stopAll();
    const harmonics = [82.4, 110, 146.8, 196.0, 261.6]; // E2, A2, D3, G3, C4

    harmonics.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      oscGain.gain.value  = 0.28 / (i + 1);

      // Slow LFO tremolo
      const lfo     = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.25 + i * 0.07;
      lfoGain.gain.value  = 0.04;
      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);

      osc.connect(oscGain);
      oscGain.connect(master);

      osc.start();
      lfo.start();
      oscs.current.push(osc, lfo);
    });
  };

  /**
   * 40Hz Gamma entrainment: base carrier + 40Hz beat.
   * Binaural: left ear gets 200Hz, right gets 240Hz → brain hears 40Hz beat.
   * (In mono mode we just pulse a 40Hz amplitude modulation.)
   */
  const buildGamma = (ctx: AudioContext, master: GainNode) => {
    stopAll();

    // Carrier
    const carrier = ctx.createOscillator();
    const cGain   = ctx.createGain();
    carrier.frequency.value = 200;
    carrier.type = 'sine';
    cGain.gain.value = 0.1;
    carrier.connect(cGain);
    cGain.connect(master);
    carrier.start();

    // 40Hz AM modulator
    const mod  = ctx.createOscillator();
    const mGain = ctx.createGain();
    mod.frequency.value = 40;
    mod.type = 'sine';
    mGain.gain.value = 0.08;
    mod.connect(mGain);
    mGain.connect(cGain.gain);
    mod.start();

    oscs.current.push(carrier, mod);
  };

  // ── Init / mode switch ─────────────────────────────────────────────
  const initAndPlay = (newMode: SoundMode) => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNode.current = audioCtx.current.createGain();
      gainNode.current.gain.value = 0.07;
      gainNode.current.connect(audioCtx.current.destination);
    }

    const ctx    = audioCtx.current;
    const master = gainNode.current!;

    setMode(newMode);
    setInit(true);

    if (newMode === 'off') {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      return;
    }

    master.gain.setTargetAtTime(0.07, ctx.currentTime, 0.4);
    if (newMode === 'lofi')  buildLofi(ctx, master);
    if (newMode === 'gamma') buildGamma(ctx, master);
  };

  // ── Drowsy response ────────────────────────────────────────────────
  useEffect(() => {
    if (!gainNode.current || !audioCtx.current || mode === 'off') return;

    const ctx = audioCtx.current;
    const targetGain = isDrowsy ? 0.13 : 0.07;
    gainNode.current.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.8);

    // Slightly raise oscillator frequencies when drowsy for alertness
    oscs.current.forEach(o => {
      if (o.frequency) {
        const current = o.frequency.value;
        const target  = isDrowsy ? current * 1.10 : current / 1.10;
        o.frequency.setTargetAtTime(target, ctx.currentTime, 0.8);
      }
    });
  }, [isDrowsy, mode]);

  // ── Cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopAll();
      audioCtx.current?.close();
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 text-xs text-white/30">
      <span style={{ fontFamily: 'monospace' }}>
        {mode === 'off' ? '♪ Silent' : mode === 'lofi' ? '♪ Lo-Fi Active' : '♪ 40Hz Gamma'}
        {isDrowsy && mode !== 'off' && ' · ⚡ Boosted'}
      </span>

      <div className="flex gap-2">
        {(['lofi', 'gamma', 'off'] as SoundMode[]).map(m => (
          <button
            key={m}
            onClick={() => initAndPlay(m)}
            className={`px-3 py-1 rounded-full border text-xs transition-all ${
              mode === m
                ? 'border-teal-500/40 bg-teal-500/10 text-teal-300'
                : 'border-white/10 bg-white/5 text-white/40 hover:text-white/70'
            }`}
          >
            {m === 'lofi' ? 'Lo-Fi' : m === 'gamma' ? '40Hz' : 'Off'}
          </button>
        ))}
      </div>
    </div>
  );
};
