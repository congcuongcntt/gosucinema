// Bản thử "Mắt Âm" — đấu trường Hổ Quyền, đêm năm 1836.
// Một cảnh 3D, hai thế giới: dương (đêm trăng, côn trùng) và âm (oán khí đỏ, bóng hổ khói).
// Nhấn giữ để mở Mắt Âm quanh con trỏ. Hổ chỉ đứng yên khi bị nhìn thấy.
import * as THREE from 'three';
import * as A from './audio.js';

const $ = (s) => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const QS = new URLSearchParams(location.search);
const DEBUG = QS.has('debug');
const TS = DEBUG ? +(QS.get('ts') || 1) : 1;   // ?debug&ts=8: tua nhanh để kiểm tra

/* ================= Số đo Hổ Quyền (m) ================= */
const R_IN = 22;          // bán kính lòng chảo (đường kính 44 m)
const H_IN = 5.9;         // thành trong
const H_OUT = 4.75;       // thành ngoài
const R_OUT = 25;
const GROUND_OUT = H_IN - H_OUT; // mặt đất phía ngoài cao hơn lòng chảo
const CAGE_ANGLES = [-0.5, -0.25, 0, 0.25, 0.5];   // 5 chuồng ở phía Nam, đối diện khán đài
const onRing = (r, phi, y = 0) => new THREE.Vector3(r * Math.sin(phi), y, -r * Math.cos(phi)); // phi = 0: chính Nam

/* ================= Renderer ================= */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

const scene = new THREE.Scene();      // thế giới chung (cả dương lẫn âm đều thấy)
const ghosts = new THREE.Scene();     // chỉ Mắt Âm thấy
const FOG_NIGHT = new THREE.Color(0x0b0f14), FOG_DAWN = new THREE.Color(0x8a8f8c);
scene.fog = new THREE.FogExp2(FOG_NIGHT.clone(), 0.014);
scene.background = FOG_NIGHT.clone();

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 260);
camera.rotation.order = 'YXZ';
const EYE = new THREE.Vector3(0, 1.62, 9);
camera.position.copy(EYE);

