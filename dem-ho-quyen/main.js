// Đêm Hổ Quyền — trải nghiệm 6 hồi. File này lo phần chung: renderer, hậu kỳ ghép hai thế giới,
// điều khiển, chuyển cảnh bằng nét châu phê và trình tự các hồi.
import * as THREE from 'three';
import * as A from './audio.js';
import { tigerMats } from './common.js';
import { createNgo } from './act-ngo.js';
import { createRuong } from './act-ruong.js';
import { createDem } from './act-dem.js';
import { createBinhMinh } from './act-binhminh.js';

const $ = (s) => document.querySelector(s);
const QS = new URLSearchParams(location.search);
const DEBUG = QS.has('debug');
const TS = DEBUG ? +(QS.get('ts') || 1) : 1;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= Renderer, hậu kỳ ================= */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

const rtOpts = { type: THREE.HalfFloatType, depthBuffer: true };
const rtBase = new THREE.WebGLRenderTarget(1, 1, rtOpts), rtGhost = new THREE.WebGLRenderTarget(1, 1, rtOpts);
const compMat = new THREE.ShaderMaterial({
  uniforms: {
    tBase: { value: rtBase.texture }, tGhost: { value: rtGhost.texture }, uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uRadius: { value: 0 }, uAspect: { value: 1 }, uTime: { value: 0 }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(1, 0.15, 0.05) },
    uNatural: { value: 0 }, uShake: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2(1, 1) }, uFade: { value: 1 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */`
  uniform sampler2D tBase, tGhost; uniform vec2 uMouse, uShake, uRes; uniform float uRadius, uAspect, uTime, uNatural, uFlash, uFade; uniform vec3 uFlashCol;
  varying vec2 vUv;
  float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
  float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*vn(p); p=p*2.03+17.1; a*=.5; } return v; }
  void main(){
    vec2 uv = vUv + uShake;
    vec3 base = texture2D(tBase, uv).rgb;
    float lum = dot(base, vec3(.299,.587,.114));
    vec3 day = mix(vec3(lum)*vec3(.82,.9,1.08), base, .55 + uNatural*.45);
    vec2 q = (vUv - uMouse) * vec2(uAspect, 1.);
    float n = fbm(vUv*vec2(uAspect,1.)*5. + vec2(0., uTime*.25)) - .5;
    float d = length(q) + n*.09*(.4 + uRadius);
    float m = 1. - smoothstep(uRadius - .012, uRadius + .004, d);
    float edge = m * (1. - smoothstep(0., .016, uRadius - d)) * step(.002, uRadius) * step(uRadius, 1.2);
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
    vec2 c = vUv - .5;
    col *= 1. - dot(c, c) * (1.05 - uNatural*.5);
    col += (hash(vUv*uRes + fract(uTime)*91.) - .5) * .035;
    col = mix(col, uFlashCol, clamp(uFlash, 0., 1.));
    gl_FragColor = vec4(max(col, 0.) * uFade, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
  depthTest: false, depthWrite: false,
});
const post = new THREE.Scene(); post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMat));
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

/* ================= Ngữ cảnh chung cho các hồi ================= */
const ptr = new THREE.Vector2(0.5, 0.55), ptrS = new THREE.Vector2(0.5, 0.55);
const ctx = {
  THREE, A, renderer, ptr, ptrS, DEBUG, REDUCED,
  holding: false, lastInput: performance.now(), aspect: innerWidth / innerHeight, pxScale: 1,
  fx: { radius: 0, natural: 0, flash: 0, shake: 0, flashColor: new THREE.Color(1, 0.15, 0.05) },
  stamp(text) { const el = $('#stamp'); if (el.textContent !== text) { el.classList.remove('in'); void el.offsetWidth; el.textContent = text; el.classList.add('in'); } },
  hint(kind) { const el = $('#hint'); el.dataset.kind = kind || ''; },
  line(text) { const el = $('#line'); el.textContent = text; el.classList.remove('in'); void el.offsetWidth; if (text) el.classList.add('in'); },
  say(text) { $('#live').textContent = text; },
  souls(n) { const s = $('#souls'); s.classList.toggle('show', n >= 0); [...s.children].forEach((d, i) => d.classList.toggle('on', i < n)); },
  flash(amount, color) { ctx.fx.flash = Math.max(ctx.fx.flash, amount); if (color) ctx.fx.flashColor.set(color); },
  shake(a) { ctx.fx.shake = Math.max(ctx.fx.shake, a); },
  next: () => goNext(),
  idle: () => performance.now() - ctx.lastInput,
};

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  rtBase.setSize(w * DPR, h * DPR); rtGhost.setSize(w * DPR, h * DPR);
  ctx.aspect = w / h;
  compMat.uniforms.uAspect.value = w / h; compMat.uniforms.uRes.value.set(w * DPR, h * DPR);
  ctx.pxScale = (h * DPR) / (2 * Math.tan(THREE.MathUtils.degToRad(58 / 2)));
  tigerMats.forEach((m) => { m.uniforms.uScale.value = ctx.pxScale; });
  // màn hình dọc: mở rộng góc nhìn dọc để giữ bề ngang như màn vuông, không cắt mất hai bên cảnh
  acts.forEach((a) => {
    if (!a || !a.camera) return;
    const c = a.camera; if (c.userData.fov0 === undefined) c.userData.fov0 = c.fov;
    const f0 = THREE.MathUtils.degToRad(c.userData.fov0), asp = w / h;
    c.fov = asp >= 1 ? c.userData.fov0 : Math.min(88, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(f0 / 2) / Math.max(asp, 0.62))));
    c.aspect = asp; c.updateProjectionMatrix();
  });
}

/* ================= Trình tự các hồi ================= */
const makers = [createNgo, createRuong, createDem, createBinhMinh];
const acts = [];
let idx = -1, act = null, busy = false;
const getAct = (i) => acts[i] || (acts[i] = makers[i](ctx));

const brushEl = $('#brush');
function goNext() { go(idx + 1); }
function go(i) {
  if (busy || i >= makers.length) return;
  busy = true;
  const first = idx < 0;
  A.brush();
  brushEl.classList.remove('reveal'); brushEl.classList.add('cover');
  setTimeout(() => {
    if (act && act.exit) act.exit();
    ctx.fx.radius = 0; ctx.fx.flash = 0; ctx.holding = false;
    idx = i; act = getAct(i);
    resize();
    act.enter();
    if (DEBUG) window.__dhq.act = act;
    brushEl.classList.remove('cover'); brushEl.classList.add('reveal');
    setTimeout(() => { busy = false; }, 500);
  }, first ? 700 : 850);
}

/* ================= Điều khiển ================= */
const setPtr = (x, y) => { ptr.set(x / innerWidth, 1 - y / innerHeight); ctx.lastInput = performance.now(); };
let dragY = null;
addEventListener('pointermove', (e) => {
  setPtr(e.clientX, e.clientY);
  if (dragY != null && act && act.onScrub) { act.onScrub((dragY - e.clientY) * 0.0016); dragY = e.clientY; }
  if (act && act.onMove) act.onMove(e);
});
addEventListener('pointerdown', (e) => {
  if (idx < 0 || busy) return;
  setPtr(e.clientX, e.clientY); ptrS.copy(ptr);
  ctx.holding = true; dragY = e.clientY;
  if (act && act.onDown) act.onDown(e);
});
const up = () => { ctx.holding = false; dragY = null; if (act && act.onUp) act.onUp(); };
addEventListener('pointerup', up); addEventListener('pointercancel', up); addEventListener('blur', up);
addEventListener('wheel', (e) => { ctx.lastInput = performance.now(); if (act && act.onScrub) act.onScrub(e.deltaY * 0.0009); }, { passive: true });
addEventListener('keydown', (e) => {
  if (idx < 0) return;
  ctx.lastInput = performance.now();
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!ctx.holding) { ctx.holding = true; if (act && act.onDown) act.onDown(e); } }
  const k = { ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, 0.04], ArrowDown: [0, -0.04] }[e.code];
  if (k) {
    ptr.x = THREE.MathUtils.clamp(ptr.x + k[0], 0, 1); ptr.y = THREE.MathUtils.clamp(ptr.y + k[1], 0, 1);
    if (act && act.onScrub && k[1]) act.onScrub(-k[1] * 0.6);
  }
});
addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') up(); });
ctx.gyro = null;
function enableGyro() {
  const on = () => addEventListener('deviceorientation', (e) => { if (e.gamma != null) ctx.gyro = { g: e.gamma, b: e.beta }; });
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().then((s) => s === 'granted' && on()).catch(() => {});
    else if (matchMedia('(pointer: coarse)').matches) on();
  } catch (_) {}
}

/* ================= Hồi 0 · Trống chầu ================= */
const gate = $('#gate'), drumEl = $('#drum'), ripple = $('#ripple'), beatDots = [...document.querySelectorAll('.beats i')];
let beats = 0;
function hitDrum() {
  if (beats >= 3) return;
  A.initAudio();
  if (beats === 0) enableGyro();
  A.drum(0.7 + beats * 0.2);
  beatDots[beats].classList.add('on');
  drumEl.classList.add('hit'); setTimeout(() => drumEl.classList.remove('hit'), 90);
  ripple.classList.remove('go'); void ripple.offsetWidth; ripple.classList.add('go');
  beats++;
  if (beats >= 3) setTimeout(() => { gate.classList.add('gone'); go(START); }, 600);
}
gate.addEventListener('pointerdown', (e) => { e.stopPropagation(); hitDrum(); });
gate.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); hitDrum(); } });
gate.focus();
// ?act=1..5 (hồi 3 và 4 cùng một cảnh đêm; act=4 vào thẳng Đại Ma Hổ)
const ACT_Q = Math.max(1, Math.min(5, +QS.get('act') || 1));
const START = [0, 0, 1, 2, 2, 3][ACT_Q];
ctx.jumpMaHo = ACT_Q === 4;

/* ================= Vòng lặp ================= */
addEventListener('resize', resize); resize();
const clock = new THREE.Clock();
let time = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05) * TS; time += dt;
  ptrS.lerp(ptr, 1 - Math.exp(-dt * 10 / TS));
  const fx = ctx.fx;
  let ghosts = null;
  if (act) { act.update(dt, time); ghosts = act.ghosts || null; }
  fx.flash = Math.max(0, fx.flash - dt * 1.6); fx.shake = Math.max(0, fx.shake - dt * 1.8);
  const u = compMat.uniforms;
  u.uTime.value = time; u.uMouse.value.copy(fx.center || ptrS); u.uRadius.value = fx.radius; u.uNatural.value = fx.natural;
  u.uFlash.value = REDUCED ? Math.min(0.25, fx.flash) : fx.flash * fx.flash; u.uFlashCol.value.copy(fx.flashColor);
  const sh = REDUCED ? 0 : fx.shake * 0.012;
  u.uShake.value.set((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
  if (act) {
    renderer.setRenderTarget(rtBase); renderer.render(act.scene, act.camera);
    renderer.setRenderTarget(rtGhost); renderer.setClearColor(0x000000, 1); renderer.clear();
    if (ghosts && fx.radius > 0.001) renderer.render(ghosts, act.camera);
    renderer.setRenderTarget(null); renderer.render(post, postCam);
  } else {
    renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1); renderer.clear();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (DEBUG) window.__dhq = { ctx, go, acts, get idx() { return idx; } };

/* ---------- hoa văn vòng tay của Mót: ngôi sao nhiều cánh và các vành như mặt trống đồng ---------- */
{
  const svg = $('#vong'), NS = 'http://www.w3.org/2000/svg';
  const add = (tag, attrs) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); svg.appendChild(el); return el; };
  const rays = 14; let star = '';
  for (let i = 0; i < rays * 2; i++) { const a = (i / (rays * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 9 : 30; star += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`; }
  add('path', { d: star + 'Z', class: 'fill' });
  [36, 44, 62, 70, 88, 94].forEach((r) => add('circle', { r }));
  for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; add('line', { x1: Math.cos(a) * 37, y1: Math.sin(a) * 37, x2: Math.cos(a) * 43, y2: Math.sin(a) * 43 }); }
  for (let i = 0; i < 18; i++) {   // vành chim bay ngược chiều kim đồng hồ, giản lược thành nét móc
    const a = (i / 18) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), x = c * 79, y = s * 79;
    add('path', { d: `M${(x - s * 5).toFixed(1)} ${(y + c * 5).toFixed(1)} Q${(x + c * 4).toFixed(1)} ${(y + s * 4).toFixed(1)} ${(x + s * 6).toFixed(1)} ${(y - c * 6).toFixed(1)}` });
  }
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; add('circle', { cx: (Math.cos(a) * 91).toFixed(1), cy: (Math.sin(a) * 91).toFixed(1), r: 1.4, class: 'fill' }); }
}
