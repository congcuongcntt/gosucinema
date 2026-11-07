// Hiệu ứng linh dị: nén nhang 3D, khói, tia lửa, pháp trận, bùa chú bay (đốt được), ma trơi, sương đất, ngọn lửa theo con trỏ.
import * as THREE from 'three';
import { NOISE } from './shaders.js';

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

export function radialTexture(stops, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function sprite(map, size, intensity = 1, blending = THREE.AdditiveBlending) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map, color: new THREE.Color(intensity, intensity, intensity), blending, depthWrite: false, transparent: true, fog: false
  }));
  s.scale.set(size, size, 1);
  return s;
}

/* ======================================================================
   PHÁP TRẬN (sigil) — vẽ bằng canvas: vòng Bát quái, vạch độ, chữ Hán
   ====================================================================== */
function sigilTexture() {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  const ring = (r, w, dash) => { g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  ring(500, 6); ring(484, 2); ring(400, 3); ring(300, 2, [4, 10]); ring(170, 4); ring(150, 1.5);
  g.setLineDash([]);
  // vạch chia độ
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const r1 = i % 5 === 0 ? 456 : 470;
    g.lineWidth = i % 5 === 0 ? 3 : 1.5;
    g.beginPath(); g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a) * 484, Math.sin(a) * 484); g.stroke();
  }
  // 8 quẻ Bát quái (vẽ vạch liền / đứt)
  const tri = ['111', '011', '101', '001', '110', '010', '100', '000'];
  tri.forEach((code, i) => {
    g.save();
    g.rotate((i / 8) * Math.PI * 2);
    g.translate(0, -350);
    [...code].forEach((b, j) => {
      const y = -24 + j * 22;
      if (b === '1') g.fillRect(-44, y, 88, 12);
      else { g.fillRect(-44, y, 36, 12); g.fillRect(8, y, 36, 12); }
    });
    g.restore();
  });
  // chữ Hán quanh vòng trong
  g.font = '600 64px "Songti SC", "STSong", "Noto Serif SC", "Noto Serif CJK SC", "SimSun", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const glyphs = ['山', '河', '異', '錄', '欽', '天', '監', '鎮'];
  glyphs.forEach((ch, i) => {
    g.save();
    g.rotate((i / 8) * Math.PI * 2 + Math.PI / 8);
    g.translate(0, -236);
    g.fillText(ch, 0, 0);
    g.restore();
  });
  // ngôi sao 8 cánh ở tâm
  g.lineWidth = 2.5;
  for (let k = 0; k < 2; k++) {
    g.beginPath();
    for (let i = 0; i <= 4; i++) {
      const a = (i / 4) * Math.PI * 2 + (k * Math.PI) / 4;
      const x = Math.cos(a) * 150, y = Math.sin(a) * 150;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ======================================================================
   NÉN NHANG 3D
   ====================================================================== */
export function createIncense({ parent, base, length, sharedTime, pixelRatio, isMobile, reduceMotion }) {
  const group = new THREE.Group();
  group.position.copy(base);
  parent.add(group);

  // Thân nhang: ngà ở trên, nâu ở chân; đầu nhang có tàn tro + vùng đỏ rực
  const stickGeo = new THREE.CylinderGeometry(0.034, 0.04, 1, 12, 1);
  stickGeo.translate(0, 0.5, 0);
  const stickUniforms = { uLen: { value: length }, uLit: { value: 0 }, uHeat: { value: 0 }, uTime: sharedTime };
  const stick = new THREE.Mesh(stickGeo, new THREE.ShaderMaterial({
    uniforms: stickUniforms,
    vertexShader: /* glsl */ `varying float vY; varying vec3 vN;
      void main(){ vY = position.y; vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `uniform float uLen, uLit, uHeat, uTime; varying float vY; varying vec3 vN;
      void main(){
        float shade = .5 + .5*max(0., dot(vN, normalize(vec3(.5,.3,1.))));
        vec3 col = mix(vec3(.55,.36,.18), vec3(1.,.92,.78), smoothstep(0., .85, vY))*shade*.9;
        float tipD = (1. - vY)*uLen;
        float ash = 1. - smoothstep(0., .022, tipD);
        float hot = (1. - smoothstep(.015, .08, tipD))*uLit;
        col = mix(col, vec3(.42,.38,.35), ash*(1. - uLit*.5));
        col += vec3(2.6,.7,.12)*hot*(.85 + .15*sin(uTime*14.));
        // lửa hơ vào: đầu nhang ửng dần trước khi bén
        col += vec3(1.4,.3,.05)*(1. - smoothstep(.0, .05, tipD))*uHeat*(1. - uLit)*(.8 + .2*sin(uTime*20.));
        gl_FragColor = vec4(col, 1.);
      }`
  }));
  group.add(stick);

  // Đầu lửa
  const hotTex = radialTexture([[0, 'rgba(255,250,225,1)'], [0.25, 'rgba(255,160,70,.9)'], [0.6, 'rgba(210,40,20,.25)'], [1, 'rgba(150,20,10,0)']]);
  const auraTex = radialTexture([[0, 'rgba(255,120,50,.55)'], [0.4, 'rgba(200,40,20,.18)'], [1, 'rgba(120,10,10,0)']]);
  const core = sprite(hotTex, 0.16, 3);
  const aura = sprite(auraTex, 1.1, 1.6);
  group.add(aura, core);

  // Khói nhang: dải lụa uốn lượn (hạt GPU, cùng "thời điểm sinh" thì nằm trên cùng một đường cong)
  const SMOKE = isMobile ? 220 : 420;
  const sGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(SMOKE * 3);
  const sSeed = new Float32Array(SMOKE);
  const sPhase = new Float32Array(SMOKE);
  for (let i = 0; i < SMOKE; i++) { sSeed[i] = Math.random(); sPhase[i] = i / SMOKE; }
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('aSeed', new THREE.BufferAttribute(sSeed, 1));
  sGeo.setAttribute('aPhase', new THREE.BufferAttribute(sPhase, 1));
  const smokeU = {
    uTime: sharedTime, uLife: { value: 6.5 }, uSurge: { value: 0 }, uLit: { value: 0 },
    uTip: { value: new THREE.Vector3(0, length, 0) }, uPR: { value: pixelRatio }
  };
  const smoke = new THREE.Points(sGeo, new THREE.ShaderMaterial({
    uniforms: smokeU,
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute float aPhase;
      uniform float uTime, uLife, uSurge, uLit, uPR; uniform vec3 uTip;
      varying float vA; varying float vTint; varying float vK;
      void main(){
        float tt = uTime + aPhase*uLife;
        float age = mod(tt, uLife);
        float birth = tt - age;
        float k = age/uLife;
        float h = age*(.3 + uSurge*.35);
        float sway = sin(birth*.55 + age*1.9 + aSeed*.5)*.09*(.15 + h*1.5)
                   + sin(birth*1.3 - age*3.2)*.035*h;
        vec3 p = uTip + vec3(sway + h*h*.035, h, cos(birth*.7 + age*1.3)*.06*h);
        p.xz += (vec2(aSeed, fract(aSeed*7.31)) - .5)*(.006 + h*.1*(1. + uSurge*2.5));
        vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_Position = projectionMatrix*mv;
        gl_PointSize = (16. + 230.*k*k + uSurge*120.*k)*uPR/max(.5, -mv.z);
        vA = smoothstep(0., .05, k)*(1. - smoothstep(.4, 1., k))*uLit;
        vTint = step(.6, aSeed);
        vK = k;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uSurge;
      varying float vA; varying float vTint; varying float vK;
      void main(){
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, 0., d); a *= a;
        vec3 ivory = vec3(.95,.88,.75);
        vec3 crimson = vec3(1.,.32,.18);
        vec3 col = mix(ivory, crimson, vTint*(.6 + .4*vK));
        gl_FragColor = vec4(col*(1.2 + uSurge*.8), a*vA*(.55 + uSurge*.3));
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  smoke.frustumCulled = false;
  group.add(smoke);

  // Tia lửa khi thắp
  const SPARKS = isMobile ? 50 : 90;
  const kGeo = new THREE.BufferGeometry();
  const kVel = new Float32Array(SPARKS * 3);
  const kSeed = new Float32Array(SPARKS);
  for (let i = 0; i < SPARKS; i++) {
    const a = Math.random() * Math.PI * 2;
    const up = 0.35 + Math.random() * 0.9;
    const sp = 0.6 + Math.random() * 1.8;
    kVel[i * 3] = Math.cos(a) * sp * 0.8;
    kVel[i * 3 + 1] = up * sp;
    kVel[i * 3 + 2] = Math.sin(a) * sp * 0.5;
    kSeed[i] = Math.random();
  }
  kGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
  kGeo.setAttribute('aVel', new THREE.BufferAttribute(kVel, 3));
  kGeo.setAttribute('aSeed', new THREE.BufferAttribute(kSeed, 1));
  const sparkU = { uTime: sharedTime, uBurst: { value: -100 }, uTip: smokeU.uTip, uPR: { value: pixelRatio } };
  const sparks = new THREE.Points(kGeo, new THREE.ShaderMaterial({
    uniforms: sparkU,
    vertexShader: /* glsl */ `
      attribute vec3 aVel; attribute float aSeed;
      uniform float uTime, uBurst, uPR; uniform vec3 uTip;
      varying float vA; varying float vK;
      void main(){
        float age = uTime - uBurst;
        float life = .6 + aSeed*1.1;
        float k = clamp(age/life, 0., 1.);
        vec3 p = uTip + aVel*age*(1. - .45*min(age, 1.)) + vec3(0., -1.1*age*age, 0.);
        vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_Position = projectionMatrix*mv;
        gl_PointSize = (3. + aSeed*5.)*(1. - k*.7)*uPR*14./max(.5, -mv.z);
        vA = (age > 0. && age < life) ? (1. - k) : 0.;
        vK = k;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA; varying float vK;
      void main(){
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, 0., d);
        vec3 col = mix(vec3(3.,2.4,1.5), vec3(2.2,.5,.1), vK);
        gl_FragColor = vec4(col, a*vA);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  sparks.frustumCulled = false;
  group.add(sparks);

  // Sóng xung kích vàng
  const ringU = { uProg: { value: 1 } };
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96), new THREE.ShaderMaterial({
    uniforms: ringU,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uProg; void main(){ float a = (1. - uProg)*(1. - uProg); gl_FragColor = vec4(vec3(1.6,1.05,.5), a*.7); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  }));
  group.add(ring);

  // Trạng thái
  const BURN_S = 45;
  // Nhang cắm sẵn nhưng CHƯA thắp: chỉ bén lửa khi đưa ngọn lửa tới đầu nhang và bấm
  const st = { lit: false, burn: 0, surge: 0, flare: 0, intensity: 0, burstAt: -100, out: true, heat: 0, heatTarget: 0 };
  const tip = new THREE.Vector3(0, length, 0);
  const tmp = new THREE.Vector3();

  function light(t) {
    st.lit = true;
    st.out = false;
    st.burn = 0;
    st.surge = 1;
    st.flare = 1;
    st.burstAt = t;
    sparkU.uBurst.value = t;
    ringU.uProg.value = 0;
  }

  function update(dt, t, { visible, camera }) {
    if (st.lit && visible) {
      st.burn = Math.min(1, st.burn + dt / BURN_S);
      if (st.burn >= 1) { st.lit = false; st.out = true; }
    }
    const len = length * (1 - st.burn * 0.72);
    stick.scale.y = len;
    stickUniforms.uLen.value = len;
    tip.set(0, len, 0);
    smokeU.uTip.value.copy(tip);

    const target = st.lit ? Math.max(0.12, Math.pow(1 - st.burn, 1.25)) : 0;
    st.intensity = damp(st.intensity, target, st.lit ? 6 : 1.4, dt);
    st.surge = damp(st.surge, 0, 0.9, dt);
    st.flare = damp(st.flare, 0, 2.6, dt);
    st.heat = damp(st.heat, st.heatTarget, st.heatTarget > st.heat ? 3 : 2, dt);
    stickUniforms.uHeat.value = st.heat;
    stickUniforms.uLit.value = st.intensity;
    smokeU.uLit.value = Math.min(1, st.intensity * 1.2 + st.surge + st.heat * 0.22);
    smokeU.uSurge.value = st.surge;

    const flick = reduceMotion ? 1 : 0.86 + Math.sin(t * 11) * 0.07 + Math.sin(t * 23.7) * 0.05;
    core.position.copy(tip);
    aura.position.copy(tip);
    const out = st.lit ? 0 : st.heat * (0.55 + 0.25 * Math.sin(t * 19)); // đốm than ửng lên khi hơ lửa
    core.scale.setScalar((0.42 + st.flare * 0.45) * (st.intensity * flick + out * 0.7) + 0.001);
    aura.scale.setScalar((2.2 + st.flare * 1.8) * (st.intensity * flick + out * 0.5) + 0.001);
    core.material.opacity = Math.min(1, st.intensity + out * 0.6 + st.flare);
    aura.material.opacity = Math.min(1, st.intensity * 0.9 + out * 0.35 + st.flare * 0.3);

    ringU.uProg.value = Math.min(1, ringU.uProg.value + dt / 0.9);
    ring.visible = ringU.uProg.value < 1;
    ring.position.copy(tip);
    ring.scale.setScalar(0.05 + ringU.uProg.value * 2.6);
    if (camera) ring.quaternion.copy(camera.quaternion);
  }

  return {
    group, light, update, state: st,
    tipWorld: () => group.localToWorld(tmp.copy(tip)),
    tipLocal: () => tip
  };
}

/* ======================================================================
   PHÁP TRẬN sau tiêu đề — mờ & quay chậm, bùng sáng khi thắp hương
   ====================================================================== */
export function createSigil({ parent, position, size }) {
  const u = { uMap: { value: sigilTexture() }, uOpacity: { value: 0.07 }, uColor: { value: new THREE.Color(1.6, 0.75, 0.32) } };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv;
      void main(){ float a = texture2D(uMap, vUv).a; gl_FragColor = vec4(uColor, a*uOpacity); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  m.position.copy(position);
  m.scale.setScalar(size);
  parent.add(m);
  let pulse = 0;
  return {
    mesh: m,
    pulse() { pulse = 1; },
    update(dt, t) {
      pulse = damp(pulse, 0, 1.1, dt);
      m.rotation.z = t * 0.05 + pulse * 0.8;
      m.scale.setScalar(size * (1 + pulse * 0.55));
      u.uOpacity.value = 0.07 + Math.sin(t * 0.8) * 0.02 + pulse * 0.5;
      u.uColor.value.setRGB(1.3 + pulse * 0.3, 0.62 + pulse * 0.15, 0.26);
    }
  };
}

/* ======================================================================
   BÙA CHÚ BAY — InstancedMesh, toàn bộ chuyển động trên GPU
   ====================================================================== */
function talismanAtlas() {
  const W = 160, H = 440, V = 3;
  const c = document.createElement('canvas');
  c.width = W * V;
  c.height = H;
  const g = c.getContext('2d');
  const texts = [['勅', '令', '鎮', '煞'], ['五', '雷', '驅', '邪'], ['欽', '天', '符', '印']];
  for (let v = 0; v < V; v++) {
    const x0 = v * W;
    const grd = g.createLinearGradient(x0, 0, x0, H);
    grd.addColorStop(0, '#e2c174');
    grd.addColorStop(1, '#b98a3c');
    g.fillStyle = grd;
    g.fillRect(x0, 0, W, H);
    // vết ố
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(90,50,10,${Math.random() * 0.12})`;
      const r = Math.random() * 7;
      g.beginPath(); g.arc(x0 + Math.random() * W, Math.random() * H, r, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = '#b3160f';
    g.lineWidth = 5; g.strokeRect(x0 + 10, 10, W - 20, H - 20);
    g.lineWidth = 2; g.strokeRect(x0 + 20, 20, W - 40, H - 40);
    g.fillStyle = '#b3160f';
    g.font = '700 58px "Songti SC", "STSong", "Noto Serif SC", "SimSun", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    texts[v].forEach((ch, i) => g.fillText(ch, x0 + W / 2, 70 + i * 82));
    // nét bùa ngoằn ngoèo
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(x0 + W / 2, 380);
    for (let i = 0; i < 6; i++) g.quadraticCurveTo(x0 + 30 + Math.random() * 100, 360 - i * 8 + Math.random() * 30, x0 + W / 2 + (Math.random() - 0.5) * 60, 400 - i * 4);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function createTalismans({ scene, spots, perShot, sharedTime, fog, pixelRatio }) {
  const count = spots.length * perShot;
  const PW = 0.42, PH = 1.16;
  const BURN = 2.6, REFORM_AT = 13, REFORM = 2.2;   // giây: cháy hết · bắt đầu tụ lại · thời gian tụ
  const geo = new THREE.PlaneGeometry(PW, PH, 4, 12);
  const seeds = new Float32Array(count);
  const variants = new Float32Array(count);
  const burnAt = new Float32Array(count).fill(-1e4);
  const hit = new Float32Array(count * 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: talismanAtlas() }, uTime: sharedTime, uFogColor: { value: fog.color }, uFogNear: { value: fog.near }, uFogFar: { value: fog.far },
      uBurn: { value: BURN }, uReformAt: { value: REFORM_AT }, uReform: { value: REFORM }
    },
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute float aVariant; attribute float aBurnAt; attribute vec2 aHit;
      uniform float uTime, uBurn;
      varying vec2 vUv; varying vec2 vLocal; varying float vDepth; varying float vSeed; varying float vAge; varying vec2 vHit;
      mat3 rY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
      mat3 rZ(float a){ float c=cos(a), s=sin(a); return mat3(c,s,0., -s,c,0., 0.,0.,1.); }
      void main(){
        vLocal = uv;
        vUv = vec2((uv.x + aVariant)/3., uv.y);
        vSeed = aSeed;
        vAge = uTime - aBurnAt;
        vHit = aHit;
        float t = uTime*(.22 + aSeed*.22) + aSeed*40.;
        vec3 p = position;
        p.z += sin(uv.y*4.5 + t*3.2)*.07*(1.1 - uv.y*.4);
        p.x += sin(uv.y*2.7 + t*2.1)*.02;
        // giấy quăn lại khi bén lửa
        float burning = step(0., vAge)*(1. - smoothstep(uBurn, uBurn + .4, vAge));
        float near = 1. - smoothstep(0., .5, length(position.xy - aHit));
        p.z += burning*(sin(uv.y*9. + uTime*14.)*.03 + near*.12*smoothstep(0., .6, vAge));
        p = rZ(sin(t*.7)*.3)*p;
        p = rY(t*.55 + aSeed*6.283)*p;
        vec3 drift = vec3(sin(t*.31)*1.6, sin(t*.23 + aSeed*3.)*1.1, cos(t*.27)*1.4);
        vec4 world = instanceMatrix*vec4(p + drift, 1.);
        vec4 mv = modelViewMatrix*world;
        vDepth = -mv.z;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform float uTime, uBurn, uReformAt, uReform;
      uniform vec3 uFogColor; uniform float uFogNear, uFogFar;
      varying vec2 vUv; varying vec2 vLocal; varying float vDepth; varying float vSeed; varying float vAge; varying vec2 vHit;
      ${NOISE}
      void main(){
        // mép dưới cháy xém sẵn, lập loè than hồng
        float n = fbm(vLocal*vec2(6., 3.) + vSeed*9.);
        float burnLine = .1 + n*.12 + vSeed*.08;
        float d = vLocal.y - burnLine;
        if (d < 0.) discard;

        // vệt cháy lan ra từ chỗ ngọn lửa chạm (lên trên nhanh hơn), rồi tụ lại như cũ
        vec2 pl = (vLocal - .5)*vec2(${PW.toFixed(2)}, ${PH.toFixed(2)});
        vec2 dv = pl - vHit;
        dv.y *= dv.y > 0. ? .62 : 1.15;
        float n2 = fbm(vLocal*vec2(7., 4.) + vSeed*13. + 3.);
        float dist = length(dv) + (n2 - .5)*.16;
        float R = -1.;
        if (vAge >= 0.) {
          R = 1.45*pow(clamp(vAge/uBurn, 0., 1.), 1.25) - .02;
          R *= 1. - smoothstep(uReformAt, uReformAt + uReform, vAge);
        }
        float front = dist - R;
        if (front < 0.) discard;

        vec3 col = texture2D(uMap, vUv).rgb;
        float glyph = smoothstep(.25, .05, col.g)*step(.4, col.r);
        col *= gl_FrontFacing ? .62 : .38;
        col += vec3(1.,.18,.06)*glyph*(.35 + .35*sin(uTime*1.7 + vSeed*20.));
        float edge = 1. - smoothstep(0., .05, d);
        col = mix(col, vec3(.08,.04,.02), smoothstep(.0, .09, .09 - d)*.9);
        col += vec3(2.4,.6,.1)*edge*edge*(.6 + .4*sin(uTime*7. + vLocal.x*20.));

        if (vAge >= 0. && vAge < uReformAt + uReform) {
          float reforming = smoothstep(uReformAt, uReformAt + .3, vAge);
          float fl = .7 + .3*sin(uTime*13. + vLocal.x*30. + vLocal.y*17.);
          float scorch = 1. - smoothstep(0., .1, front);
          float rim = 1. - smoothstep(0., .022, front);
          col = mix(col, vec3(.05,.025,.01), scorch*.92);
          vec3 fire = mix(vec3(3.2,1.1,.25), vec3(.4,2.2,1.8), reforming); // khi tụ lại: mép sáng xanh ngọc
          col += fire*rim*fl;
          col += vec3(.9,.25,.05)*(1. - smoothstep(0., .3, front))*(1. - reforming)*.5*fl;
          // hơi nóng: cả tờ bùa ửng đỏ lúc đang cháy
          col += vec3(.15,.04,.01)*(1. - smoothstep(0., uBurn, vAge));
        }
        float fog = smoothstep(uFogNear, uFogFar, vDepth);
        col = mix(col, uFogColor, fog);
        gl_FragColor = vec4(col, 1. - fog*.6);
      }`,
    side: THREE.DoubleSide,
    transparent: true
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m4 = new THREE.Matrix4();
  const bases = [];
  let i = 0;
  const P = new THREE.Vector3();
  spots.forEach(({ a, c }) => {
    for (let k = 0; k < perShot; k++, i++) {
      const side = k % 2 ? 1 : -1;
      // nửa số bùa lơ lửng giữa máy quay và chủ thể (lệch hai bên khung), nửa còn lại phía sau
      const near = k < perShot / 2;
      P.copy(a).lerp(c, near ? 0.35 + Math.random() * 0.3 : -0.25 - Math.random() * 0.4);
      const spread = near ? 3.5 + Math.random() * 4 : 6 + Math.random() * 10;
      const b = new THREE.Vector3(P.x + side * spread, P.y - 1.5 + Math.random() * 5, P.z);
      bases.push(b);
      m4.makeTranslation(b.x, b.y, b.z);
      mesh.setMatrixAt(i, m4);
      seeds[i] = Math.random();
      variants[i] = Math.floor(Math.random() * 3);
    }
  });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geo.setAttribute('aVariant', new THREE.InstancedBufferAttribute(variants, 1));
  const burnAttr = new THREE.InstancedBufferAttribute(burnAt, 1).setUsage(THREE.DynamicDrawUsage);
  const hitAttr = new THREE.InstancedBufferAttribute(hit, 2).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aBurnAt', burnAttr);
  geo.setAttribute('aHit', hitAttr);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const ash = createAsh({ scene, pixelRatio });

  // Bản sao chuyển động GPU trên CPU để biết bùa đang ở đâu trên màn hình
  const C = new THREE.Vector3(), S = new THREE.Vector3(), X = new THREE.Vector3(), Q = new THREE.Vector3();
  function center(idx, t, out, ax) {
    const s = seeds[idx];
    const tt = t * (0.22 + s * 0.22) + s * 40;
    const ry = tt * 0.55 + s * 6.283;
    out.copy(bases[idx]).add(Q.set(Math.sin(tt * 0.31) * 1.6, Math.sin(tt * 0.23 + s * 3) * 1.1, Math.cos(tt * 0.27) * 1.4));
    if (ax) ax.set(Math.cos(ry), 0, -Math.sin(ry));
    return ry;
  }

  /** thử đốt: (px, py) là toạ độ màn hình của ngọn lửa/ngón tay. Trả về số bùa vừa bén lửa */
  function probe(px, py, t, camera, W, H) {
    let lit = 0;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    for (let k = 0; k < count; k++) {
      if (t - burnAt[k] < REFORM_AT + REFORM) continue;
      center(k, t, C, X);
      S.copy(C).applyMatrix4(camera.matrixWorldInverse);
      const depth = -S.z;
      if (depth < 1.5 || depth > 34) continue;
      S.copy(C).project(camera);
      const sx = (S.x * 0.5 + 0.5) * W, sy = (-S.y * 0.5 + 0.5) * H;
      const ppu = H / (2 * depth * tanH);          // px trên mỗi đơn vị thế giới ở độ sâu này
      const face = Math.max(0.3, Math.abs(X.dot(Q.set(1, 0, 0).applyQuaternion(camera.quaternion))));
      const hw = (PW / 2) * ppu * face + 16, hh = (PH / 2) * ppu * 0.95 + 12; // nới vùng chạm cho dễ đốt
      const dx = px - sx, dy = py - sy;
      if (Math.abs(dx) > hw || Math.abs(dy) > hh) continue;
      burnAt[k] = t;
      hit[k * 2] = THREE.MathUtils.clamp(dx / ppu / face, -PW / 2, PW / 2);
      hit[k * 2 + 1] = THREE.MathUtils.clamp(-dy / ppu, -PH / 2, PH / 2);
      for (let e = 0; e < 14; e++) ash.spawn(C.x + X.x * hit[k * 2], C.y + hit[k * 2 + 1], C.z + X.z * hit[k * 2], 1);
      lit++;
    }
    if (lit) { burnAttr.needsUpdate = true; hitAttr.needsUpdate = true; }
    return lit;
  }

  const acc = new Float32Array(count);
  function update(dt, t) {
    for (let k = 0; k < count; k++) {
      const age = t - burnAt[k];
      if (age < 0 || age > BURN + 0.6) continue;
      // tro rơi từ đường cháy đang lan
      acc[k] += dt * (age < BURN ? 55 : 12);
      let n = Math.floor(acc[k]);
      if (!n) continue;
      acc[k] -= n;
      center(k, t, C, X);
      const R = 1.45 * Math.pow(Math.min(1, age / BURN), 1.25);
      while (n--) {
        const a = Math.random() * Math.PI * 2;
        const r = R * (0.85 + Math.random() * 0.2);
        const lx = hit[k * 2] + Math.cos(a) * r;
        const ly = hit[k * 2 + 1] + Math.sin(a) * r * (Math.sin(a) > 0 ? 1.6 : 0.87);
        if (Math.abs(lx) > PW / 2 || Math.abs(ly) > PH / 2) continue;
        ash.spawn(C.x + X.x * lx, C.y + ly, C.z + X.z * lx, Math.random() < 0.18 ? 1 : 0);
      }
    }
    ash.update(dt, t);
  }

  return { mesh, probe, update, bases };
}

/* ======================================================================
   MA TRƠI — đốm lửa xanh ngọc lang thang, có đuôi, chập chờn hiện/tắt
   ====================================================================== */
export function createGhostFire({ scene, spots, perShot, sharedTime, pixelRatio }) {
  const TRAIL = 18;
  const n = spots.length * perShot * TRAIL;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const trail = new Float32Array(n);
  let j = 0;
  const P = new THREE.Vector3();
  spots.forEach(({ a, c }) => {
    for (let w = 0; w < perShot; w++) {
      const s = Math.random();
      P.copy(a).lerp(c, 0.15 + Math.random() * 0.45);
      const bx = P.x + (w % 2 ? 1 : -1) * (4 + Math.random() * 6);
      const by = P.y - 1.8 + Math.random() * 3.5;
      const bz = P.z;
      for (let k = 0; k < TRAIL; k++, j++) {
        pos[j * 3] = bx; pos[j * 3 + 1] = by; pos[j * 3 + 2] = bz;
        seed[j] = s;
        trail[j] = k / TRAIL;
      }
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aTrail', new THREE.BufferAttribute(trail, 1));
  const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { uTime: sharedTime, uPR: { value: pixelRatio } },
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute float aTrail;
      uniform float uTime, uPR;
      varying float vA; varying float vHead;
      vec3 path(float t, float s){
        return vec3(sin(t*.41 + s*6.)*2.4 + sin(t*1.13 + s)*.6,
                    sin(t*.53 + s*3.)*1.3 + sin(t*1.7 + s*2.)*.35,
                    cos(t*.37 + s*5.)*2.2);
      }
      void main(){
        float t = uTime*(.55 + aSeed*.5) - aTrail*.6;
        vec3 p = position + path(t, aSeed*10.);
        p.y += aTrail*aTrail*.5;
        vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_Position = projectionMatrix*mv;
        float flick = .7 + .3*sin(uTime*(8. + aSeed*6.) + aSeed*20.);
        float vis = smoothstep(.25, .7, sin(uTime*.21 + aSeed*12.)*.5 + .5);
        vHead = 1. - step(.01, aTrail);
        vA = (1. - aTrail)*(1. - aTrail)*flick*vis*(1. - smoothstep(35., 70., -mv.z));
        gl_PointSize = (vHead > .5 ? 420. : 240.*(1. - aTrail) + 30.)*uPR/max(1., -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA; varying float vHead;
      void main(){
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, 0., d); a *= a;
        vec3 col = mix(vec3(.15,.95,.8), vec3(.8,1.,1.), a*vHead);
        gl_FragColor = vec4(col*(1.3 + vHead), a*vA*.8);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  pts.frustumCulled = false;
  scene.add(pts);
  return pts;
}

/* ======================================================================
   SƯƠNG ĐẤT — lớp sương xanh ngọc trôi dưới mỗi cảnh
   ====================================================================== */
export function createGroundMist({ scene, anchors, sharedTime, fog }) {
  const geo = new THREE.PlaneGeometry(1, 1);
  anchors.forEach((a, i) => {
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { uTime: sharedTime, uSeed: { value: i * 3.7 }, uFogColor: { value: fog.color }, uFogNear: { value: fog.near }, uFogFar: { value: fog.far + 20 } },
      vertexShader: `varying vec2 vUv; varying float vDepth; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vDepth = -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uSeed; uniform vec3 uFogColor; uniform float uFogNear, uFogFar;
        varying vec2 vUv; varying float vDepth;
        ${NOISE}
        void main(){
          vec2 p = vUv*6. + uSeed;
          float n = fbm(p + vec2(uTime*.03, uTime*.012));
          n = fbm(p*1.4 + n*2. - vec2(uTime*.02, 0.));
          float mask = smoothstep(.5, .15, length(vUv - .5));
          float a = smoothstep(.35, .85, n)*mask*.5;
          vec3 col = mix(vec3(.16,.24,.23), vec3(.42,.5,.47), n);
          float f = smoothstep(uFogNear, uFogFar, vDepth);
          gl_FragColor = vec4(mix(col, uFogColor, f), a*(1. - f*.7));
        }`,
      transparent: true, depthWrite: false
    }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(a.x, a.y - 5.2, a.z - 4);
    m.scale.set(70, 56, 1);
    scene.add(m);
  });
}

/* ======================================================================
   NGỌN LỬA theo con trỏ — "hồn đăng": lửa nhỏ chân xanh ngọc, nghiêng theo
   hướng di chuyển, toé tàn lửa. Dùng để thắp nhang và đốt bùa.
   ====================================================================== */
export function createCursorFlame({ scene, camera, canvas, pixelRatio, reduceMotion }) {
  const D = 6;                         // khoảng cách ngọn lửa trước máy quay
  // Khung vẽ rộng hơn thân lửa để lưỡi lửa có chỗ uốn, tách ngọn
  const FH = 0.14, FW = 0.087, BASE = 0.1; // BASE: phần khung dưới chân lửa (cho đáy tròn mềm)
  const geo = new THREE.PlaneGeometry(FW, FH, 6, 24);
  geo.translate(0, FH * 0.5 - FH * BASE, 0); // chân lửa nằm ngay điểm con trỏ
  const u = {
    uTime: { value: 0 }, uAlpha: { value: 0 }, uFlare: { value: 0 },
    uBend: { value: new THREE.Vector2() }, uH: { value: 1 }, uFH: { value: FH }, uBaseK: { value: BASE }
  };
  const flame = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */ `
      uniform vec2 uBend; uniform float uH, uFH, uBaseK; varying vec2 vUv;
      void main(){
        vUv = uv;
        vec3 p = position;
        float y = max(0., (uv.y - uBaseK)/(1. - uBaseK));   // 0 ở chân, 1 ở đỉnh
        p.y = (p.y)*mix(1., uH, step(0., p.y));             // thở: chỉ kéo phần trên chân
        // thân lửa uốn theo lò xo: chân bám con trỏ, ngọn trễ lại và lắc lư
        // uốn cong bằng cách xoay dần quanh chân (giữ chiều dài, không bị kéo thành vệt)
        float w = y*(1.6 - .6*y);
        float a = -uBend.x*w;
        float c = cos(a), sn = sin(a);
        p.y *= 1. + uBend.y*.6*y;
        p.xy = mat2(c, sn, -sn, c)*p.xy;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uAlpha, uFlare, uBaseK; varying vec2 vUv;
      ${NOISE}
      void main(){
        float y = (vUv.y - uBaseK)/(1. - uBaseK);          // <0 dưới chân
        float x = (vUv.x - .5)*2.;                          // -1..1
        float t = uTime;
        // nhiễu cuộn lên trên (hai lớp, tốc độ khác nhau) + uốn miền theo chiều cao
        float n1 = fbm(vec2(x*1.2, y*1.6 - t*1.5));
        float n2 = vnoise(vec2(x*2.2 + 7., y*2.8 - t*2.4));
        float warp = (n1 - .5)*.42*smoothstep(0., 1., y) + (n2 - .5)*.1*y;
        float xx = x + warp;
        // mặt cắt giọt nước: đáy tròn, thắt dần về ngọn
        float yb = clamp(y, -.12, 1.);
        float wid = .62*pow(max(0., 1. - yb), .55)*sqrt(clamp((yb + .12)/.3, 0., 1.));
        float d = abs(xx)/max(wid, .001);
        // mật độ: lõi đặc, càng lên cao nhiễu càng ăn mòn → lưỡi lửa tách, đứt ngọn
        float dens = 1. - d;
        dens -= (n1*1.1 + n2*.25 - .55)*smoothstep(.2, 1., y)*.8;
        dens -= smoothstep(.55, 1.05, y)*.55;
        dens = clamp(dens, 0., 1.);
        dens *= smoothstep(-.14, .02, y);                   // đáy mềm
        float heat = pow(dens, 1.35)*(1. - .55*y)*(1. - .4*smoothstep(.0, .35, abs(xx)/max(wid, .001)));
        // dải màu vật đen: đỏ thẫm → cam → vàng → trắng ngà
        vec3 col = vec3(.55,.05,.01);
        col = mix(col, vec3(1.,.32,.05), smoothstep(.05, .35, heat));
        col = mix(col, vec3(1.,.66,.2), smoothstep(.3, .62, heat));
        col = mix(col, vec3(1.,.93,.72), smoothstep(.62, .92, heat));
        // chân lửa xanh ngọc mờ (hồn đăng), chỉ ở mép đáy
        float foot = (1. - smoothstep(-.02, .2, y))*smoothstep(.0, .5, dens)*(1. - smoothstep(.55, .95, heat));
        col = mix(col, vec3(.15,.75,.8), foot*.8);
        float a = smoothstep(0., .6, dens);
        a *= a;
        gl_FragColor = vec4(col*(1.05 + uFlare*1.4), a*uAlpha*.9);
      }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
  }));
  flame.renderOrder = 20;
  flame.frustumCulled = false;
  scene.add(flame);

  const halo = sprite(radialTexture([[0, 'rgba(255,200,120,.7)'], [0.3, 'rgba(255,110,40,.22)'], [1, 'rgba(120,20,10,0)']]), 0.9, 1);
  halo.material.depthTest = false;
  halo.renderOrder = 19;
  scene.add(halo);

  // tàn lửa bốc lên từ ngọn
  const N = 48;
  const pos = new Float32Array(N * 3);
  const life = new Float32Array(N);       // 0..1, >=1 là chết
  const vel = new Float32Array(N * 3);
  const dur = new Float32Array(N);
  life.fill(1);
  const geoE = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const lifeAttr = new THREE.BufferAttribute(life, 1).setUsage(THREE.DynamicDrawUsage);
  geoE.setAttribute('position', posAttr);
  geoE.setAttribute('aLife', lifeAttr);
  const embers = new THREE.Points(geoE, new THREE.ShaderMaterial({
    uniforms: { uPR: { value: pixelRatio }, uAlpha: u.uAlpha },
    vertexShader: `attribute float aLife; uniform float uPR; varying float vK;
      void main(){ vK = aLife; vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv;
        gl_PointSize = aLife >= 1. ? 0. : (4.*(1. - aLife) + 1.)*uPR*6./max(.5, -mv.z); }`,
    fragmentShader: `uniform float uAlpha; varying float vK;
      void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d);
        vec3 c = mix(vec3(3.,1.9,.8), vec3(1.8,.35,.08), vK);
        gl_FragColor = vec4(c, a*(1. - vK)*uAlpha); }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
  }));
  embers.renderOrder = 21;
  embers.frustumCulled = false;
  scene.add(embers);

  const ndc = new THREE.Vector2(0, 0);
  const sm = new THREE.Vector2(0, 0);
  const prevSm = new THREE.Vector2(0, 0);
  const cur = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const up = new THREE.Vector3();
  const right = new THREE.Vector3();
  const screen = { x: -1e4, y: -1e4 };
  let active = false, alpha = 0, init = false, flare = 0, spawnAcc = 0, next = 0;
  // lò xo cho ngọn lửa (đơn vị: chiều cao ngọn lửa)
  const bend = new THREE.Vector2(), bendV = new THREE.Vector2(), bendT = new THREE.Vector2();
  let breathe = 1;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (!init) { sm.copy(ndc); prevSm.copy(ndc); init = true; }
    // chỉ cháy trên nền 3D (và điểm thắp nhang); rê lên thẻ chữ/nút thì lửa lụi, hiện con trỏ thường
    active = e.target === canvas || !!e.target.closest?.('.incense-anchor');
  }, { passive: true });
  document.addEventListener('pointerleave', () => { active = false; });
  addEventListener('blur', () => { active = false; });

  function emit(n, speed = 1) {
    for (let k = 0; k < n; k++) {
      const i = next; next = (next + 1) % N;
      const o = i * 3;
      const tx = bend.x * FH * 0.8, ty = FH * 0.62;
      pos[o] = cur.x + up.x * ty + right.x * tx; pos[o + 1] = cur.y + up.y * ty + right.y * tx; pos[o + 2] = cur.z + up.z * ty + right.z * tx;
      const side = (Math.random() - 0.5) * 0.12 * speed;
      const rise = (0.1 + Math.random() * 0.2) * speed;
      vel[o] = up.x * rise + right.x * side; vel[o + 1] = up.y * rise + right.y * side; vel[o + 2] = up.z * rise + right.z * side;
      life[i] = 0;
      dur[i] = 0.5 + Math.random() * 0.8;
    }
  }

  return {
    /** toạ độ màn hình (px) của chân ngọn lửa — điểm "chạm" */
    screen,
    get active() { return alpha > 0.4; },
    flare(k = 1) { flare = Math.max(flare, k); },
    inspect: 1, // debug: phóng to để soi hình dạng lửa
    update(dt, t) {
      sm.x = damp(sm.x, ndc.x, 22, dt);
      sm.y = damp(sm.y, ndc.y, 22, dt);
      const vx = dt > 0 ? (sm.x - prevSm.x) / dt : 0;
      const vy = dt > 0 ? (sm.y - prevSm.y) / dt : 0;
      prevSm.copy(sm);
      screen.x = (sm.x * 0.5 + 0.5) * innerWidth;
      screen.y = (-sm.y * 0.5 + 0.5) * innerHeight;

      dir.set(sm.x, sm.y, 0.5).unproject(camera).sub(camera.position).normalize();
      cur.copy(camera.position).addScaledVector(dir, D);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);

      const speed = Math.hypot(vx * camera.aspect, vy);
      // vận tốc con trỏ quy ra đơn vị thế giới ở mặt phẳng ngọn lửa
      const halfH = D * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      const wx = vx * halfH * camera.aspect, wy = vy * halfH;
      // ngọn lửa bị gió kéo ngược hướng di chuyển; đứng yên thì lay nhẹ như có gió lùa
      const idle = reduceMotion ? 0 : Math.sin(t * 0.9) * 0.05 + Math.sin(t * 1.9 + 1.3) * 0.025;
      bendT.set(
        Math.tanh(-wx * 0.32) * 0.72 + idle,
        THREE.MathUtils.clamp(-wy * 0.35, -0.45, 0.6) + Math.min(0.35, Math.abs(wx) * 0.12)
      );
      // lò xo thiếu giảm chấn: dừng đột ngột thì ngọn lửa vẫy qua lại rồi mới đứng
      const K = 38, C = 10, h = Math.min(dt, 1 / 30);
      bendV.x += ((bendT.x - bend.x) * K - bendV.x * C) * h;
      bendV.y += ((bendT.y - bend.y) * K - bendV.y * C) * h;
      bend.x += bendV.x * h; bend.y += bendV.y * h;
      // nhịp thở chiều cao theo nhiễu (không đều như sin)
      const b = reduceMotion ? 1 : 1 + (Math.sin(t * 2.3) * 0.6 + Math.sin(t * 4.1 + 2) * 0.4) * 0.05;
      breathe = damp(breathe, b + flare * 0.35, 5, dt);
      flare = damp(flare, 0, 2.2, dt);
      alpha = damp(alpha, active ? 1 : 0, 4, dt);

      flame.position.copy(cur);
      flame.quaternion.copy(camera.quaternion);
      flame.scale.setScalar((1 + flare * 0.25) * this.inspect);
      u.uTime.value = t;
      u.uBend.value.copy(bend);
      u.uH.value = breathe;
      u.uAlpha.value = alpha;
      u.uFlare.value = flare;
      halo.position.copy(cur).addScaledVector(up, FH * 0.3).addScaledVector(right, bend.x * FH * 0.3);
      halo.material.opacity = alpha * (0.42 + flare * 0.4) * (0.85 + (breathe - 1) * 1.5);
      halo.scale.setScalar(0.3 + flare * 0.35);

      if (alpha > 0.05 && !reduceMotion) {
        spawnAcc += dt * (0.6 + speed * 5 + flare * 24);
        const n = Math.floor(spawnAcc);
        if (n) { spawnAcc -= n; emit(n, 1 + flare); }
      }
      for (let i = 0; i < N; i++) {
        if (life[i] >= 1) continue;
        life[i] = Math.min(1, life[i] + dt / dur[i]);
        const o = i * 3;
        pos[o] += vel[o] * dt + Math.sin(t * 9 + i) * 0.002;
        pos[o + 1] += vel[o + 1] * dt;
        pos[o + 2] += vel[o + 2] * dt;
      }
      posAttr.needsUpdate = true;
      lifeAttr.needsUpdate = true;
    }
  };
}

/* ======================================================================
   TRO BÙA — tàn giấy rơi lả tả (xám tro, mép còn ửng than hồng) + tia lửa bay lên
   ====================================================================== */
function createAsh({ scene, pixelRatio, count = 420 }) {
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const life = new Float32Array(count).fill(1);
  const dur = new Float32Array(count);
  const kind = new Float32Array(count);   // 0 tro, 1 tia lửa
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) seed[i] = Math.random();
  const geo = new THREE.BufferGeometry();
  const pA = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const lA = new THREE.BufferAttribute(life, 1).setUsage(THREE.DynamicDrawUsage);
  const kA = new THREE.BufferAttribute(kind, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', pA);
  geo.setAttribute('aLife', lA);
  geo.setAttribute('aKind', kA);
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const uTime = { value: 0 };
  const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { uPR: { value: pixelRatio }, uTime },
    vertexShader: /* glsl */ `
      attribute float aLife, aKind, aSeed; uniform float uPR, uTime;
      varying float vK; varying float vKind; varying float vRot; varying float vSeed;
      void main(){
        vK = aLife; vKind = aKind; vSeed = aSeed;
        vRot = uTime*(1.5 + aSeed*3.) + aSeed*6.283;
        vec4 mv = modelViewMatrix*vec4(position,1.);
        gl_Position = projectionMatrix*mv;
        float s = aKind > .5 ? (4. + aSeed*3.)*(1. - aLife) : (3.5 + aSeed*4.5);
        gl_PointSize = aLife >= 1. ? 0. : s*uPR*7./max(.5, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying float vK; varying float vKind; varying float vRot; varying float vSeed;
      void main(){
        vec2 p = gl_PointCoord - .5;
        if (vKind > .5) {
          float a = smoothstep(.5, 0., length(p));
          gl_FragColor = vec4(mix(vec3(3.,2.,.9), vec3(2.,.4,.08), vK), a*(1. - vK));
          return;
        }
        // mảnh tro: hình dẹt xoay lật (giả lập cánh giấy lật trong gió)
        float c = cos(vRot), s = sin(vRot);
        p = mat2(c, -s, s, c)*p;
        p.y /= .35 + .65*abs(sin(vRot*1.3));
        float ang = atan(p.y, p.x);
        float d = max(abs(p.x)*1.3, abs(p.y)) + (sin(ang*5. + vSeed*40.)*.5 + .5)*.12;  // mép rách nham nhở
        float a = smoothstep(.5, .32, d);
        float ember = 1. - smoothstep(.0, .22, vK);
        vec3 ash = mix(vec3(.13,.12,.11), vec3(.38,.36,.33), vSeed);
        vec3 col = mix(ash, vec3(2.2,.7,.15), ember*.85);
        col += vec3(1.4,.35,.05)*smoothstep(.3, .5, d)*(1. - smoothstep(0., .5, vK))*.8;
        gl_FragColor = vec4(col, a*(1. - smoothstep(.75, 1., vK))*.9);
      }`,
    transparent: true, depthWrite: false
  }));
  pts.frustumCulled = false;
  pts.renderOrder = 6;
  scene.add(pts);
  let next = 0, alive = 0;
  return {
    spawn(x, y, z, k = 0) {
      const i = next; next = (next + 1) % count;
      const o = i * 3;
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
      if (k) {
        vel[o] = (Math.random() - 0.5) * 1.2; vel[o + 1] = 0.6 + Math.random() * 1.4; vel[o + 2] = (Math.random() - 0.5) * 1.2;
        dur[i] = 0.4 + Math.random() * 0.8;
      } else {
        vel[o] = (Math.random() - 0.5) * 0.5; vel[o + 1] = 0.15 + Math.random() * 0.45; vel[o + 2] = (Math.random() - 0.5) * 0.5;
        dur[i] = 3.5 + Math.random() * 3;
      }
      kind[i] = k;
      life[i] = 0;
      alive = 8;
    },
    update(dt, t) {
      uTime.value = t;
      if (alive <= 0) return;
      alive -= dt;
      for (let i = 0; i < count; i++) {
        if (life[i] >= 1) continue;
        life[i] = Math.min(1, life[i] + dt / dur[i]);
        const o = i * 3;
        if (kind[i]) {
          vel[o + 1] -= 0.4 * dt;
        } else {
          // hơi nóng đẩy lên lúc đầu, rồi rơi chậm, đung đưa như lá
          vel[o + 1] = damp(vel[o + 1], -0.32 - seed[i] * 0.25, 0.9, dt);
          vel[o] = damp(vel[o], Math.sin(t * (1.2 + seed[i]) + i) * 0.35, 1.5, dt);
          vel[o + 2] = damp(vel[o + 2], Math.cos(t * (0.9 + seed[i]) + i) * 0.25, 1.5, dt);
        }
        pos[o] += vel[o] * dt; pos[o + 1] += vel[o + 1] * dt; pos[o + 2] += vel[o + 2] * dt;
      }
      pA.needsUpdate = true; lA.needsUpdate = true; kA.needsUpdate = true;
    }
  };
}