/* ================= Vật liệu vẽ bằng canvas ================= */
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function brickTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); const r = rng(7);
  g.fillStyle = '#5a5246'; g.fillRect(0, 0, 512, 512);
  const bw = 64, bh = 30;
  for (let y = 0, row = 0; y < 512; y += bh + 2, row++) {
    for (let x = -(row % 2) * bw / 2; x < 512; x += bw + 2) {
      const k = r();
      const h = 14 + k * 14, s = 28 + r() * 22, l = 27 + r() * 16;   // gạch vồ nâu đỏ đã sẫm màu
      g.fillStyle = `hsl(${h},${s}%,${l}%)`;
      g.fillRect(x, y, bw, bh);
      g.fillStyle = `rgba(0,0,0,${r() * 0.25})`; g.fillRect(x, y + bh * 0.6, bw, bh * 0.4);
      if (r() < 0.12) { g.fillStyle = 'rgba(20,14,10,.7)'; g.fillRect(x + r() * bw, y + r() * bh, 6 + r() * 14, 3 + r() * 5); }
    }
  }
  // rêu và vệt nước chảy
  for (let i = 0; i < 260; i++) {
    const x = r() * 512, y = r() * 512, rad = 4 + r() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${40 + r() * 30},${60 + r() * 30},${30 + r() * 15},${0.35 + r() * 0.3})`);
    gr.addColorStop(1, 'rgba(40,60,30,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 60; i++) {
    const x = r() * 512, w = 2 + r() * 8;
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x, 0, w, 120 + r() * 380);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function groundTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); const r = rng(3);
  g.fillStyle = '#2b3420'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) {
    const x = r() * 512, y = r() * 512;
    g.strokeStyle = `hsla(${70 + r() * 40},${25 + r() * 25}%,${8 + r() * 18}%,.8)`;
    g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 7); g.stroke();
  }
  for (let i = 0; i < 40; i++) {   // vũng bùn, vết chân
    const x = r() * 512, y = r() * 512, rad = 10 + r() * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(38,28,20,.85)'); gr.addColorStop(1, 'rgba(38,28,20,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function softSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/* ================= Dựng đấu trường ================= */
const brick = brickTexture();
const wallMat = new THREE.MeshStandardMaterial({ map: brick, bumpMap: brick, bumpScale: 0.6, roughness: 0.95, metalness: 0 });
const wood = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.9 });
const dark = new THREE.MeshBasicMaterial({ color: 0x010101 });

{ // lòng chảo
  const gt = groundTexture(); gt.repeat.set(10, 10);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R_IN, 96), new THREE.MeshStandardMaterial({ map: gt, bumpMap: gt, bumpScale: 0.4, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
}
{ // thành trong: nhìn từ bên trong
  const tex = brick.clone(); tex.needsUpdate = true; tex.repeat.set(34, 1.85);
  const m = wallMat.clone(); m.map = tex; m.bumpMap = tex; m.side = THREE.BackSide;
  const w = new THREE.Mesh(new THREE.CylinderGeometry(R_IN, R_IN, H_IN, 128, 1, true), m);
  w.position.y = H_IN / 2; scene.add(w);
  // mặt trên vành tường + lan can thấp
  const top = new THREE.Mesh(new THREE.RingGeometry(R_IN, R_OUT, 128, 1), new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 1 }));
  top.rotation.x = -Math.PI / 2; top.position.y = H_IN; scene.add(top);
  const pt = brick.clone(); pt.needsUpdate = true; pt.repeat.set(34, 0.25);
  const pm = wallMat.clone(); pm.map = pt; pm.bumpMap = pt; pm.side = THREE.DoubleSide;
  const par = new THREE.Mesh(new THREE.CylinderGeometry(R_IN + 0.25, R_IN + 0.25, 0.8, 128, 1, true), pm);
  par.position.y = H_IN + 0.4; scene.add(par);
  // thành ngoài, hơi nghiêng
  const ot = brick.clone(); ot.needsUpdate = true; ot.repeat.set(40, 1.5);
  const om = wallMat.clone(); om.map = ot; om.bumpMap = ot;
  const out = new THREE.Mesh(new THREE.CylinderGeometry(R_OUT, R_OUT + H_OUT * Math.tan(0.2), H_OUT, 128, 1, true), om);
  out.position.y = GROUND_OUT + H_OUT / 2; scene.add(out);
  const og = new THREE.Mesh(new THREE.RingGeometry(R_OUT + 1, 140, 64, 1), new THREE.MeshStandardMaterial({ color: 0x10150d, roughness: 1 }));
  og.rotation.x = -Math.PI / 2; og.position.y = GROUND_OUT; scene.add(og);
}

const cageDoors = [];
CAGE_ANGLES.forEach((phi, i) => {   // năm chuồng cọp
  const g = new THREE.Group();
  g.position.copy(onRing(R_IN - 0.03, phi));
  g.lookAt(0, 0, 0);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), dark); hole.position.set(0, 1.3, 0.01); g.add(hole);
  const frame = (w, h, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.22), wood); m.position.set(x, y, z); g.add(m); };
  frame(0.22, 2.9, -1.2, 1.45, 0.1); frame(0.22, 2.9, 1.2, 1.45, 0.1); frame(2.8, 0.28, 0, 2.86, 0.1);
  // song cửa gỗ kéo lên bằng tời; cửa giữa hé mở
  const gate = new THREE.Group();
  for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.6, 0.09), wood); b.position.set(-0.96 + k * 0.32, 1.3, 0.18); gate.add(b); }
  [0.5, 1.6].forEach((y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.1), wood); b.position.set(0, y, 0.22); gate.add(b); });
  g.add(gate);
  // tời trên vành tường
  const winch = new THREE.Group(); winch.position.set(0, H_IN, -0.9);
  [-0.8, 0.8].forEach((x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 0.16), wood); p.position.set(x, 0.95, 0); winch.add(p); });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.9, 8), wood); beam.rotation.z = Math.PI / 2; beam.position.y = 1.75; winch.add(beam);
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.6), wood); lever.position.set(0.95, 1.75, 0.7); lever.rotation.x = -0.5; winch.add(lever);
  g.add(winch);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, H_IN - 1.0, 4), new THREE.MeshStandardMaterial({ color: 0x6b5a40 }));
  rope.position.set(0, (H_IN + 2.6) / 2 + 0.4, 0.12); g.add(rope);
  scene.add(g);
  cageDoors.push({ group: g, gate, phi, mouth: onRing(R_IN - 1.2, phi) });
});

{ // khán đài của vua phía Bắc (sau lưng người xem)
  const g = new THREE.Group(); g.position.copy(onRing(R_IN + 1.6, Math.PI, H_IN)); g.lookAt(0, H_IN, 0);
  const base = new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 4), wallMat); base.position.y = 0.6; g.add(base);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a2a1c, roughness: 0.9 });
  [[-3.6, -1.4], [3.6, -1.4], [-3.6, 1.4], [3.6, 1.4]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3, 10), new THREE.MeshStandardMaterial({ color: 0x6e1712, roughness: 0.7 }));
    p.position.set(x, 2.7, z); g.add(p);
  });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.2, 4, 1), roofMat); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.5); roof.position.y = 5.2; g.add(roof);
  scene.add(g);
}

{ // rừng cây bao quanh, chỉ là bóng đen trong sương
  const trunk = new THREE.CylinderGeometry(0.3, 0.5, 9, 6);
  const crown = new THREE.IcosahedronGeometry(4.2, 3);
  const mt = new THREE.MeshStandardMaterial({ color: 0x0a0f09, roughness: 1 });
  const N = 90, ti = new THREE.InstancedMesh(trunk, mt, N), ci = new THREE.InstancedMesh(crown, mt, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(); const r = rng(11);
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2, d = 31 + r() * 40, k = 0.7 + r() * 1.1;
    p.set(Math.sin(a) * d, GROUND_OUT + 4.5 * k, Math.cos(a) * d); s.set(k, k, k); m.compose(p, q, s); ti.setMatrixAt(i, m);
    p.y += 6 * k; s.set(k * (0.8 + r() * 0.6), k * (0.7 + r() * 0.5), k * (0.8 + r() * 0.6)); m.compose(p, q, s); ci.setMatrixAt(i, m);
  }
  scene.add(ti, ci);
}

/* ---------- ánh sáng: trăng, đuốc ---------- */
const hemi = new THREE.HemisphereLight(0x6a7c98, 0x1a140e, 1.1); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9db4d6, 1.5); moon.position.set(-30, 40, 20); scene.add(moon);
const sun = new THREE.DirectionalLight(0xffc89a, 0); sun.position.set(40, 12, -10); scene.add(sun);
const sprite = softSprite();
const torches = [];
[-0.95, -0.55, 0.55, 0.95, 1.9, -1.9].forEach((phi, i) => {
  const pos = onRing(R_IN + 0.3, phi, H_IN + 1.3);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.3, 6), wood); pole.position.copy(pos).setY(H_IN + 0.65); scene.add(pole);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0xffa050, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  flame.position.copy(pos); flame.scale.setScalar(0.9); scene.add(flame);
  const light = i < 4 ? new THREE.PointLight(0xff8a3a, 30, 40, 1.4) : null;
  if (light) { light.position.copy(pos).add(new THREE.Vector3(0, 0.2, 0)); scene.add(light); }
  torches.push({ flame, light, seed: i * 1.7 });
});

/* ---------- sương sát đất, tro bụi ---------- */
const mist = [];
{
  const r = rng(5);
  for (let i = 0; i < 34; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0x8796a8, transparent: true, opacity: 0.04 + r() * 0.04, depthWrite: false }));
    const a = r() * Math.PI * 2, d = r() * (R_IN - 3);
    s.position.set(Math.sin(a) * d, 0.6 + r() * 1.2, Math.cos(a) * d);
    s.scale.set(6 + r() * 6, 1.6 + r() * 1.4, 1); scene.add(s);
    mist.push({ s, sp: 0.1 + r() * 0.25, ph: r() * 6 });
  }
}
const dust = (() => {
  const N = 1400, pos = new Float32Array(N * 3), r = rng(9);
  for (let i = 0; i < N; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * R_IN; pos.set([Math.sin(a) * d, r() * 7, Math.cos(a) * d], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ map: sprite, size: 0.06, color: 0xc9b9a0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
  const p = new THREE.Points(g, m); scene.add(p); return p;
})();

/* ================= Hổ bằng khói ================= */
// Một đám điểm lấy mẫu trên các khối: thân, ngực, đầu, mõm, tai, bốn chân, đuôi.
// Vằn hổ = những dải bị bỏ trống. Chân bước theo dáng chéo, đuôi quẫy, khói bốc lên từ lưng.
function tigerGeometry(n, seed) {
  const r = rng(seed);
  const P = [], part = [], rnd = [];
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
      const bx = 0, by = 1.0 * (1 - t) * (1 - t) + 0.55 * 2 * t * (1 - t) + 0.82 * t * t;
      const bz = -0.95 * (1 - t) * (1 - t) - 1.55 * 2 * t * (1 - t) - 2.15 * t * t;
      s = [bx + Math.cos(a) * rad, by + Math.sin(a) * rad, bz, 6];
    }
    // vằn: bỏ trống các dải ngang trên thân, đuôi và chân
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
uniform float uTime, uWalk, uDissolve, uScale, uSmoke, uLook;
varying float vA; varying float vR; varying float vHead;
void main(){
  vec3 p = position;
  if(aPart > 1.5 && aPart < 5.5){
    float off = (abs(aPart-2.) < .1 || abs(aPart-5.) < .1) ? 0. : 3.14159;
    float a = sin(uWalk + off) * .42;
    float h = .88 - p.y;
    p.z += sin(a) * h; p.y = .88 - cos(a) * h;
    p.y += max(0., cos(uWalk + off)) * .07 * (h / .88);
  }
  if(aPart > 5.5){
    float k = clamp((-.95 - p.z) / 1.2, 0., 1.);
    p.x += sin(uTime * 1.7 + k * 3.) * .38 * k * k; p.y += sin(uTime * 1.3 + k * 2.) * .12 * k;
  }
  if(aPart > .5 && aPart < 1.5){            // đầu quay theo người xem
    float c = cos(uLook), s = sin(uLook); vec3 q = p - vec3(0., 1.1, .9);
    p = vec3(c*q.x + s*q.z, q.y, -s*q.x + c*q.z) + vec3(0., 1.1, .9);
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
  gl_PointSize = .05 * uScale * (.55 + aRand * .9) / max(.1, -mv.z);
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

// Ngũ Hổ: năm sắc khói (liên tưởng sáng tác từ tín ngưỡng thờ Mẫu, không phải sử liệu)
const TIGER_COLORS = [0xd9f0ea, 0xff8a6a, 0xf5d27a, 0x8fe0d2, 0xb7a8e6];
const tigers = CAGE_ANGLES.map((phi, i) => {
  const mat = new THREE.ShaderMaterial({
    vertexShader: tigerVert, fragmentShader: tigerFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uWalk: { value: 0 }, uDissolve: { value: 1 }, uScale: { value: 1 }, uSmoke: { value: 0.35 }, uLook: { value: 0 }, uColor: { value: new THREE.Color(TIGER_COLORS[i]) }, uAlpha: { value: 0.55 } },
  });
  const pts = new THREE.Points(tigerGeometry(7000, 101 + i * 13), mat);
  pts.frustumCulled = false;
  const group = new THREE.Group(); group.add(pts); group.scale.setScalar(1.15); group.visible = false; ghosts.add(group);
  // đôi mắt: sống ở thế giới dương, chỉ là hai đốm sáng trong bóng tối
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute([-0.1, 1.22, 1.47, 0.1, 1.22, 1.47], 3));
  const eyes = new THREE.Points(eg, new THREE.PointsMaterial({ map: sprite, size: 0.09, color: 0xffd27a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  scene.add(eyes);
  return {
    i, group, mat, eyes, door: cageDoors[i], state: 'wait', t: 0, wake: 4 + i * 6.5, pos: new THREE.Vector3(), heading: 0,
    walk: 0, seen: 0, freed: false, voice: null, weave: Math.random() * 6, growlAt: 0,
  };
});

/* ================= Hậu kỳ: ghép hai thế giới ================= */
const rtOpts = { type: THREE.HalfFloatType, depthBuffer: true };
let rtBase = new THREE.WebGLRenderTarget(1, 1, rtOpts), rtGhost = new THREE.WebGLRenderTarget(1, 1, rtOpts);
const compMat = new THREE.ShaderMaterial({
  uniforms: {
    tBase: { value: rtBase.texture }, tGhost: { value: rtGhost.texture }, uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uRadius: { value: 0 }, uAspect: { value: 1 }, uTime: { value: 0 }, uFlash: { value: new THREE.Vector3() }, uDawn: { value: 0 },
    uShake: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */`
  uniform sampler2D tBase, tGhost; uniform vec2 uMouse, uShake, uRes; uniform float uRadius, uAspect, uTime, uDawn; uniform vec3 uFlash;
  varying vec2 vUv;
  float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
  float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*vn(p); p=p*2.03+17.1; a*=.5; } return v; }
  void main(){
    vec2 uv = vUv + uShake;
    vec3 base = texture2D(tBase, uv).rgb;
    float lum = dot(base, vec3(.299,.587,.114));
    // dương: đêm trăng, lạnh, hơi bạc màu
    vec3 day = mix(vec3(lum)*vec3(.82,.9,1.08), base, .55 + uDawn*.45);
    // mặt nạ Mắt Âm: vòng tròn quanh con trỏ, mép rách như giấy cháy
    vec2 q = (vUv - uMouse) * vec2(uAspect, 1.);
    float n = fbm(vUv*vec2(uAspect,1.)*5. + vec2(0., uTime*.25)) - .5;
    float d = length(q) + n*.09*(.4 + uRadius);
    float m = 1. - smoothstep(uRadius - .012, uRadius + .004, d);
    float edge = m * (1. - smoothstep(0., .016, uRadius - d)) * step(.002, uRadius);
    // âm: tương phản gắt, đỏ máu, quang sai
    vec2 off = (vUv - .5) * .006;
    float lr = dot(texture2D(tBase, uv + off).rgb, vec3(.33)), lb = dot(texture2D(tBase, uv - off).rgb, vec3(.33));
    float L = pow(clamp(lum*2.4, 0., 1.), .8);
    vec3 am = mix(vec3(.012,0.,0.), vec3(.75,.09,.04), smoothstep(.0, .55, L));
    am = mix(am, vec3(1.,.82,.62), smoothstep(.55, 1., L));
    am.r += lr*.25; am.b += lb*.05;
    vec3 gh = texture2D(tGhost, uv).rgb;
    float gl = dot(gh, vec3(.33));
    am = mix(am, am*.25, clamp(gl*1.5, 0., 1.)) + gh*1.6;
    am *= .85 + .15*sin(uTime*1.7 + vUv.y*3.);
    vec3 col = mix(day, am, m);
    col += vec3(1.,.38,.1) * edge * 1.4;
    // hạt phim, vignette
    vec2 c = vUv - .5;
    col *= 1. - dot(c, c) * (1.05 - uDawn*.5);
    col += (hash(vUv*uRes + fract(uTime)*91.) - .5) * .035;
    col = mix(col, uFlash.x > 0. ? vec3(1.,.15,.05) : vec3(.6,.8,1.), abs(uFlash.x));
    gl_FragColor = vec4(max(col, 0.), 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
  depthTest: false, depthWrite: false,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMat);
const post = new THREE.Scene(); post.add(quad);
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  rtBase.setSize(w * DPR, h * DPR); rtGhost.setSize(w * DPR, h * DPR);
  compMat.uniforms.uAspect.value = w / h;
  compMat.uniforms.uRes.value.set(w * DPR, h * DPR);
  const scale = (h * DPR) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  tigers.forEach((t) => { t.mat.uniforms.uScale.value = scale; });
}
addEventListener('resize', resize); resize();

