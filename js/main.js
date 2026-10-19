import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from './textures.js';
import { createCharacter } from './character.js';
import * as sfx from './audio.js';
import { manuscrit } from './manuscrit.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = THREE.MathUtils.lerp;
const smooth = (k) => k * k * (3 - 2 * k);
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

// ───────────────────────── Rendu ─────────────────────────
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030201);
scene.fog = new THREE.FogExp2(0x070403, 0.1);

const camera = new THREE.PerspectiveCamera(45, 1, 0.03, 30);

// ───────────────────────── La pièce ─────────────────────────
const ROOM = { x: 1.6, back: -1.9, front: 1.8, h: 2.8 };

function shadowed(m, cast = true, receive = true) {
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function texRepeat(tex, rx, ry) {
  const t = tex.clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

const floorTex = T.floorTexture();
const floor = shadowed(
  new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.x * 2, ROOM.front - ROOM.back),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.78, color: 0xb0a090 })
  ),
  false
);
floor.rotation.x = -Math.PI / 2;
floor.position.z = (ROOM.front + ROOM.back) / 2;
scene.add(floor);

const wallTexA = T.wallTexture(3);
const wallTexB = T.wallTexture(8);
function wall(w, h, tex, rx) {
  return shadowed(
    new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: texRepeat(tex, rx, (rx * h) / w), roughness: 0.95, color: 0xa89a8a })
    ),
    false
  );
}
const backWall = wall(ROOM.x * 2, ROOM.h, wallTexA, 2);
backWall.position.set(0, ROOM.h / 2, ROOM.back);
scene.add(backWall);
const leftWall = wall(ROOM.front - ROOM.back, ROOM.h, wallTexB, 2.4);
leftWall.rotation.y = Math.PI / 2;
leftWall.position.set(-ROOM.x, ROOM.h / 2, (ROOM.front + ROOM.back) / 2);
scene.add(leftWall);
const rightWall = wall(ROOM.front - ROOM.back, ROOM.h, wallTexA, 2.4);
rightWall.rotation.y = -Math.PI / 2;
rightWall.position.set(ROOM.x, ROOM.h / 2, (ROOM.front + ROOM.back) / 2);
scene.add(rightWall);
const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(ROOM.x * 2, ROOM.front - ROOM.back),
  new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 1 })
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.set(0, ROOM.h, (ROOM.front + ROOM.back) / 2);
scene.add(ceiling);
// plinthes
const woodDark = new THREE.MeshStandardMaterial({ color: 0x24170f, roughness: 0.7 });
for (const [w, x, z, ry] of [
  [ROOM.x * 2, 0, ROOM.back + 0.01, 0],
  [ROOM.front - ROOM.back, -ROOM.x + 0.01, 0, Math.PI / 2],
  [ROOM.front - ROOM.back, ROOM.x - 0.01, 0, -Math.PI / 2],
]) {
  const b = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.02), woodDark));
  b.position.set(x, 0.06, z);
  b.rotation.y = ry;
  scene.add(b);
}

// Fenêtre de nuit
const WIN = { x: -0.18, y: 1.72, w: 1.0, h: 1.15 };
const nightTex = T.nightTexture();
const glass = new THREE.Mesh(
  new THREE.PlaneGeometry(WIN.w, WIN.h),
  new THREE.MeshBasicMaterial({ map: nightTex, color: 0xffffff, toneMapped: false })
);
glass.position.set(WIN.x, WIN.y, ROOM.back + 0.005);
scene.add(glass);
const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.6 });
function frameBar(w, h, d, x, y, z) {
  const m = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMat));
  m.position.set(x, y, z);
  scene.add(m);
}
const fz = ROOM.back + 0.04;
frameBar(WIN.w + 0.12, 0.07, 0.08, WIN.x, WIN.y + WIN.h / 2 + 0.03, fz);
frameBar(WIN.w + 0.12, 0.07, 0.08, WIN.x, WIN.y - WIN.h / 2 - 0.03, fz);
frameBar(0.07, WIN.h + 0.12, 0.08, WIN.x - WIN.w / 2 - 0.03, WIN.y, fz);
frameBar(0.07, WIN.h + 0.12, 0.08, WIN.x + WIN.w / 2 + 0.03, WIN.y, fz);
frameBar(0.035, WIN.h, 0.05, WIN.x, WIN.y, fz);
frameBar(WIN.w, 0.03, 0.05, WIN.x, WIN.y + WIN.h / 6, fz);
frameBar(WIN.w, 0.03, 0.05, WIN.x, WIN.y - WIN.h / 6, fz);
frameBar(WIN.w + 0.24, 0.04, 0.2, WIN.x, WIN.y - WIN.h / 2 - 0.08, ROOM.back + 0.1);