/* ======================================================================
   ÂM MÔN — chữ Hán khổng lồ lơ lửng giữa hai cảnh, máy quay bay xuyên qua.
   Chữ hiện ra như mực loang rồi cháy tàn thành tro xanh ngọc.
   ====================================================================== */
function glyphTexture(ch) {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 380px "Songti SC", "STSong", "Noto Serif SC", "Noto Serif CJK SC", "SimSun", serif';
  g.shadowColor = '#fff';
  g.shadowBlur = 10;
  g.fillStyle = '#fff';
  g.fillText(ch, S / 2, S / 2 + 10);
  g.shadowBlur = 0;
  // vòng ấn triện mảnh bao quanh
  g.strokeStyle = 'rgba(255,255,255,.55)';
  g.lineWidth = 3;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.47, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1.5;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.445, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2, r0 = S * 0.47, r1 = r0 + (i % 8 ? 7 : 18);
    g.beginPath();
    g.moveTo(S / 2 + Math.cos(a) * r0, S / 2 + Math.sin(a) * r0);
    g.lineTo(S / 2 + Math.cos(a) * r1, S / 2 + Math.sin(a) * r1);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function createGlyphGate({ scene, chars, sharedTime }) {
  const textures = new Map();
  const tex = (ch) => {
    if (!textures.has(ch)) textures.set(ch, glyphTexture(ch));
    return textures.get(ch);
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null }, uTime: sharedTime, uAmt: { value: 0 }, uBurn: { value: 0 }, uSeed: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
uniform sampler2D uTex; uniform float uTime, uAmt, uBurn, uSeed;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 uv = vUv;
  float w = fbm(uv*3. + vec2(uSeed, uTime*.15));
  uv += (w - .5)*.035;                         // nét mực run rẩy
  float a = texture2D(uTex, uv).r;
  float n = fbm(uv*4.5 + uSeed*3.);
  // mực loang vào (uAmt) rồi cháy tàn (uBurn)
  float on = smoothstep(n - .05, n + .05, uAmt*1.25 - .1);
  float burn = uBurn*1.3 - .15;
  float dead = smoothstep(burn - .04, burn + .02, n);
  float rim = (1. - smoothstep(0., .07, abs(n - burn)))*step(.02, uBurn);
  vec3 jade = vec3(.32, 1., .82), gold = vec3(1., .74, .36);
  vec3 col = mix(jade, gold, smoothstep(.35, .75, w))*a*on*dead*.55;
  col += vec3(1., .5, .18)*rim*a*.8;
  float alpha = a*on*max(dead, rim);
  if (alpha < .003) discard;
  gl_FragColor = vec4(col*alpha, alpha);
}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.renderOrder = 20;
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  let cur = -1;

  return {
    /** i: vùng đất (i → i+1), f: tiến trình 0..1, at: điểm trên đường bay để treo chữ phía trên */
    update(camera, i, f, at) {
      if (f <= 0.04 || f >= 0.96) { mesh.visible = false; return; }
      if (i !== cur) { cur = i; mat.uniforms.uTex.value = tex(chars[i % chars.length]); mat.uniforms.uSeed.value = i * 1.37; }
      mesh.visible = true;
      mesh.position.copy(at);
      mesh.position.y += 8.5;
      mesh.lookAt(camera.position);
      mesh.scale.setScalar(11);
      mat.uniforms.uAmt.value = THREE.MathUtils.smoothstep(f, 0.08, 0.4);
      mat.uniforms.uBurn.value = THREE.MathUtils.smoothstep(f, 0.6, 0.9);
    }
  };
}

