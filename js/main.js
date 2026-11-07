import { SHOTS, CHARACTERS, FACTIONS, PLACES, RELICS, TIMELINE, GALLERY, MEDIA } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

const html = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
const N = SHOTS.length;
const sections = $$('.shot').sort((a, b) => a.dataset.shot - b.dataset.shot);

/* ============ Thanh cuộn ảo & slate storyboard ============ */
const scroller = $('#scroller');
// id neo (#nhan-vat…) chuyển sang các beat trong luồng cuộn, để cú nhảy theo hash gốc của trình duyệt
// rơi đúng vị trí cảnh thay vì nhắm vào section overlay cố định (vốn kéo trang về đầu).
sections.forEach((sec) => {
  const beat = Object.assign(document.createElement('div'), { className: 'beat', id: sec.id });
  sec.dataset.anchor = sec.id;
  sec.removeAttribute('id');
  scroller.append(beat);
});
const beatH = () => scroller.firstElementChild.offsetHeight || innerHeight;

sections.forEach((sec) => {
  const s = SHOTS[+sec.dataset.shot];
  const card = $('.card', sec);
  if (card.classList.contains('card--bare')) return;
  const slate = document.createElement('header');
  slate.className = 'slate';
  slate.setAttribute('aria-hidden', 'true');
  slate.innerHTML = `<span class="slate-code">${s.code}</span><span class="slate-label">${s.label}</span><span class="slate-move">${s.move}</span>`;
  card.prepend(slate);
});

const stripList = $('#strip-list');
SHOTS.forEach((s, i) => {
  const li = document.createElement('li');
  li.innerHTML = `<button type="button" data-goto="${i}"><span>${s.code.replace('SC ', '')}</span><b>${s.label}</b></button>`;
  stripList.append(li);
});

function goto(i) {
  scrollTo({ top: clamp(i, 0, N - 1) * beatH(), behavior: reduceMotion ? 'auto' : 'smooth' });
}
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-goto]');
  if (!g) return;
  e.preventDefault();
  goto(+g.dataset.goto);
});

/* ============ Danh sách chọn trong từng cảnh ============ */
const state = { sel: Array(N).fill(0), charView: 'avatar' };
let world = null;
let active = 0;

const LISTS = {
  3: { items: CHARACTERS, label: (c) => c.name },
  4: { items: FACTIONS, label: (f, k) => `<small>0${k + 1}</small>${f.name}` },
  5: { items: PLACES, label: (p) => p.name.split(' — ')[0] },
  6: { items: RELICS, label: (r) => r.name },
  7: { items: TIMELINE, label: (t) => `<b>${t.year}</b><small>${t.era}</small>` },
  8: { items: GALLERY }
};

$$('[data-list]').forEach((box) => {
  const shot = +box.dataset.list;
  LISTS[shot].items.forEach((it, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.innerHTML = LISTS[shot].label(it, k);
    b.addEventListener('click', () => select(shot, k));
    box.append(b);
  });
  box.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    e.stopPropagation();
    step(shot, e.key === 'ArrowRight' ? 1 : -1);
    box.children[state.sel[shot]].focus();
  });
});

const bind = (name, text) => $$(`[data-bind="${name}"]`).forEach((el) => (el.textContent = text));

function reflect(shot) {
  const k = state.sel[shot];
  const sec = sections[shot];
  $$('[data-list] > button', sec).forEach((b, j) => {
    b.setAttribute('aria-selected', String(j === k));
    b.tabIndex = j === k ? 0 : -1;
  });
  if (shot === 3) {
    const c = CHARACTERS[k];
    bind('char-sub', c.sub); bind('char-name', c.name); bind('char-seal', c.seal);
    bind('char-bio', c.bio); bind('char-quote', c.quote);
  } else if (shot === 4) {
    const f = FACTIONS[k];
    bind('faction-sub', `${f.place} · ${f.side.toUpperCase()}`); bind('faction-name', f.name); bind('faction-desc', f.desc);
  } else if (shot === 5) {
    bind('place-name', PLACES[k].name); bind('place-desc', PLACES[k].desc);
  } else if (shot === 6) {
    const r = RELICS[k];
    bind('relic-sub', `PHÁP KHÍ 0${k + 1} · ${r.owner.toUpperCase()}`); bind('relic-name', r.name); bind('relic-glyph', r.glyph); bind('relic-desc', r.desc);
  } else if (shot === 7) {
    const t = TIMELINE[k];
    bind('tl-sub', `${t.year} · ${t.era}`); bind('tl-title', t.title); bind('tl-desc', t.desc);
  } else if (shot === 8) {
    const g = GALLERY[k];
    bind('g-count', `${String(k + 1).padStart(2, '0')} / ${GALLERY.length}`); bind('g-title', g.title); bind('g-caption', g.caption);
  }
  updateFallbackBg();
}

