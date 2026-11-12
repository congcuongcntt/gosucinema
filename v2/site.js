// Sơn Hà Dị Lục · trang giới thiệu dự án.
// Một canvas WebGL cố định làm "sân khấu hình": mọi hình nền lớn là tư liệu thật của dự án,
// chuyển cảnh bằng vệt mực loang, và ở những cảnh có hai lớp (ngày/đêm, dương/âm, bản đồ/mạng lưới)
// con trỏ mở một "Mắt Âm" để nhìn sang lớp kia.
import * as THREE from 'three';
import { CHARACTERS, FACTIONS, RELICS, GALLERY } from '../js/data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const plateUrl = (n) => (n.startsWith('still-') ? `assets/still-frame/${n.slice(6)}.webp` : `assets/v2/${n}.webp`);

/* ================= Sân khấu hình ================= */
const stage = (() => {
  const canvas = $('#stage'), fallback = $('#stage-fallback');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
  catch (e) { renderer = null; }
  if (!renderer) {
    document.documentElement.classList.add('no-gl');
    return { show(name) { fallback.style.backgroundImage = `url(${plateUrl(name)})`; }, pointer() {}, ok: false };
  }
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(DPR);
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blank = new THREE.DataTexture(new Uint8Array([7, 6, 5, 255]), 1, 1); blank.needsUpdate = true;
  const U = {
    tA: { value: blank }, tB: { value: blank }, tAlt: { value: blank },
    uAsp: { value: new THREE.Vector3(1.78, 1.78, 1.78) }, uScreen: { value: 1.78 },
    uMix: { value: 0 }, uTime: { value: 0 }, uLens: { value: 0 }, uMouse: { value: new THREE.Vector2(0.62, 0.5) }, uPar: { value: new THREE.Vector2() },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, depthTest: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: /* glsl */`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D tA, tB, tAlt;
      uniform vec3 uAsp; uniform float uScreen, uMix, uTime, uLens; uniform vec2 uMouse, uPar;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a*noise(p); p = p*2.03 + 7.1; a *= .5; } return v; }
      vec2 cover(vec2 uv, float ia, float zoom, vec2 off){
        vec2 s = uScreen > ia ? vec2(1., ia/uScreen) : vec2(uScreen/ia, 1.);
        return (uv - .5) * s / zoom + .5 + off;
      }
      void main(){
        vec2 uv = vUv;
        float drift = 1.045 + .02*sin(uTime*.07);
        vec3 a = texture2D(tA, cover(uv, uAsp.x, drift, uPar)).rgb;
        vec3 b = texture2D(tB, cover(uv, uAsp.y, drift + (1.-uMix)*.05, uPar)).rgb;
        // vệt mực loang từ trái sang, mép cháy son đỏ
        float n = fbm(uv*vec2(uScreen, 1.)*2.6 + 3.);
        float t = mix(-.25, 1.25, uMix);
        float m = smoothstep(t - .09, t + .09, n*.55 + uv.x*.45 + (1.-uv.y)*.08);
        m = 1. - m;
        vec3 col = mix(a, b, m);
        col += vec3(.62, .07, .035) * m*(1.-m)*3.2 * step(.001, uMix) * step(uMix, .999);
        // Mắt Âm: vòng nhìn sang lớp kia, mép như giấy cháy
        vec2 d = (uv - uMouse) * vec2(uScreen, 1.);
        float edge = (fbm(uv*vec2(uScreen,1.)*7. + uTime*.06) - .5) * .11;
        float r = uLens * (.23 + .012*sin(uTime*1.3));
        float lm = smoothstep(r, r - .035, length(d) + edge) * step(.001, uLens);
        vec3 alt = texture2D(tAlt, cover(uv, uAsp.z, drift, uPar)).rgb;
        col = mix(col, alt, lm);
        col += vec3(1., .42, .12) * lm*(1.-lm)*2.6;
        // tối góc và hạt phim
        vec2 q = uv - .5; col *= 1. - dot(q, q)*.85;
        col += (hash(gl_FragCoord.xy + fract(uTime)*91.7) - .5) * .03;
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

  const loader = new THREE.TextureLoader(), cache = new Map();
  function load(name) {
    if (!cache.has(name)) cache.set(name, new Promise((res) => loader.load(plateUrl(name), (t) => {
      t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
      t.userData.asp = t.image.width / t.image.height; res(t);
    }, undefined, () => res(null))));
    return cache.get(name);
  }
  let current = '', want = '', mixing = false, mixT = 0, hasAlt = false, lensWant = 0;
  const ptr = new THREE.Vector2(0.62, 0.5), ptrS = ptr.clone();
  let lastMove = -1e9, pointerSeen = false;

  async function show(name, alt) {
    const key = name + '|' + (alt || '');
    if (key === want) return;
    want = key;
    const [t, ta] = await Promise.all([load(name), alt ? load(alt) : null]);
    if (want !== key || !t) return;
    if (mixing) { U.tA.value = U.tB.value; U.uAsp.value.x = U.uAsp.value.y; }
    U.tB.value = t; U.uAsp.value.y = t.userData.asp;
    U.uMix.value = 0; mixT = 0; mixing = true; current = key;
    hasAlt = false; lensWant = 0;
    pendingAlt = ta;
    fallback.style.backgroundImage = `url(${plateUrl(name)})`;
  }
  let pendingAlt = null;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    U.uScreen.value = innerWidth / innerHeight;
  }
  addEventListener('resize', resize); resize();
  const clock = new THREE.Clock(); let visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) { clock.getDelta(); requestAnimationFrame(frame); } });
  function frame() {
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!REDUCED) U.uTime.value += dt;
    if (mixing) {
      mixT += dt / (REDUCED ? 0.01 : 1.15);
      const k = Math.min(1, mixT); U.uMix.value = k * k * (3 - 2 * k);
      if (mixT >= 1) {
        mixing = false; U.tA.value = U.tB.value; U.uAsp.value.x = U.uAsp.value.y; U.uMix.value = 0;
        if (pendingAlt) { U.tAlt.value = pendingAlt; U.uAsp.value.z = pendingAlt.userData.asp; hasAlt = true; }
      }
    }
    // không có con trỏ (cảm ứng) hoặc để yên lâu: Mắt Âm tự trôi chậm quanh giữa hình
    const idle = performance.now() - lastMove > 5000;
    if (!pointerSeen || idle) ptr.set(0.6 + Math.sin(U.uTime.value * 0.23) * 0.2, 0.52 + Math.sin(U.uTime.value * 0.31 + 1) * 0.16);
    ptrS.lerp(ptr, 1 - Math.exp(-dt * (idle ? 1.5 : 9)));
    U.uMouse.value.copy(ptrS);
    U.uPar.value.set((0.5 - ptrS.x) * 0.012, (0.5 - ptrS.y) * 0.012);
    lensWant = hasAlt && !mixing && lensOn ? 1 : 0;
    U.uLens.value += (lensWant - U.uLens.value) * (1 - Math.exp(-dt * 4));
    if (U.uLens.value < 0.002) U.uLens.value = 0;
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }
  let lensOn = true;
  requestAnimationFrame(frame);
  return {
    ok: true, show, preload: load,
    pointer(x, y) { ptr.set(x / innerWidth, 1 - y / innerHeight); lastMove = performance.now(); pointerSeen = true; },
    setLens(v) { lensOn = v; },
    get state() { return { current, mixing, lens: U.uLens.value, hasAlt }; },
  };
})();

addEventListener('pointermove', (e) => stage.pointer(e.clientX, e.clientY), { passive: true });
addEventListener('pointerdown', (e) => stage.pointer(e.clientX, e.clientY), { passive: true });

/* ================= Cảnh theo vị trí cuộn ================= */
const plateOf = (el) => {
  const on = $('[data-cams] button.on', el);            // mục bối cảnh: theo góc máy đang chọn
  const src = on || el;
  return [src.dataset.plate, src.dataset.alt];
};
const scenes = $$('main [data-plate]').filter((el) => el.tagName !== 'BUTTON');
let activeScene = null;
const sceneIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    activeScene = en.target;
    stage.show(...plateOf(en.target));
    en.target.classList.add('seen');
    const i = scenes.indexOf(en.target), nx = scenes[i + 1];
    if (nx && stage.preload) stage.preload(plateOf(nx)[0]);
  });
}, { rootMargin: '-50% 0px -50% 0px' });
scenes.forEach((s) => sceneIO.observe(s));
stage.show(...plateOf(scenes[0]));

/* ================= Mục lục bên phải ================= */
const rail = $('#rail'), secs = $$('main > section[data-nav]');
secs.forEach((s, i) => {
  const a = document.createElement('a'); a.href = '#' + s.id;
  a.innerHTML = `<span>${s.dataset.nav}</span><i></i>`; a.dataset.i = i; rail.append(a);
});
const railIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => { if (en.isIntersecting) { $$('a', rail).forEach((a) => a.classList.toggle('on', a.hash === '#' + en.target.id)); document.body.dataset.sec = en.target.id; } });
}, { rootMargin: '-50% 0px -50% 0px' });
secs.forEach((s) => railIO.observe(s));

/* ================= Góc máy bối cảnh ================= */
$$('[data-cams]').forEach((box) => {
  const sec = box.closest('section'), hint = $('[data-lens-hint]', sec);
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', box).forEach((x) => x.classList.toggle('on', x === b));
    stage.show(b.dataset.plate, b.dataset.alt);
    if (hint) hint.classList.toggle('off', !b.dataset.alt);
    b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
  });
});

/* ================= Trailer ================= */
const film = $('#film'), bgm = $('#bgm'), soundBtn = $('#sound');
$$('.film-tabs button').forEach((b) => b.addEventListener('click', () => {
  $$('.film-tabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
  film.poster = b.dataset.poster; film.src = b.dataset.src; film.play().catch(() => {});
}));
let bgmOn = false;
function setBgm(on) {
  bgmOn = on; soundBtn.setAttribute('aria-pressed', on); $('#sound-label').textContent = on ? 'NHẠC: BẬT' : 'NHẠC: TẮT';
  if (on) { bgm.volume = 0.5; bgm.play().catch(() => setBgm(false)); } else bgm.pause();
}
soundBtn.addEventListener('click', () => setBgm(!bgmOn));
film.addEventListener('play', () => { if (bgmOn) bgm.pause(); });
film.addEventListener('pause', () => { if (bgmOn) bgm.play().catch(() => {}); });

/* ================= Nhân vật ================= */
{
  const names = $('.cast-names'), img = $('#cast-img'), toggle = $('#cast-toggle');
  let cur = 0, sheet = false;
  const paint = () => {
    const c = CHARACTERS[cur];
    img.classList.add('swap');
    const src = sheet ? c.sheet : c.turnaround;
    const pre = new Image(); pre.onload = pre.onerror = () => { img.src = src; img.alt = `${c.name}: ${sheet ? 'bảng thiết kế' : 'ba góc nhìn'}`; img.classList.remove('swap'); }; pre.src = src;
    $('#cast-name').textContent = c.name; $('#cast-sub').textContent = c.sub;
    $('#cast-bio').textContent = c.bio; $('#cast-quote').textContent = c.quote;
    $$('button', names).forEach((b, i) => b.setAttribute('aria-selected', i === cur));
    toggle.setAttribute('aria-pressed', sheet); toggle.textContent = sheet ? 'Xem ba góc nhìn' : 'Xem bảng thiết kế';
  };
  CHARACTERS.forEach((c, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab');
    b.innerHTML = `<img src="${c.avatar}" alt="" loading="lazy"><span>${c.name}</span>`;
    b.addEventListener('click', () => { cur = i; sheet = false; paint(); });
    names.append(b);
  });
  toggle.addEventListener('click', () => { sheet = !sheet; paint(); });
  img.addEventListener('click', () => openLightbox(img.src, img.alt));
  paint();
}

/* ================= Sáu thế lực ================= */
$('#factions').innerHTML = FACTIONS.map((f) => `<li><b>${f.name}</b><span>${f.place} · ${f.side}</span></li>`).join('');

/* ================= Pháp khí ================= */
{
  const tabs = $('#relic-tabs'), sec = $('#phap-khi');
  const pick = (i, apply = true) => {
    const r = RELICS[i];
    $('#relic-name').textContent = r.name; $('#relic-owner').textContent = r.owner; $('#relic-desc').textContent = r.desc;
    $$('button', tabs).forEach((b, k) => b.setAttribute('aria-selected', k === i));
    sec.dataset.plate = `relic-${i + 1}`;
    if (apply) stage.show(sec.dataset.plate);
  };
  RELICS.forEach((r, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab');
    b.innerHTML = `<i>0${i + 1}</i><span>${r.name}</span>`;
    b.addEventListener('click', () => pick(i)); tabs.append(b);
  });
  pick(2, false);
}

/* ================= Khung hình ================= */
{
  const box = $('#frames'), sec = $('#khung-hinh');
  const pick = (i, apply = true) => {
    const g = GALLERY[i];
    $('#frame-title').textContent = g.title; $('#frame-cap').textContent = g.caption;
    $$('button', box).forEach((b, k) => b.classList.toggle('on', k === i));
    sec.dataset.plate = `still-${String(i + 1).padStart(2, '0')}`;
    if (apply) stage.show(sec.dataset.plate);
  };
  GALLERY.forEach((g, i) => {
    const b = document.createElement('button'); b.type = 'button';
    b.innerHTML = `<img src="${g.img}" alt="${g.title}" loading="lazy"><span>${String(i + 1).padStart(2, '0')}</span>`;
    b.addEventListener('click', () => { pick(i); b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUCED ? 'auto' : 'smooth' }); });
    box.append(b);
  });
  pick(0, false);
}

/* ================= Xem hình lớn ================= */
const lb = $('#lightbox'), lbImg = $('#lb-img');
let lbFrom = null;
function openLightbox(src, alt) { lbFrom = document.activeElement; lbImg.src = src; lbImg.alt = alt || ''; lb.hidden = false; $('#lb-close').focus(); }
function closeLightbox() { lb.hidden = true; lbImg.removeAttribute('src'); if (lbFrom) lbFrom.focus(); }
$$('[data-full]').forEach((b) => b.addEventListener('click', () => openLightbox(b.dataset.full, $('img', b).alt)));
lb.addEventListener('click', (e) => { if (e.target !== lbImg) closeLightbox(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hidden) closeLightbox(); });

/* ================= Mô hình 3D ngọc lệnh ================= */
{
  const canvas = $('#relic3d');
  let started = false;
  const start = async () => {
    if (started) return; started = true;
    try {
      const [{ GLTFLoader }, { RoomEnvironment }] = await Promise.all([
        import('three/addons/loaders/GLTFLoader.js'), import('three/addons/environments/RoomEnvironment.js'),
      ]);
      const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
      const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
      const key = new THREE.DirectionalLight(0xffe2b8, 2.2); key.position.set(2, 3, 4); sc.add(key);
      const rim = new THREE.DirectionalLight(0xc93026, 1.6); rim.position.set(-3, 1, -3); sc.add(rim);
      const pivot = new THREE.Group(); sc.add(pivot);
      const gltf = await new GLTFLoader().loadAsync('assets/v2/ngoc-lenh.glb');
      const box = new THREE.Box3().setFromObject(gltf.scene), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(c); pivot.add(gltf.scene);
      const fit = Math.max(size.x, size.y, size.z);
      cam.position.set(0, 0, fit / (2 * Math.tan(THREE.MathUtils.degToRad(15))) * 1.25);
      canvas.parentElement.classList.add('ready');
      let rotY = -0.5, rotX = 0.05, vel = 0.35, drag = false, px = 0, py = 0, vis = true;
      canvas.addEventListener('pointerdown', (e) => { drag = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener('pointermove', (e) => {
        if (!drag) return;
        vel = (e.clientX - px) * 0.6; rotY += (e.clientX - px) * 0.01; rotX = THREE.MathUtils.clamp(rotX + (e.clientY - py) * 0.006, -0.6, 0.6);
        px = e.clientX; py = e.clientY;
      });
      const up = () => { drag = false; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
      canvas.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') rotY -= 0.2; if (e.key === 'ArrowRight') rotY += 0.2; });
      new IntersectionObserver(([en]) => { vis = en.isIntersecting; if (vis) requestAnimationFrame(loop); }).observe(canvas);
      const clock = new THREE.Clock();
      function loop() {
        if (!vis || document.hidden) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (canvas.width !== Math.round(w * r.getPixelRatio()) || canvas.height !== Math.round(h * r.getPixelRatio())) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
        if (!drag) { vel += ((REDUCED ? 0 : 0.35) - vel) * Math.min(1, dt * 1.5); rotY += vel * dt; }
        pivot.rotation.set(rotX, rotY, 0);
        r.render(sc, cam); requestAnimationFrame(loop);
      }
      document.addEventListener('visibilitychange', () => { if (!document.hidden && vis) requestAnimationFrame(loop); });
      requestAnimationFrame(loop);
    } catch (e) { canvas.parentElement.classList.add('failed'); }
  };
  canvas.tabIndex = 0;
  new IntersectionObserver(([en], io) => { if (en.isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '600px 0px' }).observe(canvas);
}

if (new URLSearchParams(location.search).has('debug')) window.__site = { stage };
