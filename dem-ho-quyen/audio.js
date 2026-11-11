// Âm thanh của bản thử Mắt Âm — toàn bộ tổng hợp bằng Web Audio, không cần file.
// Thế giới dương: gió, côn trùng đêm. Thế giới âm: côn trùng tắt lặng, tiếng ù trầm, tim đập.
// Mỗi con hổ có một PannerNode HRTF: đeo tai nghe sẽ nghe nó thở ở đúng chỗ nó đứng.

let ctx = null, master, comp, noiseBuf;
let windGain, windFilter, insectGain, droneGain, whineGain;
const voices = [];

const now = () => ctx.currentTime;

function makeNoise() {
  const len = ctx.sampleRate * 3;
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  let p = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; p = p * 0.96 + w * 0.04; d[i] = w * 0.35 + p * 3.2; }
  return b;
}
function noiseSrc(loop = false) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf; s.loop = loop;
  if (!loop) s.loopStart = 0;
  return s;
}
function env(g, t, a, peak, d) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function shaper(amount) {
  const ws = ctx.createWaveShaper();
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; c[i] = Math.tanh(x * amount); }
  ws.curve = c;
  return ws;
}

export function initAudio() {
  if (ctx) { ctx.resume(); return ctx; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  noiseBuf = makeNoise();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  master = ctx.createGain(); master.gain.value = 0.9;
  master.connect(comp).connect(ctx.destination);
  return ctx;
}

/* ---------- cổng: trống chầu ---------- */
export function drum(strength = 1) {
  if (!ctx) return;
  const t = now();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.35);
  env(g, t, 0.004, 0.9 * strength, 1.4);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + 1.6);
  // tiếng dùi gõ vào da
  const n = noiseSrc(), f = ctx.createBiquadFilter(), ng = ctx.createGain();
  f.type = 'lowpass'; f.frequency.value = 900;
  env(ng, t, 0.002, 0.45 * strength, 0.12);
  n.connect(f).connect(ng).connect(master);
  n.start(t, Math.random()); n.stop(t + 0.2);
  // thân trống ngân
  const o2 = ctx.createOscillator(), g2 = ctx.createGain();
  o2.type = 'triangle'; o2.frequency.setValueAtTime(92, t); o2.frequency.exponentialRampToValueAtTime(70, t + 1);
  env(g2, t, 0.01, 0.18 * strength, 2.2);
  o2.connect(g2).connect(master); o2.start(t); o2.stop(t + 2.4);
}

/* ---------- nền: gió, côn trùng, tiếng ù của cõi âm ---------- */
export function startAmbience() {
  if (!ctx || windGain) return;
  // gió lùa qua vành tường
  const w = noiseSrc(true);
  windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 380; windFilter.Q.value = 0.7;
  windGain = ctx.createGain(); windGain.gain.value = 0;
  w.connect(windFilter).connect(windGain).connect(master);
  w.start();
  windGain.gain.setTargetAtTime(0.22, now(), 2);

  // côn trùng đêm: dế rỉ rả (sóng sin cao, điều biên theo nhịp)
  insectGain = ctx.createGain(); insectGain.gain.value = 0;
  [[4150, 23, 0.6], [4680, 17, -0.5], [3720, 29, 0.1]].forEach(([f, rate, p]) => {
    const o = ctx.createOscillator(); o.frequency.value = f;
    const am = ctx.createGain(); am.gain.value = 0;
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = rate;
    const lg = ctx.createGain(); lg.gain.value = 0.5;
    const slow = ctx.createOscillator(); slow.frequency.value = 0.31 + Math.random() * 0.2;
    const sg = ctx.createGain(); sg.gain.value = 0.5;
    lfo.connect(lg).connect(am.gain); slow.connect(sg).connect(am.gain);
    const pan = ctx.createStereoPanner(); pan.pan.value = p;
    const lvl = ctx.createGain(); lvl.gain.value = 0.012;
    o.connect(am).connect(lvl).connect(pan).connect(insectGain);
    o.start(); lfo.start(); slow.start();
  });
  insectGain.connect(master);
  insectGain.gain.setTargetAtTime(1, now(), 3);

  // cõi âm: hai sóng răng cưa lệch nhau rất ít, nghe như mặt đất đang thở
  droneGain = ctx.createGain(); droneGain.gain.value = 0;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
  [55, 55.6, 82.4].forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = i === 2 ? 'sine' : 'sawtooth'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = i === 2 ? 0.25 : 0.16;
    o.connect(g).connect(lp); o.start();
  });
  lp.connect(droneGain).connect(master);
  whineGain = ctx.createGain(); whineGain.gain.value = 0;
  const wh = ctx.createOscillator(); wh.frequency.value = 1864;
  const trem = ctx.createOscillator(); trem.frequency.value = 5.3;
  const tg = ctx.createGain(); tg.gain.value = 9;
  trem.connect(tg).connect(wh.frequency);
  wh.connect(whineGain).connect(master); wh.start(); trem.start();
}

