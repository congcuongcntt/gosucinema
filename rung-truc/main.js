// Rừng Trúc Âm — cảnh rừng trúc chân thực: đi chậm theo lối mòn, gió lùa ngọn trúc, sương chiều.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createBambooGrove, rng, BAMBOO_GLSL } from '../js/bamboo.js';

const qs = new URLSearchParams(location.search);
const DEBUG = qs.has('debug');
const FIXED_T = qs.has('t') ? parseFloat(qs.get('t')) : null;   // khoá thời gian để chụp kiểm thử
const VIEW = qs.get('view') || 'walk';
const isMobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG });
const DPR = Math.min(devicePixelRatio, isMobile ? 1.5 : 2);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(isMobile ? 62 : 52, innerWidth / innerHeight, 0.05, 260);
const time = { value: 0 };

/* ---------------- bảng màu: chiều tà sương lam, nắng xiên ngược phía trước ---------------- */
const LOOK = {
  time,
  sunDir: [0.18, 0.36, -1],
  sunCol: [2.3, 1.95, 1.4],
  skyCol: [0.29, 0.37, 0.38],
  gndCol: [0.04, 0.038, 0.03],
  fogCol: [0.1, 0.135, 0.13],
  fogSunCol: [0.62, 0.6, 0.45],
  fogDensity: 0.02,
  fogHeight: 2.6,
  groundY: 0,
  canopyY: 13,
  wind: 1,
  windDir: [0.7, 0, -0.7]
};

/* ---------------- địa hình & lối mòn ---------------- */
const pathX = (z) => Math.sin(z * 0.045) * 4.5 + Math.sin(z * 0.11 + 1.2) * 1.2;
const groundY = (x, z) => {
  const d = Math.abs(x - pathX(z));
  return 0.35 * Math.sin(x * 0.13 + z * 0.07) + 0.25 * Math.sin(x * 0.31 - z * 0.23 + 2) + 0.12 * Math.sin(x * 0.9 + z * 0.7)
    - 0.12 * (1 - THREE.MathUtils.smoothstep(d, 0.6, 1.6)) + 0.02 * d;
};

/* ---------------- đặt cây: dày, lối mòn trống ---------------- */
const R = rng(2024);
const placements = [];
const Z0 = 22, Z1 = -95, HALF = isMobile ? 16 : 24;
const cell = isMobile ? 1.45 : 1.25;
for (let z = Z1; z < Z0; z += cell) {
  for (let x = -HALF; x < HALF; x += cell) {
    const px = x + (R() - 0.5) * cell * 0.95, pz = z + (R() - 0.5) * cell * 0.95;
    const dp = Math.abs(px - pathX(pz));
    if (dp < 1.25 + R() * 0.5) continue;              // lối đi
    const xl = Math.abs(px - pathX(pz));
    if (xl > HALF - 2 && R() < 0.5) continue;
    // khóm trúc: mật độ dao động theo vết loang
    const clump = 0.5 + 0.5 * Math.sin(px * 0.21 + Math.sin(pz * 0.13) * 2) * Math.sin(pz * 0.17 + 1);
    if (R() > 0.45 + clump * 0.55) continue;
    const near = dp < 6.5;
    const pl = { x: px, y: groundY(px, pz), z: pz, h: 12 + R() * 9 + (dp > 4 ? 2 : 0), near };
    // trúc sát lối đi ngả vào lòng đường, ngọn chụm lại thành vòm
    if (dp < 6 && R() < 0.85) {
      const toPath = pathX(pz) - px;
      pl.leanDir = Math.atan2((R() - 0.5) * 0.6, Math.sign(toPath));
      pl.tilt = (0.04 + R() * 0.09) * (1 - dp / 7);
    }
    placements.push(pl);
  }
}
// vành rừng xa (thưa, nhẹ) để không lộ chân trời ở hai bên
for (let z = Z1; z < Z0; z += cell * 2.2) {
  for (const side of [-1, 1]) {
    for (let d = HALF; d < HALF + 16; d += cell * 2.2) {
      const pz = z + (R() - 0.5) * cell * 2, px = pathX(pz) + side * (d + R() * cell * 2);
      placements.push({ x: px, y: groundY(px, pz), z: pz, h: 15 + R() * 6, near: false });
    }
  }
}
// vài cây khô đổ nghiêng, thân già vàng
for (let k = 0; k < 7; k++) {
  const z = Z1 + R() * (Z0 - Z1 - 10), side = R() < 0.5 ? -1 : 1;
  const x = pathX(z) + side * (2 + R() * 7);
  placements.push({ x, y: groundY(x, z), z, h: 9 + R() * 6, age: 0.95 + R() * 0.05, tilt: 0.7 + R() * 0.5, leanDir: (side > 0 ? 0 : Math.PI) + (R() - 0.5) * 1.2, near: true, noLeaves: true, fallen: true });
}

