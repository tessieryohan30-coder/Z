// Le personnage : corps en primitives, bras et jambes en cinématique inverse (IK).
// Tout est exprimé dans l'espace local de `root` (le tabouret pivotant).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, featherTexture } from './textures.js';

const Y = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _m = new THREE.Matrix4();

const mats = {
  shirt: new THREE.MeshStandardMaterial({ color: 0xe9e1d2, roughness: 0.88 }),
  trousers: new THREE.MeshStandardMaterial({ color: 0x2a231e, roughness: 0.9 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc9967a, roughness: 0.62 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x9a6638, roughness: 0.75 }),
  shoe: new THREE.MeshStandardMaterial({ color: 0x17110d, roughness: 0.45 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.6 }),
  eye: new THREE.MeshStandardMaterial({ color: 0x0c0806, roughness: 0.25 }),
  strap: new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.7 }),
  stool: new THREE.MeshStandardMaterial({ color: 0x3b2516, roughness: 0.55 }),
};

function shadowed(m) {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Résout une chaîne à deux segments : renvoie coude/genou et poignet/cheville.
function solveIK(A, T, pole, l1, l2, outMid, outEnd) {
  const d = _a.subVectors(T, A);
  const dist = THREE.MathUtils.clamp(d.length(), 0.01, l1 + l2 - 0.002);
  const dir = d.normalize();
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const p = _b.subVectors(pole, A);
  p.addScaledVector(dir, -p.dot(dir)).normalize();
  outMid.copy(A).addScaledVector(dir, a).addScaledVector(p, h);
  outEnd.copy(A).addScaledVector(dir, dist);
}

function placeSegment(mesh, from, to) {
  mesh.position.addVectors(from, to).multiplyScalar(0.5);
  _c.subVectors(to, from).normalize();
  mesh.quaternion.setFromUnitVectors(Y, _c);
}

function makeHand(side) {
  // repère : +y = doigts, +z = dos de la main, pouce côté -x (droite) / +x (gauche)
  const g = new THREE.Group();
  const palm = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.068, 0.075, 0.026, 3, 0.012), mats.skin));
  palm.position.y = 0.04;
  g.add(palm);
  const fingers = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.064, 0.05, 0.022, 3, 0.01), mats.skin));
  fingers.position.set(0, 0.085, -0.012);
  fingers.rotation.x = 0.7;
  g.add(fingers);
  const thumb = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.04, 4, 8), mats.skin));
  const s = side === 'R' ? -1 : 1;
  thumb.position.set(0.036 * s, 0.04, -0.014);
  thumb.rotation.set(0.5, 0, -0.6 * s);
  g.add(thumb);
  const cuff = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.037, 0.04, 14), mats.shirt));
  cuff.position.y = -0.03;
  g.add(cuff);
  return g;
}

function makeQuill() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0025, 0.0012, 0.23, 6),
    new THREE.MeshStandardMaterial({ color: 0xd9d0bd, roughness: 0.5 })
  );
  shaft.position.y = 0.115;
  shaft.castShadow = true;
  g.add(shaft);
  const nib = new THREE.Mesh(new THREE.ConeGeometry(0.0025, 0.012, 6), mats.dark);
  nib.rotation.x = Math.PI;
  nib.position.y = 0.002;
  g.add(nib);
  const vane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.18),
    new THREE.MeshStandardMaterial({
      map: featherTexture(),
      transparent: true,
      alphaTest: 0.25,
      side: THREE.DoubleSide,
      roughness: 0.8,
    })
  );
  vane.position.y = 0.15;
  vane.rotation.y = 0.4;
  vane.castShadow = true;
  g.add(vane);
  return g;
}

function makeStool() {
  const g = new THREE.Group();
  const seat = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.045, 28), mats.stool));
  seat.position.y = 0.47;
  g.add(seat);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const leg = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.5, 8), mats.stool));
    leg.position.set(Math.cos(a) * 0.15, 0.23, Math.sin(a) * 0.15);
    leg.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18);
    g.add(leg);
  }
  const ring = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.01, 6, 28), mats.stool));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.17;
  g.add(ring);
  return g;
}

