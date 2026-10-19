// Textures procédurales (canvas) : bois, plâtre, papiers manuscrits, nuit.
import * as THREE from 'three';

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, { repeat = [1, 1], srgb = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}

function blotches(ctx, w, h, r, n, color, alphaMax, sizeMin, sizeMax) {
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h;
    const s = sizeMin + r() * (sizeMax - sizeMin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, s);
    g.addColorStop(0, `rgba(${color},${alphaMax * r()})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
  }
}

// Plancher : lames horizontales usées.
export function floorTexture() {
  const W = 1024, H = 1024;
  const [c, ctx] = makeCanvas(W, H);
  const r = rng(7);
  const plank = 128;
  for (let y = 0; y < H; y += plank) {
    let x = -r() * 400;
    while (x < W) {
      const len = 300 + r() * 500;
      const l = 32 + r() * 22;
      ctx.fillStyle = `rgb(${l + 22},${l + 8},${l - 6})`;
      ctx.fillRect(x, y, len, plank);
      // veinage
      for (let k = 0; k < 40; k++) {
        const yy = y + r() * plank;
        ctx.strokeStyle = `rgba(${r() < 0.5 ? '15,8,4' : '90,62,40'},${0.08 + r() * 0.18})`;
        ctx.lineWidth = 0.6 + r() * 1.6;
        ctx.beginPath();
        ctx.moveTo(x, yy);
        const amp = 2 + r() * 5;
        const f = 0.004 + r() * 0.01;
        const ph = r() * 6;
        for (let xx = x; xx < x + len; xx += 12) {
          ctx.lineTo(xx, yy + Math.sin(xx * f + ph) * amp);
        }
        ctx.stroke();
      }
      // nœud
      if (r() < 0.35) {
        const kx = x + r() * len, ky = y + r() * plank;
        for (let k = 0; k < 6; k++) {
          ctx.strokeStyle = `rgba(20,10,5,${0.25 - k * 0.03})`;
          ctx.beginPath();
          ctx.ellipse(kx, ky, 6 + k * 5, 3 + k * 2.4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(5,3,2,0.9)';
      ctx.fillRect(x, y, 3, plank);
      x += len;
    }
    ctx.fillStyle = 'rgba(5,3,2,0.95)';
    ctx.fillRect(0, y, W, 3);
  }
  blotches(ctx, W, H, r, 50, '0,0,0', 0.35, 40, 160);
  blotches(ctx, W, H, r, 25, '120,95,70', 0.12, 30, 120);
  return toTexture(c, { repeat: [2, 2] });
}

// Bois du bureau, plus fin et plus chaud.
export function deskTexture() {
  const W = 1024, H = 512;
  const [c, ctx] = makeCanvas(W, H);
  const r = rng(11);
  ctx.fillStyle = '#4a2f1c';
  ctx.fillRect(0, 0, W, H);
  for (let k = 0; k < 260; k++) {
    const yy = r() * H;
    ctx.strokeStyle = `rgba(${r() < 0.6 ? '25,12,5' : '120,80,50'},${0.05 + r() * 0.2})`;
    ctx.lineWidth = 0.5 + r() * 2;
    ctx.beginPath();
    const amp = 2 + r() * 8, f = 0.003 + r() * 0.008, ph = r() * 6;
    for (let xx = 0; xx <= W; xx += 8) ctx.lineTo(xx, yy + Math.sin(xx * f + ph) * amp);
    ctx.stroke();
  }
  // rayures, taches d'encre, cernes de tasse
  for (let k = 0; k < 120; k++) {
    ctx.strokeStyle = `rgba(200,170,130,${r() * 0.12})`;
    ctx.lineWidth = 0.6;
    const x = r() * W, y = r() * H, a = r() * Math.PI, l = 10 + r() * 60;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  blotches(ctx, W, H, r, 14, '5,3,2', 0.6, 4, 18);
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = 'rgba(10,5,2,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r() * W, r() * H, 26 + r() * 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  blotches(ctx, W, H, r, 30, '0,0,0', 0.3, 40, 160);
  return toTexture(c);
}

// Mur : vieux plâtre taché laissant deviner des briques.
export function wallTexture(seed = 3) {
  const W = 1024, H = 1024;
  const [c, ctx] = makeCanvas(W, H);
  const r = rng(seed);
  ctx.fillStyle = '#5a4535';
  ctx.fillRect(0, 0, W, H);
  // briques
  const bw = 128, bh = 52;
  for (let y = 0, row = 0; y < H; y += bh, row++) {
    for (let x = row % 2 ? -bw / 2 : 0; x < W; x += bw) {
      const l = 70 + r() * 30;
      ctx.fillStyle = `rgb(${l + 20},${l - 5},${l - 25})`;
      ctx.fillRect(x + 3, y + 3, bw - 6, bh - 6);
    }
  }
  // plâtre par-dessus, irrégulier
  ctx.globalAlpha = 1;
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = r() * H, s = 60 + r() * 260;
    const g = ctx.createRadialGradient(x, y, 0, x, y, s);
    const l = 95 + r() * 30;
    g.addColorStop(0, `rgba(${l + 25},${l + 10},${l - 10},0.85)`);
    g.addColorStop(0.7, `rgba(${l + 25},${l + 10},${l - 10},0.6)`);
    g.addColorStop(1, `rgba(${l + 25},${l + 10},${l - 10},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
  }
  // coulures et taches d'humidité
  for (let i = 0; i < 25; i++) {
    const x = r() * W, y = r() * H * 0.6, len = 80 + r() * 300;
    const g = ctx.createLinearGradient(x, y, x, y + len);
    g.addColorStop(0, 'rgba(30,20,12,0.25)');
    g.addColorStop(1, 'rgba(30,20,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 4 + r() * 18, len);
  }
  blotches(ctx, W, H, r, 60, '20,12,6', 0.35, 30, 200);
  // fissures
  for (let i = 0; i < 10; i++) {
    ctx.strokeStyle = 'rgba(20,12,8,0.5)';
    ctx.lineWidth = 0.8 + r();
    let x = r() * W, y = r() * H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 14; k++) {
      x += (r() - 0.5) * 30;
      y += r() * 22;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return toTexture(c, { repeat: [1.5, 1.5] });
}

// Écriture cursive « illisible » (gribouillis manuscrits).
function scribbleLine(ctx, r, x0, x1, y, size) {
  let x = x0;
  while (x < x1) {
    const wordLen = size * (1.5 + r() * 5);
    const end = Math.min(x + wordLen, x1);
    ctx.beginPath();
    ctx.moveTo(x, y);
    let px = x;
    while (px < end) {
      const step = size * (0.25 + r() * 0.35);
      const tall = r();
      const h = tall < 0.12 ? size * 1.6 : tall > 0.9 ? -size * 0.9 : size * (0.4 + r() * 0.3);
      ctx.quadraticCurveTo(px + step * 0.2, y - h, px + step * 0.55, y - h * 0.4);
      ctx.quadraticCurveTo(px + step * 0.8, y + size * 0.15, px + step, y);
      px += step;
    }
    ctx.stroke();
    if (r() < 0.12) {
      // mot barré
      ctx.beginPath();
      ctx.moveTo(x - 2, y - size * 0.35);
      ctx.lineTo(end + 2, y - size * 0.3 + (r() - 0.5) * 4);
      ctx.stroke();
    }
    x = end + size * (0.5 + r() * 0.7);
  }
}

function agedPaper(ctx, W, H, r) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#efe4cc');
  g.addColorStop(1, '#e0cfae');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  blotches(ctx, W, H, r, 18, '150,110,60', 0.18, 20, 120);
  // bords jaunis
  const e = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  e.addColorStop(0, 'rgba(120,80,30,0)');
  e.addColorStop(1, 'rgba(120,80,30,0.45)');
  ctx.fillStyle = e;
  ctx.fillRect(0, 0, W, H);
}

export function paperTexture(seed, { dense = false } = {}) {
  const W = 512, H = 724;
  const [c, ctx] = makeCanvas(W, H);
  const r = rng(seed);
  agedPaper(ctx, W, H, r);
  ctx.strokeStyle = `rgba(${30 + r() * 20},${18 + r() * 10},${10},0.85)`;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const size = dense ? 10 + r() * 3 : 11 + r() * 6;
  const lh = size * (2.1 + r() * 0.6);
  const margin = 40 + r() * 20;
  ctx.lineWidth = 1.3 + r() * 0.8;
  let y = 60 + r() * 30;
  const slope = (r() - 0.5) * 0.04;
  while (y < H - 50) {
    if (r() < 0.08 && !dense) {
      // petit croquis / schéma
      ctx.beginPath();
      const cx = margin + r() * (W - 2 * margin - 120) + 60, cy = y + 40;
      ctx.ellipse(cx, cy, 40 + r() * 40, 25 + r() * 20, r(), 0, Math.PI * 2);
      ctx.moveTo(cx - 60, cy + 30);
      ctx.lineTo(cx + 70, cy - 20);
      ctx.stroke();
      y += 110;
      continue;
    }
    if (r() < 0.12) {
      y += lh * 0.8; // paragraphe
    }
    const x0 = margin + (r() < 0.15 ? 30 : 0);
    const x1 = W - margin - (r() < 0.2 ? r() * 200 : 0);
    ctx.save();
    ctx.translate(0, (x0 - W / 2) * slope);
    ctx.rotate(slope);
    scribbleLine(ctx, r, x0, x1, y, size);
    ctx.restore();
    y += lh;
  }
  return toTexture(c);
}

// Ciel de nuit derrière la fenêtre, avec toits et cheminées.
export function nightTexture() {
  const W = 512, H = 512;
  const [c, ctx] = makeCanvas(W, H);
  const r = rng(21);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#05080f');
  g.addColorStop(0.6, '#131c2c');
  g.addColorStop(1, '#202a38');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // halo de lune voilée
  const m = ctx.createRadialGradient(W * 0.72, H * 0.22, 2, W * 0.72, H * 0.22, 180);
  m.addColorStop(0, 'rgba(220,225,235,0.9)');
  m.addColorStop(0.08, 'rgba(160,170,190,0.45)');
  m.addColorStop(1, 'rgba(60,70,90,0)');
  ctx.fillStyle = m;
  ctx.fillRect(0, 0, W, H);
  // toits
  ctx.fillStyle = '#04060a';
  let x = 0;
  ctx.beginPath();
  ctx.moveTo(0, H);
  while (x < W) {
    const w = 40 + r() * 90;
    const top = H * (0.62 + r() * 0.18);
    ctx.lineTo(x, top + 20);
    ctx.lineTo(x + w / 2, top);
    ctx.lineTo(x + w, top + 20);
    if (r() < 0.6) {
      const cx = x + r() * w * 0.6;
      ctx.lineTo(cx, top + 10);
      ctx.lineTo(cx, top - 26);
      ctx.lineTo(cx + 10, top - 26);
      ctx.lineTo(cx + 10, top + 10);
    }
    x += w;
  }
  ctx.lineTo(W, H);
  ctx.fill();
  // quelques fenêtres allumées au loin
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(255,200,120,${0.3 + r() * 0.4})`;
    ctx.fillRect(r() * W, H * (0.78 + r() * 0.18), 5, 7);
  }
  return toTexture(c);
}

// Tranches de livres : bandes et titres dorés effacés (teintées par la couleur d'instance).
export function spineTexture() {
  const W = 64, H = 256;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#d8d0c4';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,240,200,0.9)';
  for (const y of [18, 26, 220, 228]) ctx.fillRect(0, y, W, 3);
  ctx.fillStyle = 'rgba(255,240,200,0.5)';
  for (let i = 0; i < 5; i++) ctx.fillRect(20, 60 + i * 14, 24, 5);
  const r = rng(5);
  blotches(ctx, W, H, r, 10, '0,0,0', 0.4, 10, 40);
  return toTexture(c);
}

export function glowSprite() {
  const [c, ctx] = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return toTexture(c);
}

// Plume : barbes de plume avec transparence.
export function featherTexture() {
  const W = 64, H = 256;
  const [c, ctx] = makeCanvas(W, H);
  const r = rng(9);
  ctx.clearRect(0, 0, W, H);
  for (let y = 30; y < H - 8; y += 1.5) {
    const t = (y - 30) / (H - 38);
    const half = Math.sin(Math.PI * Math.pow(t, 0.7)) * 26 * (1 - t * 0.3);
    const l = 225 + r() * 30;
    ctx.strokeStyle = `rgba(${l},${l - 8},${l - 25},${0.6 + r() * 0.4})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2, y);
    ctx.lineTo(W / 2 - half * (0.8 + r() * 0.3), y - 10);
    ctx.moveTo(W / 2, y);
    ctx.lineTo(W / 2 + half * (0.8 + r() * 0.3), y - 10);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(200,190,170,1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