const grove = createBambooGrove(scene, placements, { ...LOOK, isMobile, leafDensity: isMobile ? 0.75 : 0.85, seed: 7 });
const U = grove.uniforms;

/* ---------------- mặt đất: lớp lá trúc khô ---------------- */
{
  const W = 2 * HALF + 40, L = Z0 - Z1 + 60;
  const g = new THREE.PlaneGeometry(W, L, isMobile ? 120 : 220, isMobile ? 200 : 360);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, (Z0 + Z1) / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const pathA = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) pathA[i] = 1 - THREE.MathUtils.smoothstep(Math.abs(p.getX(i) - pathX(p.getZ(i))), 0.5, 1.5);
  g.setAttribute('aPath', new THREE.BufferAttribute(pathA, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */ `
      attribute float aPath; varying float vPath; varying vec3 vW, vN;
      void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vN = normal; vPath = aPath; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      uniform float uExposure;
      ${BAMBOO_GLSL.NOISE}
      ${BAMBOO_GLSL.LIGHT}
      varying float vPath; varying vec3 vW, vN;
      vec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p)*43758.5453); }
      // một lớp lá rụng: mỗi ô một chiếc lá thuôn, hướng ngẫu nhiên
      float leafLayer(vec2 p, float seed, out vec3 lc, out float edge){
        vec2 c = floor(p), fp = fract(p);
        float best = 0.; lc = vec3(0.); edge = 0.;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
          vec2 o = vec2(float(i), float(j));
          vec2 h = h22(c + o + seed);
          vec2 d = fp - (o + h);
          float ang = h.x*6.2831 + seed;
          vec2 r = vec2(cos(ang)*d.x + sin(ang)*d.y, -sin(ang)*d.x + cos(ang)*d.y);
          float len = .62 + h.y*.25;
          float t = clamp(r.x/len, -1., 1.);
          float wd = .1*(1. - t*t)*(1. - .35*t);
          float m = smoothstep(wd, wd*.55, abs(r.y + .05*t*t))*step(abs(r.x), len);
          if (m > best){
            best = m;
            vec2 hh = h22(c + o + seed*3.1);
            lc = mix(vec3(.15, .095, .05), vec3(.3, .22, .12), hh.x)*(.6 + .4*hh.y);
            lc = mix(lc, vec3(.17, .17, .09), step(.9, hh.y)*.8);        // vài lá còn xanh úa
            edge = smoothstep(wd*.55, wd, abs(r.y))*m;
          }
        }
        return best;
      }
      void main(){
        vec3 n = normalize(vN);
        float dist = length(vW - cameraPosition);
        vec3 soil = mix(vec3(.06, .042, .026), vec3(.11, .08, .05), bfbm(vec3(vW.xz*.6, 1.)));
        vec3 col = soil;
        float detail = 1. - smoothstep(14., 40., dist);
        vec3 lc; float e, m;
        vec2 q = vW.xz*8.5;
        // ba lớp lá chồng lên nhau, lớp dưới tối hơn
        m = leafLayer(q, 1.7, lc, e);           col = mix(col, lc*.55, m*detail);
        m = leafLayer(q*1.13 + 3.1, 5.3, lc, e); col = mix(col*.8, lc*.8, m*detail); col *= 1. - e*.15;
        m = leafLayer(q*.91 + 7.7, 9.1, lc, e);  col = mix(col*.85, lc, m*detail*(1. - vPath*.75)); col *= 1. - e*.18;
        col = mix(col, vec3(.13, .095, .055)*(.7 + .5*bfbm(vec3(vW.xz*1.3, 2.))), 1. - detail*.85);
        // lối mòn: đất nén, lá vụn
        col = mix(col, vec3(.1, .075, .05)*(.7 + .6*bfbm(vec3(vW.xz*2.5, 3.))), vPath*.6);
        float sunVis = .22 + .78*dapple(vW);
        float ndl = max(dot(n, uSunDir), 0.);
        float ao = .65 + .35*bfbm(vec3(vW.xz*.35, 5.));
        vec3 c = col*(uSunCol*ndl*sunVis*.55 + mix(uGndCol, uSkyCol, .8)*ao);
        c *= uExposure;
        gl_FragColor = vec4(bambooFog(c, vW), 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  scene.add(new THREE.Mesh(g, mat));
}

/* ---------------- bầu trời: chỉ lộ qua kẽ tán ---------------- */
{
  const g = new THREE.SphereGeometry(200, 32, 16);
  const mat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position + cameraPosition*0., 1.); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir, uFogCol, uFogSunCol, uSkyCol; varying vec3 vD;
      void main(){
        vec3 d = normalize(vD);
        vec3 zen = vec3(.42, .5, .52);
        vec3 col = mix(uFogCol*1.3, zen, smoothstep(.0, .55, d.y));
        float s = max(dot(d, uSunDir), 0.);
        col += uFogSunCol*(pow(s, 8.)*.9 + pow(s, 120.)*3.);
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const sky = new THREE.Mesh(g, mat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  sky.onBeforeRender = () => sky.position.copy(camera.position);
  scene.add(sky);
}

/* ---------------- tia nắng xuyên sương + bụi lơ lửng ---------------- */
const shafts = new THREE.Group();
{
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U, uSeed: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uFogSunCol;
      ${BAMBOO_GLSL.NOISE}
      varying vec2 vUv; varying vec3 vW;
      void main(){
        float stripes = bn(vec3(vUv.x*9., vUv.y*.6, uTime*.05)) *.7 + bn(vec3(vUv.x*23., 1., uTime*.08))*.3;
        stripes = smoothstep(.45, .85, stripes);
        float fade = smoothstep(0., .25, vUv.y)*smoothstep(1., .55, vUv.y)*smoothstep(0., .2, vUv.x)*smoothstep(1., .8, vUv.x);
        float d = length(vW - cameraPosition);
        float a = stripes*fade*smoothstep(2., 9., d)*.07;
        gl_FragColor = vec4(uFogSunCol*a, 1.);
      }`
  });
  const sun = new THREE.Vector3(...LOOK.sunDir).normalize();
  for (let k = 0; k < 9; k++) {
    const z = -8 - k * 9 - R() * 4;
    const x = pathX(z) + (R() - 0.5) * 10;
    const h = 22;
    const g = new THREE.PlaneGeometry(6 + R() * 6, h);
    const m = new THREE.Mesh(g, mat);
    // tấm chứa hướng nắng: dựng đứng rồi nghiêng theo góc nắng
    m.position.set(x, groundY(x, z) + h * 0.5 - 1, z);
    const nrm = new THREE.Vector3(-sun.z, 0, sun.x).normalize();
    m.lookAt(m.position.clone().add(nrm));
    const horiz = new THREE.Vector3(sun.x, 0, sun.z).normalize();
    const elev = Math.asin(sun.y);
    // xoay trục dọc của tấm về phía mặt trời
    const target = horiz.clone().multiplyScalar(Math.cos(elev)).setY(Math.sin(elev));
    const cur = new THREE.Vector3(0, 1, 0).applyQuaternion(m.quaternion);
    m.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(cur, target));
    m.position.addScaledVector(target, 0);
    m.frustumCulled = false;
    shafts.add(m);
  }
  scene.add(shafts);

  const N = isMobile ? 500 : 1400;
  const pp = new Float32Array(N * 3), ps = new Float32Array(N);
  for (let i = 0; i < N; i++) { pp[i * 3] = (R() - 0.5) * 18; pp[i * 3 + 1] = R() * 7; pp[i * 3 + 2] = -R() * 30; ps[i] = R(); }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  dg.setAttribute('aS', new THREE.BufferAttribute(ps, 1));
  const dm = new THREE.ShaderMaterial({
    uniforms: { ...U, uCam: { value: new THREE.Vector3() }, uPR: { value: DPR } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aS; uniform float uTime, uPR; uniform vec3 uCam; varying float vA;
      void main(){
        vec3 p = position;
        p += vec3(sin(uTime*.2 + aS*40.)*.6, sin(uTime*.13 + aS*20.)*.4 + uTime*.04*(aS - .3), cos(uTime*.17 + aS*30.)*.6);
        // bọc quanh máy quay
        vec3 rel = p - uCam; rel.x = mod(rel.x + 9., 18.) - 9.; rel.z = mod(rel.z + 30., 30.) - 30.; rel.y = mod(rel.y + 1.5, 7.) - 1.5;
        vec4 mv = viewMatrix*vec4(uCam + rel, 1.);
        gl_Position = projectionMatrix*mv;
        gl_PointSize = (1. + aS*1.6)*uPR*6./max(.5, -mv.z);
        vA = smoothstep(26., 6., -mv.z)*smoothstep(.3, 2., -mv.z)*(.35 + .65*fract(aS*7.));
      }`,
    fragmentShader: `uniform vec3 uFogSunCol; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d)*vA*.5; gl_FragColor = vec4(uFogSunCol*a, 1.); }`
  });
  const dust = new THREE.Points(dg, dm);
  dust.frustumCulled = false;
  dust.onBeforeRender = () => dm.uniforms.uCam.value.copy(camera.position);
  scene.add(dust);
}

/* ---------------- hậu kỳ ---------------- */
const rt = new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType, samples: isMobile ? 0 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(DPR);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.32, 0.7, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: time, uRes: { value: new THREE.Vector2(innerWidth, innerHeight) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      // phân màu: bóng tối ngả lục lam, vùng sáng hơi ấm
      float l = dot(c, vec3(.299, .587, .114));
      c = mix(c, c*vec3(.92, 1.02, 1.04), smoothstep(.5, .0, l)*.6);
      vec2 q = vUv - .5;
      c *= 1. - dot(q, q)*.95;
      c += (h(vUv*uRes + fract(uTime)*91.) - .5)*.035;
      gl_FragColor = vec4(c, 1.);
    }`
});
composer.addPass(grade);