function makeHead() {
  const head = new THREE.Group();
  const skull = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.1, 28, 22), mats.skin));
  skull.scale.set(0.86, 1.08, 0.98);
  skull.position.y = 0.1;
  head.add(skull);
  const jaw = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 16), mats.skin));
  jaw.scale.set(1.0, 0.9, 1.0);
  jaw.position.set(0, 0.045, -0.025);
  head.add(jaw);
  // visage tourné vers -z
  const nose = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), mats.skin));
  nose.scale.set(0.75, 1.15, 1);
  nose.position.set(0, 0.088, -0.094);
  head.add(nose);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), mats.eye);
    eye.position.set(0.034 * s, 0.115, -0.083);
    head.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.006, 0.01), mats.hair);
    brow.position.set(0.035 * s, 0.137, -0.088);
    brow.rotation.z = -0.15 * s;
    head.add(brow);
    const ear = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), mats.skin));
    ear.scale.set(0.45, 1, 0.75);
    ear.position.set(0.087 * s, 0.1, 0.005);
    head.add(ear);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.006), mats.dark);
  mouth.position.set(0, 0.045, -0.088);
  head.add(mouth);

  // cheveux : une calotte, puis des boucles en désordre (instances)
  const cap = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.106, 28, 16, 0, Math.PI * 2, 0, 1.85), mats.hair));
  cap.scale.set(0.9, 1.08, 1.02);
  cap.position.set(0, 0.105, 0.006);
  cap.rotation.x = 0.55;
  head.add(cap);
  const r = rng(42);
  const curls = [];
  const dir = new THREE.Vector3();
  while (curls.length < 340) {
    dir.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    if (dir.lengthSq() > 1 || dir.lengthSq() < 0.05) continue;
    dir.normalize();
    const back = dir.z > -0.25 && dir.y > -0.45;
    const top = dir.y > 0.42;
    const temple = Math.abs(dir.x) > 0.75 && dir.y > -0.05 && dir.z > -0.45;
    if (!(back || top || temple)) continue;
    curls.push(dir.clone());
  }
  const hair = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mats.hair, curls.length + 14);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const sc = new THREE.Vector3();
  const pos = new THREE.Vector3();
  let i = 0;
  const qa = new THREE.Quaternion();
  for (const d of curls) {
    // mèches plates, posées à plat sur le crâne et orientées au hasard autour de la normale
    pos.set(d.x * 0.09, d.y * 0.11 + 0.105, d.z * 0.1 + 0.006).addScaledVector(d, 0.004 + r() * 0.01);
    q.setFromUnitVectors(Y, d);
    qa.setFromAxisAngle(Y, r() * Math.PI * 2);
    q.multiply(qa);
    const s = 0.02 + r() * 0.016;
    sc.set(s * 1.5, s * 0.42, s * (0.8 + r() * 0.5));
    hair.setMatrixAt(i++, _m.compose(pos, q, sc));
  }
  // mèches qui tombent sur le front
  for (let k = 0; k < 14; k++) {
    pos.set((r() - 0.5) * 0.12, 0.16 + r() * 0.04, -0.075 - r() * 0.02);
    e.set(r() * 3, r() * 3, r() * 3);
    q.setFromEuler(e);
    const s = 0.018 + r() * 0.014;
    sc.set(s * 1.3, s * 0.7, s);
    hair.setMatrixAt(i++, _m.compose(pos, q, sc));
  }
  hair.castShadow = true;
  hair.receiveShadow = true;
  head.add(hair);
  return head;
}