// Bibliothèque (à droite de la fenêtre)
const SHELF = { x0: 0.55, x1: 1.5, h: 2.2, d: 0.3 };
const shelfMat = new THREE.MeshStandardMaterial({ map: texRepeat(T.deskTexture(), 0.6, 1), roughness: 0.7, color: 0x8a7060 });
{
  const zc = ROOM.back + SHELF.d / 2;
  const w = SHELF.x1 - SHELF.x0;
  const xc = (SHELF.x0 + SHELF.x1) / 2;
  const add = (g, x, y, z) => {
    const m = shadowed(new THREE.Mesh(g, shelfMat));
    m.position.set(x, y, z);
    scene.add(m);
  };
  add(new THREE.BoxGeometry(0.03, SHELF.h, SHELF.d), SHELF.x0, SHELF.h / 2, zc);
  add(new THREE.BoxGeometry(0.03, SHELF.h, SHELF.d), SHELF.x1, SHELF.h / 2, zc);
  add(new THREE.BoxGeometry(w + 0.08, 0.04, SHELF.d + 0.04), xc, SHELF.h, zc);
  const levels = [0.06, 0.48, 0.9, 1.32, 1.74];
  for (const y of levels) add(new THREE.BoxGeometry(w, 0.025, SHELF.d), xc, y, zc);

  const r = T.rng(77);
  const palette = [0x5a1e14, 0x2b3a24, 0x1f2a3a, 0x6b4a22, 0x3a2416, 0x7a6a50, 0x40281a, 0x553018, 0x2a2018, 0x8a7a5a];
  const books = [];
  const place = (x, y, z, sx, sy, sz, rz = 0, ry = 0) => books.push({ x, y, z, sx, sy, sz, rz, ry, c: palette[Math.floor(r() * palette.length)] });
  for (const y0 of levels) {
    let x = SHELF.x0 + 0.03;
    const yb = y0 + 0.0125;
    while (x < SHELF.x1 - 0.05) {
      const roll = r();
      if (roll < 0.07) {
        x += 0.04 + r() * 0.06;
      } else if (roll < 0.16) {
        // pile couchée
        const n = 2 + Math.floor(r() * 4);
        const bw = 0.16 + r() * 0.06;
        let yy = yb;
        for (let i = 0; i < n; i++) {
          const t = 0.025 + r() * 0.025;
          place(x + bw / 2, yy + t / 2, ROOM.back + 0.17, bw, t, 0.2 + r() * 0.03, 0, (r() - 0.5) * 0.15);
          yy += t;
        }
        x += bw + 0.01;
      } else {
        const t = 0.022 + r() * 0.035;
        const h = 0.2 + r() * 0.15;
        const lean = roll > 0.93 ? 0.18 : 0;
        place(x + t / 2 + lean * h * 0.5, yb + h / 2, ROOM.back + 0.06 + (0.24 - 0.16) / 2 + r() * 0.03, t, h, 0.16 + r() * 0.08, -lean);
        x += t + 0.002 + lean * h;
      }
    }
  }
  // piles par terre
  for (const [px, pz, n] of [[1.05, -1.0, 9], [1.25, -0.55, 6], [-1.2, -0.95, 7], [-1.32, -0.2, 5]]) {
    let yy = 0;
    for (let i = 0; i < n; i++) {
      const t = 0.03 + r() * 0.035;
      place(px + (r() - 0.5) * 0.04, yy + t / 2, pz + (r() - 0.5) * 0.04, 0.17 + r() * 0.08, t, 0.24 + r() * 0.06, 0, (r() - 0.5) * 0.5);
      yy += t;
    }
  }
  const bookMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ map: T.spineTexture(), roughness: 0.8 }),
    books.length
  );
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const col = new THREE.Color();
  books.forEach((b, i) => {
    q.setFromEuler(e.set(0, b.ry, b.rz));
    bookMesh.setMatrixAt(i, m4.compose(v3(b.x, b.y, b.z), q, v3(b.sx, b.sy, b.sz)));
    bookMesh.setColorAt(i, col.setHex(b.c));
  });
  shadowed(bookMesh);
  scene.add(bookMesh);

  // globe sur la bibliothèque
  const globe = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), new THREE.MeshStandardMaterial({ color: 0x4a4636, roughness: 0.4, metalness: 0.1 })));
  globe.position.set(1.2, SHELF.h + 0.2, zc);
  scene.add(globe);
  const brass = new THREE.MeshStandardMaterial({ color: 0x6a5230, metalness: 0.8, roughness: 0.35 });
  const mer = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.006, 6, 40), brass));
  mer.position.copy(globe.position);
  mer.rotation.y = 0.6;
  scene.add(mer);
  const foot = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.08, 16), brass));
  foot.position.set(1.2, SHELF.h + 0.06, zc);
  scene.add(foot);
}

// ───────────────────────── Papiers ─────────────────────────
const paperTextures = Array.from({ length: 10 }, (_, i) => T.paperTexture(100 + i * 13));
const paperMats = paperTextures.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.92, side: THREE.DoubleSide }));
const plainPaper = new THREE.MeshStandardMaterial({ color: 0xe6d8bc, roughness: 0.95 });