/* ---------------- máy quay: đi bộ chậm theo lối mòn, chuột để ngó ---------------- */
const look = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', (e) => {
  look.tx = (e.clientX / innerWidth - 0.5) * 2;
  look.ty = (e.clientY / innerHeight - 0.5) * 2;
});
let walk = 0, walkSpeed = 0.55;
addEventListener('wheel', (e) => { walk += e.deltaY * 0.004; }, { passive: true });

function placeCamera(t) {
  if (VIEW === 'culm') {
    // cận cảnh thân trúc để so với ảnh thật
    const z = -6, x = pathX(z);
    camera.position.set(x - 0.2, groundY(x, z) + 1.5, z + 0.5);
    camera.lookAt(x + 1.2, groundY(x, z) + 1.9, z - 4);
    return;
  }
  if (VIEW === 'macro') {
    // đứng sát một cây trúc (để so vỏ, mắt, phấn với ảnh chụp thật)
    const z = -10, x = pathX(z);
    let best = null, bd = 1e9;
    for (const p of placements) { if (p.fallen) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
    const dx = (x - best.x) / bd, dz = (z - best.z) / bd;
    camera.position.set(best.x + dx * 1.3 + dz * 0.25, best.y + 1.55, best.z + dz * 1.3 - dx * 0.25);
    camera.lookAt(best.x - dz * 0.5, best.y + 1.7, best.z + dx * 0.5);
    return;
  }
  if (VIEW === 'up') {
    const z = -14, x = pathX(z);
    camera.position.set(x, groundY(x, z) + 1.4, z);
    camera.lookAt(x + 0.4, groundY(x, z) + 14, z - 6);
    return;
  }
  const s = 10 - (t * walkSpeed + walk) % 95;
  const x = pathX(s);
  const bob = Math.sin(t * 1.9) * 0.025;
  camera.position.set(x, groundY(x, s) + 1.62 + bob, s);
  const ahead = s - 6;
  const yaw = look.x * 0.9, pitch = 0.16 - look.y * 0.45;
  const tx = pathX(ahead), tz = ahead;
  const dir = new THREE.Vector3(tx - x, 0, tz - s).normalize();
  dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
  camera.lookAt(x + dir.x * 6, camera.position.y + Math.tan(pitch) * 6, s + dir.z * 6);
}

/* ---------------- âm thanh: gió lùa lá trúc, thân trúc va nhau lộc cộc ---------------- */
let audio = null;
function startAudio() {
  if (audio) return;
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const len = ac.sampleRate * 4;
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048;
      d[i] = (b0 + b1 + b2 + w * 0.05) * 0.5;
    }
  }
  const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.6;
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300;
  const gain = ac.createGain(); gain.gain.value = 0;
  const master = ac.createGain(); master.gain.value = 0.9;
  src.connect(hp).connect(bp).connect(gain).connect(master).connect(ac.destination);
  src.start();
  master.gain.setValueAtTime(0, ac.currentTime);
  master.gain.linearRampToValueAtTime(0.9, ac.currentTime + 3);
  audio = { ac, gain, bp, master, nextKnock: ac.currentTime + 2 };
}
function knock(ac, when, dest) {
  // thân trúc rỗng chạm nhau: hai tiếng gõ gỗ ngắn
  for (let k = 0; k < (Math.random() < 0.6 ? 2 : 3); k++) {
    const t = when + k * (0.11 + Math.random() * 0.12);
    const o = ac.createOscillator(); o.type = 'sine';
    const f = 380 + Math.random() * 260; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.82, t + 0.12);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 + Math.random() * 0.06, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.16);
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; o.connect(g).connect(pan).connect(dest); } else o.connect(g).connect(dest);
    o.start(t); o.stop(t + 0.2);
  }
}
const soundBtn = document.getElementById('sound');
soundBtn?.addEventListener('click', () => {
  if (!audio) { startAudio(); soundBtn.setAttribute('aria-pressed', 'true'); soundBtn.querySelector('span').textContent = 'GIÓ: BẬT'; return; }
  const on = audio.ac.state === 'running';
  if (on) audio.ac.suspend(); else audio.ac.resume();
  soundBtn.setAttribute('aria-pressed', String(!on));
  soundBtn.querySelector('span').textContent = on ? 'GIÓ: TẮT' : 'GIÓ: BẬT';
});

