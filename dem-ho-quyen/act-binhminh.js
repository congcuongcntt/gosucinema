// Hồi 5 · Bình minh. Sương sớm trong lòng chảo, đất còn úa.
// Rê chuột trên nền đất: lúa và cỏ hồi lại theo đường tay đi. Khi đủ, bóng thiếu nữ hiện trên vành tường rồi biến mất.
// Cuối cùng là một nén nhang: hơ ngọn lửa vào đầu nhang để thắp.
import * as THREE from 'three';
import { buildArena, buildMist, softSprite, figure, onRing, R_IN, H_IN } from './common.js';

const ORIGIN_HOSTS = ['gosucinema.web.id', 'www.gosucinema.web.id'];
const IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$|\.(localhost|test)$/.test(location.hostname);
const NS = ORIGIN_HOSTS.includes(location.hostname) ? 'gosucinema.web.id' : (IS_LOCAL ? 'local.dev' : location.hostname);
const COUNT_GET = `https://abacus.jasoncameron.dev/get/${NS}/shdl_incense_1836`;
const COUNT_HIT = `https://abacus.jasoncameron.dev/hit/${NS}/shdl_incense_1836`;

export function createBinhMinh(ctx) {
  const { A } = ctx;
  const scene = new THREE.Scene();
  const FOG = new THREE.Color(0x9aa09c);
  scene.background = FOG.clone(); scene.fog = new THREE.FogExp2(FOG.clone(), 0.03);
  const camera = new THREE.PerspectiveCamera(58, ctx.aspect, 0.02, 260);
  camera.rotation.order = 'YXZ';
  const EYE = new THREE.Vector3(0, 1.62, 8);
  camera.position.copy(EYE);
  scene.add(camera);

  const { floorMat } = buildArena(scene);
  floorMat.color.set(0x8f8160);      // đất úa
  scene.add(new THREE.HemisphereLight(0xffe6c8, 0x3a3020, 1.5));
  const sun = new THREE.DirectionalLight(0xffc89a, 2.6); sun.position.set(40, 12, -10); scene.add(sun);
  const mist = buildMist(scene, 0xe8e4da, 40);
  const sprite = softSprite();

  // lúa: thân xanh ngả vàng, bông lúa vàng trĩu
  const MAX = 2600;
  const stalkG = new THREE.CylinderGeometry(0.008, 0.016, 1, 4); stalkG.translate(0, 0.5, 0);
  const headG = new THREE.SphereGeometry(1, 8, 6); headG.scale(0.018, 0.13, 0.014); headG.translate(0, 0.11, 0);
  const stalks = new THREE.InstancedMesh(stalkG, new THREE.MeshStandardMaterial({ color: 0x8aa04a, roughness: 0.8 }), MAX);
  const heads = new THREE.InstancedMesh(headG, new THREE.MeshStandardMaterial({ color: 0xe8b43c, roughness: 0.5, emissive: 0x5a3a08, emissiveIntensity: 0.5 }), MAX);
  stalks.count = heads.count = 0; stalks.frustumCulled = heads.frustumCulled = false;
  scene.add(stalks, heads);
  const born = [], growing = new Set();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pv = new THREE.Vector3();
  function place(i, k) {
    const b = born[i], g = k * k * (3 - 2 * k);
    e.set(b.tilt, b.rot, b.tilt * 0.5); q.setFromEuler(e);
    sc.set(1, b.h * g, 1); m4.compose(b.p, q, sc); stalks.setMatrixAt(i, m4);
    pv.set(0, b.h * g, 0).applyQuaternion(q).add(b.p);
    e.set(b.tilt + 1.35 * g, b.rot, 0); q.setFromEuler(e); sc.setScalar(g); m4.compose(pv, q, sc); heads.setMatrixAt(i, m4);
  }
  // hạt vàng bay lên chỗ lúa mọc
  const MOTES = 300, mp = new Float32Array(MOTES * 3), mv = [];
  for (let i = 0; i < MOTES; i++) { mp[i * 3 + 1] = -10; mv.push({ life: 0 }); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: sprite, size: 0.08, color: 0xffd27a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  scene.add(motes);
  let moteI = 0;

  // bóng thiếu nữ trên vành tường
  const girl = figure(0x0c0a0b, 0x0c0a0b);
  girl.children[2].visible = false;                     // không đội nón; búi tóc
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), girl.children[0].material); bun.position.set(0, 1.42, -0.08); girl.add(bun);
  girl.scale.set(1.35, 1.6, 1.35);   // to hơn người thật một chút để đọc được dáng từ xa
  girl.position.copy(onRing(R_IN + 0.6, 0.12, H_IN)); girl.lookAt(EYE.x, H_IN, EYE.z);
  girl.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0; o.material.fog = false; } });
  girl.visible = false; scene.add(girl);
  const girlHead = girl.children[1];

  // nén nhang trước mặt, gắn vào máy quay
  const stick = new THREE.Group(); stick.position.set(0.05, -0.32, -1.1); stick.rotation.z = -0.08; stick.visible = false; camera.add(stick);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0xa3231a })); handle.position.y = -0.11; stick.add(handle);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.34, 6), new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 1 })); body.position.y = 0.17; stick.add(body);
  const ember = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0xff6a2a, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 }));
  ember.position.y = 0.345; ember.scale.setScalar(0.03); stick.add(ember);
  const tipLocal = new THREE.Vector3(0, 0.345, 0);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 }));
  flame.scale.set(0.035, 0.06, 1); camera.add(flame);
  const SMOKE = 220, sp = new Float32Array(SMOKE * 3), sl = new Float32Array(SMOKE);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const smoke = new THREE.Points(sg, new THREE.PointsMaterial({ map: sprite, size: 0.035, color: 0xe8e2d8, transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
  smoke.visible = false; stick.add(smoke);

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const tipW = new THREE.Vector3(), tmp = new THREE.Vector3();
  let phase = 'grow', phaseT = 0, planted = 0, burn = 0, yaw = 0, pitch = 0, lastPt = new THREE.Vector2(-1, -1), soundtrack = null, counted = false;

  function plant(p) {
    for (let n = 0; n < 5 && stalks.count < MAX; n++) {
      const i = stalks.count++; heads.count = stalks.count;
      const a = Math.random() * 6.283, r = Math.random() * 0.9;
      born[i] = { p: new THREE.Vector3(p.x + Math.cos(a) * r, 0, p.z + Math.sin(a) * r), h: 0.55 + Math.random() * 0.5, tilt: (Math.random() - 0.5) * 0.3, rot: Math.random() * 6.283, t: 0 };
      growing.add(i); place(i, 0.001); planted++;
      const k = moteI++ % MOTES; mv[k].life = 1; mp[k * 3] = born[i].p.x; mp[k * 3 + 1] = 0.2; mp[k * 3 + 2] = born[i].p.z;
    }
    stalks.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    if (Math.random() < 0.12) A.tick(1046 + Math.random() * 600, 0.03);
  }

  function showEnd() {
    const end = document.getElementById('end'); end.classList.add('show');
    const out = document.getElementById('end-count');
    const show = (v) => { if (typeof v === 'number') out.textContent = v.toLocaleString('vi-VN'); };
    if (!IS_LOCAL && !counted) {
      counted = true;
      fetch(COUNT_HIT, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => d && show(d.value)).catch(() => {});
    } else fetch(COUNT_GET, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => d && show(d.value)).catch(() => {});
  }

  return {
    scene, camera,
    get phase() { return phase; }, get planted() { return planted; },
    _tip() { const v = tipLocal.clone(); stick.localToWorld(v); v.project(camera); return [(v.x + 1) / 2, (1 - v.y) / 2]; },
    enter() {
      phase = 'grow'; phaseT = 0;
      ctx.fx.natural = 1; ctx.fx.radius = 0;
      ctx.stamp('BÌNH MINH'); ctx.souls(-1); ctx.hint('');
      ctx.say('Bình minh, sương sớm trong lòng chảo. Đất còn úa. Rê chuột trên nền đất để lúa hồi lại.');
      A.setWorldLevel(0.3);
      soundtrack = soundtrack || new Audio('../assets/audio/soundtrack-1836.m4a');
      soundtrack.loop = true; soundtrack.volume = 0; soundtrack.play().catch(() => {});
    },
    exit() {},
    onDown() {},
    update(dt, time) {
      phaseT += dt;
      if (soundtrack && soundtrack.volume < 0.6) soundtrack.volume = Math.min(0.6, soundtrack.volume + dt * 0.08);
      if (Math.random() < dt * 1.2) A.bird();
      let ty = -(ctx.ptrS.x - 0.5) * 1.0, tp = (ctx.ptrS.y - 0.5) * 0.45;
      if (phase === 'incense' || phase === 'lit') { ty *= 0.15; tp *= 0.15; }
      if (ctx.gyro) ty += -ctx.gyro.g * 0.01;
      yaw = THREE.MathUtils.damp(yaw, ty, 2.4, dt); pitch = THREE.MathUtils.damp(pitch, tp - 0.08, 2.4, dt);
      camera.rotation.set(pitch, yaw, 0);
      camera.updateMatrixWorld();

      // lúa mọc theo con trỏ trên nền đất
      if (phase === 'grow' || phase === 'girl') {
        if (lastPt.distanceTo(ctx.ptrS) > 0.004) {
          ndc.set(ctx.ptrS.x * 2 - 1, ctx.ptrS.y * 2 - 1); ray.setFromCamera(ndc, camera);
          if (ray.ray.intersectPlane(plane, hit) && hit.length() < R_IN - 0.5 && Math.hypot(hit.x - EYE.x, hit.z - EYE.z) > 3.2) plant(hit);
          lastPt.copy(ctx.ptrS);
        }
        ctx.hint(ctx.idle() > 2500 && planted < 900 ? 'move' : '');
      }
      growing.forEach((i) => { const b = born[i]; b.t = Math.min(1, b.t + dt * 1.6); place(i, b.t); if (b.t >= 1) growing.delete(i); });
      if (growing.size) stalks.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
      for (let k = 0; k < MOTES; k++) { const v = mv[k]; if (v.life > 0) { v.life -= dt * 0.5; mp[k * 3 + 1] += dt * 0.6; mp[k * 3] += Math.sin(time * 2 + k) * dt * 0.1; } else mp[k * 3 + 1] = -10; }
      mg.attributes.position.needsUpdate = true;
      floorMat.color.lerpColors(new THREE.Color(0x8f8160), new THREE.Color(0xffffff), Math.min(1, planted / 1100));
      mist(time, dt, 1.6);

      if (phase === 'grow' && planted >= 1000) { phase = 'girl'; phaseT = 0; girl.visible = true; ctx.hint(''); }
      if (phase === 'girl') {
        const o = phaseT < 1.5 ? phaseT / 1.5 : phaseT < 4 ? 1 : Math.max(0, 1 - (phaseT - 4) / 1.2);
        girl.traverse((c) => { if (c.material) c.material.opacity = o; });
        girlHead.position.x = Math.sin(Math.min(1, Math.max(0, phaseT - 1.8)) * Math.PI * 0.5) * 0.05;   // nghiêng đầu nhìn
        if (phaseT > 1.6 && phaseT - dt <= 1.6) { A.bell(0); ctx.say('Trên vành tường, một bóng thiếu nữ đứng nhìn, rồi biến mất.'); }
        if (phaseT > 5.4) {
          girl.visible = false; phase = 'incense'; phaseT = 0; stick.visible = true; burn = 0;
          ctx.say('Một nén nhang. Hơ ngọn lửa vào đầu nhang để thắp.');
        }
      }
      if (phase === 'incense' || phase === 'lit') {
        // ngọn lửa theo con trỏ, trên mặt phẳng cách mắt 1.1 m
        ndc.set(ctx.ptrS.x * 2 - 1, ctx.ptrS.y * 2 - 1); ray.setFromCamera(ndc, camera);
        tmp.copy(ray.ray.direction).multiplyScalar(1.1 / Math.max(0.2, -ray.ray.direction.clone().transformDirection(camera.matrixWorldInverse).z)).add(ray.ray.origin);
        camera.worldToLocal(tmp); flame.position.copy(tmp).add(new THREE.Vector3(0, 0.03, 0));
        flame.material.opacity = phase === 'incense' ? 0.9 : Math.max(0, flame.material.opacity - dt);
        flame.scale.set(0.035 * (0.9 + Math.random() * 0.2), 0.06 * (0.9 + Math.random() * 0.25), 1);
        tipW.copy(tipLocal); stick.localToWorld(tipW); camera.worldToLocal(tipW);
        if (phase === 'incense') {
          const d = Math.hypot(tmp.x - tipW.x, tmp.y - tipW.y);
          if (d < 0.05) burn += dt; else burn = Math.max(0, burn - dt * 0.5);
          ember.material.opacity = Math.min(1, burn * 1.5);
          ctx.hint(ctx.idle() > 3000 ? 'move' : '');
          if (burn > 0.9) {
            phase = 'lit'; phaseT = 0; A.ignite(); A.bell(4); smoke.visible = true; ctx.hint('');
            document.body.classList.add('lit');
            ctx.say('Nén nhang đã thắp.');
          }
        }
        if (phase === 'lit') {
          ember.material.opacity = 0.8 + Math.sin(time * 5) * 0.2; ember.scale.setScalar(0.03 + Math.sin(time * 3) * 0.004);
          for (let i = 0; i < SMOKE; i++) {
            sl[i] -= dt * 0.35; if (sl[i] <= 0) { sl[i] = 1; sp[i * 3] = 0; sp[i * 3 + 1] = 0.35; sp[i * 3 + 2] = 0; }
            const age = 1 - sl[i];
            sp[i * 3] += Math.sin(time * 1.3 + i * 0.7 + age * 6) * dt * 0.05 * age; sp[i * 3 + 1] += dt * 0.22; sp[i * 3 + 2] += Math.cos(time + i) * dt * 0.02 * age;
          }
          sg.attributes.position.needsUpdate = true;
          if (phaseT > 2.5 && phaseT - dt <= 2.5) showEnd();
        }
      }
    },
  };
}