let lastBeat = 0;
/** am: 0..1 Mắt Âm mở bao nhiêu; dawn: 0..1; near: khoảng cách con hổ gần nhất */
export function updateAmbience(am, dawn, near) {
  if (!ctx || !windGain) return;
  const t = now();
  const live = 1 - dawn;
  insectGain.gain.setTargetAtTime((1 - Math.min(1, am * 2.5)) * live * 0.9 + dawn * 0.2, t, am > 0.05 ? 0.03 : 0.6);
  droneGain.gain.setTargetAtTime(am * 0.55 * live, t, 0.15);
  whineGain.gain.setTargetAtTime(am * 0.006 * live, t, 0.3);
  windGain.gain.setTargetAtTime((0.16 + 0.1 * Math.sin(t * 0.21) + am * 0.12) * (1 - dawn * 0.6), t, 0.8);
  windFilter.frequency.setTargetAtTime(330 + 160 * Math.sin(t * 0.13) + am * 220, t, 0.8);
  // tim đập khi có hổ gần và mắt đang mở
  if (am > 0.2 && near < 14 && live > 0.5) {
    const period = 0.42 + (near / 14) * 0.7;
    if (t - lastBeat > period) { lastBeat = t; heartbeat(Math.min(1, 1.4 - near / 14)); }
  }
}
function heartbeat(k) {
  const t = now();
  [0, 0.17].forEach((d, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(62, t + d); o.frequency.exponentialRampToValueAtTime(38, t + d + 0.14);
    env(g, t + d, 0.006, (i ? 0.3 : 0.45) * k, 0.18);
    o.connect(g).connect(master); o.start(t + d); o.stop(t + d + 0.3);
  });
}