/* ---------------- vòng lặp ---------------- */
const clock = new THREE.Clock();
let gustLevel = 1;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = FIXED_T ?? clock.elapsedTime;
  time.value = t;
  look.x += (look.tx - look.x) * Math.min(1, dt * 2.2);
  look.y += (look.ty - look.y) * Math.min(1, dt * 2.2);
  // cơn gió lớn thỉnh thoảng thổi qua
  gustLevel = 0.75 + 0.45 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.21) * Math.sin(t * 0.077 + 1), 2);
  U.uWind.value = gustLevel;
  placeCamera(t);
  if (audio) {
    const now = audio.ac.currentTime;
    audio.gain.gain.setTargetAtTime(0.12 + gustLevel * 0.35, now, 0.4);
    audio.bp.frequency.setTargetAtTime(900 + gustLevel * 1100, now, 0.6);
    if (now > audio.nextKnock) { knock(audio.ac, now + 0.05, audio.master); audio.nextKnock = now + 2.5 + Math.random() * 7 / gustLevel; }
  }
  if (DEBUG) { renderer.info.autoReset = false; renderer.info.reset(); }
  composer.render(dt);
  adapt(dt);
  if (FIXED_T == null) requestAnimationFrame(frame);
}

// máy yếu: sau vài giây đầu, nếu khung hình chậm thì hạ độ phân giải
let perfN = 0, perfT = 0, curDPR = DPR;
function adapt(dt) {
  if (FIXED_T != null || perfN < 0) return;
  perfN++;
  if (perfN > 30) perfT += dt;
  if (perfN === 150) {
    const avg = perfT / 120;
    if (avg > 0.024 && curDPR > 1) { curDPR = Math.max(1, curDPR * 0.7); }
    else if (avg > 0.024) { curDPR = 0.8; bloom.enabled = false; }
    if (curDPR !== DPR) { renderer.setPixelRatio(curDPR); composer.setPixelRatio(curDPR); composer.setSize(innerWidth, innerHeight); perfN = 0; perfT = 0; }
    else perfN = -1;
    if (curDPR <= 0.8) perfN = -1;
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  grade.uniforms.uRes.value.set(innerWidth, innerHeight);
});

if (DEBUG) { window.__bamboo = { scene, camera, renderer, grove, U, LOOK, frame, time }; console.log('stats', JSON.stringify(grove.stats), renderer.info.render.triangles); }
frame();
if (FIXED_T != null) { requestAnimationFrame(() => { frame(); window.__ready = true; if (DEBUG) console.log('tris', renderer.info.render.triangles, 'calls', renderer.info.render.calls); }); }
else { window.__ready = true; }
document.body.classList.add('ready');
