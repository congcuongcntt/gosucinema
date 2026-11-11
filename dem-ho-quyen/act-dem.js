// Hồi 3 · Mắt Âm và Hồi 4 · Đại Ma Hổ — cùng một đêm trong lòng chảo Hổ Quyền.
// Hồi 3: nhấn giữ để mở Mắt Âm. Năm bóng hổ chỉ đứng im khi bị nhìn thấy; nhìn thẳng khi chúng tới gần để giải oán.
// Hồi 4: oán khí dồn lại thành Đại Ma Hổ. Nối năm dấu bùa trên nền đất, rồi giữ đúng lúc để đỡ đòn cuối.
import * as THREE from 'three';
import { buildArena, buildTorches, flickerTorches, buildMist, buildDust, smokeTiger, softSprite, CAGE_ANGLES } from './common.js';

const CENTER = new THREE.Vector2(0.5, 0.5);
const TIGER_COLORS = [0xd9f0ea, 0xff8a6a, 0xf5d27a, 0x8fe0d2, 0xb7a8e6];   // Ngũ Hổ: năm sắc khói (liên tưởng sáng tác)

export function createDem(ctx) {
  const { A } = ctx;
  const scene = new THREE.Scene(), ghosts = new THREE.Scene();
  const FOG = new THREE.Color(0x0b0f14);
  scene.background = FOG.clone(); scene.fog = new THREE.FogExp2(FOG.clone(), 0.016);
  const camera = new THREE.PerspectiveCamera(58, ctx.aspect, 0.05, 260);
  camera.rotation.order = 'YXZ';
  const EYE = new THREE.Vector3(0, 1.62, 6);
  camera.position.copy(EYE);

  const { cageDoors } = buildArena(scene);
  scene.add(new THREE.HemisphereLight(0x6a7c98, 0x1a140e, 1.1));
  const moon = new THREE.DirectionalLight(0x9db4d6, 1.5); moon.position.set(-30, 40, 20); scene.add(moon);
  const torches = buildTorches(scene);
  const mist = buildMist(scene);
  const dust = buildDust(scene);
  const sprite = softSprite();

  /* ---------- Hồi 3: năm bóng hổ ---------- */
  const tigers = CAGE_ANGLES.map((phi, i) => {
    const T = smokeTiger(TIGER_COLORS[i], 7000, 101 + i * 13);
    T.group.scale.setScalar(1.15); T.group.visible = false; ghosts.add(T.group);
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute([-0.1, 1.22, 1.47, 0.1, 1.22, 1.47], 3));
    const eyes = new THREE.Points(eg, new THREE.PointsMaterial({ map: sprite, size: 0.09, color: 0xffd27a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    scene.add(eyes);
    return { i, ...T, eyes, door: cageDoors[i], state: 'wait', t: 0, wake: 0, pos: new THREE.Vector3(), heading: 0, walk: 0, seen: 0, freed: false, voice: null, weave: Math.random() * 6, growlAt: 0 };
  });

  /* ---------- Hồi 4: Đại Ma Hổ, năm dấu bùa ---------- */
  const big = smokeTiger(0xf3dcc8, 26000, 777, 0.05);
  big.group.scale.setScalar(3.1); big.group.visible = false; ghosts.add(big.group);
  big.u.uAlpha.value = 0.24;
  const BIG_POS = new THREE.Vector3(0, 0, -9);
  const SEAL_C = new THREE.Vector3(0, 0, -2.2), SEAL_R = 4.6;
  const seals = [0, 1, 2, 3, 4].map((k) => {
    const a = (k / 5) * Math.PI * 2 + Math.PI;
    const p = new THREE.Vector3(SEAL_C.x + Math.sin(a) * SEAL_R, 0.03, SEAL_C.z + Math.cos(a) * SEAL_R * 0.75);
    const g = new THREE.Group(); g.position.copy(p); g.visible = false; scene.add(g);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 40), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.8, fog: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; g.add(ring);
    const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0xff7a3a, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    dot.position.y = 0.25; dot.scale.setScalar(0.9); g.add(dot);
    return { p, g, ring, dot, on: false };
  });
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.95, fog: false });
  const pathGeo = new THREE.BufferGeometry(); const pathLine = new THREE.Line(pathGeo, lineMat); scene.add(pathLine);
  const chainGeo = new THREE.BufferGeometry(); const chains = new THREE.LineSegments(chainGeo, lineMat); scene.add(chains);
  const qte = document.getElementById('qte'), qRing = qte.querySelector('.q-ring'), vong = document.getElementById('vong');

  let phase = 'eye', freed = 0, order = [], phaseT = 0, lungeAt = 0, qScale = 2.4, qDone = false, yaw = 0, pitch = 0, bigVoice = null;
  const ndc = new THREE.Vector3(), tmp = new THREE.Vector3(), toCam = new THREE.Vector3();
  const screen = (v, y = 1.3) => { ndc.copy(v).setY(y).project(camera); return { x: ndc.x * 0.5 + 0.5, y: ndc.y * 0.5 + 0.5, front: ndc.z < 1 }; };

  function spawn(t) {
    t.state = 'emerge'; t.t = 0; t.group.visible = true;
    t.pos.copy(t.door.mouth).setY(0); t.heading = Math.atan2(-t.pos.x, -t.pos.z); t.u.uDissolve.value = 1;
  }
  function updateTiger(t, dt, time) {
    const u = t.u; u.uTime.value = time;
    if (t.state === 'gone') return;
    t.t += dt;
    toCam.set(EYE.x - t.pos.x, 0, EYE.z - t.pos.z);
    const dist = toCam.length(); toCam.normalize();
    const s = screen(t.pos);
    const inEye = s.front && Math.hypot((s.x - ctx.ptrS.x) * ctx.aspect, s.y - ctx.ptrS.y) < ctx.fx.radius + 0.05;
    t.seen = THREE.MathUtils.damp(t.seen, inEye ? 1 : 0, 7, dt);
    if (t.state === 'wait') { if (phaseT > t.wake) spawn(t); return; }
    if (t.state === 'emerge') {
      u.uDissolve.value = Math.max(0, 1 - t.t / 1.1);
      t.door.gate.position.y = Math.min(2.4, t.t * 3);
      t.walk += dt * 6; t.pos.addScaledVector(toCam, dt * 2);
      if (t.t > 1.1) { t.state = 'stalk'; t.t = 0; }
    } else if (t.state === 'stalk') {
      t.door.gate.position.y = Math.max(0, t.door.gate.position.y - dt * 1.2);
      // bị nhìn thấy thì gần như đứng im; khuất mắt thì lao tới rất nhanh
      const speed = THREE.MathUtils.lerp(4.4, 1.6, t.seen);
      tmp.set(toCam.z, 0, -toCam.x).multiplyScalar(Math.sin(time * 0.8 + t.weave) * 0.5 * Math.min(1, dist / 10));
      const dir = tmp.add(toCam).normalize();
      t.pos.addScaledVector(dir, speed * dt);
      t.walk += dt * speed * 3.2;
      const want = Math.atan2(dir.x, dir.z);
      t.heading += Math.atan2(Math.sin(want - t.heading), Math.cos(want - t.heading)) * Math.min(1, dt * 4);
      u.uSmoke.value = 0.3 + (1 - t.seen) * 0.3;
      if (t.seen > 0.5 && time > t.growlAt && dist < 18) { A.growl(t.voice, 0.6 + (1 - dist / 18) * 0.6); t.growlAt = time + 1.8 + Math.random() * 1.5; }
      if (t.seen > 0.6 && dist < 12) { t.state = 'face'; t.t = 0; A.roar(t.voice); ctx.shake(1); ctx.flash(0.5, 0xff2a12); }
      else if (dist < 1.8) { t.state = 'pass'; t.t = 0; A.whoosh(); ctx.flash(0.45, 0x99ccff); ctx.shake(0.4); }
    } else if (t.state === 'face') {
      t.pos.addScaledVector(toCam, dt * 6 * (1 - Math.min(1, t.t / 0.3)));
      t.walk += dt * 8 * (1 - Math.min(1, t.t / 0.3));
      u.uDissolve.value = Math.max(0, (t.t - 0.35) / 1.0);
      if (t.t > 1.4) {
        t.state = 'gone'; t.freed = true; t.group.visible = false;
        A.bell(freed); freed++; ctx.souls(freed);
        ctx.say(`Đã giải ${freed} trên 5 bóng hổ.`);
        if (freed >= 5) startMaHo(time);
      }
    } else if (t.state === 'pass') {
      t.pos.addScaledVector(toCam, dt * 7);
      u.uDissolve.value = Math.min(1, t.t / 0.5);
      if (t.t > 0.6) { t.state = 'wait'; t.group.visible = false; t.wake = phaseT + 1.4 + Math.random(); }
    }
    u.uWalk.value = t.walk;
    const look = Math.atan2(EYE.x - t.pos.x, EYE.z - t.pos.z) - t.heading;
    u.uLook.value = THREE.MathUtils.clamp(Math.atan2(Math.sin(look), Math.cos(look)), -0.7, 0.7) * t.seen;
    t.group.position.copy(t.pos); t.group.rotation.y = t.heading;
    t.eyes.position.copy(t.pos); t.eyes.rotation.y = t.heading; t.eyes.scale.setScalar(1.15);
    const blink = Math.sin(time * 1.3 + t.weave * 3) > -0.3 ? 1 : 0;
    t.eyes.material.opacity = (t.state === 'stalk' ? 1 : 0) * blink * (1 - Math.min(1, ctx.fx.radius * 3)) * THREE.MathUtils.clamp((24 - dist) / 12, 0, 0.9);
    A.placeVoice(t.voice, t.pos.x, 1.2, t.pos.z);
    if (t.state === 'stalk' || t.state === 'emerge') A.breathe(t.voice, THREE.MathUtils.lerp(1.2, 2.6, t.seen), THREE.MathUtils.clamp(1.3 - dist / 26, 0.3, 1));
  }

  function startMaHo(time) {
    phase = 'gather'; phaseT = 0;
    ctx.stamp('CANH TƯ'); ctx.hint('');
    setTimeout(() => { ctx.souls(-1); }, 1500);
    big.group.visible = true; big.group.position.copy(BIG_POS); big.u.uDissolve.value = 1;
    A.placeVoice(bigVoice, BIG_POS.x, 3, BIG_POS.z);
    void time;
  }
  function drawPath() {
    const pts = order.map((k) => seals[k].p.clone().setY(0.08));
    if (order.length === 5) pts.push(pts[0].clone());
    pathGeo.setFromPoints(pts.length > 1 ? pts : [new THREE.Vector3(), new THREE.Vector3()]);
    pathLine.visible = pts.length > 1;
  }
  function startStrike() {
    phase = 'strike'; phaseT = 0; qDone = false; qScale = 2.4;
    qte.classList.add('show');
    ctx.say('Đại Ma Hổ chồm lên. Bấm đúng lúc vòng đỏ khớp vòng trong để đỡ đòn.');
  }
  function strikeResult(ok) {
    qDone = true; qte.classList.remove('show');
    if (ok) {
      phase = 'won'; phaseT = 0;
      A.shimmer(); A.roar(bigVoice); ctx.flash(0.8, 0xffe2a0); ctx.shake(0.8);
      vong.classList.remove('burst'); void vong.offsetWidth; vong.classList.add('burst');
      ctx.say('Hoa văn trên vòng tay bừng sáng. Đại Ma Hổ tan thành khói.');
    } else {
      A.crack(); A.roar(bigVoice); ctx.flash(0.9, 0xffffff); ctx.shake(1.2);
      ctx.say('Chưa kịp. Thử lại.');
      phase = 'recover'; phaseT = 0;
    }
  }

  return {
    scene, ghosts, camera,
    get phase() { return phase; }, get freed() { return freed; }, get qScale() { return qScale; },
    _tigers() { return tigers.filter((t) => t.state === 'stalk' || t.state === 'emerge').map((t) => { const s = screen(t.pos); return [s.x, 1 - s.y, t.pos.distanceTo(EYE)]; }); },
    _seals() { return seals.map((s) => { const c = screen(s.p, 0.1); return [c.x, 1 - c.y]; }); },
    enter() {
      phase = 'eye'; phaseT = 0; freed = 0; order = [];
      tigers.forEach((t, i) => {
        t.state = 'wait'; t.wake = 1.2 + i * 1.8; t.freed = false; t.group.visible = false;
        if (!t.voice) t.voice = A.tigerVoice(t.i);
      });
      bigVoice = bigVoice || A.tigerVoice(7);
      ctx.fx.natural = 0; ctx.fx.radius = 0;
      ctx.stamp('GIỜ TÝ'); ctx.souls(0); ctx.hint('hold');
      ctx.line('ÔNG BA MƯƠI'); setTimeout(() => ctx.line(''), 3200);
      ctx.say('Giờ Tý, giữa lòng chảo. Nhấn giữ để mở Mắt Âm. Bóng hổ chỉ đứng im khi bị nhìn thấy; nhìn thẳng khi nó tới gần để giải oán.');
      A.startAmbience(); A.setWorldLevel(1);
      if (ctx.jumpMaHo) { ctx.jumpMaHo = false; freed = 5; tigers.forEach((t) => { t.state = 'gone'; }); startMaHo(0); }
    },
    exit() { qte.classList.remove('show'); ctx.fx.center = null; },
    onDown() {
      if (phase === 'strike' && !qDone) strikeResult(Math.abs(qScale - 1) < 0.2);
    },
    update(dt, time) {
      phaseT += dt;
      // máy quay
      let ty = -(ctx.ptrS.x - 0.5) * 1.4, tp = (ctx.ptrS.y - 0.5) * 0.5;
      if (ctx.gyro) { ty += -ctx.gyro.g * 0.012; tp += (ctx.gyro.b - 50) * 0.006; }
      if (phase !== 'eye') { ty *= 0.4; tp = tp * 0.4 + 0.05; }
      yaw = THREE.MathUtils.damp(yaw, ty, 2.4, dt); pitch = THREE.MathUtils.damp(pitch, tp + 0.03, 2.4, dt);
      camera.rotation.set(pitch + Math.sin(time * 0.5) * 0.004, yaw + Math.sin(time * 0.31) * 0.006, 0);

      // Mắt Âm: hồi 3 nhấn giữ để mở; hồi 4 mở sẵn toàn khung hình
      let target = 0;
      if (phase === 'eye') target = ctx.holding ? 0.3 : 0;
      else target = 1.6;
      ctx.fx.radius = THREE.MathUtils.damp(ctx.fx.radius, target, ctx.holding || phase !== 'eye' ? 5 : 8, dt);
      ctx.fx.center = phase === 'eye' ? null : CENTER;
      const am = Math.min(1, ctx.fx.radius / 0.3);

      let near = 99;
      tigers.forEach((t) => { updateTiger(t, dt, time); if (t.state === 'stalk') near = Math.min(near, t.pos.distanceTo(EYE)); });
      if (phase === 'eye') ctx.hint(!ctx.holding && ctx.idle() > 2500 ? 'hold' : '');

      // Đại Ma Hổ
      if (phase !== 'eye') {
        const u = big.u; u.uTime.value = time;
        near = 9;
        if (phase === 'gather') {
          u.uDissolve.value = Math.max(0, 1 - phaseT / 2.4);
          if (phaseT > 0.3 && phaseT - dt <= 0.3) { A.roar(bigVoice); ctx.shake(0.8); }
          if (phaseT > 2.6) {
            phase = 'seal'; phaseT = 0; seals.forEach((s) => { s.g.visible = true; s.on = false; }); order = []; drawPath(); chainGeo.setFromPoints([]);
            ctx.hint('drag'); lungeAt = 5;
            ctx.say('Năm dấu bùa trên nền đất. Nhấn giữ rồi kéo nối qua cả năm dấu.');
          }
        }
        // đi qua đi lại, thỉnh thoảng vồ tới dọa
        const prowl = phase === 'seal' ? Math.sin(time * 0.6) * 3 : 0;
        const lunge = phase === 'seal' && phaseT > lungeAt ? Math.max(0, Math.sin((phaseT - lungeAt) * 3)) : 0;
        if (phase === 'seal' && phaseT > lungeAt + 1.05) { lungeAt = phaseT + 4 + Math.random() * 2; }
        if (lunge > 0.95 && !big.lunged) { big.lunged = true; A.growl(bigVoice, 1.4); ctx.shake(0.5); } if (lunge < 0.1) big.lunged = false;
        big.group.position.set(BIG_POS.x + prowl, 0, BIG_POS.z + lunge * 3.5);
        // đứng xéo ba phần tư để thấy dáng hổ; rình qua lại thì quay theo hướng đi
        big.group.rotation.y = phase === 'seal' ? Math.cos(time * 0.6) * 1.1 * (1 - lunge) : 0.75;
        u.uWalk.value += dt * (phase === 'seal' ? 2.4 : 0.4);
        u.uSmoke.value = 0.5;
        A.placeVoice(bigVoice, big.group.position.x, 3, big.group.position.z);
        if (phase === 'seal' || phase === 'gather') A.breathe(bigVoice, 2.2, 1);

        if (phase === 'seal') {
          if (ctx.holding) {
            seals.forEach((s, k) => {
              if (s.on) return;
              const sc = screen(s.p, 0.1);
              if (Math.hypot((sc.x - ctx.ptrS.x) * ctx.aspect, sc.y - ctx.ptrS.y) < 0.07) {
                s.on = true; order.push(k); A.tick(520 * Math.pow(1.19, order.length), 0.12); drawPath();
              }
            });
          }
          seals.forEach((s) => { s.ring.material.color.setHex(s.on ? 0xffe0a0 : 0xff5a2a); s.dot.scale.setScalar((s.on ? 1.4 : 0.8) + Math.sin(time * 4 + s.p.x) * 0.1); });
          ctx.hint(!ctx.holding && ctx.idle() > 2500 && order.length < 5 ? 'drag' : '');
          if (order.length === 5) {
            phase = 'bind'; phaseT = 0; drawPath(); ctx.hint(''); A.tick(1320, 0.18);
            const pts = []; const chest = BIG_POS.clone().setY(3.2);
            seals.forEach((s) => { pts.push(s.p.clone().setY(0.1), chest); });
            chainGeo.setFromPoints(pts);
            ctx.say('Năm dấu bùa khép lại, xích ánh sáng trói Đại Ma Hổ.');
          }
        }
        if (phase === 'bind') {
          ctx.shake(0.15); big.group.position.x += Math.sin(time * 30) * 0.08;
          if (phaseT > 1.6) startStrike();
        }
        if (phase === 'strike') {
          u.uRear.value = Math.min(1, phaseT / 0.8);
          if (!qDone) {
            qScale = Math.max(0, 2.4 - phaseT * 1.05);
            qRing.style.transform = `translate(-50%,-50%) scale(${qScale})`;
            if (qScale < 0.55) strikeResult(false);
          }
          near = 2;
        }
        if (phase === 'recover') { u.uRear.value = Math.max(0, 1 - phaseT * 1.5); if (phaseT > 1.4) startStrike(); }
        if (phase === 'won') {
          u.uDissolve.value = Math.min(1, phaseT / 2.2); u.uRear.value = 1;
          chains.material.opacity = Math.max(0, 0.95 - phaseT); seals.forEach((s) => { s.g.visible = phaseT < 1.2; });
          if (phaseT > 3.2 && phaseT - dt <= 3.2) ctx.next();
        }
      }
      if (phase !== 'won') { chains.material.opacity = 0.95; }
      pathLine.visible = phase === 'seal' || phase === 'bind' || phase === 'strike' || phase === 'recover' || (phase === 'won' && phaseT < 1.2);
      chains.visible = phase === 'bind' || phase === 'strike' || phase === 'recover' || phase === 'won';

      flickerTorches(torches, time);
      mist(time, dt);
      dust.rotation.y += dt * 0.01;
      A.setListener(camera);
      A.updateAmbience(am, 0, near);
    },
  };
}
