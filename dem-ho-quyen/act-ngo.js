// Hồi 1 · Giờ Ngọ. Người xem đứng ở khán đài phía Bắc, chỗ của vua.
// Trận voi hổ đông cứng giữa một khoảnh khắc; lăn chuột (hoặc kéo dọc) để tua thời gian của trận đấu.
// Nhạc chỉ đi khi thời gian đi: mỗi bước tua bật một nốt kèn ngũ cung.
import * as THREE from 'three';
import { buildArena, buildDust, solidTiger, elephant, R_IN, H_IN, onRing } from './common.js';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;
// ngũ cung: hò xự xang xê cống (Rê, Fa, Sol, La, Đô)
const SCALE = [293.7, 349.2, 392, 440, 523.3, 587.3, 698.5];
const TUNE = [0, 2, 3, 2, 4, 3, 2, 1, 0, 1, 2, 4, 5, 4, 3, 2, 3, 4, 6, 5, 4, 3, 2, 0, 1, 2, 3, 4, 5, 6, 5, 4];

export function createNgo(ctx) {
  const { A } = ctx;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaab3b2);
  scene.fog = new THREE.FogExp2(0xb8b4a6, 0.0075);
  const camera = new THREE.PerspectiveCamera(40, ctx.aspect, 0.1, 400);
  camera.rotation.order = 'YXZ';
  const EYE = new THREE.Vector3(0, H_IN + 2.3, R_IN + 0.6);
  camera.position.copy(EYE);

  buildArena(scene, { soldiers: true });
  scene.add(new THREE.HemisphereLight(0xcfe0f0, 0x4a3b2a, 1.1));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.8); sun.position.set(6, 40, -8); scene.add(sun);

  // lọng vàng, trống lớn trên khán đài (rìa khung hình, như trailer)
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe0ad22, roughness: 0.6, side: THREE.DoubleSide });
  [[-3.4, 1.2], [3.6, 1.0], [-5.2, 2.2]].forEach(([x, z]) => {
    const u = new THREE.Group(); u.position.set(x, H_IN + 1.2, R_IN + z);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 20, 1, true), yellow); top.position.y = 2.6; u.add(top);
    const fr = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.5, 20, 1, true), yellow); fr.position.y = 2.1; u.add(fr);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6), new THREE.MeshStandardMaterial({ color: 0x5a3a1c })); pole.position.y = 1.3; u.add(pole);
    scene.add(u);
  });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.0, 24), new THREE.MeshStandardMaterial({ color: 0x8e1d14, roughness: 0.6 }));
  drum.rotation.z = Math.PI / 2; drum.position.set(-2.6, H_IN + 1.7, R_IN - 0.2); scene.add(drum);

  // voi và hổ
  const E = elephant(); scene.add(E.root);
  const T = solidTiger(); scene.add(T.group);
  const ePos = new THREE.Vector3(-2.2, 0, 0.5);
  E.root.position.copy(ePos);
  const T0 = new THREE.Vector3(5.5, 0, -7.5), T1 = new THREE.Vector3(3.2, 0, -4.2);
  E.root.rotation.order = 'YXZ';
  E.root.rotation.y = Math.atan2(T1.x - ePos.x, T1.z - ePos.z);
  const headW = new THREE.Vector3();
  const dust = buildDust(scene, 0xe8d6b4, 2200, 0.05);
  const dustBase = dust.geometry.attributes.position.array.slice();
  // bụi tung lên quanh chân voi khi dẫm
  const burstN = 600, burstPos = new Float32Array(burstN * 3), burstVel = [];
  for (let i = 0; i < burstN; i++) { const a = Math.random() * 6.283, s = 1 + Math.random() * 5; burstVel.push([Math.cos(a) * s, 0.5 + Math.random() * 3.5, Math.sin(a) * s]); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(burstPos, 3));
  const burst = new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.12, color: 0xcbb38c, transparent: true, opacity: 0.7, depthWrite: false })); scene.add(burst);

  let t = 0, vel = 0, done = false, noteStep = 0, yaw = 0, pitch = 0, enteredAt = 0;

  function pose(t) {
    // hổ: rình, phóng, bám, bị hất, nằm dưới chân voi
    const crouch = smooth(0, 0.28, t) * (1 - smooth(0.3, 0.36, t));
    const leap = smooth(0.32, 0.55, t), thrown = smooth(0.7, 0.8, t);
    E.head.getWorldPosition(headW);
    const p = T.group.position;
    p.lerpVectors(T0, T1, smooth(0, 0.3, t));
    if (leap > 0) {
      const target = headW.clone().add(new THREE.Vector3(0.6, -1.6, 0.4));
      p.lerp(target, leap); p.y += Math.sin(leap * Math.PI) * 1.6 + leap * 0.0;
    }
    const ground = ePos.clone().add(new THREE.Vector3(2.2, 0, -1.2));
    if (thrown > 0) { p.lerp(ground, thrown); p.y = lerp(p.y, 0.25, thrown); }
    T.group.lookAt(ePos.x, p.y, ePos.z);
    T.body.position.y = -0.28 * crouch;
    T.body.rotation.x = -0.55 * Math.sin(leap * Math.PI) * (1 - thrown);
    T.body.rotation.z = 1.35 * thrown;
    T.legs.forEach((l, i) => { l.rotation.x = (i < 2 ? -1 : 1) * (0.5 * crouch + 0.9 * Math.sin(leap * Math.PI) * (1 - thrown)); });
    T.jaw.position.y = -0.18 - 0.08 * Math.max(crouch, Math.sin(leap * Math.PI));
    T.head.rotation.x = 0.3 * crouch - 0.2 * leap;
    // voi: ngẩng vòi, quật đầu, chồm lên, dẫm xuống
    const swing = smooth(0.55, 0.68, t) - smooth(0.68, 0.78, t);
    const rear = smooth(0.78, 0.89, t) * (1 - smooth(0.9, 0.935, t));
    E.head.rotation.x = -0.25 * smooth(0.1, 0.4, t) + 0.3 * swing;
    E.head.rotation.y = 0.7 * swing;
    E.trunk.rotation.x = -0.5 * smooth(0.15, 0.45, t) - 0.6 * rear;
    E.root.rotation.x = -0.42 * rear;
    E.legs[0].rotation.x = -0.6 * rear; E.legs[1].rotation.x = -0.4 * rear;
    // bụi: đứng im giữa không trung, chỉ chuyển theo thời gian của trận đấu
    const a = dust.geometry.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) { a[i] = dustBase[i] + Math.sin(i) * t * 0.8; a[i + 1] = dustBase[i + 1] + Math.cos(i * 1.3) * t * 0.5; }
    dust.geometry.attributes.position.needsUpdate = true;
    const stomp = smooth(0.92, 0.99, t);
    const sp = ePos.clone().add(new THREE.Vector3(1.6, 0, -0.9));
    for (let i = 0; i < burstN; i++) {
      const v = burstVel[i];
      burstPos[i * 3] = sp.x + v[0] * stomp * 0.6; burstPos[i * 3 + 1] = Math.max(0, v[1] * stomp - 2 * stomp * stomp); burstPos[i * 3 + 2] = sp.z + v[2] * stomp * 0.6;
    }
    bg.attributes.position.needsUpdate = true;
    burst.material.opacity = stomp > 0 ? 0.7 : 0;
  }
  pose(0);

  return {
    scene, camera,
    enter() {
      enteredAt = performance.now();
      t = 0; vel = 0; done = false; noteStep = 0; pose(0);
      ctx.fx.natural = 1; ctx.fx.radius = 0;
      ctx.stamp('GIỜ NGỌ · 1836'); ctx.souls(-1); ctx.hint('scroll');
      ctx.say('Giờ Ngọ, khán đài phía Bắc. Trận voi hổ dừng lại giữa chừng. Lăn chuột hoặc kéo lên để thời gian đi tiếp.');
      A.startDay(); A.dayLevel(1);
    },
    exit() { A.stopDay(); },
    onScrub(d) { if (!done) vel += d * 9; },
    update(dt, time) {
      // quán tính của thời gian: tua thì chạy, buông thì đông cứng lại
      vel *= Math.exp(-dt * 5);
      if (!done) t = THREE.MathUtils.clamp(t + vel * dt * 0.5, 0, 1);
      pose(t);
      const step = Math.floor(t * TUNE.length * 0.97);
      while (noteStep < step && noteStep < TUNE.length) {
        A.kenNote(SCALE[TUNE[noteStep]], 0.55, 0.12 + t * 0.06);
        if (noteStep % 4 === 0) A.drum(0.35); else A.phach();
        noteStep++;
      }
      if (step < noteStep - 2) noteStep = step;   // tua lùi
      A.dayLevel(1 - smooth(0.6, 0.9, t) * 0.85);
      if (!done && t >= 0.95) {
        done = true; A.cut(1.6); A.crack(); ctx.flash(1, 0x8a0d08); ctx.shake(1);
        ctx.say('Voi dẫm xuống. Mọi âm thanh tắt hẳn.');
        setTimeout(() => ctx.next(), 900);
      }
      ctx.hint(!done && ctx.idle() > 3000 && performance.now() - enteredAt > 1500 ? 'scroll' : '');
      // máy quay nhìn theo con trỏ, rung nhẹ khi thời gian chạy
      let ty = -(ctx.ptrS.x - 0.5) * 0.7, tp = (ctx.ptrS.y - 0.5) * 0.3;
      if (ctx.gyro) { ty += -ctx.gyro.g * 0.008; tp += (ctx.gyro.b - 50) * 0.004; }
      yaw = THREE.MathUtils.damp(yaw, ty, 2.5, dt); pitch = THREE.MathUtils.damp(pitch, tp - 0.33, 2.5, dt);
      const jit = Math.min(1, Math.abs(vel)) * 0.004;
      camera.rotation.set(pitch + (Math.random() - 0.5) * jit, yaw + (Math.random() - 0.5) * jit, 0);
      void time; void onRing;
    },
  };
}