function curledSheet(seed) {
  const r = T.rng(seed);
  const g = new THREE.PlaneGeometry(0.21, 0.297, 4, 6);
  const p = g.attributes.position;
  const curl = 0.04 + r() * 0.08;
  const lift = (r() - 0.3) * 0.06;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const fromTop = (0.1485 - y) / 0.297; // 0 en haut (épinglé), 1 en bas
    let z = curl * (x / 0.105) ** 2 * 0.15 * fromTop + lift * fromTop ** 2.2 * (1 + x * 3);
    p.setZ(i, Math.max(0, z));
  }
  g.computeVertexNormals();
  return g;
}
const sheetGeos = Array.from({ length: 6 }, (_, i) => curledSheet(500 + i));
const pinMat = new THREE.MeshStandardMaterial({ color: 0x8a6a40, metalness: 0.7, roughness: 0.3 });
const pinGeo = new THREE.SphereGeometry(0.006, 8, 6);

{
  const r = T.rng(1234);
  let layer = 0;
  const pin = (parentPos, rotY, x, y, z, rz, s) => {
    const m = shadowed(new THREE.Mesh(sheetGeos[Math.floor(r() * sheetGeos.length)], paperMats[Math.floor(r() * paperMats.length)]));
    m.position.set(x, y, z);
    m.rotation.set(0, rotY, rz);
    m.scale.setScalar(s);
    scene.add(m);
    const pn = new THREE.Mesh(pinGeo, pinMat);
    pn.position.set(0, 0.13, 0.004);
    m.add(pn);
  };
  // murs latéraux, couverts de feuilles comme une obsession
  for (const side of [-1, 1]) {
    for (let z = ROOM.back + 0.14; z < 1.3; z += 0.2) {
      for (let y = 0.4; y < ROOM.h - 0.12; y += 0.27) {
        if (r() < 0.22) continue;
        const off = 0.004 + (layer++ % 7) * 0.0016;
        pin(null, -side * Math.PI / 2, side * (ROOM.x - off), y + (r() - 0.5) * 0.08, z + (r() - 0.5) * 0.08, (r() - 0.5) * 0.25, 0.85 + r() * 0.3);
      }
    }
  }
  // mur du fond, autour de la fenêtre
  for (let x = -ROOM.x + 0.14; x < WIN.x - WIN.w / 2 - 0.1; x += 0.2) {
    for (let y = 0.9; y < ROOM.h - 0.12; y += 0.27) {
      if (r() < 0.2) continue;
      const off = 0.004 + (layer++ % 7) * 0.0016;
      pin(null, 0, x + (r() - 0.5) * 0.06, y + (r() - 0.5) * 0.06, ROOM.back + off, (r() - 0.5) * 0.25, 0.85 + r() * 0.3);
    }
  }
  for (let x = WIN.x - WIN.w / 2; x < SHELF.x0 + 0.9; x += 0.21) {
    if (r() < 0.25) continue;
    const off = 0.004 + (layer++ % 7) * 0.0016;
    pin(null, 0, x, ROOM.h - 0.24 + (r() - 0.5) * 0.06, ROOM.back + off, (r() - 0.5) * 0.3, 0.8 + r() * 0.2);
  }

  // feuilles tombées et boulettes au sol
  for (let i = 0; i < 9; i++) {
    const m = shadowed(new THREE.Mesh(sheetGeos[i % sheetGeos.length], paperMats[i % paperMats.length]), false);
    m.rotation.set(-Math.PI / 2, 0, r() * Math.PI * 2);
    const a = r() * Math.PI * 2;
    const d = 0.55 + r() * 0.8;
    m.position.set(Math.cos(a) * d * 1.1, 0.003 + i * 0.0006, -0.3 + Math.sin(a) * d * 0.7);
    scene.add(m);
  }
  const ballGeo = new THREE.IcosahedronGeometry(0.04, 2);
  {
    const p = ballGeo.attributes.position;
    const rr = T.rng(66);
    for (let i = 0; i < p.count; i++) {
      const k = 0.75 + rr() * 0.5;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
    ballGeo.computeVertexNormals();
  }
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xd9ccb0, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 16; i++) {
    const b = shadowed(new THREE.Mesh(ballGeo, ballMat));
    const a = r() * Math.PI * 2;
    const d = 0.45 + r() * 0.9;
    b.position.set(THREE.MathUtils.clamp(Math.cos(a) * d * 1.2, -1.45, 1.45), 0.032, THREE.MathUtils.clamp(-0.4 + Math.sin(a) * d, -1.75, 1.2));
    b.rotation.set(r() * 6, r() * 6, r() * 6);
    b.scale.setScalar(0.7 + r() * 0.6);
    scene.add(b);
  }
}

