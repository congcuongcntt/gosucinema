// Phần dùng chung: số đo Hổ Quyền, vật liệu vẽ bằng canvas, đấu trường, hổ bằng khói, voi, người.
import * as THREE from 'three';

export const R_IN = 22, H_IN = 5.9, H_OUT = 4.75, R_OUT = 25, GROUND_OUT = H_IN - H_OUT;
export const CAGE_ANGLES = [-0.5, -0.25, 0, 0.25, 0.5];   // 5 chuồng phía Nam, đối diện khán đài
export const onRing = (r, phi, y = 0) => new THREE.Vector3(r * Math.sin(phi), y, -r * Math.cos(phi)); // phi = 0: chính Nam
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const canvasTex = (w, h, draw, srgb = true) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
};

let _brick, _ground, _sprite, _stripe;
export function brickTexture() {
  return _brick || (_brick = canvasTex(512, 512, (g) => {
    const r = rng(7);
    g.fillStyle = '#5a5246'; g.fillRect(0, 0, 512, 512);
    const bw = 64, bh = 30;
    for (let y = 0, row = 0; y < 512; y += bh + 2, row++) {
      for (let x = -(row % 2) * bw / 2; x < 512; x += bw + 2) {
        g.fillStyle = `hsl(${14 + r() * 14},${28 + r() * 22}%,${27 + r() * 16}%)`; g.fillRect(x, y, bw, bh);
        g.fillStyle = `rgba(0,0,0,${r() * 0.25})`; g.fillRect(x, y + bh * 0.6, bw, bh * 0.4);
        if (r() < 0.12) { g.fillStyle = 'rgba(20,14,10,.7)'; g.fillRect(x + r() * bw, y + r() * bh, 6 + r() * 14, 3 + r() * 5); }
      }
    }
    for (let i = 0; i < 260; i++) {
      const x = r() * 512, y = r() * 512, rad = 4 + r() * 26, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${40 + r() * 30},${60 + r() * 30},${30 + r() * 15},${0.35 + r() * 0.3})`); gr.addColorStop(1, 'rgba(40,60,30,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 60; i++) {
      const x = r() * 512, gr = g.createLinearGradient(0, 0, 0, 512);
      gr.addColorStop(0, 'rgba(0,0,0,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x, 0, 2 + r() * 8, 120 + r() * 380);
    }
  }));
}
export function groundTexture() {
  return _ground || (_ground = canvasTex(512, 512, (g) => {
    const r = rng(3);
    g.fillStyle = '#2b3420'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5000; i++) {
      const x = r() * 512, y = r() * 512;
      g.strokeStyle = `hsla(${70 + r() * 40},${25 + r() * 25}%,${8 + r() * 18}%,.8)`;
      g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 7); g.stroke();
    }
    for (let i = 0; i < 40; i++) {
      const x = r() * 512, y = r() * 512, rad = 10 + r() * 50, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(38,28,20,.85)'); gr.addColorStop(1, 'rgba(38,28,20,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }));
}
export function softSprite() {
  return _sprite || (_sprite = canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }, false));
}
/** lông hổ: cam, vằn đen, bụng trắng (dọc theo chiều v của khối cầu) */
export function stripeTexture() {
  return _stripe || (_stripe = canvasTex(512, 256, (g, w, h) => {
    const r = rng(21);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#d9d2c2'); gr.addColorStop(0.18, '#c8742c'); gr.addColorStop(0.5, '#b45f1f'); gr.addColorStop(0.82, '#c8742c'); gr.addColorStop(1, '#d9d2c2');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#140d08';
    for (let i = 0; i < 34; i++) {
      const x = (i / 34) * w + r() * 8, wd = 3 + r() * 7;
      g.beginPath(); g.moveTo(x, h * (0.18 + r() * 0.1));
      g.bezierCurveTo(x + 14 * (r() - 0.5), h * 0.35, x + wd + 10 * (r() - 0.5), h * 0.65, x + wd * 0.3, h * (0.72 + r() * 0.1));
      g.lineTo(x + wd, h * 0.5); g.closePath(); g.fill();
    }
  }));
}

/* ================= Đấu trường ================= */
export function buildArena(scene, { soldiers = false } = {}) {
  const brick = brickTexture();
  const wallMat = new THREE.MeshStandardMaterial({ map: brick, bumpMap: brick, bumpScale: 0.6, roughness: 0.95 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.9 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x010101 });
  const tex = (rx, ry) => { const t = brick.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return t; };
  const wm = (rx, ry, side = THREE.FrontSide) => { const m = wallMat.clone(); m.map = m.bumpMap = tex(rx, ry); m.side = side; return m; };

  const gt = groundTexture().clone(); gt.needsUpdate = true; gt.repeat.set(10, 10);
  const floorMat = new THREE.MeshStandardMaterial({ map: gt, bumpMap: gt, bumpScale: 0.4, roughness: 1 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R_IN, 96), floorMat); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const w = new THREE.Mesh(new THREE.CylinderGeometry(R_IN, R_IN, H_IN, 128, 1, true), wm(34, 1.85, THREE.BackSide)); w.position.y = H_IN / 2; scene.add(w);
  const top = new THREE.Mesh(new THREE.RingGeometry(R_IN, R_OUT, 128, 1), new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 1 }));
  top.rotation.x = -Math.PI / 2; top.position.y = H_IN; scene.add(top);
  const par = new THREE.Mesh(new THREE.CylinderGeometry(R_IN + 0.25, R_IN + 0.25, 0.8, 128, 1, true), wm(34, 0.25, THREE.DoubleSide)); par.position.y = H_IN + 0.4; scene.add(par);
  const out = new THREE.Mesh(new THREE.CylinderGeometry(R_OUT, R_OUT + H_OUT * Math.tan(0.2), H_OUT, 128, 1, true), wm(40, 1.5)); out.position.y = GROUND_OUT + H_OUT / 2; scene.add(out);
  const og = new THREE.Mesh(new THREE.RingGeometry(R_OUT + 1, 160, 64, 1), new THREE.MeshStandardMaterial({ color: 0x10150d, roughness: 1 }));
  og.rotation.x = -Math.PI / 2; og.position.y = GROUND_OUT; scene.add(og);

  const cageDoors = CAGE_ANGLES.map((phi) => {
    const g = new THREE.Group(); g.position.copy(onRing(R_IN - 0.03, phi)); g.lookAt(0, 0, 0);
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), dark); hole.position.set(0, 1.3, 0.01); g.add(hole);
    const frame = (fw, fh, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.22), wood); m.position.set(x, y, 0.1); g.add(m); };
    frame(0.22, 2.9, -1.2, 1.45); frame(0.22, 2.9, 1.2, 1.45); frame(2.8, 0.28, 0, 2.86);
    const gate = new THREE.Group();
    for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.6, 0.09), wood); b.position.set(-0.96 + k * 0.32, 1.3, 0.18); gate.add(b); }
    [0.5, 1.6].forEach((y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.1), wood); b.position.set(0, y, 0.22); gate.add(b); });
    g.add(gate);
    const winch = new THREE.Group(); winch.position.set(0, H_IN, -0.9);
    [-0.8, 0.8].forEach((x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 0.16), wood); p.position.set(x, 0.95, 0); winch.add(p); });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.9, 8), wood); beam.rotation.z = Math.PI / 2; beam.position.y = 1.75; winch.add(beam);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.6), wood); lever.position.set(0.95, 1.75, 0.7); lever.rotation.x = -0.5; winch.add(lever);
    g.add(winch);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, H_IN - 1.0, 4), new THREE.MeshStandardMaterial({ color: 0x6b5a40 }));
    rope.position.set(0, (H_IN + 2.6) / 2 + 0.4, 0.12); g.add(rope);
    scene.add(g);
    return { group: g, gate, phi, mouth: onRing(R_IN - 1.2, phi) };
  });

  // khán đài vua phía Bắc
  const stand = new THREE.Group(); stand.position.copy(onRing(R_IN + 1.6, Math.PI, H_IN)); stand.lookAt(0, H_IN, 0);
  const base = new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 4), wm(3, 0.5)); base.position.y = 0.6; stand.add(base);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x6e1712, roughness: 0.7 });
  [[-3.6, -1.4], [3.6, -1.4], [-3.6, 1.4], [3.6, 1.4]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3, 10), pillarMat); p.position.set(x, 2.7, z); stand.add(p);
  });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.2, 4, 1), new THREE.MeshStandardMaterial({ color: 0x4a2a1c, roughness: 0.9 }));
  roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.5); roof.position.y = 5.2; stand.add(roof);
  scene.add(stand);

  // rừng cây bao quanh
  const trunk = new THREE.CylinderGeometry(0.3, 0.5, 9, 6), crown = new THREE.IcosahedronGeometry(4.2, 3);
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x0f170d, roughness: 1 });
  const N = 90, ti = new THREE.InstancedMesh(trunk, treeMat, N), ci = new THREE.InstancedMesh(crown, treeMat, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(); const r = rng(11);
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2, d = 31 + r() * 40, k = 0.7 + r() * 1.1;
    p.set(Math.sin(a) * d, GROUND_OUT + 4.5 * k, Math.cos(a) * d); s.set(k, k, k); m.compose(p, q, s); ti.setMatrixAt(i, m);
    p.y += 6 * k; s.set(k * (0.8 + r() * 0.6), k * (0.7 + r() * 0.5), k * (0.8 + r() * 0.6)); m.compose(p, q, s); ci.setMatrixAt(i, m);
  }
  scene.add(ti, ci);

  // lính đứng quanh vành tường (chỉ ban ngày)
  if (soldiers) {
    const body = new THREE.CylinderGeometry(0.2, 0.26, 1.15, 8), head = new THREE.SphereGeometry(0.13, 10, 8), hat = new THREE.ConeGeometry(0.22, 0.28, 10);
    const red = new THREE.MeshStandardMaterial({ color: 0x9a1d14, roughness: 0.8 }), skin = new THREE.MeshStandardMaterial({ color: 0x8a5a3c }), blk = new THREE.MeshStandardMaterial({ color: 0x161210 });
    const M = 46, bi = new THREE.InstancedMesh(body, red, M), hi = new THREE.InstancedMesh(head, skin, M), ci2 = new THREE.InstancedMesh(hat, blk, M);
    for (let i = 0; i < M; i++) {
      const phi = -1.25 + (i / (M - 1)) * 2.5 + Math.PI * (i % 2 ? 0 : 0); // nửa vòng phía Nam
      const pos = onRing(R_IN + 1.1, phi, H_IN);
      p.copy(pos).setY(H_IN + 0.58); s.set(1, 1, 1); m.compose(p, q, s); bi.setMatrixAt(i, m);
      p.y += 0.72; m.compose(p, q, s); hi.setMatrixAt(i, m);
      p.y += 0.16; m.compose(p, q, s); ci2.setMatrixAt(i, m);
    }
    scene.add(bi, hi, ci2);
    // cờ vàng, cờ đỏ dọc vành tường
    const flagG = new THREE.PlaneGeometry(0.9, 1.3), poleG = new THREE.CylinderGeometry(0.03, 0.03, 3, 5);
    for (let i = 0; i < 14; i++) {
      const phi = -2.6 + (i / 13) * 5.2, pos = onRing(R_IN + 2.2, phi, H_IN);
      const pole = new THREE.Mesh(poleG, wood); pole.position.copy(pos).setY(H_IN + 1.5); scene.add(pole);
      const f = new THREE.Mesh(flagG, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xd8a21c : 0xa3231a, side: THREE.DoubleSide, roughness: 0.8 }));
      f.position.copy(pos).setY(H_IN + 2.4); f.position.x += 0.45 * Math.cos(phi); f.lookAt(0, H_IN + 2.4, 0); f.rotateY(Math.PI / 2); scene.add(f);
    }
  }
  return { cageDoors, floorMat };
}

/** đuốc trên vành tường */
export function buildTorches(scene, count = 6) {
  const sprite = softSprite(), wood = new THREE.MeshStandardMaterial({ color: 0x2a1c12 });
  return [-0.95, -0.55, 0.55, 0.95, 1.9, -1.9].slice(0, count).map((phi, i) => {
    const pos = onRing(R_IN + 0.3, phi, H_IN + 1.3);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.3, 6), wood); pole.position.copy(pos).setY(H_IN + 0.65); scene.add(pole);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0xffa050, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    flame.position.copy(pos); flame.scale.setScalar(0.9); scene.add(flame);
    const light = i < 4 ? new THREE.PointLight(0xff8a3a, 30, 40, 1.4) : null;
    if (light) { light.position.copy(pos).add(new THREE.Vector3(0, 0.2, 0)); scene.add(light); }
    return { flame, light, seed: i * 1.7 };
  });
}
export function flickerTorches(torches, time, k = 1) {
  torches.forEach((t) => {
    const f = 0.8 + Math.sin(time * 9 + t.seed) * 0.08 + Math.sin(time * 23 + t.seed * 3) * 0.06 + (Math.random() - 0.5) * 0.06;
    t.flame.scale.set(0.7 * f, 1.1 * f, 1); t.flame.material.opacity = k;
    if (t.light) t.light.intensity = 30 * f * k;
  });
}
export function buildMist(scene, color = 0x8796a8, n = 34) {
  const sprite = softSprite(), r = rng(5), mist = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color, transparent: true, opacity: 0.05, depthWrite: false }));
    const a = r() * Math.PI * 2, d = r() * (R_IN - 3);
    s.position.set(Math.sin(a) * d, 0.6 + r() * 1.2, Math.cos(a) * d); s.scale.set(6 + r() * 6, 1.6 + r() * 1.4, 1); scene.add(s);
    mist.push({ s, sp: 0.1 + r() * 0.25, ph: r() * 6 });
  }
  return (time, dt, k = 1) => mist.forEach((m) => { m.s.position.x += Math.sin(time * 0.05 + m.ph) * m.sp * dt; m.s.material.opacity = (0.045 + 0.025 * Math.sin(time * 0.2 + m.ph)) * k; });
}
export function buildDust(scene, color = 0xc9b9a0, n = 1400, size = 0.06) {
  const pos = new Float32Array(n * 3), r = rng(9);
  for (let i = 0; i < n; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * R_IN; pos.set([Math.sin(a) * d, r() * 7, Math.cos(a) * d], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: softSprite(), size, color, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(p); return p;
}

/* ================= Hổ bằng khói ================= */
export function tigerGeometry(n, seed) {
  const r = rng(seed), P = [], part = [], rnd = [];
  const ell = (c, rad, id) => {
    let x, y, z, l;
    do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1; l = x * x + y * y + z * z; } while (l > 1 || l < 0.01);
    l = Math.sqrt(l); const k = 0.82 + r() * 0.18;
    return [c[0] + (x / l) * rad[0] * k, c[1] + (y / l) * rad[1] * k, c[2] + (z / l) * rad[2] * k, id];
  };
  const LEGS = [[-0.2, 0.62, 2], [0.2, 0.62, 3], [-0.21, -0.68, 4], [0.21, -0.68, 5]];
  while (P.length / 3 < n) {
    const u = r(); let s;
    if (u < 0.36) s = ell([0, 0.95, -0.1], [0.37, 0.4, 0.92], 0);
    else if (u < 0.48) s = ell([0, 1.0, 0.55], [0.38, 0.46, 0.42], 0);
    else if (u < 0.6) s = ell([0, 1.17, 1.22], [0.27, 0.26, 0.29], 1);
    else if (u < 0.63) s = ell([0, 1.06, 1.48], [0.15, 0.12, 0.15], 1);
    else if (u < 0.65) s = ell([r() < 0.5 ? -0.17 : 0.17, 1.39, 1.16], [0.07, 0.08, 0.04], 1);
    else if (u < 0.88) {
      const L = LEGS[Math.floor(r() * 4)], y = r() * 0.88, a = r() * 6.283, rad = 0.1 + (y < 0.14 ? 0.04 : 0) + (y > 0.6 ? 0.04 : 0);
      s = [L[0] + Math.cos(a) * rad, y, L[1] + Math.sin(a) * rad * 1.2, L[2]];
    } else {
      const t = r(), a = r() * 6.283, rad = 0.06 * (1 - 0.45 * t);
      const by = 1.0 * (1 - t) * (1 - t) + 0.55 * 2 * t * (1 - t) + 0.82 * t * t, bz = -0.95 * (1 - t) * (1 - t) - 1.55 * 2 * t * (1 - t) - 2.15 * t * t;
      s = [Math.cos(a) * rad, by + Math.sin(a) * rad, bz, 6];
    }
    const [x, y, z, id] = s;
    const st = id === 6 ? Math.sin(z * 14) : (id >= 2 && id <= 5) ? Math.sin(y * 16 + x * 3) : Math.sin(z * 9.5 + Math.sin(y * 7) * 1.4 + Math.abs(x) * 3);
    if (id !== 1 && st > 0.45 && r() < 0.86) continue;
    P.push(x, y, z); part.push(id); rnd.push(r());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.setAttribute('aRand', new THREE.Float32BufferAttribute(rnd, 1));
  return g;
}
const tigerVert = /* glsl */`
attribute float aPart; attribute float aRand;
uniform float uTime, uWalk, uDissolve, uScale, uSmoke, uLook, uRear, uPt;
varying float vA; varying float vR; varying float vHead;
void main(){
  vec3 p = position;
  if(aPart > 1.5 && aPart < 5.5){
    float off = (abs(aPart-2.) < .1 || abs(aPart-5.) < .1) ? 0. : 3.14159;
    float a = sin(uWalk + off) * .42;
    if(aPart < 3.5) a -= uRear * .9;
    float h = .88 - p.y;
    p.z += sin(a) * h; p.y = .88 - cos(a) * h;
    p.y += max(0., cos(uWalk + off)) * .07 * (h / .88);
  }
  if(aPart > 5.5){
    float k = clamp((-.95 - p.z) / 1.2, 0., 1.);
    p.x += sin(uTime * 1.7 + k * 3.) * .38 * k * k; p.y += sin(uTime * 1.3 + k * 2.) * .12 * k;
  }
  if(aPart > .5 && aPart < 1.5){
    float c = cos(uLook), s = sin(uLook); vec3 q = p - vec3(0., 1.1, .9);
    p = vec3(c*q.x + s*q.z, q.y, -s*q.x + c*q.z) + vec3(0., 1.1, .9);
  }
  // chồm lên: xoay quanh chân sau
  if(uRear > 0.){
    float c = cos(-uRear*.8), s = sin(-uRear*.8); vec3 q = p - vec3(0., .2, -.7);
    p = vec3(q.x, c*q.y - s*q.z, s*q.y + c*q.z) + vec3(0., .2, -.7);
  }
  p.y += sin(uWalk * 2.) * .025;
  float smoke = step(.5, aRand) * (uSmoke + uDissolve * 1.6);
  float life = fract(uTime * .16 * (.5 + aRand) + aRand * 7.);
  p += vec3(sin(aRand * 40. + uTime * .7) * .2, life * 1.1, cos(aRand * 31. + uTime * .6) * .2) * smoke;
  vec3 dir = normalize(position - vec3(0., .9, 0.) + 1e-4);
  p += dir * uDissolve * uDissolve * (1.5 + aRand * 5.) + vec3(0., uDissolve * aRand * 2., 0.);
  p += vec3(sin(uTime * 23. + aRand * 91.), sin(uTime * 19. + aRand * 53.), sin(uTime * 17. + aRand * 37.)) * .012;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPt * uScale * (.55 + aRand * .9) / max(.1, -mv.z);
  vA = (1. - uDissolve) * (1. - life * smoke * .85);
  vR = aRand; vHead = step(.5, aPart) * step(aPart, 1.5);
}`;
const tigerFrag = /* glsl */`
uniform vec3 uColor; uniform float uAlpha;
varying float vA; varying float vR; varying float vHead;
void main(){
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, .0, d);
  vec3 c = uColor * (.55 + vR * .9) + vHead * .15;
  gl_FragColor = vec4(c * a * vA * uAlpha, 1.);
}`;
export const tigerMats = new Set();
export function smokeTiger(color, n = 7000, seed = 101, pt = 0.05) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: tigerVert, fragmentShader: tigerFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uWalk: { value: 0 }, uDissolve: { value: 1 }, uScale: { value: 1 }, uSmoke: { value: 0.35 }, uLook: { value: 0 }, uRear: { value: 0 }, uPt: { value: pt }, uColor: { value: new THREE.Color(color) }, uAlpha: { value: 0.55 } },
  });
  tigerMats.add(mat);
  const pts = new THREE.Points(tigerGeometry(n, seed), mat); pts.frustumCulled = false;
  const group = new THREE.Group(); group.add(pts);
  return { group, mat, u: mat.uniforms };
}

/* ================= Hổ thật và voi chiến (ban ngày) ================= */
export function solidTiger() {
  const fur = new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.85 });
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const sph = (rx, ry, rz, x, y, z, mat = fur) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat); m.scale.set(rx, ry, rz); m.position.set(x, y, z); body.add(m); return m; };
  sph(0.4, 0.42, 1.0, 0, 0.95, -0.1); sph(0.42, 0.48, 0.45, 0, 1.0, 0.55);
  const head = new THREE.Group(); head.position.set(0, 1.15, 1.15); body.add(head);
  const hs = (rx, ry, rz, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), fur); m.scale.set(rx, ry, rz); m.position.set(x, y, z); head.add(m); };
  hs(0.3, 0.28, 0.3, 0, 0, 0.05); hs(0.17, 0.14, 0.18, 0, -0.08, 0.3); hs(0.07, 0.09, 0.04, -0.18, 0.24, 0); hs(0.07, 0.09, 0.04, 0.18, 0.24, 0);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ color: 0x3a0c08 })); jaw.scale.set(0.13, 0.05, 0.15); jaw.position.set(0, -0.18, 0.28); head.add(jaw);
  const legs = [[-0.22, 0.62], [0.22, 0.62], [-0.23, -0.7], [0.23, -0.7]].map(([x, z]) => {
    const pv = new THREE.Group(); pv.position.set(x, 0.88, z); body.add(pv);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.9, 10), fur); l.position.y = -0.45; pv.add(l);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), fur); paw.position.y = -0.86; paw.scale.set(1, 0.6, 1.3); pv.add(paw);
    return pv;
  });
  const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.0, -1.0), new THREE.Vector3(0, 0.6, -1.6), new THREE.Vector3(0.2, 0.75, -2.2)]);
  body.add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 16, 0.06, 6), fur));
  return { group: g, body, head, jaw, legs };
}
export function elephant() {
  const skin = new THREE.MeshStandardMaterial({ color: 0x6d655d, roughness: 0.95 });
  const ivory = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.5 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x8c1912, roughness: 0.75 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc8962a, roughness: 0.4, metalness: 0.6 });
  const root = new THREE.Group();          // gốc ở chân sau, để voi chồm lên quanh đó
  const g = new THREE.Group(); g.position.z = 1.3; root.add(g);
  const sph = (rx, ry, rz, x, y, z, mat = skin) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), mat); m.scale.set(rx, ry, rz); m.position.set(x, y, z); g.add(m); return m; };
  sph(1.45, 1.35, 2.1, 0, 2.6, 0);
  const head = new THREE.Group(); head.position.set(0, 3.25, 2.1); g.add(head);
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 16), skin); head.add(hm);
  [-1, 1].forEach((sx) => { const e = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skin); e.scale.set(0.12, 0.85, 0.75); e.position.set(sx * 0.9, 0.05, -0.25); e.rotation.y = sx * 0.4; head.add(e); });
  const trunkCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.2, 0.75), new THREE.Vector3(0, -1.1, 1.05), new THREE.Vector3(0, -2.0, 1.0), new THREE.Vector3(0, -2.6, 1.25)]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 24, 0.2, 10), skin); head.add(trunk);
  [-1, 1].forEach((sx) => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * 0.35, -0.5, 0.6), new THREE.Vector3(sx * 0.42, -1.0, 1.1), new THREE.Vector3(sx * 0.3, -0.9, 1.6)]);
    head.add(new THREE.Mesh(new THREE.TubeGeometry(c, 10, 0.06, 6), ivory));
  });
  const legs = [[-0.75, 1.25], [0.75, 1.25], [-0.75, -1.2], [0.75, -1.2]].map(([x, z]) => {
    const pv = new THREE.Group(); pv.position.set(x, 2.0, z); g.add(pv);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.38, 2.1, 14), skin); l.position.y = -1.0; pv.add(l);
    return pv;
  });
  // áo voi đỏ viền vàng, như trong trailer
  const c = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.6, 2.4, 24, 1, true, -Math.PI * 0.62, Math.PI * 1.24), new THREE.MeshStandardMaterial({ color: 0x8c1912, roughness: 0.75, side: THREE.DoubleSide }));
  c.rotation.x = Math.PI / 2; c.rotation.y = Math.PI; c.position.set(0, 2.75, 0); c.scale.set(1, 1, 1.05); g.add(c);
  void gold;
  // quản tượng
  const man = figure(0x8c1912); man.position.set(0, 4.0, 1.0); man.scale.setScalar(0.85); g.add(man);
  return { root, g, head, trunk, legs, cloth };
}
export function figure(color = 0x1a1412, hatColor = 0x161210) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.2, 10), m); b.position.y = 0.6; g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshStandardMaterial({ color: 0x7a5038 })); h.position.y = 1.36; g.add(h);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.2, 14), new THREE.MeshStandardMaterial({ color: hatColor })); hat.position.y = 1.52; g.add(hat);
  return g;
}