function select(shot, k) {
  state.sel[shot] = k;
  world?.select(shot, k);
  if (shot === 3 && state.charView !== 'avatar') world?.setCharView(state.charView);
  reflect(shot);
}
function step(shot, d) {
  const n = LISTS[shot]?.items.length;
  if (!n) return;
  select(shot, (state.sel[shot] + d + n) % n);
}

for (let i = 0; i < N; i++) if (LISTS[i]) reflect(i);

// Chế độ xem tạo hình nhân vật
$$('[data-view]').forEach((b) => b.addEventListener('click', () => {
  state.charView = b.dataset.view;
  $$('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  world?.setCharView(state.charView);
}));

// Gallery
$$('[data-gstep]').forEach((b) => b.addEventListener('click', () => step(8, +b.dataset.gstep)));
$('#g-zoom').addEventListener('click', () => openLightbox(state.sel[8]));

/* ============ Lightbox ============ */
const lb = $('#lightbox');
function openLightbox(k) {
  const g = GALLERY[k];
  lb.dataset.index = k;
  $('img', lb).src = g.img;
  $('img', lb).alt = g.title;
  $('figcaption strong', lb).textContent = `${String(k + 1).padStart(2, '0')} · ${g.title}`;
  $('figcaption span', lb).textContent = g.caption;
  if (!lb.open) lb.showModal();
}
const lbStep = (d) => {
  const k = (+lb.dataset.index + d + GALLERY.length) % GALLERY.length;
  openLightbox(k);
  select(8, k);
};
$('.lb-close', lb).addEventListener('click', () => lb.close());
$('.lb-prev', lb).addEventListener('click', () => lbStep(-1));
$('.lb-next', lb).addEventListener('click', () => lbStep(1));
lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });

/* ============ Phím tắt ============ */
addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, [contenteditable]')) return;
  if (lb.open) {
    if (e.key === 'ArrowRight') lbStep(1);
    if (e.key === 'ArrowLeft') lbStep(-1);
    return;
  }
  if (e.target.closest('[data-list]')) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    if (LISTS[active]) { e.preventDefault(); step(active, e.key === 'ArrowRight' ? 1 : -1); }
  } else if (e.key === 'Home') { e.preventDefault(); goto(0); }
  else if (e.key === 'End') { e.preventDefault(); goto(N - 1); }
});

/* ============ Âm thanh: mặc định TẮT, người xem tự bật ============ */
const bgm = $('#bgm');
const soundBtn = $('#sound-btn');
const BGM_VOL = 0.6;
let videoUnmuted = false;
function setSound(on) {
  soundBtn.setAttribute('aria-pressed', String(on));
  $('.chip-label', soundBtn).textContent = on ? 'NHẠC: BẬT' : 'NHẠC: TẮT';
  if (on) {
    bgm.volume = videoUnmuted ? 0.12 : BGM_VOL;
    bgm.play().catch(() => setSound(false));
  } else bgm.pause();
}
soundBtn.addEventListener('click', () => setSound(bgm.paused));

const videoSoundBtn = $('#video-sound-btn');
videoSoundBtn.addEventListener('click', () => {
  if (!world) return;
  videoUnmuted = !videoUnmuted;
  world.video.muted = !videoUnmuted;
  if (videoUnmuted) world.video.play().catch(() => {});
  videoSoundBtn.setAttribute('aria-pressed', String(videoUnmuted));
  videoSoundBtn.textContent = videoUnmuted ? '🔊 Tắt tiếng bản dựng' : '🔈 Bật tiếng bản dựng';
  if (!bgm.paused) bgm.volume = videoUnmuted ? 0.12 : BGM_VOL;
});

/* ============ Thắp hương (+1) — giữ bộ đếm chung của site gốc ============ */
const INCENSE_GET = 'https://abacus.jasoncameron.dev/get/gosucinema.web.id/shdl_incense_1836';
const INCENSE_HIT = 'https://abacus.jasoncameron.dev/hit/gosucinema.web.id/shdl_incense_1836';
const incenseBtn = $('#incense-btn');
const incenseCount = $('#incense-count');
let incense = 0;
const showIncense = () => (incenseCount.textContent = incense ? incense.toLocaleString('vi-VN') : '—');
fetch(INCENSE_GET, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => {
  if (d && typeof d.value === 'number') { incense = Math.max(incense, d.value); showIncense(); }
}).catch(() => {});
// ?nocount — thử hiệu ứng mà không cộng vào bộ đếm thật
const COUNT_ENABLED = !new URLSearchParams(location.search).has('nocount');
const incenseAnchor = $('#incense-anchor');
const iaLabel = $('#ia-label');