// ───────────────────────── Bureau ─────────────────────────
const DESK = { x: 0, z: -1.2, w: 1.4, d: 0.7, top: 0.76 };
const deskMat = new THREE.MeshStandardMaterial({ map: T.deskTexture(), roughness: 0.55, color: 0xc0a890 });
{
  const top = shadowed(new THREE.Mesh(new RoundedBoxGeometry(DESK.w, 0.045, DESK.d, 2, 0.01), deskMat));
  top.position.set(DESK.x, DESK.top - 0.0225, DESK.z);
  scene.add(top);
  const legMat = deskMat;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.05, DESK.top - 0.045, 0.05), legMat));
      leg.position.set(DESK.x + sx * (DESK.w / 2 - 0.05), (DESK.top - 0.045) / 2, DESK.z + sz * (DESK.d / 2 - 0.05));
      scene.add(leg);
    }
  }
  const apron = shadowed(new THREE.Mesh(new THREE.BoxGeometry(DESK.w - 0.1, 0.09, 0.02), legMat));
  apron.position.set(DESK.x, DESK.top - 0.09, DESK.z - DESK.d / 2 + 0.06);
  scene.add(apron);
  const side = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, DESK.d - 0.1), legMat));
  side.position.set(DESK.x - DESK.w / 2 + 0.05, DESK.top - 0.09, DESK.z);
  scene.add(side);
  const side2 = side.clone();
  side2.position.x = DESK.x + DESK.w / 2 - 0.05;
  scene.add(side2);
  const drawer = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.02), legMat));
  drawer.position.set(DESK.x + 0.3, DESK.top - 0.09, DESK.z + DESK.d / 2 - 0.01);
  scene.add(drawer);

  // pile de feuilles (gauche) et livres (fond droit)
  const r = T.rng(808);
  for (let i = 0; i < 16; i++) {
    const m = shadowed(new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), paperMats[i % paperMats.length]), false);
    m.rotation.set(-Math.PI / 2, 0, (r() - 0.5) * 0.4);
    m.position.set(-0.42 + (r() - 0.5) * 0.03, DESK.top + 0.002 + i * 0.0018, -1.02 + (r() - 0.5) * 0.03);
    scene.add(m);
  }
  for (let i = 0; i < 4; i++) {
    const m = shadowed(new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), paperMats[(i + 3) % paperMats.length]), false);
    m.rotation.set(-Math.PI / 2, 0, (r() - 0.5) * 1.4);
    m.position.set(-0.15 + r() * 0.5, DESK.top + 0.001 + i * 0.0008, -1.35 + r() * 0.12);
    scene.add(m);
  }
  const bookMat = new THREE.MeshStandardMaterial({ map: T.spineTexture(), color: 0x5a2a1a, roughness: 0.8 });
  let yy = DESK.top;
  for (let i = 0; i < 3; i++) {
    const t = 0.035 + r() * 0.02;
    const b = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.2, t, 0.27), bookMat.clone()));
    b.material.color.setHex([0x5a2a1a, 0x2c3324, 0x3a2a1c][i]);
    b.position.set(0.48, yy + t / 2, -1.38);
    b.rotation.y = (r() - 0.5) * 0.4;
    scene.add(b);
    yy += t;
  }
}

// encrier
const INK = v3(0.42, DESK.top, -0.95);
{
  const glassInk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.1, metalness: 0.2 })));
  glassInk.position.set(INK.x, INK.y + 0.025, INK.z);
  scene.add(glassInk);
  const neck = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.018, 14), new THREE.MeshStandardMaterial({ color: 0x5a4024, metalness: 0.7, roughness: 0.35 })));
  neck.position.set(INK.x, INK.y + 0.058, INK.z);
  scene.add(neck);
}

// feuille sur laquelle il écrit
const writingSheet = shadowed(new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), new THREE.MeshStandardMaterial({ map: T.paperTexture(4242, { dense: true }), roughness: 0.9 })), false);
writingSheet.rotation.set(-Math.PI / 2, 0, 0.12);
writingSheet.position.set(-0.04, DESK.top + 0.0015, -1.06);
scene.add(writingSheet);