/* ---------- hổ: tiếng thở, gầm, lướt qua ---------- */
export function tigerVoice(i) {
  if (!ctx) return null;
  const p = ctx.createPanner();
  p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 2.5; p.rolloffFactor = 1.1; p.maxDistance = 60;
  const out = ctx.createGain(); out.gain.value = 1;
  p.connect(out).connect(master);
  const v = { p, nextBreath: now() + 1 + i * 0.37 };
  voices[i] = v;
  return v;
}
export function placeVoice(v, x, y, z) {
  if (!v) return;
  if (v.p.positionX) { v.p.positionX.value = x; v.p.positionY.value = y; v.p.positionZ.value = z; }
  else v.p.setPosition(x, y, z);
}
export function breathe(v, rate, loud) {
  if (!ctx || !v) return;
  const t = now();
  if (t < v.nextBreath) return;
  v.nextBreath = t + rate * (0.85 + Math.random() * 0.3);
  // hít vào, rồi thở ra dài qua cổ họng
  [[0, 0.5, 520, 0.5], [0.62, 0.9, 340, 0.8]].forEach(([d, len, f, a]) => {
    const n = noiseSrc(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.6;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(a * loud, t + d + len * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + len);
    n.connect(bp).connect(g).connect(v.p);
    n.start(t + d, Math.random() * 2); n.stop(t + d + len + 0.05);
  });
}
export function growl(v, k = 1) {
  if (!ctx || !v) return;
  const t = now();
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(68 + Math.random() * 8, t);
  o.frequency.linearRampToValueAtTime(58, t + 1.4);
  const am = ctx.createGain(); am.gain.value = 0.5;
  const flutter = ctx.createOscillator(); flutter.frequency.value = 23; const fg = ctx.createGain(); fg.gain.value = 0.5;
  flutter.connect(fg).connect(am.gain);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  const g = ctx.createGain(); env(g, t, 0.25, 0.7 * k, 1.3);
  o.connect(am).connect(shaper(3)).connect(lp).connect(g).connect(v.p);
  o.start(t); flutter.start(t); o.stop(t + 1.7); flutter.stop(t + 1.7);
}
/** tiếng gầm của oán khí: nhiều con chồng lên nhau */
export function roar(v) {
  if (!ctx || !v) return;
  const t = now();
  const g = ctx.createGain(); env(g, t, 0.08, 1.2, 1.9);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(300, t + 1.9);
  const sh = shaper(5);
  sh.connect(lp).connect(g).connect(v.p);
  [96, 131, 74, 160].forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 1.25, t + i * 0.04);
    o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 1.9);
    const og = ctx.createGain(); og.gain.value = 0.22;
    o.connect(og).connect(sh); o.start(t + i * 0.04); o.stop(t + 2.1);
  });
  const n = noiseSrc(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
  bp.type = 'bandpass'; bp.frequency.setValueAtTime(1200, t); bp.frequency.exponentialRampToValueAtTime(380, t + 1.6); bp.Q.value = 0.8;
  env(ng, t, 0.05, 0.9, 1.6);
  n.connect(bp).connect(ng).connect(v.p); n.start(t, Math.random()); n.stop(t + 1.8);
  // dư âm vọng lại từ vòng tường
  const dl = ctx.createDelay(); dl.delayTime.value = 0.19; const fb = ctx.createGain(); fb.gain.value = 0.35;
  g.connect(dl); dl.connect(fb).connect(dl); dl.connect(master);
}
/** hổ lướt xuyên qua người xem khi không bị nhìn thấy */
export function whoosh() {
  if (!ctx) return;
  const t = now();
  const n = noiseSrc(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), pan = ctx.createStereoPanner();
  bp.type = 'bandpass'; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(2400, t); bp.frequency.exponentialRampToValueAtTime(180, t + 1.1);
  env(g, t, 0.25, 0.9, 0.9);
  pan.pan.setValueAtTime(-0.9, t); pan.pan.linearRampToValueAtTime(0.9, t + 1.1);
  n.connect(bp).connect(g).connect(pan).connect(master); n.start(t, Math.random()); n.stop(t + 1.3);
  const o = ctx.createOscillator(), og = ctx.createGain();
  o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(40, t + 1.2);
  env(og, t, 0.1, 0.3, 1.1); o.connect(og).connect(master); o.start(t); o.stop(t + 1.3);
}
/** chuông đồng ngân khi một linh hồn hổ được giải */
export function bell(step = 0) {
  if (!ctx) return;
  const t = now() + 0.25;
  const base = [196, 220, 247, 262, 294][step % 5];
  const out = ctx.createGain(); out.gain.value = 0.16; out.connect(master);
  [[1, 1, 4.6], [2.76, 0.42, 2.8], [5.4, 0.2, 1.7], [1.5, 0.25, 3.4], [8.93, 0.08, 1]].forEach(([m, a, d]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = base * m; env(g, t, 0.01, a, d);
    o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.1);
  });
}
/** chim sớm lúc bình minh */
export function bird() {
  if (!ctx) return;
  const t = now();
  const f0 = 2600 + Math.random() * 1500;
  const notes = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < notes; i++) {
    const s = t + i * 0.13;
    const o = ctx.createOscillator(), g = ctx.createGain(), pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    o.frequency.setValueAtTime(f0 * (1 + Math.random() * 0.2), s);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.7, s + 0.09);
    env(g, s, 0.01, 0.05, 0.09);
    o.connect(g).connect(pan).connect(master); o.start(s); o.stop(s + 0.12);
  }
}

export function setListener(cam) {
  if (!ctx) return;
  const L = ctx.listener;
  const p = cam.position;
  const f = cam.getWorldDirection(cam.userData.tmp || (cam.userData.tmp = new cam.position.constructor()));
  if (L.positionX) {
    L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z;
    L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z;
    L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
  } else {
    L.setPosition(p.x, p.y, p.z);
    L.setOrientation(f.x, f.y, f.z, 0, 1, 0);
  }
}