const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

// Tiếng chuông chùa ngân (tổng hợp bằng WebAudio, chỉ phát khi người xem bấm)
let actx = null;
function templeBell() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    const out = actx.createGain();
    out.gain.value = 0.14;
    out.connect(actx.destination);
    // các bội âm không điều hoà đặc trưng của chuông đồng
    [[196, 1, 4.2], [196 * 2.76, 0.42, 2.6], [196 * 5.4, 0.2, 1.6], [196 * 1.5, 0.25, 3.2], [196 * 8.93, 0.08, 0.9]].forEach(([f, a, d]) => {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(a, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + d + 0.05);
    });
  } catch (_) { /* không có WebAudio: bỏ qua */ }
}

// Âm phong: tiếng gió âm hút qua khi chuyển cảnh (chỉ khi người xem đã bật nhạc)
let windBuf = null;
function spiritWind(dir) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    if (!windBuf) {
      windBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
      const d = windBuf.getChannelData(0);
      let b = 0;
      for (let i = 0; i < d.length; i++) { b = b * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = b * 6; }
    }
    const src = actx.createBufferSource();
    src.buffer = windBuf;
    const bp = actx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2.2;
    bp.frequency.setValueAtTime(260, t);
    bp.frequency.exponentialRampToValueAtTime(1500, t + 0.55);
    bp.frequency.exponentialRampToValueAtTime(320, t + 1.5);
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    const pan = actx.createStereoPanner ? actx.createStereoPanner() : null;
    if (pan) {
      pan.pan.setValueAtTime(-0.7 * dir, t);
      pan.pan.linearRampToValueAtTime(0.7 * dir, t + 1.5);
    }
    let node = src.connect(bp).connect(g);
    if (pan) node = node.connect(pan);
    node.connect(actx.destination);
    src.start(t);
    src.stop(t + 1.7);
    // tiếng ngân trầm thoảng qua
    const o = actx.createOscillator(), og = actx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(82, t);
    o.frequency.exponentialRampToValueAtTime(61, t + 1.4);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.09, t + 0.45);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(og).connect(actx.destination);
    o.start(t);
    o.stop(t + 1.6);
  } catch (_) { /* bỏ qua */ }
}

let incenseLock = 0;
function lightIncense() {
  const now = Date.now();
  if (now - incenseLock < 900) return;
  incenseLock = now;
  world?.lightIncense();
  incense += 1;
  showIncense();
  restart(incenseBtn, 'is-lit');
  restart(incenseCount, 'is-pop');
  restart(incenseAnchor, 'is-burst');
  templeBell();
  navigator.vibrate?.(18);
  if (!COUNT_ENABLED) return;
  fetch(INCENSE_HIT, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (d && typeof d.value === 'number' && d.value > incense) { incense = d.value; showIncense(); }
  }).catch(() => {});
}
incenseBtn.addEventListener('click', lightIncense);
incenseAnchor.addEventListener('click', lightIncense);

let incenseUi = '';
function updateIncenseAnchor() {
  if (!world || active !== 0) return;
  const info = world.incenseInfo();
  incenseAnchor.style.transform = `translate(${info.x.toFixed(1)}px, ${info.y.toFixed(1)}px)`;
  const ui = info.out ? 'out' : 'lit';
  if (ui !== incenseUi) {
    incenseUi = ui;
    incenseAnchor.classList.toggle('is-out', info.out);
    iaLabel.textContent = info.out ? 'HƯƠNG ĐÃ TÀN · BẤM THẮP (+1)' : 'THẮP THÊM NÉN MỚI (+1)';
  }
}

/* ============ Fallback khi không có WebGL ============ */
const fallbackBg = $('.fallback-bg');
function updateFallbackBg() {
  if (world || !html.classList.contains('no-webgl')) return;
  const i = active;
  const urls = [
    MEDIA.heroArt, MEDIA.story, MEDIA.renderPoster, CHARACTERS[state.sel[3]].avatar, MEDIA.factionMap,
    PLACES[state.sel[5]].img, RELICS[state.sel[6]].img, TIMELINE[state.sel[7]].img, GALLERY[state.sel[8]].img, MEDIA.heroArt
  ];
  fallbackBg.style.backgroundImage = `url("${urls[i]}")`;
}