// ───────────────────────── Lampe de bureau ─────────────────────────
const lampMetal = new THREE.MeshStandardMaterial({ color: 0x2f3328, metalness: 0.65, roughness: 0.38 });
const LAMP = { base: v3(-0.5, DESK.top, -1.38), joint: v3(-0.54, 1.14, -1.52), head: v3(-0.34, 1.22, -1.3), target: v3(-0.05, DESK.top, -1.02) };
const lampDir = LAMP.target.clone().sub(LAMP.head).normalize();
const bulbPos = LAMP.head.clone().addScaledVector(lampDir, 0.035);
{
  const base = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.025, 24), lampMetal));
  base.position.copy(LAMP.base).y += 0.0125;
  scene.add(base);
  const rod = (a, b, r) => {
    const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8), lampMetal));
    m.position.addVectors(a, b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize());
    scene.add(m);
  };
  rod(LAMP.base.clone().setY(LAMP.base.y + 0.02), LAMP.joint, 0.009);
  rod(LAMP.joint, LAMP.head, 0.008);
  const j = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), lampMetal));
  j.position.copy(LAMP.joint);
  scene.add(j);
  const shade = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.095, 0.15, 28, 1, true), lampMetal.clone()));
  shade.material.side = THREE.DoubleSide;
  shade.position.copy(LAMP.head);
  shade.quaternion.setFromUnitVectors(v3(0, -1, 0), lampDir);
  scene.add(shade);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc070, emissiveIntensity: 9 })
  );
  bulb.position.copy(bulbPos);
  scene.add(bulb);
}
const spot = new THREE.SpotLight(0xffb468, 3.2, 0, 1.05, 0.75, 2);
spot.position.copy(bulbPos);
spot.target.position.copy(LAMP.target);
spot.castShadow = true;
spot.shadow.mapSize.set(2048, 2048);
spot.shadow.camera.near = 0.05;
spot.shadow.camera.far = 6;
spot.shadow.bias = -0.0004;
spot.shadow.normalBias = 0.015;
spot.shadow.radius = 4;
scene.add(spot, spot.target);
// lumière diffuse de l'ampoule, qui remplit faiblement la pièce
const glow = new THREE.PointLight(0xff9a50, 1.1, 0, 2);
glow.position.copy(LAMP.head).add(v3(0.02, 0.3, 0.08));
glow.castShadow = true;
glow.shadow.mapSize.set(1024, 1024);
glow.shadow.bias = -0.002;
glow.shadow.radius = 6;
scene.add(glow);
// clair de lune par la fenêtre
const moon = new THREE.DirectionalLight(0x8fa4c8, 0.45);
moon.position.set(WIN.x + 0.6, 3.2, ROOM.back - 2);
moon.target.position.set(0, 0, -0.3);
scene.add(moon, moon.target);
scene.add(new THREE.HemisphereLight(0x4a4050, 0x1a1008, 0.3));
// faible reflet chaud dans le dos du personnage (lumière renvoyée par la pièce)
const bounce = new THREE.PointLight(0xffb070, 0.35, 0, 2);
bounce.position.set(0.9, 2.1, 0.7);
scene.add(bounce);
// lumière d'appoint qui révèle son visage quand il se retourne
const fill = new THREE.PointLight(0xffc890, 0, 0, 2);
fill.position.set(0.3, 1.5, 0.75);
scene.add(fill);

// poussière dans le faisceau
const dust = (() => {
  const n = 220;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const r = T.rng(31);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = -0.6 + r() * 0.8;
    pos[i * 3 + 1] = 0.8 + r() * 0.75;
    pos[i * 3 + 2] = -1.5 + r() * 0.75;
    seed[i] = r() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    size: 0.008,
    map: T.glowSprite(),
    color: 0xffd8a0,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, m);
  scene.add(pts);
  const base = pos.slice();
  return (t) => {
    for (let i = 0; i < n; i++) {
      const s = seed[i];
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.13 + s) * 0.06;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.09 + s * 1.7) * 0.08;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.11 + s * 0.6) * 0.05;
    }
    g.attributes.position.needsUpdate = true;
  };
})();

// ───────────────────────── Personnage ─────────────────────────
const ch = createCharacter();
ch.root.position.set(0, 0, -0.45);
scene.add(ch.root);
ch.root.traverse((o) => {
  if (o.isMesh) {
    o.castShadow = true;
    o.receiveShadow = true;
  }
});

// plume dans la main droite
const quill = ch.quill;
quill.position.set(-0.012, 0.115, -0.03);
quill.quaternion.setFromUnitVectors(v3(0, 1, 0), v3(-0.15, -0.55, 0.82).normalize());
ch.hands.R.add(quill);

// Le manuscrit : posé à droite, tête vers lui (il le tendra sans le retourner)
const manuscript = new THREE.Group();
{
  const front = shadowed(new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), new THREE.MeshStandardMaterial({ map: T.paperTexture(9001, { dense: true }), roughness: 0.9 })));
  const back = shadowed(new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), plainPaper));
  back.rotation.y = Math.PI;
  back.position.z = -0.0005;
  manuscript.add(front, back);
}
const Q_DESK = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI + 0.14, 'XYZ'));
manuscript.quaternion.copy(Q_DESK);
manuscript.position.set(0.22, DESK.top + 0.004, -0.7);
ch.root.add(manuscript);

// ───────────────────────── Pose & chorégraphie ─────────────────────────
const base = {
  rootYaw: 0,
  lean: -0.47,
  twist: 0.04,
  headPitch: -0.42,
  headYaw: 0.06,
  headRoll: 0.04,
  handR: v3(0.06, 0.795, -0.55),
  handL: v3(-0.19, 0.782, -0.57),
  dorsR: v3(0.55, 1, 0.1),
  dorsL: v3(-0.15, 1, 0.1),
  poleR: v3(0.8, -0.35, 0.5),
  poleL: v3(-0.8, -0.35, 0.5),
  write: 1,
  hold: 0,
};