/* ======================================================================
   VỆT HỒN — những sợi sáng xanh ngọc lao vút qua máy quay khi chuyển cảnh
   ====================================================================== */
export function createSpiritStreaks({ scene, count = 150 }) {
  const pos = new Float32Array(count * 6);
  const col = new Float32Array(count * 6);
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.6 + Math.pow(Math.random(), 0.7) * 7;
    seeds.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.7, z: -Math.random() * 46, k: 0.6 + Math.random() * 0.8, gold: Math.random() < 0.18 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 15;
  const rig = new THREE.Group();
  rig.add(lines);
  scene.add(rig);

  return {
    /** m: cường độ chuyển cảnh, v: vận tốc có dấu (shot/giây) */
    update(camera, dt, m, v) {
      rig.visible = m > 0.01;
      if (!rig.visible) return;
      rig.position.copy(camera.position);
      rig.quaternion.copy(camera.quaternion);
      const speed = THREE.MathUtils.clamp(v, -3, 3) * 34;
      const len = 0.4 + Math.min(9, Math.abs(v) * 5.5);
      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        s.z += speed * s.k * dt;
        if (s.z > 2) s.z -= 48;
        else if (s.z < -46) s.z += 48;
        const tail = s.z - Math.sign(speed || 1) * len * s.k;
        const j = i * 6;
        pos[j] = s.x; pos[j + 1] = s.y; pos[j + 2] = s.z;
        pos[j + 3] = s.x; pos[j + 4] = s.y; pos[j + 5] = tail;
        const near = 1 - Math.min(1, -s.z / 46);
        const b = m * (0.25 + near * 0.9);
        if (s.gold) { col[j] = b; col[j + 1] = b * 0.68; col[j + 2] = b * 0.32; }
        else { col[j] = b * 0.3; col[j + 1] = b; col[j + 2] = b * 0.82; }
        col[j + 3] = col[j + 4] = col[j + 5] = 0;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }
  };
}