/* ================= Điều khiển ================= */
const ptr = new THREE.Vector2(0.5, 0.55), ptrS = new THREE.Vector2(0.5, 0.55);
let holding = false, holdT = 0, radius = 0, lastInput = performance.now(), started = false;
let gyro = null;
const setPtr = (x, y) => { ptr.set(x / innerWidth, 1 - y / innerHeight); lastInput = performance.now(); };
addEventListener('pointermove', (e) => setPtr(e.clientX, e.clientY));
addEventListener('pointerdown', (e) => { if (!started) return; setPtr(e.clientX, e.clientY); holding = true; });
addEventListener('pointerup', () => { holding = false; });
addEventListener('pointercancel', () => { holding = false; });
addEventListener('blur', () => { holding = false; });
addEventListener('keydown', (e) => {
  if (!started) return;
  if (e.code === 'Space') { holding = true; e.preventDefault(); lastInput = performance.now(); }
  const k = { ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, 0.04], ArrowDown: [0, -0.04] }[e.code];
  if (k) { ptr.x = THREE.MathUtils.clamp(ptr.x + k[0], 0, 1); ptr.y = THREE.MathUtils.clamp(ptr.y + k[1], 0, 1); lastInput = performance.now(); }
});
addEventListener('keyup', (e) => { if (e.code === 'Space') holding = false; });
function enableGyro() {
  const on = () => addEventListener('deviceorientation', (e) => { if (e.gamma != null) gyro = { g: e.gamma, b: e.beta }; });
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().then((s) => s === 'granted' && on()).catch(() => {});
    else if (matchMedia('(pointer: coarse)').matches) on();
  } catch (_) {}
}