const tweens = new Set();
function tween(dur, fn, ease = easeInOut) {
  return new Promise((res) => tweens.add({ t: 0, dur, fn, ease, res }));
}
const wait = (s) => tween(s, () => {});
function to(obj, target, dur, ease = easeInOut) {
  const from = {};
  for (const k in target) from[k] = obj[k].isVector3 ? obj[k].clone() : obj[k];
  return tween(
    dur,
    (e) => {
      for (const k in target) {
        if (obj[k].isVector3) obj[k].lerpVectors(from[k], target[k], e);
        else obj[k] = from[k] + (target[k] - from[k]) * e;
      }
    },
    ease
  );
}

// geste d'écriture : trois lignes, une pause pour réfléchir, et ainsi de suite
const LINE = 4.2, BACK = 0.65, PAUSE = 2.4;
const writeOff = v3(0, 0, 0);
let headThink = 0;
function writingMotion(t) {
  const cyc = t % (3 * (LINE + BACK) + PAUSE);
  headThink = 0;
  if (cyc < 3 * (LINE + BACK)) {
    const li = Math.floor(cyc / (LINE + BACK));
    const lt = cyc % (LINE + BACK);
    if (lt < LINE) {
      const p = lt / LINE;
      const w = lt * 17;
      writeOff.set(-0.06 + 0.12 * p + 0.004 * Math.sin(w), 0.0035 * Math.max(0, Math.sin(lt * 23)), -li * 0.016 + 0.004 * Math.sin(lt * 13));
    } else {
      const q = smooth((lt - LINE) / BACK);
      writeOff.set(lerp(0.06, -0.06, q), 0.02 * Math.sin(Math.PI * q), -li * 0.016 - 0.008 * q);
    }
  } else {
    const k = (cyc - 3 * (LINE + BACK)) / PAUSE;
    const a = Math.sin(Math.PI * k);
    headThink = a;
    writeOff.set(-0.06, 0.03 * a, -0.048 + 0.03 * a);
  }
}

const pose = ch.pose;
const gripR = v3(0, 0, 0), gripL = v3(0, 0, 0);
const _dn = v3(0, 0, 0);
function applyPose(t) {
  writingMotion(t);
  const w = base.write;
  const breath = Math.sin(t * 1.4) * 0.012;
  ch.root.rotation.y = base.rootYaw;
  pose.lean = base.lean + breath + headThink * 0.05 * w;
  pose.twist = base.twist;
  pose.headPitch = base.headPitch + w * (headThink * 0.28 + Math.sin(t * 0.7) * 0.02);
  pose.headYaw = base.headYaw + w * (-writeOff.x * 0.9 + headThink * 0.12);
  pose.headRoll = base.headRoll + w * headThink * 0.08;
  pose.handR.copy(base.handR).addScaledVector(writeOff, w);
  pose.handL.copy(base.handL);
  pose.dorsR.copy(base.dorsR);
  pose.dorsL.copy(base.dorsL);
  pose.poleR.copy(base.poleR);
  pose.poleL.copy(base.poleL);
  if (base.hold > 0) {
    // mains au milieu des bords du manuscrit
    manuscript.updateMatrix();
    _dn.set(0, 0, 1).applyQuaternion(manuscript.quaternion);
    // à plat sur le bureau : mains posées dessus ; debout : doigts derrière la feuille
    const flat = THREE.MathUtils.clamp(_dn.y, 0, 1);
    const dz = lerp(-0.022, 0.012, flat);
    gripR.set(-0.104, 0.0, dz).applyMatrix4(manuscript.matrix);
    gripL.set(0.104, 0.0, dz).applyMatrix4(manuscript.matrix);
    _dn.multiplyScalar(lerp(-1, 1, flat));
    pose.handR.lerp(gripR, base.hold);
    pose.handL.lerp(gripL, base.hold);
    pose.dorsR.lerp(_dn.clone().add(v3(0.4, 0, 0)), base.hold);
    pose.dorsL.lerp(_dn.clone().add(v3(-0.4, 0, 0)), base.hold);
  }
  ch.update();
}

// ───────────────────────── Caméra ─────────────────────────
const cam = {
  pos: v3(0.42, 1.78, 1.12),
  look: v3(-0.06, 0.98, -1.0),
};
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});
let parallax = 1;

function updateCamera(t) {
  mouse.sx += (mouse.x - mouse.sx) * 0.03;
  mouse.sy += (mouse.y - mouse.sy) * 0.03;
  camera.position.copy(cam.pos);
  camera.position.x += (Math.sin(t * 0.21) * 0.025 + mouse.sx * 0.06) * parallax;
  camera.position.y += (Math.sin(t * 0.17 + 1) * 0.018 - mouse.sy * 0.04) * parallax;
  camera.lookAt(cam.look);
}