export function fadeMaster(v, sec) { if (ctx) master.gain.setTargetAtTime(v, now(), sec / 3); }

/* ================= Bổ sung cho bản đủ 6 hồi ================= */
export const audioCtx = () => ctx;

/** kèn bầu (giả lập): sóng răng cưa qua bộ lọc dải, rung nhẹ, luyến lên nốt */
export function kenNote(freq, len = 0.5, loud = 0.16) {
  if (!ctx) return;
  const t = now();
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(freq * 0.94, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
  const vib = ctx.createOscillator(); vib.frequency.value = 5.6; const vg = ctx.createGain(); vg.gain.value = freq * 0.012;
  vib.connect(vg).connect(o.frequency);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq * 2.2; bp.Q.value = 1.4;
  const bp2 = ctx.createBiquadFilter(); bp2.type = 'peaking'; bp2.frequency.value = 1400; bp2.gain.value = 6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(loud, t + 0.04);
  g.gain.setValueAtTime(loud, t + len * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(bp).connect(bp2).connect(g).connect(master);
  o.start(t); vib.start(t); o.stop(t + len + 0.05); vib.stop(t + len + 0.05);
}
/** trống nhỏ, phách gỗ cho nhịp nhã nhạc */
export function phach() {
  if (!ctx) return;
  const t = now();
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1900;
  const g = ctx.createGain(); env(g, t, 0.001, 0.12, 0.05);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 3;
  o.connect(bp).connect(g).connect(master); o.start(t); o.stop(t + 0.08);
}

let crowdG = null, cicadaG = null, flyG = null, flyF = null;
/** đám đông xa và ve sầu giờ Ngọ */
export function startDay() {
  if (!ctx || crowdG) return;
  const n = noiseSrc(true); const lp = ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 520; lp.Q.value = 0.6;
  crowdG = ctx.createGain(); crowdG.gain.value = 0;
  const am = ctx.createGain(); am.gain.value = 0.7; const lfo = ctx.createOscillator(); lfo.frequency.value = 0.4; const lg = ctx.createGain(); lg.gain.value = 0.3;
  lfo.connect(lg).connect(am.gain); lfo.start();
  n.connect(lp).connect(am).connect(crowdG).connect(master); n.start(0, 0.5);
  cicadaG = ctx.createGain(); cicadaG.gain.value = 0;
  const c = ctx.createOscillator(); c.frequency.value = 5200; const cam = ctx.createGain(); cam.gain.value = 0;
  const cl = ctx.createOscillator(); cl.frequency.value = 64; const cg = ctx.createGain(); cg.gain.value = 1;
  cl.connect(cg).connect(cam.gain); c.connect(cam).connect(cicadaG).connect(master); c.start(); cl.start();
  crowdG.gain.setTargetAtTime(0.12, now(), 1); cicadaG.gain.setTargetAtTime(0.008, now(), 1);
}
export function dayLevel(v) { if (crowdG) { crowdG.gain.setTargetAtTime(0.12 * v, now(), 0.08); cicadaG.gain.setTargetAtTime(0.008 * v, now(), 0.08); } }
export function stopDay() { dayLevel(0); }

/** ruồi vo ve quanh rương: tần số rung nhanh, to dần khi lại gần */
export function startFlies() {
  if (!ctx || flyG) return;
  flyG = ctx.createGain(); flyG.gain.value = 0;
  [[212, 0], [236, 0.4], [198, -0.4]].forEach(([f, p]) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const wob = ctx.createOscillator(); wob.frequency.value = 3 + Math.random() * 4; const wg = ctx.createGain(); wg.gain.value = 18;
    wob.connect(wg).connect(o.frequency);
    const pan = ctx.createStereoPanner(); pan.pan.value = p;
    const og = ctx.createGain(); og.gain.value = 0.04;
    o.connect(og).connect(pan).connect(flyG); o.start(); wob.start();
  });
  flyF = ctx.createBiquadFilter(); flyF.type = 'lowpass'; flyF.frequency.value = 900;
  flyG.connect(flyF).connect(master);
}
export function fliesLevel(v) { if (flyG) { flyG.gain.setTargetAtTime(v, now(), 0.15); flyF.frequency.setTargetAtTime(600 + v * 2400, now(), 0.15); } }

/** nắp gỗ bị cạy: tiếng kẽo kẹt rồi bật */
export function creak() {
  if (!ctx) return;
  const t = now();
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(140, t); o.frequency.linearRampToValueAtTime(90, t + 0.5); o.frequency.linearRampToValueAtTime(170, t + 0.7);
  const am = ctx.createGain(); am.gain.value = 0; const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.setValueAtTime(28, t); lfo.frequency.linearRampToValueAtTime(14, t + 0.7);
  lfo.connect(am.gain);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 4;
  const g = ctx.createGain(); env(g, t, 0.05, 0.25, 0.7);
  o.connect(am).connect(bp).connect(g).connect(master); o.start(t); lfo.start(t); o.stop(t + 0.85); lfo.stop(t + 0.85);
  // tiếng nắp bật
  const n = noiseSrc(), lp = ctx.createBiquadFilter(), ng = ctx.createGain();
  lp.type = 'lowpass'; lp.frequency.value = 700; env(ng, t + 0.72, 0.002, 0.8, 0.25);
  n.connect(lp).connect(ng).connect(master); n.start(t + 0.72, Math.random()); n.stop(t + 1.1);
}
/** chổi châu phê quệt qua khung hình */
export function brush() {
  if (!ctx) return;
  const t = now();
  const n = noiseSrc(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), pan = ctx.createStereoPanner();
  bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(2600, t + 0.5);
  env(g, t, 0.12, 0.45, 0.5); pan.pan.setValueAtTime(-0.8, t); pan.pan.linearRampToValueAtTime(0.8, t + 0.6);
  n.connect(bp).connect(g).connect(pan).connect(master); n.start(t, Math.random()); n.stop(t + 0.8);
}
/** cắt lặng toàn bộ trong một khoảnh khắc */
export function cut(sec = 1.2) {
  if (!ctx) return;
  const t = now();
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(0.0001, t);
  master.gain.setTargetAtTime(0.9, t + sec, 0.3);
}
/** tiếng vỡ, nứt */
export function crack() {
  if (!ctx) return;
  const t = now();
  const n = noiseSrc(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
  hp.type = 'highpass'; hp.frequency.value = 1800; env(g, t, 0.001, 0.9, 0.35);
  n.connect(hp).connect(g).connect(master); n.start(t, Math.random()); n.stop(t + 0.4);
  const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
  env(og, t, 0.002, 0.6, 0.4); o.connect(og).connect(master); o.start(t); o.stop(t + 0.45);
}
/** ánh sáng hoa văn vòng tay bừng lên */
export function shimmer() {
  if (!ctx) return;
  const t = now();
  [523, 659, 784, 1046, 1318].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f;
    env(g, t + i * 0.05, 0.01, 0.12, 2.4 - i * 0.2); o.connect(g).connect(master); o.start(t + i * 0.05); o.stop(t + 2.8);
  });
  const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(140, t + 1.2);
  env(g, t, 0.05, 0.5, 1.6); o.connect(g).connect(master); o.start(t); o.stop(t + 1.8);
}
/** tiếng đinh nhỏ khi nối một dấu bùa / mầm lúa nhú */
export function tick(f = 880, loud = 0.08) {
  if (!ctx) return;
  const t = now();
  const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f;
  env(g, t, 0.003, loud, 0.5); o.connect(g).connect(master); o.start(t); o.stop(t + 0.55);
}
/** lửa bén vào đầu nhang */
export function ignite() {
  if (!ctx) return;
  const t = now();
  const n = noiseSrc(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 0.7; env(g, t, 0.02, 0.25, 0.6);
  n.connect(bp).connect(g).connect(master); n.start(t, Math.random()); n.stop(t + 0.7);
}
export function setWorldLevel(v) { if (insectGain) insectGain.gain.setTargetAtTime(v, now(), 0.5); if (windGain) windGain.gain.setTargetAtTime(0.18 * v, now(), 0.5); }