/* ============ Loader ============ */
const loader = $('#loader');
function hideLoader() {
  if (loader.classList.contains('is-clap')) return;
  loader.classList.add('is-clap');
  setTimeout(() => loader.classList.add('is-done'), reduceMotion ? 0 : 650);
  setTimeout(() => loader.remove(), reduceMotion ? 300 : 1700);
}

/* ============ Khởi tạo WebGL (import động để bắt lỗi CDN/WebGL) ============ */
try {
  const { createWorld } = await import('./world.js');
  world = createWorld({
    canvas: $('#gl'),
    isMobile,
    reduceMotion,
    onPick: (shot, k, opts = {}) => {
      if (shot === 8 && opts.clicked && state.sel[8] === k) openLightbox(k);
      else select(shot, k);
    },
    onLoadProgress: (p) => { $('#loader-fill').style.transform = `scaleX(${p})`; }
  });
  if (new URLSearchParams(location.search).has('debug')) window.__world = world;
  $('#loader-text').textContent = 'ĐANG DỰNG CẢNH MỞ MÀN…';
  Promise.race([world.ready, new Promise((r) => setTimeout(r, 7000))]).then(hideLoader, hideLoader);
} catch (err) {
  console.warn('WebGL không khả dụng — chuyển sang chế độ ảnh tĩnh.', err);
  world = null;
  html.classList.add('no-webgl');
  hideLoader();
}

/* ============ Scroll → tiến trình camera ============ */
let target = 0;
let current = 0;
const readScroll = () => { target = clamp(scrollY / beatH(), 0, N - 1); };
addEventListener('scroll', readScroll, { passive: true });

// mở đúng cảnh theo #hash (tắt khôi phục vị trí cuộn của trình duyệt để hash luôn thắng)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const fromHash = sections.findIndex((s) => '#' + s.dataset.anchor === location.hash);
if (fromHash > 0) {
  scrollTo({ top: fromHash * beatH(), behavior: 'auto' });
}
readScroll();
current = target;

addEventListener('resize', () => {
  scrollTo({ top: active * beatH(), behavior: 'auto' });
  readScroll();
});

const tcEl = $('#tc');
const codeEl = $('#vf-code');
const moveEl = $('#vf-move');
const stripFill = $('#strip-fill');
let lastActive = -1;
let lastGoal = -1;
let shotStart = performance.now();

function setActive(i) {
  active = i;
  shotStart = performance.now();
  sections.forEach((sec, j) => {
    const on = j === i;
    sec.classList.toggle('is-active', on);
    sec.inert = !on;
    sec.setAttribute('aria-hidden', String(!on));
  });
  $$('button', stripList).forEach((b, j) => {
    if (j === i) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
  });
  codeEl.textContent = SHOTS[i].code;
  moveEl.textContent = SHOTS[i].move;
  history.replaceState(null, '', location.pathname + location.search + (i === 0 ? '' : '#' + sections[i].dataset.anchor));
  updateFallbackBg();
}

function timecode(now) {
  const secs = current * 12 + (now - shotStart) / 1000;
  const f = Math.floor((secs % 1) * 24);
  const s = Math.floor(secs) % 60;
  const m = Math.floor(secs / 60) % 60;
  const h = Math.floor(secs / 3600);
  const p = (n) => String(n).padStart(2, '0');
  return `TC ${p(h)}:${p(m)}:${p(s)}:${p(f)}`;
}

let last = performance.now();
let tcTick = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  current = reduceMotion ? target : damp(current, target, 3.4, dt);
  if (Math.abs(current - target) < 0.0004) current = target;

  const a = Math.round(current);
  if (a !== lastActive) { lastActive = a; setActive(a); }
  const goal = Math.round(target);
  if (goal !== lastGoal) {
    if (!bgm.paused && !reduceMotion && Math.abs(goal - current) > 0.4) spiritWind(goal > current ? 1 : -1);
    lastGoal = goal;
  }
  html.classList.toggle('is-moving', Math.abs(target - current) > 0.03);
  stripFill.style.transform = `scaleX(${current / (N - 1)})`;
  if ((tcTick += dt) > 1 / 24) { tcTick = 0; tcEl.textContent = timecode(now); }

  world?.render(current, dt, now / 1000);
  updateIncenseAnchor();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