// ───────────────────────── Post-traitement : sépia, vignette, grain ─────────────────────────
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uSepia: { value: 0.82 },
    uFade: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uSepia, uFade;
    uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      vec3 sh = vec3(0.045, 0.028, 0.016);
      vec3 md = vec3(0.52, 0.36, 0.21);
      vec3 hi = vec3(1.0, 0.92, 0.78);
      vec3 g = l < 0.5 ? mix(sh, md, smoothstep(0.0, 0.5, l)) : mix(md, hi, smoothstep(0.5, 1.0, l));
      c = mix(c, g, uSepia);
      vec2 d = vUv - 0.5;
      d.x *= uRes.x / uRes.y;
      float vig = smoothstep(1.05, 0.2, length(d) * 1.25);
      c *= mix(0.25, 1.0, vig);
      float n = hash(vUv * uRes + fract(uTime * 7.13) * 97.0) - 0.5;
      c += n * 0.045 * (0.6 + l);
      gl_FragColor = vec4(c * uFade, 1.0);
    }`,
};
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.7, 0.8);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass(GradeShader);
composer.addPass(grade);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const aspect = w / h;
  camera.aspect = aspect;
  // on garde au moins ~60° d'horizontal, sans dépasser 68° de vertical en portrait
  const hfov = THREE.MathUtils.degToRad(60);
  const vfov = 2 * Math.atan(Math.tan(hfov / 2) / aspect);
  camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vfov), 42, 68);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  grade.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
}
window.addEventListener('resize', resize);
resize();

// ───────────────────────── Boucle ─────────────────────────
const clock = new THREE.Clock();
let time = 0;
let timeScale = 1;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05) * timeScale;
  time += dt;
  for (const tw of tweens) {
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur);
    tw.fn(tw.ease(k));
    if (k >= 1) {
      tweens.delete(tw);
      tw.res();
    }
  }
  applyPose(time);
  const flick = 1 + Math.sin(time * 13.1) * 0.012 + Math.sin(time * 31.7) * 0.008 + (Math.random() - 0.5) * 0.01;
  spot.intensity = 3.2 * flick;
  glow.intensity = 1.1 * flick;
  dust(time);
  updateCamera(time);
  grade.uniforms.uTime.value = time;
  composer.render();
  requestAnimationFrame(frame);
}

// ───────────────────────── Le manuscrit (page HTML) ─────────────────────────
const page = document.getElementById('page');
const ink = document.getElementById('ink');
const CHARS_PER_SECOND = 26;

function buildManuscript(text) {
  const paras = text.trim().split(/\n\s*\n/);
  const chars = [];
  paras.forEach((para, pi) => {
    const p = document.createElement('p');
    if (pi === 0) p.className = 'salutation';
    if (pi === paras.length - 1 && paras.length > 1) p.className = 'signature';
    const lines = para.split('\n');
    lines.forEach((line, li) => {
      for (const word of line.split(/(\s+)/)) {
        if (!word) continue;
        if (/^\s+$/.test(word)) {
          const s = document.createTextNode(' ');
          p.appendChild(s);
          continue;
        }
        const w = document.createElement('span');
        w.className = 'w';
        for (const c of word) {
          const s = document.createElement('span');
          s.className = 'c';
          s.textContent = c;
          w.appendChild(s);
          chars.push(s);
        }
        p.appendChild(w);
      }
      if (li < lines.length - 1) p.appendChild(document.createElement('br'));
    });
    ink.appendChild(p);
    chars.push(null); // fin de paragraphe : respiration
  });
  return chars;
}

function writeManuscript() {
  const chars = buildManuscript(manuscrit);
  let i = 0;
  let acc = 0;
  let last = performance.now();
  let fast = false;
  let followScroll = true;
  page.addEventListener('pointerdown', () => (fast = true), { once: true });
  page.addEventListener('wheel', () => (followScroll = false), { passive: true });
  page.addEventListener('touchmove', () => (followScroll = false), { passive: true });

  function step(now) {
    const dt = (now - last) / 1000;
    last = now;
    acc += dt * (fast ? 400 : CHARS_PER_SECOND);
    while (acc >= 1 && i < chars.length) {
      const c = chars[i++];
      if (c === null) {
        acc -= fast ? 1 : 14;
        continue;
      }
      c.classList.add('on');
      const ch = c.textContent;
      acc -= /[.,;:!?—]/.test(ch) && !fast ? 6 : 1;
      if (!fast && c === c.parentNode.firstChild) sfx.scratch(Math.min(0.5, 0.06 * c.parentNode.childNodes.length), 1);
      if (followScroll) {
        const box = page.getBoundingClientRect();
        const cb = c.getBoundingClientRect();
        if (cb.bottom > box.bottom - box.height * 0.25) page.scrollTop += cb.bottom - (box.bottom - box.height * 0.25);
      }
    }
    if (i < chars.length) requestAnimationFrame(step);
    else page.classList.add('done');
  }
  requestAnimationFrame(step);
}

// ───────────────────────── La scène qui se joue au clic ─────────────────────────
async function sequence() {
  sfx.startAudio();
  parallax = 0.5;

  // il s'arrête d'écrire, lève un peu la tête
  await Promise.all([to(base, { write: 0, headPitch: -0.22, headYaw: 0 }, 1.0)]);
  await wait(0.5);

  // pose la plume dans l'encrier
  const inkLocal = ch.root.worldToLocal(INK.clone());
  await to(base, { handR: v3(inkLocal.x - 0.04, 0.83, inkLocal.z + 0.13), dorsR: v3(0.9, 0.6, 0.3), lean: -0.42, headYaw: -0.15 }, 0.9);
  scene.attach(quill);
  const qFrom = quill.position.clone(), qFromQ = quill.quaternion.clone();
  const qTo = v3(INK.x, INK.y + 0.06, INK.z);
  const qToQ = new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), v3(-0.25, 1, 0.35).normalize());
  await tween(0.5, (e) => {
    quill.position.lerpVectors(qFrom, qTo, e);
    quill.quaternion.slerpQuaternions(qFromQ, qToQ, e);
  });
  sfx.scratch(0.08, 0.5);

  // il a entendu quelqu'un : il tourne la tête par-dessus l'épaule
  await to(base, { handR: v3(0.14, 0.62, -0.25), dorsR: v3(1, 0.3, 0), headPitch: 0.02, headYaw: -0.95, twist: -0.18, lean: -0.22 }, 1.4);
  await wait(0.9);
  await to(base, { headYaw: -0.1, headPitch: -0.3, twist: 0 }, 1.0);

  // il prend le manuscrit à deux mains
  await to(base, { hold: 1, lean: -0.42, handL: v3(0.05, 0.8, -0.6) }, 1.0);
  sfx.rustle(0.8);
  const mFrom = manuscript.position.clone(), mFromQ = manuscript.quaternion.clone();
  const mUpQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI + 0.25, 0, Math.PI, 'XYZ'));
  const mUp = v3(0.0, 0.84, -0.34);
  await Promise.all([
    tween(1.3, (e) => {
      manuscript.position.lerpVectors(mFrom, mUp, e);
      manuscript.position.y += Math.sin(Math.PI * e) * 0.05;
      manuscript.quaternion.slerpQuaternions(mFromQ, mUpQ, e);
    }),
    to(base, { lean: -0.12, headPitch: -0.35, headYaw: 0, poleR: v3(0.9, -0.9, 0.3), poleL: v3(-0.9, -0.9, 0.3) }, 1.3),
  ]);
  await wait(0.4);

  // il pivote sur son tabouret, vers nous
  sfx.creak(2.4);
  await Promise.all([
    to(base, { rootYaw: -Math.PI }, 2.6, easeInOut),
    tween(2.6, (e) => {
      base.headYaw = -0.35 * Math.sin(Math.PI * Math.min(1, e * 1.3));
      base.twist = -0.12 * Math.sin(Math.PI * e);
    }, (k) => k),
    to(fill, { intensity: 0.7 }, 2.6),
    to(cam, { pos: v3(0.22, 1.42, 1.05), look: v3(0, 1.02, -0.2) }, 3.0),
  ]);
  // il lève les yeux vers nous
  await to(base, { headPitch: 0.16, headRoll: -0.04 }, 1.1);
  await wait(0.9);

  // il nous tend la feuille
  sfx.rustle(0.5);
  const offQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI + 0.05, 0, Math.PI, 'XYZ'));
  const mFrom2 = manuscript.position.clone(), mFromQ2 = manuscript.quaternion.clone();
  const mOut = v3(0, 0.95, -0.58);
  await Promise.all([
    tween(1.5, (e) => {
      manuscript.position.lerpVectors(mFrom2, mOut, e);
      manuscript.quaternion.slerpQuaternions(mFromQ2, offQ, e);
    }),
    to(base, { lean: -0.2, headPitch: 0.1, poleR: v3(0.8, -0.8, 0.2), poleL: v3(-0.8, -0.8, 0.2) }, 1.5),
  ]);

  // on s'approche du manuscrit
  parallax = 0;
  const mWorld = new THREE.Vector3();
  manuscript.getWorldPosition(mWorld);
  await to(cam, { pos: v3(mWorld.x, mWorld.y + 0.01, mWorld.z + 0.42), look: mWorld.clone() }, 2.4);
  document.body.classList.add('reading');
  await wait(1.2);
  writeManuscript();
}

// ───────────────────────── Démarrage ─────────────────────────
const btn = document.getElementById('zoe');
btn.addEventListener('click', () => {
  btn.disabled = true;
  document.body.classList.add('started');
  sequence();
}, { once: true });

applyPose(0);
updateCamera(0);
requestAnimationFrame(frame);
tween(3.2, (e) => (grade.uniforms.uFade.value = e), easeOut).then(() => document.body.classList.add('ready'));

// outil de mise au point : ajoute #debug à l'URL
if (location.hash === '#debug') {
  tweens.clear();
  grade.uniforms.uFade.value = 1;
  document.body.classList.add('ready');
  window.__dbg = { grade, base, cam, spot, glow, fill, moon, renderer, scene, camera, tweens, setTimeScale: (s) => (timeScale = s) };
}