/* ================= Cổng trống ================= */
const gate = $('#gate'), drumEl = $('#drum'), ripple = $('#ripple'), beatDots = [...document.querySelectorAll('.beats i')];
let beats = 0;
function hitDrum() {
  if (started) return;
  A.initAudio();
  if (beats === 0) enableGyro();
  A.drum(0.7 + beats * 0.2);
  beatDots[beats].classList.add('on');
  drumEl.classList.add('hit'); setTimeout(() => drumEl.classList.remove('hit'), 90);
  ripple.classList.remove('go'); void ripple.offsetWidth; ripple.classList.add('go');
  beats++;
  if (beats >= 3) setTimeout(enter, 650);
}
gate.addEventListener('pointerdown', (e) => { e.stopPropagation(); hitDrum(); });
gate.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); hitDrum(); } });
gate.focus();
let enterT = 0;
function enter() {
  started = true; enterT = gameTime;
  gate.classList.add('gone');
  $('#souls').classList.add('show');
  A.startAmbience();
  tigers.forEach((t) => { t.voice = A.tigerVoice(t.i); });
}

/* ================= Hành vi của hổ ================= */
const tmp = new THREE.Vector3(), ndc = new THREE.Vector3();
let freed = 0, dawn = 0, dawnStart = -1, flash = 0, flashSign = 1, shake = 0;
const soulDots = [...document.querySelectorAll('#souls i')];
const live = $('#live');
const soundtrack = new Audio('../assets/audio/soundtrack-1836.m4a');
soundtrack.loop = true; soundtrack.volume = 0;