export function createCharacter() {
  const root = new THREE.Group();
  root.add(makeStool());

  const hips = new THREE.Group();
  hips.position.y = 0.52;
  root.add(hips);
  const pelvis = shadowed(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mats.trousers));
  pelvis.scale.set(0.16, 0.08, 0.12);
  pelvis.position.y = 0.0;
  hips.add(pelvis);

  const spine = new THREE.Group();
  hips.add(spine);
  // buste : profil de révolution aplati
  const profile = [
    [0.0, -0.02], [0.128, -0.02], [0.135, 0.06], [0.142, 0.16], [0.15, 0.27],
    [0.155, 0.35], [0.14, 0.42], [0.1, 0.465], [0.05, 0.48], [0.0, 0.48],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const torso = shadowed(new THREE.Mesh(new THREE.LatheGeometry(profile, 32), mats.shirt));
  torso.scale.set(1.18, 1, 0.74);
  spine.add(torso);
  const belt = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.15, 0.06, 28), mats.trousers));
  belt.scale.set(1.12, 1, 0.8);
  belt.position.y = 0.0;
  spine.add(belt);
  // bretelles visibles dans le dos
  for (const s of [-1, 1]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.006), mats.strap);
    strap.position.set(0.055 * s, 0.19, 0.113);
    strap.rotation.set(-0.08, 0, 0.12 * s);
    strap.castShadow = true;
    spine.add(strap);
  }
  const collar = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.075, 0.05, 18, 1, true), mats.shirt));
  collar.material = mats.shirt.clone();
  collar.material.side = THREE.DoubleSide;
  collar.position.y = 0.48;
  spine.add(collar);
  const neck = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.052, 0.09, 14), mats.skin));
  neck.position.y = 0.5;
  spine.add(neck);
  const head = makeHead();
  head.position.y = 0.5;
  spine.add(head);

  const shoulderR = new THREE.Object3D();
  shoulderR.position.set(0.16, 0.405, 0.0);
  const shoulderL = new THREE.Object3D();
  shoulderL.position.set(-0.16, 0.405, 0.0);
  spine.add(shoulderR, shoulderL);
  for (const s of [shoulderR, shoulderL]) {
    const ball = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), mats.shirt));
    s.add(ball);
  }
  const traps = shadowed(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), mats.shirt));
  traps.scale.set(0.19, 0.055, 0.1);
  traps.position.set(0, 0.425, 0.005);
  spine.add(traps);

  const L_UP = 0.28, L_LO = 0.25, L_TH = 0.43, L_SH = 0.43;
  const seg = (r, len, mat) => shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat));
  const arm = {
    R: { up: seg(0.043, L_UP, mats.shirt), lo: seg(0.037, L_LO, mats.shirt), hand: makeHand('R'), anchor: shoulderR },
    L: { up: seg(0.043, L_UP, mats.shirt), lo: seg(0.037, L_LO, mats.shirt), hand: makeHand('L'), anchor: shoulderL },
  };
  for (const a of Object.values(arm)) {
    a.elbow = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), mats.shirt));
    root.add(a.up, a.lo, a.hand, a.elbow);
  }

  const hipR = new THREE.Object3D();
  hipR.position.set(0.085, 0, -0.02);
  const hipL = new THREE.Object3D();
  hipL.position.set(-0.085, 0, -0.02);
  hips.add(hipR, hipL);
  const leg = {
    R: { up: seg(0.07, L_TH, mats.trousers), lo: seg(0.055, L_SH, mats.trousers), anchor: hipR },
    L: { up: seg(0.07, L_TH, mats.trousers), lo: seg(0.055, L_SH, mats.trousers), anchor: hipL },
  };
  for (const l of Object.values(leg)) {
    l.knee = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), mats.trousers));
    l.shoe = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.07, 0.24, 3, 0.03), mats.shoe));
    root.add(l.up, l.lo, l.knee, l.shoe);
  }

  const quill = makeQuill();

  // pose courante (espace local de root) ; animée par main.js
  const pose = {
    lean: -0.45,
    twist: 0,
    headPitch: -0.5,
    headYaw: 0,
    headRoll: 0,
    handR: new THREE.Vector3(0.12, 0.8, -0.6),
    handL: new THREE.Vector3(-0.17, 0.78, -0.58),
    dorsR: new THREE.Vector3(0.3, 1, 0.2),
    dorsL: new THREE.Vector3(-0.3, 1, 0.2),
    poleR: new THREE.Vector3(0.7, 0.3, 0.5),
    poleL: new THREE.Vector3(-0.7, 0.3, 0.5),
  };

  const feet = {
    R: new THREE.Vector3(0.14, 0.09, -0.42),
    L: new THREE.Vector3(-0.15, 0.09, -0.36),
  };

  const tmpA = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const end = new THREE.Vector3();
  const pole = new THREE.Vector3();
  const bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3();

  function anchorLocal(obj, out) {
    obj.getWorldPosition(out);
    return root.worldToLocal(out);
  }

  function update() {
    spine.rotation.set(pose.lean, pose.twist, 0);
    head.rotation.set(pose.headPitch, pose.headYaw, pose.headRoll, 'YXZ');
    root.updateMatrixWorld(true);

    for (const side of ['R', 'L']) {
      const a = arm[side];
      anchorLocal(a.anchor, tmpA);
      const target = side === 'R' ? pose.handR : pose.handL;
      pole.copy(tmpA).add(side === 'R' ? pose.poleR : pose.poleL);
      solveIK(tmpA, target, pole, L_UP, L_LO, mid, end);
      placeSegment(a.up, tmpA, mid);
      placeSegment(a.lo, mid, end);
      a.elbow.position.copy(mid);
      // main : axe des doigts prolonge l'avant-bras, dos orienté par dors*
      by.subVectors(end, mid).normalize();
      bz.copy(side === 'R' ? pose.dorsR : pose.dorsL).normalize();
      bz.addScaledVector(by, -bz.dot(by)).normalize();
      bx.crossVectors(by, bz);
      a.hand.position.copy(end);
      a.hand.quaternion.setFromRotationMatrix(_m.makeBasis(bx, by, bz));
    }

    for (const side of ['R', 'L']) {
      const l = leg[side];
      anchorLocal(l.anchor, tmpA);
      pole.copy(tmpA).add(_c.set(side === 'R' ? 0.15 : -0.15, 0.6, -1));
      solveIK(tmpA, feet[side], pole, L_TH, L_SH, mid, end);
      placeSegment(l.up, tmpA, mid);
      placeSegment(l.lo, mid, end);
      l.knee.position.copy(mid);
      l.shoe.position.set(end.x, 0.04, end.z - 0.06);
      l.shoe.rotation.y = side === 'R' ? -0.15 : 0.1;
    }
  }

  update();
  return { root, spine, head, hands: { R: arm.R.hand, L: arm.L.hand }, quill, pose, update };
}
