// Ambiance sonore synthétisée (aucun fichier) : pièce, horloge, plume, papier, tabouret.
let ctx = null;
let master = null;
let noiseBuf = null;

function noiseBuffer() {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function noise(loop = false) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = loop;
  return src;
}

export function startAudio() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  noiseBuf = noiseBuffer();
  master = ctx.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 3);
  master.connect(ctx.destination);

  // fond de pièce : souffle sourd
  const room = noise(true);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 280;
  const rg = ctx.createGain();
  rg.gain.value = 0.05;
  room.connect(lp).connect(rg).connect(master);
  room.start();

  // horloge : tic… tac…
  let tick = 0;
  const next = () => {
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    const src = noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = tick++ % 2 ? 2600 : 3300;
    bp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(bp).connect(g).connect(master);
    src.start(t, Math.random());
    src.stop(t + 0.08);
    setTimeout(next, 1000);
  };
  next();
}

// grattement de plume sur le papier
export function scratch(duration = 0.12, strength = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = noise();
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3200 + Math.random() * 2500;
  bp.Q.value = 1.4;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  const g = ctx.createGain();
  const peak = (0.05 + Math.random() * 0.05) * strength;
  g.gain.setValueAtTime(0.0001, t);
  // petites saccades, comme une pointe qui accroche les fibres
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    g.gain.linearRampToValueAtTime(peak * (0.4 + Math.random() * 0.6), t + (duration * i) / (steps + 1));
  }
  g.gain.linearRampToValueAtTime(0.0001, t + duration);
  src.connect(hp).connect(bp).connect(g).connect(master);
  src.start(t, Math.random());
  src.stop(t + duration + 0.02);
}

// froissement de papier
export function rustle(duration = 0.7) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = noise();
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  for (let i = 0; i < 14; i++) {
    g.gain.linearRampToValueAtTime(Math.random() * 0.22, t + (duration * i) / 14);
  }
  g.gain.linearRampToValueAtTime(0.0001, t + duration);
  src.connect(bp).connect(g).connect(master);
  src.start(t, Math.random());
  src.stop(t + duration + 0.05);
}

// craquement du tabouret qui pivote : grains de bois rapprochés
export function creak(duration = 1.6) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 700;
  bp.Q.value = 4;
  const g = ctx.createGain();
  g.gain.value = 0.5;
  bp.connect(g).connect(master);
  let t = 0;
  while (t < duration) {
    const env = Math.sin((t / duration) * Math.PI);
    const rate = 35 + 30 * Math.sin(t * 5) + Math.random() * 10;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 500 + Math.random() * 400;
    const og = ctx.createGain();
    const st = t0 + t;
    og.gain.setValueAtTime(0.0001, st);
    og.gain.exponentialRampToValueAtTime(0.02 + 0.07 * env, st + 0.002);
    og.gain.exponentialRampToValueAtTime(0.0001, st + 0.012);
    osc.connect(og).connect(bp);
    osc.start(st);
    osc.stop(st + 0.015);
    t += 1 / rate;
  }
}