function spawn(t) {
  t.state = 'emerge'; t.t = 0; t.group.visible = true;
  t.pos.copy(t.door.mouth).setY(0);
  t.heading = Math.atan2(-t.pos.x, -t.pos.z);
  t.door.gate.position.y = 0;
}
const tmpS = new THREE.Vector3();
function screenOf(t) {
  tmpS.copy(t.pos).setY(1.3);
  ndc.copy(tmpS).project(camera);
  return { x: ndc.x * 0.5 + 0.5, y: ndc.y * 0.5 + 0.5, front: ndc.z < 1 };
}
function updateTiger(t, dt, time, open) {
  const u = t.mat.uniforms;
  u.uTime.value = time;
  if (t.freed && t.state === 'gone') return;
  t.t += dt;
  const toCam = tmp.set(EYE.x - t.pos.x, 0, EYE.z - t.pos.z);
  const dist = toCam.length();
  // có đang bị Mắt Âm nhìn trúng không
  const s = screenOf(t);
  const dx = (s.x - ptrS.x) * camera.aspect, dy = s.y - ptrS.y;
  const inEye = s.front && Math.hypot(dx, dy) < radius + 0.04;
  t.seen = THREE.MathUtils.damp(t.seen, inEye ? 1 : 0, 6, dt);

  if (t.state === 'wait') {
    if (started && time - enterT > t.wake) spawn(t);
    return;
  }
  if (t.state === 'emerge') {
    u.uDissolve.value = Math.max(0, 1 - t.t / 2.2);
    t.door.gate.position.y = Math.min(2.4, t.t * 1.4);
    t.walk += dt * 3;
    t.pos.addScaledVector(toCam.normalize(), dt * 0.6);
    if (t.t > 2.2) { t.state = 'stalk'; t.t = 0; }
  } else if (t.state === 'stalk') {
    t.door.gate.position.y = Math.max(0, t.door.gate.position.y - dt * 0.8);
    // bị nhìn thấy thì gần như đứng im; khuất mắt thì lao tới
    const speed = THREE.MathUtils.lerp(1.35, 0.12, t.seen) * (dawnStart > 0 ? 0 : 1);
    const dir = toCam.clone().normalize();
    const side = new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(Math.sin(time * 0.45 + t.weave) * 0.55 * Math.min(1, dist / 12));
    dir.add(side).normalize();
    t.pos.addScaledVector(dir, speed * dt);
    t.walk += dt * speed * 3.6;
    const want = Math.atan2(dir.x, dir.z);
    t.heading += Math.atan2(Math.sin(want - t.heading), Math.cos(want - t.heading)) * Math.min(1, dt * 3);
    u.uSmoke.value = 0.3 + (1 - t.seen) * 0.25;
    if (t.seen > 0.5 && time > t.growlAt && dist < 16) { A.growl(t.voice, 0.6 + (1 - dist / 16) * 0.6); t.growlAt = time + 2.6 + Math.random() * 2; }
    if (t.seen > 0.7 && dist < 4.8) { t.state = 'face'; t.t = 0; A.roar(t.voice); shake = 1; flash = 0.55; flashSign = 1; }
    else if (dist < 1.6) { t.state = 'pass'; t.t = 0; A.whoosh(); flash = 0.45; flashSign = -1; shake = 0.4; }
  } else if (t.state === 'face') {
    // đối mặt: hổ chồm lên một nhịp rồi oán khí tan thành tro
    const k = Math.min(1, t.t / 0.35);
    t.pos.addScaledVector(toCam.normalize(), dt * 5 * (1 - k));
    u.uDissolve.value = Math.max(0, (t.t - 0.5) / 1.6);
    if (t.t > 2.2) {
      t.state = 'gone'; t.freed = true; t.group.visible = false;
      soulDots[freed].classList.add('on'); A.bell(freed); freed++;
      live.textContent = `Đã giải ${freed} trên 5 linh hồn hổ.`;
      if (freed >= 5) { dawnStart = time; live.textContent = 'Trời sáng.'; }
    }
  } else if (t.state === 'pass') {
    t.pos.addScaledVector(toCam.normalize(), dt * 6);
    u.uDissolve.value = Math.min(1, t.t / 0.6);
    if (t.t > 0.8) { t.state = 'wait'; t.group.visible = false; t.wake = time - enterT + 3 + Math.random() * 3; u.uDissolve.value = 1; }
  }
  u.uWalk.value = t.walk;
  const look = Math.atan2(EYE.x - t.pos.x, EYE.z - t.pos.z) - t.heading;
  u.uLook.value = THREE.MathUtils.clamp(Math.atan2(Math.sin(look), Math.cos(look)), -0.7, 0.7) * t.seen;
  t.group.position.copy(t.pos);
  t.group.rotation.y = t.heading;
  // mắt hổ ở cõi dương: chỉ lóe lên khi khuất Mắt Âm và đã đến gần
  t.eyes.position.copy(t.pos); t.eyes.rotation.y = t.heading; t.eyes.scale.setScalar(1.15);
  const blink = Math.sin(time * 0.9 + t.weave * 3) > -0.2 ? 1 : 0;
  t.eyes.material.opacity = (t.state === 'stalk' ? 1 : 0) * blink * (1 - Math.min(1, radius * 3)) * THREE.MathUtils.clamp((26 - dist) / 14, 0, 0.9) * (1 - dawn);
  A.placeVoice(t.voice, t.pos.x, 1.2, t.pos.z);
  if (t.state === 'stalk' || t.state === 'emerge') A.breathe(t.voice, THREE.MathUtils.lerp(1.8, 3.2, t.seen), THREE.MathUtils.clamp(1.2 - dist / 30, 0.25, 1));
}

