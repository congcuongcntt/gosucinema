import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  panelVertex, panelFragment, emberVertex, emberFragment, smokeVertex, smokeFragment, FilmShader, VeilShader
} from './shaders.js';
import { SHOTS, CHARACTERS, PLACES, RELICS, TIMELINE, GALLERY, MEDIA } from './data.js';
import {
  createIncense, createSigil, createTalismans, createGhostFire, createGroundMist, createCursorWisp,
  createGlyphGate, createSpiritStreaks
} from './fx.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const tmpV = new THREE.Vector3();
const easeInOut = (f) => (f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2);

const FOG_COLOR = new THREE.Color(0x040807); // đen ngọc bích như bản gốc (--abyss / --jade-shadow)
const FOG_NEAR = 24;
const FOG_FAR = 78;

export function createWorld({ canvas, isMobile, reduceMotion, onPick, onLoadProgress }) {
  /* ---------------- Renderer & post ---------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = FOG_COLOR;
  scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 220);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.6, 0.55, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const veil = new ShaderPass(VeilShader);
  veil.enabled = false;
  composer.addPass(veil);
  const film = new ShaderPass(FilmShader);
  composer.addPass(film);

  const MAX_TEX = Math.min(renderer.capabilities.maxTextureSize, isMobile ? 2048 : 3072);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  /* ---------------- Texture cache (thu nhỏ ảnh quá khổ trước khi đẩy lên GPU) ---------------- */
  const texCache = new Map();
  const imgLoader = new THREE.ImageLoader();
  imgLoader.setCrossOrigin('anonymous');

  function loadTexture(src) {
    if (texCache.has(src)) return texCache.get(src);
    const p = new Promise((resolve, reject) => {
      imgLoader.load(src, (img) => {
        let source = img;
        const big = Math.max(img.width, img.height);
        if (big > MAX_TEX) {
          const s = MAX_TEX / big;
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * s);
          c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          source = c;
        }
        const tex = new THREE.Texture(source);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAniso;
        tex.needsUpdate = true;
        tex.userData.aspect = img.width / img.height;
        resolve(tex);
      }, undefined, reject);
    });
    texCache.set(src, p);
    return p;
  }

  /* ---------------- Panel ---------------- */
  const panels = [];
  const interactive = [];
  const sharedTime = { value: 0 };
  const panelGeo = new THREE.PlaneGeometry(1, 1, 24, 1);

  class Panel {
    constructor({ src, video, aspect = 16 / 9, height, width, shot, alpha = false, gain = 1, bend = 0 }) {
      this.shot = shot;
      this.src = src;
      this.video = video || null;
      this.fit = width ? 'width' : 'height';
      this.size = width || height;
      this.loading = false;
      this.loaded = false;
      this.revealTarget = 0;
      this.focusTarget = 1;
      this.hoverTarget = 0;
      this.nextTex = null;
      this.swapping = false;
      this.uniforms = {
        uTex: { value: null },
        uHasTex: { value: 0 },
        uUseAlpha: { value: alpha ? 1 : 0 },
        uReveal: { value: 0 },
        uTime: sharedTime,
        uFocus: { value: 1 },
        uHover: { value: 0 },
        uOpacity: { value: 1 },
        uSeed: { value: Math.random() },
        uGlow: { value: new THREE.Vector3(0, 0, 0) },
        uAspect: { value: aspect },
        uGain: { value: gain },
        uBend: { value: bend },
        uFogColor: { value: FOG_COLOR },
        uFogNear: { value: FOG_NEAR },
        uFogFar: { value: FOG_FAR }
      };
      const mat = new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: panelVertex,
        fragmentShader: panelFragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      this.mesh = new THREE.Mesh(panelGeo, mat);
      this.mesh.userData.panel = this;
      this.applyAspect(aspect);
      panels.push(this);
    }
    applyAspect(a) {
      this.aspect = a;
      const w = this.fit === 'width' ? this.size : this.size * a;
      const h = this.fit === 'width' ? this.size / a : this.size;
      this.mesh.scale.set(w, h, 1);
      this.uniforms.uAspect.value = a;
    }
    load() {
      if (this.loading) return;
      this.loading = true;
      if (this.video) {
        const tex = new THREE.VideoTexture(this.video);
        tex.colorSpace = THREE.SRGBColorSpace;
        const ready = () => {
          this.applyAspect(this.video.videoWidth / this.video.videoHeight || this.aspect);
          this.setTexture(tex);
        };
        if (this.video.readyState >= 2) ready();
        else this.video.addEventListener('loadeddata', ready, { once: true });
        this.video.preload = 'auto';
        this.video.load();
        return;
      }
      loadTexture(this.src).then((tex) => this.setTexture(tex)).catch(() => {});
    }
    setTexture(tex) {
      this.uniforms.uTex.value = tex;
      this.uniforms.uHasTex.value = 1;
      if (tex.userData.aspect) this.applyAspect(tex.userData.aspect);
      this.loaded = true;
    }
    /** Đổi ảnh: đốt tàn ảnh cũ rồi hiện ảnh mới */
    swap(src) {
      if (src === this.src) return;
      this.src = src;
      this.swapping = true;
      this.nextTex = null;
      loadTexture(src).then((tex) => { if (this.src === src) this.nextTex = tex; }).catch(() => { this.swapping = false; });
    }
    update(dt) {
      const u = this.uniforms;
      if (this.swapping && this.nextTex && u.uReveal.value < 0.03) {
        this.setTexture(this.nextTex);
        this.nextTex = null;
        this.swapping = false;
      }
      const target = this.swapping || !this.loaded ? 0 : this.revealTarget;
      if (reduceMotion) u.uReveal.value = target;
      else {
        const speed = target > u.uReveal.value ? 0.85 : 2.2;
        u.uReveal.value += Math.sign(target - u.uReveal.value) * Math.min(Math.abs(target - u.uReveal.value), speed * dt);
      }
      u.uFocus.value = damp(u.uFocus.value, this.focusTarget, 5, dt);
      u.uHover.value = damp(u.uHover.value, this.hoverTarget, 8, dt);
    }
  }

  /* ---------------- FX helpers ---------------- */
  const smokes = [];
  const smokeGeo = new THREE.PlaneGeometry(1, 1);
  function addSmoke(group, pos, size, color = 0x6b4a3a, opacity = 0.22) {
    const m = new THREE.Mesh(smokeGeo, new THREE.ShaderMaterial({
      uniforms: { uTime: sharedTime, uSeed: { value: Math.random() * 10 }, uOpacity: { value: opacity }, uColor: { value: new THREE.Color(color) } },
      vertexShader: smokeVertex, fragmentShader: smokeFragment, transparent: true, depthWrite: false
    }));
    m.position.copy(pos);
    m.scale.set(size, size, 1);
    group.add(m);
    smokes.push(m);
  }

  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,240,210,1)');
    grd.addColorStop(0.18, 'rgba(255,140,70,.85)');
    grd.addColorStop(0.5, 'rgba(200,40,20,.25)');
    grd.addColorStop(1, 'rgba(150,20,10,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  function glowSprite(size, intensity = 1.6) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: new THREE.Color(intensity, intensity, intensity), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
    }));
    s.scale.set(size, size, 1);
    return s;
  }

  /* ---------------- Shots ---------------- */
  const shots = [];
  function makeShot(index, anchor, { camPos, camTgt, roll = 0, fov = 40 }) {
    const group = new THREE.Group();
    group.position.copy(anchor);
    scene.add(group);
    const s = {
      index, id: SHOTS[index].id, anchor, group, roll, fov,
      camPos: anchor.clone().add(camPos), camTgt: anchor.clone().add(camTgt),
      fPos: V(), fTgt: V(), wPos: V(), wTgt: V(),
      items: [], sel: 0,
      select() {}, update() {}, pick() {}
    };
    shots.push(s);
    return s;
  }
  function addPanel(shot, opts, pos, rotY = 0, parent = shot.group) {
    const p = new Panel({ ...opts, shot: shot.index });
    p.mesh.position.copy(pos);
    p.mesh.rotation.y = rotY;
    parent.add(p.mesh);
    return p;
  }
  function makeInteractive(shot, panel, itemIndex) {
    panel.mesh.userData.pick = { shot: shot.index, item: itemIndex };
    interactive.push(panel.mesh);
  }
  /** offset camera tới trước một item (theo pháp tuyến của nó) */
  function focusOn(shot, worldPos, normal, dist, lift = 0.3) {
    shot.wTgt.copy(worldPos).sub(shot.camTgt);
    shot.wPos.copy(worldPos).addScaledVector(normal, dist).add(V(0, lift, 0)).sub(shot.camPos);
  }

  // SC01 — Mở màn
  const TITLE_H = 5.4;
  {
    const s = makeShot(0, V(0, 0, 0), { camPos: V(0, 0.4, 13.5), camTgt: V(0, 0.4, 0), fov: 42 });
    const bg = addPanel(s, { src: MEDIA.heroArt, aspect: 5504 / 3072, height: 24 }, V(0, 1.5, -16));
    bg.focusTarget = 0.62;
    s.title = addPanel(s, { src: MEDIA.titleArt, aspect: 732 / 832, height: TITLE_H, alpha: true, gain: 1.3 }, V(0, 0.75, 0));
    s.title.uniforms.uFocus.value = 1;
    addSmoke(s.group, V(-7, -3, -4), 16, 0x2c3d3a, 0.24);
    addSmoke(s.group, V(8, -2, -6), 18, 0x5a2a22, 0.2);
    addSmoke(s.group, V(0, -5, 2), 14, 0x24332f, 0.28);

    // Nén nhang 3D cắm giữa chữ "DỊ" và "LỤC" (toạ độ lấy từ SVG gốc 366×416:
    // x = 148.5, thân nhang từ y = 237.5 đến chân đỏ y = 337.5)
    const TITLE_W = TITLE_H * (732 / 832);
    const FOOT = 337.5 / 416;
    const STICK_LEN = (FOOT - 237.5 / 416) * TITLE_H;
    const incX = (148.5 / 366 - 0.5) * TITLE_W;
    s.incense = createIncense({
      parent: s.group, base: V(incX, 0, 0.06), length: STICK_LEN,
      sharedTime, pixelRatio: DPR, isMobile, reduceMotion
    });
    s.sigil = createSigil({ parent: s.group, position: V(0, 0.75, -0.8), size: 8.5 });

    s.update = (dt, t) => {
      s.title.mesh.position.y = 0.75 + Math.sin(t * 0.6) * 0.06;
      const titleY = s.title.mesh.position.y;
      s.incense.group.position.y = titleY + (0.5 - FOOT) * TITLE_H;
      s.sigil.mesh.position.y = titleY;
      s.sigil.update(dt, t);
      // ánh lửa đầu nhang hắt lên mặt chữ; chữ bừng sáng khi vừa thắp
      const st = s.incense.state;
      const tipY = s.incense.group.position.y + s.incense.tipLocal().y;
      s.title.uniforms.uGlow.value.set(148.5 / 366, 0.5 + (tipY - titleY) / TITLE_H, st.intensity * 0.55 + st.flare * 0.6);
      s.title.uniforms.uGain.value = 1.3 + st.flare * 0.35;
      // backdrop luôn phủ kín khung hình (kể cả màn dọc)
      const d = camera.position.distanceTo(bg.mesh.getWorldPosition(tmpV));
      const vh = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * 1.12;
      const k = Math.max(1, vh / 24, (vh * camera.aspect) / (24 * bg.aspect));
      bg.applyAspect(bg.aspect);
      bg.mesh.scale.multiplyScalar(k);
    };
  }

  // SC02 — Khởi nguồn
  {
    const s = makeShot(1, V(-16, 2.5, -42), { camPos: V(4.5, 1, 19.5), camTgt: V(0.4, 0, 0), fov: 40 });
    addPanel(s, { src: MEDIA.story, aspect: 2560 / 1429, height: 8.4, bend: 0.4 }, V(0, 0, 0), 0.22);
    addSmoke(s.group, V(-6, -4, 3), 15);
    addSmoke(s.group, V(7, 3, -5), 17, 0x5a2a22, 0.16);
  }

  // SC03 — Bản dựng (video)
  const video = document.createElement('video');
  video.src = MEDIA.render;
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.setAttribute('playsinline', '');
  {
    const s = makeShot(2, V(12, -1.5, -84), { camPos: V(-4.5, 1.4, 20), camTgt: V(0, 0, 0), roll: -0.045, fov: 40 });
    s.panel = addPanel(s, { video, aspect: 16 / 9, height: 8.6, bend: 0.25 }, V(0, 0, 0), -0.16);
    addSmoke(s.group, V(-8, -3, 2), 16, 0x5a2a22, 0.18);
    addSmoke(s.group, V(8, 4, -6), 18);
  }

  // SC04 — Nhân vật (vòng cung)
  {
    const s = makeShot(3, V(0, 1, -128), { camPos: V(0, 0.6, 12), camTgt: V(0, 0, 0), fov: 40 });
    const C = V(0, 0, 13);
    const R = 13;
    s.wide = false;
    CHARACTERS.forEach((c, k) => {
      const a = -0.62 + k * (1.24 / (CHARACTERS.length - 1));
      const pos = C.clone().add(V(R * Math.sin(a), 0, -R * Math.cos(a)));
      const p = addPanel(s, { src: c.avatar, aspect: 716 / 960, height: 5.2 }, pos, -a);
      p.home = pos.clone();
      p.normal = V(-Math.sin(a), 0, Math.cos(a));
      makeInteractive(s, p, k);
      s.items.push(p);
    });
    s.select = (k) => {
      s.sel = k;
      s.items.forEach((p, j) => (p.focusTarget = j === k ? 1 : 0.28));
      s.refocus();
    };
    s.refocus = () => {
      const p = s.items[s.sel];
      const wp = p.home.clone().addScaledVector(p.normal, s.wide ? 2 : 0).add(s.anchor);
      focusOn(s, wp, p.normal, s.wide ? 13 : 9.8, 0.1);
    };
    s.setView = (mode) => {
      const p = s.items[s.sel];
      const c = CHARACTERS[s.sel];
      s.wide = mode !== 'avatar';
      s.items.forEach((q, j) => { if (j !== s.sel && q.src !== CHARACTERS[j].avatar) q.swap(CHARACTERS[j].avatar); });
      p.swap(c[mode]);
      s.refocus();
    };
    s.update = (dt) => {
      s.items.forEach((p, j) => {
        const out = j === s.sel && s.wide ? 2 : 0;
        const target = p.home.clone().addScaledVector(p.normal, out);
        p.mesh.position.lerp(target, 1 - Math.exp(-dt * 4));
      });
    };
    s.pick = (k) => onPick(3, k);
  }

  // SC05 — Sáu thế lực (bản đồ nằm nghiêng)
  {
    const s = makeShot(4, V(-14, -5, -170), { camPos: V(0, 13, 14.5), camTgt: V(0, 0, -0.5), fov: 40 });
    const map = addPanel(s, { src: MEDIA.factionMap, aspect: 1024 / 571, height: 11.5 }, V(0, 0, 0));
    map.mesh.rotation.x = -1.05;
    addSmoke(s.group, V(-9, 2, 2), 14, 0x5a2a22, 0.18);
    addSmoke(s.group, V(9, 1, -3), 16);
    const pins = [];
    for (let k = 0; k < 6; k++) {
      const g = glowSprite(0.9, 1.4);
      g.position.set(-8 + k * 3.2, 1.2 + Math.sin(k) * 0.3, -1.5 + (k % 2) * 2);
      s.group.add(g);
      pins.push(g);
    }
    s.select = (k) => { s.sel = k; };
    s.update = (dt, t) => pins.forEach((g, k) => {
      const on = k === s.sel;
      const sc = (on ? 1.8 : 0.7) + Math.sin(t * 3 + k) * 0.08;
      g.scale.x = g.scale.y = damp(g.scale.x, sc, 6, dt);
    });
  }

  // SC06 — Địa đồ
  {
    const s = makeShot(5, V(14, 1, -212), { camPos: V(0, 1, 17), camTgt: V(0, 0, -2), fov: 40 });
    const layout = [[V(-10, 0, 0), 0.45], [V(0, 0.3, -4), 0], [V(10, 0, 0), -0.45]];
    PLACES.forEach((pl, k) => {
      const [pos, ry] = layout[k];
      const p = addPanel(s, { src: pl.img, aspect: 16 / 9, height: 5.8 }, pos, ry);
      p.normal = V(Math.sin(ry), 0, Math.cos(ry));
      makeInteractive(s, p, k);
      s.items.push(p);
    });
    addSmoke(s.group, V(0, -4, 3), 20, 0x3d2a24, 0.22);
    s.select = (k) => {
      s.sel = k;
      s.items.forEach((p, j) => (p.focusTarget = j === k ? 1 : 0.3));
      const p = s.items[k];
      focusOn(s, p.mesh.position.clone().add(s.anchor), p.normal, 12.5, 0.2);
    };
    s.pick = (k) => onPick(5, k);
  }

  // SC07 — Pháp khí (bàn xoay)
  {
    const s = makeShot(6, V(-6, 3, -254), { camPos: V(0, 0.9, 16.5), camTgt: V(0, 0, 6), fov: 38 });
    const ring = new THREE.Group();
    s.group.add(ring);
    const R = 6;
    RELICS.forEach((r, k) => {
      const th = (k * Math.PI) / 2;
      const p = addPanel(s, { src: r.img, aspect: 2560 / 1429, height: 4.3 }, V(R * Math.sin(th), 0, R * Math.cos(th)), th, ring);
      makeInteractive(s, p, k);
      s.items.push(p);
    });
    const core = glowSprite(4, 0.9);
    s.group.add(core);
    s.rot = 0;
    s.select = (k) => {
      // quay theo đường ngắn nhất
      const cur = s.sel;
      let d = k - cur;
      if (d > 2) d -= 4;
      if (d < -2) d += 4;
      s.rot += d;
      s.sel = k;
      s.items.forEach((p, j) => (p.focusTarget = j === k ? 1 : 0.25));
    };
    s.update = (dt, t) => {
      ring.rotation.y = damp(ring.rotation.y, (-s.rot * Math.PI) / 2, 3.2, dt);
      ring.position.y = Math.sin(t * 0.8) * 0.12;
    };
    s.pick = (k) => onPick(6, k);
  }

  // SC08 — Trục thời gian (sợi chỉ đỏ)
  {
    const s = makeShot(7, V(8, 0, -298), { camPos: V(0, 2.4, 23), camTgt: V(0, 1, 0), fov: 40 });
    const pts = TIMELINE.map((_, k) => V(-15 + k * 6, Math.sin(k * 1.3) * 1.1, -Math.abs(k - 2.5) * 1.2));
    const curvePts = [pts[0].clone().add(V(-8, -1, 2)), ...pts, pts[pts.length - 1].clone().add(V(8, 1, 2))];
    const curve = new THREE.CatmullRomCurve3(curvePts, false, 'centripetal');
    const thread = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 240, 0.035, 6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.32, 0.12) })
    );
    s.group.add(thread);
    s.nodes = [];
    TIMELINE.map((tl, k) => {
      const node = glowSprite(1.1, 1.6);
      node.position.copy(pts[k]);
      s.group.add(node);
      s.nodes.push(node);
      const p = addPanel(s, { src: tl.img, aspect: 16 / 9, height: 2.7 }, pts[k].clone().add(V(0, 2.3, 0)));
      makeInteractive(s, p, k);
      s.items.push(p);
    });
    s.select = (k) => {
      s.sel = k;
      s.items.forEach((p, j) => (p.focusTarget = j === k ? 1 : 0.35));
      const wp = pts[k].clone().add(V(0, 1.7, 0)).add(s.anchor);
      focusOn(s, wp, V(0, 0, 1), 10.5, 0.4);
    };
    s.update = (dt, t) => s.nodes.forEach((n, k) => {
      const sc = (k === s.sel ? 2 : 1) + Math.sin(t * 4 + k) * 0.1;
      n.scale.x = n.scale.y = damp(n.scale.x, sc, 6, dt);
    });
    s.pick = (k) => onPick(7, k);
  }

  // SC09 — Khung hình (rotunda 12 still)
  {
    const s = makeShot(8, V(0, 2, -345), { camPos: V(0, 0.3, 12.5), camTgt: V(0, -0.4, 0), fov: 40 });
    const C = V(0, 0, 15);
    const R = 15;
    const STEP = 0.52;
    const strip = new THREE.Group();
    strip.position.copy(C);
    s.group.add(strip);
    GALLERY.forEach((g, k) => {
      const phi = k * STEP;
      const p = addPanel(s, { src: g.img, aspect: 2560 / 1429, height: 4 }, V(R * Math.sin(phi), 0, -R * Math.cos(phi)), -phi, strip);
      makeInteractive(s, p, k);
      s.items.push(p);
    });
    s.pos = 0; // vị trí liên tục (không wrap) để xoay mượt qua mép
    s.select = (k) => {
      const n = GALLERY.length;
      const cur = ((s.pos % n) + n) % n;
      let d = k - cur;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      s.pos += d;
      s.sel = k;
      s.items.forEach((p, j) => (p.focusTarget = j === k ? 1 : 0.32));
    };
    s.update = (dt) => { strip.rotation.y = damp(strip.rotation.y, s.pos * STEP, 3.5, dt); };
    s.pick = (k) => onPick(8, k);
  }

  // SC10 — Hồi kết
  {
    const s = makeShot(9, V(0, 9, -392), { camPos: V(0, -0.6, 15), camTgt: V(0, 0.4, 0), fov: 46 });
    s.title = addPanel(s, { src: MEDIA.titleArt, aspect: 732 / 832, height: 5.6, alpha: true, gain: 1.3 }, V(0, 1.4, 0));
    addSmoke(s.group, V(-6, -3, -2), 18, 0x5a2a22, 0.2);
    addSmoke(s.group, V(6, -4, -1), 18);
    s.update = (dt, t) => { s.title.mesh.position.y = 1.4 + Math.sin(t * 0.5) * 0.08; };
  }

  /* ---------------- Không khí linh dị dùng chung mọi cảnh ---------------- */
  const anchors = shots.map((s) => s.anchor);
  const fogInfo = { color: FOG_COLOR, near: FOG_NEAR, far: FOG_FAR };
  const spots = shots.map((s) => ({ a: s.camTgt, c: s.camPos }));
  createTalismans({ scene, spots, perShot: isMobile ? 4 : 8, sharedTime, fog: fogInfo });
  createGhostFire({ scene, spots, perShot: isMobile ? 2 : 4, sharedTime, pixelRatio: DPR });
  createGroundMist({ scene, anchors, sharedTime, fog: fogInfo });
  const finePointer = matchMedia('(pointer: fine)').matches;
  const wisp = finePointer && !reduceMotion ? createCursorWisp({ scene, camera, pixelRatio: DPR }) : null;

  // Trạng thái chọn mặc định
  shots.forEach((s) => s.select(0));
  shots.forEach((s) => { s.fPos.copy(s.wPos); s.fTgt.copy(s.wTgt); });

  /* ---------------- Tàn nhang quanh mỗi cảnh ---------------- */
  {
    const per = isMobile ? 90 : 220;
    const H = 22;
    const count = per * shots.length;
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const off = new Float32Array(count);
    shots.forEach((s, i) => {
      for (let k = 0; k < per; k++) {
        const j = i * per + k;
        pos[j * 3] = s.anchor.x + (Math.random() - 0.5) * 38;
        pos[j * 3 + 1] = s.anchor.y;
        pos[j * 3 + 2] = s.anchor.z + (Math.random() - 0.5) * 40 + 6;
        seed[j] = Math.random();
        off[j] = Math.random() * H;
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aOff', new THREE.BufferAttribute(off, 1));
    const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: { uTime: sharedTime, uHeight: { value: H }, uSize: { value: 5.5 }, uPixelRatio: { value: DPR }, uColor: { value: new THREE.Color(1.0, 0.42, 0.14) } },
      vertexShader: emberVertex, fragmentShader: emberFragment,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    pts.frustumCulled = false;
    scene.add(pts);
  }

  /* ---------------- Camera rig ---------------- */
  const posCurve = new THREE.CatmullRomCurve3(shots.map((s) => s.camPos), false, 'centripetal');
  const tgtCurve = new THREE.CatmullRomCurve3(shots.map((s) => s.camTgt), false, 'centripetal');
  const P = V(), T = V();
  const tan = V(), side = V(), UP = V(0, 1, 0);
  // trạng thái chuyển cảnh: m = cường độ (0 khi dừng ở cảnh, 1 ở giữa hai cảnh)
  const trans = { m: 0, f: 0, i: 0, dir: 1 };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let W = innerWidth, Hh = innerHeight;

  function frameShift(i) {
    const f = SHOTS[i].frame;
    const portrait = W / Hh < 0.9;
    if (portrait) return [0, f === 'center' ? 0.16 : 0.25];
    if (f === 'left') return [0.19, 0];
    if (f === 'top') return [0, 0.12];
    return [0, 0.14];
  }

  function updateCamera(current, dt, t) {
    const N = shots.length;
    const i0 = Math.min(N - 2, Math.max(0, Math.floor(current)));
    const f = Math.min(1, Math.max(0, current - i0));
    const e = easeInOut(f);
    const u = (i0 + e) / (N - 1);
    posCurve.getPoint(u, P);
    tgtCurve.getPoint(u, T);

    for (const s of shots) {
      const k = 1 - Math.exp(-dt * 3);
      s.fPos.lerp(s.wPos, k);
      s.fTgt.lerp(s.wTgt, k);
      const w = Math.max(0, 1 - Math.abs(current - s.index));
      if (w > 0) {
        P.addScaledVector(s.fPos, w);
        T.addScaledVector(s.fTgt, w);
      }
    }

    const a = shots[i0], b = shots[i0 + 1];
    let roll = THREE.MathUtils.lerp(a.roll, b.roll, e);
    let fov = THREE.MathUtils.lerp(a.fov, b.fov, e);

    // Vũ đạo chuyển cảnh: máy quay vòng cung lệch sang một bên, xoắn trục (barrel roll),
    // giãn FOV như bị hút qua cửa âm. Chiều xoáy đổi luân phiên giữa các cảnh.
    const dir = i0 % 2 ? 1 : -1;
    const m = reduceMotion ? 0 : Math.pow(Math.sin(Math.PI * f), 1.4);
    trans.m = m; trans.f = f; trans.i = i0; trans.dir = dir;
    if (m > 0.0005) {
      posCurve.getTangent(u, tan);
      side.crossVectors(tan, UP);
      if (side.lengthSq() > 1e-4) P.addScaledVector(side.normalize(), dir * m * 3.2);
      P.y += m * 1.6;
      P.addScaledVector(tan, -m * 2.5);
      roll += dir * (m * 0.26 + Math.sin(Math.PI * 2 * f) * 0.07);
      fov += m * 22;
    }
    const [ax, ay] = frameShift(i0), [bx, by] = frameShift(i0 + 1);
    const sx = THREE.MathUtils.lerp(ax, bx, e), sy = THREE.MathUtils.lerp(ay, by, e);

    // handheld + parallax theo con trỏ
    pointer.sx = damp(pointer.sx, pointer.x, 2.5, dt);
    pointer.sy = damp(pointer.sy, pointer.y, 2.5, dt);
    const hand = reduceMotion ? 0 : 1;
    P.x += (Math.sin(t * 0.53) * 0.07 + Math.sin(t * 1.7) * 0.015) * hand + pointer.sx * 0.55;
    P.y += (Math.sin(t * 0.71 + 1) * 0.05) * hand - pointer.sy * 0.3;

    camera.position.copy(P);
    camera.lookAt(T);
    camera.rotateZ(roll + Math.sin(t * 0.37) * 0.004 * hand);

    const aspect = W / Hh;
    if (aspect < 1.25) {
      const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * 1.25);
      fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hf / 2) / aspect));
      fov = Math.min(fov, 82);
    }
    camera.fov = fov;
    camera.aspect = aspect;
    camera.setViewOffset(W, Hh, sx * W, sy * Hh, W, Hh);
    camera.updateProjectionMatrix();
  }

  /* ---------------- Picking ---------------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null;
  let activeShot = 0;
  let settled = true;

  function raycast(clientX, clientY) {
    ndc.set((clientX / W) * 2 - 1, -(clientY / Hh) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const cands = interactive.filter((m) => m.userData.pick.shot === activeShot);
    const hit = raycaster.intersectObjects(cands, false)[0];
    return hit ? hit.object : null;
  }

  canvas.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / W) * 2 - 1;
    pointer.y = (e.clientY / Hh) * 2 - 1;
    if (e.pointerType !== 'mouse') return;
    const obj = settled ? raycast(e.clientX, e.clientY) : null;
    if (hovered && hovered !== obj) hovered.userData.panel.hoverTarget = 0;
    hovered = obj;
    if (obj) obj.userData.panel.hoverTarget = 1;
    canvas.style.cursor = obj ? 'pointer' : '';
  });

  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    const s = shots[activeShot];
    // vuốt ngang để đổi item trong các cảnh có danh sách
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && s.items.length > 1) {
      const n = s.items.length;
      const step = dx < 0 ? 1 : -1;
      onPick(activeShot, (s.sel + step + n) % n, { swipe: true });
    } else if (Math.hypot(dx, dy) < 8 && settled) {
      const obj = raycast(e.clientX, e.clientY);
      if (obj) onPick(activeShot, obj.userData.pick.item, { clicked: true });
    }
    down = null;
  });

  /* ---------------- Resize ---------------- */
  function resize() {
    W = innerWidth;
    Hh = innerHeight;
    renderer.setSize(W, Hh, false);
    composer.setSize(W, Hh);
    bloom.setSize(W / 2, Hh / 2);
    film.uniforms.uRes.value = [W * DPR, Hh * DPR];
    veil.uniforms.uRes.value = [W, Hh];
  }
  addEventListener('resize', resize);
  resize();

  /* ---------------- Preload cảnh đầu ---------------- */
  const first = [MEDIA.titleArt, MEDIA.heroArt];
  let done = 0;
  const ready = Promise.all(first.map((src) => loadTexture(src).finally(() => onLoadProgress?.(++done / first.length))));

  /* ---------------- Frame ---------------- */
  let prev = 0;
  let videoWanted = false;
  function render(current, dt, t) {
    sharedTime.value = t;
    activeShot = Math.round(current);
    settled = Math.abs(current - activeShot) < 0.08;

    for (const p of panels) {
      const d = Math.abs(current - p.shot);
      if (d < 1.6) p.load();
      if (d < 0.9) p.revealTarget = 1;
      else if (d > 1.3) p.revealTarget = 0;
      p.update(dt);
    }
    const inc = shots[0].incense;
    inc.update(dt, t, { visible: current < 0.5 && !document.hidden, camera });
    shots.forEach((s) => s.update(dt, t));
    smokes.forEach((m) => m.quaternion.copy(camera.quaternion));
    wisp?.update(dt, t);

    const wantVideo = Math.abs(current - 2) < 0.6;
    if (wantVideo !== videoWanted) {
      videoWanted = wantVideo;
      if (wantVideo) video.play().catch(() => {});
      else video.pause();
    }

    updateCamera(current, dt, t);

    // rung nhẹ máy quay khi hương bùng lên
    kick = damp(kick, 0, 5, dt);
    if (kick > 0.001 && !reduceMotion) {
      camera.position.x += Math.sin(t * 71) * kick * 0.035;
      camera.position.y += Math.sin(t * 53 + 1) * kick * 0.03;
    }

    const sv = dt > 0 ? (current - prev) / dt : 0;
    const vel = Math.abs(sv);
    prev = current;
    gate.update(camera, trans.i, trans.f, trans.dir);
    streaks?.update(camera, dt, trans.m, sv);
    const u = film.uniforms;
    u.uTime.value = t;
    u.uAberration.value = damp(u.uAberration.value, Math.min(1, vel * 0.9 + inc.state.flare * 0.5), 6, dt);
    u.uDip.value = damp(u.uDip.value, reduceMotion ? 0 : Math.min(0.3, vel * 0.22), 6, dt);
    u.uGrain.value = reduceMotion ? 0.035 : 0.07;
    u.uHaze.value = reduceMotion ? 0 : 1;

    // "hồn lướt qua": thỉnh thoảng một bóng nhân đôi xanh ngọc vụt qua khung hình
    if (!reduceMotion && t > nextGhost) { ghostAt = t; nextGhost = t + 9 + Math.random() * 12; }
    const ga = t - ghostAt;
    u.uGhost.value = Math.max(ga >= 0 && ga < 0.5 ? Math.sin((ga / 0.5) * Math.PI) : 0, trans.m * 0.7);
    veil.enabled = trans.m > 0.002;
    if (veil.enabled) {
      const vu = veil.uniforms;
      vu.uTime.value = t;
      vu.uVeil.value = trans.m;
      vu.uDir.value = trans.dir;
      vu.uSeed.value = trans.i * 2.31;
    }

    bloom.strength = 0.6 + inc.state.flare * 0.35 + trans.m * 0.35;

    composer.render(dt);
  }

  // chữ Hán của cảnh sắp tới: 源 khởi nguồn · 影 bản dựng · 魂 nhân vật · 勢 thế lực · 域 địa đồ
  // 器 pháp khí · 時 thời gian · 夢 khung hình · 終 hồi kết
  const gate = createGlyphGate({ scene, chars: ['源', '影', '魂', '勢', '域', '器', '時', '夢', '終'], sharedTime });
  const streaks = reduceMotion ? null : createSpiritStreaks({ scene, count: isMobile ? 80 : 160 });

  let kick = 0;
  let ghostAt = -100;
  let nextGhost = 6;
  const incenseScreen = new THREE.Vector3();

  return {
    ready,
    render,
    video,
    select(shotIndex, k) { shots[shotIndex].select(k); },
    setCharView(mode) { shots[3].setView(mode); },
    resize,
    debug: { scene, camera, shots, renderer },
    /** Thắp hương: nhang dài lại, tia lửa, sóng xung kích, pháp trận bừng sáng, máy quay rung nhẹ */
    lightIncense() {
      const s = shots[0];
      s.incense.light(sharedTime.value);
      s.sigil.pulse();
      kick = 1;
    },
    /** Trạng thái nhang + toạ độ màn hình của đầu nhang (để đặt nút/nhãn DOM) */
    incenseInfo() {
      const s = shots[0];
      const p = s.incense.tipWorld();
      incenseScreen.copy(p).project(camera);
      return {
        lit: s.incense.state.lit,
        out: s.incense.state.out,
        burn: s.incense.state.burn,
        x: (incenseScreen.x * 0.5 + 0.5) * W,
        y: (-incenseScreen.y * 0.5 + 0.5) * Hh,
        onScreen: incenseScreen.z < 1
      };
    }
  };
}