/* ================= Vòng lặp ================= */
const clock = new THREE.Clock();
let gameTime = 0;
const hint = $('#hint');
let yaw = 0, pitch = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05) * TS; gameTime += dt; const time = gameTime;
  // con trỏ mượt, máy quay nhìn theo
  ptrS.lerp(ptr, 1 - Math.exp(-dt * 10));
  let ty = -(ptrS.x - 0.5) * 1.5, tp = (ptrS.y - 0.5) * 0.55;
  if (gyro) { ty += -gyro.g * 0.012; tp += (gyro.b - 50) * 0.006; }
  yaw = THREE.MathUtils.damp(yaw, ty, 2.4, dt); pitch = THREE.MathUtils.damp(pitch, tp + 0.03, 2.4, dt);
  camera.rotation.set(pitch + Math.sin(time * 0.5) * 0.004, yaw + Math.sin(time * 0.31) * 0.006, 0);
  camera.position.set(EYE.x, EYE.y + Math.sin(time * 1.1) * 0.012, EYE.z);

  // Mắt Âm: nhấn giữ để mở; giữ lâu thì mở rộng ra cả khung hình
  holdT = holding && started && dawnStart < 0 ? holdT + dt : 0;
  const target = holding && started && dawnStart < 0 ? (holdT > 4 ? 1.3 : 0.26 + Math.min(holdT, 4) * 0.02) : 0;
  radius = THREE.MathUtils.damp(radius, target, holding ? 5 : 7, dt);
  const am = Math.min(1, radius / 0.3);
  hint.classList.toggle('show', started && dawnStart < 0 && !holding && performance.now() - lastInput > 4500);

  let near = 99;
  tigers.forEach((t) => { updateTiger(t, dt, time, am > 0.2); if (t.state === 'stalk') near = Math.min(near, t.pos.distanceTo(EYE)); });

  // bình minh sau khi giải đủ năm con
  if (dawnStart > 0) {
    dawn = Math.min(1, (time - dawnStart) / 9);
    if (dawn > 0.05 && soundtrack.paused) soundtrack.play().catch(() => {});
    soundtrack.volume = Math.min(0.7, dawn * 0.7);
    if (Math.random() < dt * 1.4 * dawn) A.bird();
    $('#stamp').textContent = 'BÌNH MINH · 1836';
  }
  scene.fog.color.lerpColors(FOG_NIGHT, FOG_DAWN, dawn); scene.background.copy(scene.fog.color);
  scene.fog.density = 0.014 + dawn * 0.016;   // sương sớm dày lên như ảnh Cam_10
  moon.intensity = 1.5 * (1 - dawn); sun.intensity = 2.6 * dawn; hemi.intensity = 1.1 + dawn * 0.6;
  hemi.color.setHex(0x5a6c88).lerp(new THREE.Color(0xffe2c0), dawn);

  torches.forEach((t) => {
    const f = 0.8 + Math.sin(time * 9 + t.seed) * 0.08 + Math.sin(time * 23 + t.seed * 3) * 0.06 + (Math.random() - 0.5) * 0.06;
    t.flame.scale.set(0.7 * f, 1.1 * f, 1); t.flame.material.opacity = 1 - dawn;
    if (t.light) t.light.intensity = 30 * f * (1 - dawn * 0.9);
  });
  mist.forEach((m) => { m.s.position.x += Math.sin(time * 0.05 + m.ph) * m.sp * dt; m.s.material.opacity = (0.045 + 0.025 * Math.sin(time * 0.2 + m.ph)) * (1 + dawn * 1.5); });
  dust.rotation.y += dt * 0.01; dust.position.y = -((time * 0.08) % 1) * 0.3;

  A.setListener(camera);
  A.updateAmbience(am, dawn, near);

  flash = Math.max(0, flash - dt * 1.6); shake = Math.max(0, shake - dt * 1.8);
  const u = compMat.uniforms;
  u.uTime.value = time; u.uMouse.value.copy(ptrS); u.uRadius.value = radius; u.uDawn.value = dawn;
  u.uFlash.value.set(REDUCED ? 0 : flash * flash * flashSign, 0, 0);
  u.uShake.value.set(REDUCED ? 0 : (Math.random() - 0.5) * 0.012 * shake, REDUCED ? 0 : (Math.random() - 0.5) * 0.012 * shake);

  renderer.setRenderTarget(rtBase); renderer.render(scene, camera);
  renderer.setRenderTarget(rtGhost); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(ghosts, camera);
  renderer.setRenderTarget(null); renderer.render(post, postCam);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (DEBUG) window.__matam = { scene, ghosts, camera, tigers, setHold: (v) => { holding = v; }, enter, skip: (n) => { tigers.slice(0, n).forEach((t) => { t.wake = 0; }); } };
