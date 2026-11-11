// Hồi 2 · Những chiếc rương. Chạng vạng, đường đất từ Hổ Quyền sang Điện Voi Ré.
// Ba chiếc rương gỗ đậy kín, mùi tanh, ruồi bâu. Rê lại gần thì rương rung; bấm để cạy nắp.
// Bên trong: da hổ còn máu, lệnh bài có dấu giả, đĩnh vàng mang ký hiệu lạ.
import * as THREE from 'three';
import { groundTexture, stripeTexture, softSprite, rng } from './common.js';

function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function peltTexture() {
  return canvas(512, 384, (g, w, h) => {
    const r = rng(41);
    g.save();
    g.beginPath();   // mép da rách, không đều
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2, rr = 0.42 + r() * 0.08 + (Math.abs(Math.cos(a * 2)) > 0.85 ? 0.08 : 0);
      g.lineTo(w / 2 + Math.cos(a) * rr * w, h / 2 + Math.sin(a) * rr * h);
    }
    g.closePath(); g.clip();
    g.drawImage(stripeTexture().image, 0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      const x = w * (0.3 + r() * 0.4), y = h * (0.3 + r() * 0.4), rad = 20 + r() * 70, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(110,0,0,.95)'); gr.addColorStop(0.6, 'rgba(70,0,0,.6)'); gr.addColorStop(1, 'rgba(60,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.restore();
  });
}
function plaqueTexture() {
  return canvas(128, 256, (g, w, h) => {
    g.fillStyle = '#2b1a10'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#a07a3a'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#b3221a'; g.fillRect(34, 150, 60, 60);              // dấu triện son đỏ, bị đóng lệch
    g.fillStyle = '#2b1a10'; g.fillRect(42, 158, 44, 44);
    g.fillStyle = '#b3221a'; g.fillRect(50, 166, 28, 28);
    g.strokeStyle = '#c9a25a'; g.lineWidth = 5;
    [[40, 40, 88, 40], [64, 30, 64, 120], [42, 80, 86, 80], [46, 104, 82, 118]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
  });
}
function goldTexture() {
  return canvas(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#f6d46a'); gr.addColorStop(0.5, '#c8922a'); gr.addColorStop(1, '#f0c45a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6a4210'; g.lineWidth = 4;
    g.beginPath(); g.arc(w / 2, h / 2, 34, 0, Math.PI * 2); g.stroke();       // ký hiệu lạ: con mắt trong vòng xoắn
    g.beginPath(); for (let a = 0; a < 12; a += 0.1) { const rr = 4 + a * 2.2; g.lineTo(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr * 0.7); } g.stroke();
    g.beginPath(); g.ellipse(w / 2, h / 2, 14, 6, 0, 0, Math.PI * 2); g.fillStyle = '#6a4210'; g.fill();
  });
}

// hộp bỏ mặt trên, để nhìn được đồ bên trong khi nắp bật
function openBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d), idx = g.index.array, top = g.groups[2];
  const keep = [...idx.slice(0, top.start), ...idx.slice(top.start + top.count)];
  g.setIndex(keep); g.clearGroups(); return g;
}

export function createRuong(ctx) {
  const { A } = ctx;
  const scene = new THREE.Scene();
  const DUSK = new THREE.Color(0x3d2a2e);
  scene.background = DUSK.clone(); scene.fog = new THREE.FogExp2(DUSK.clone(), 0.032);
  const camera = new THREE.PerspectiveCamera(50, ctx.aspect, 0.05, 200);
  camera.rotation.order = 'YXZ';
  const EYE = new THREE.Vector3(0, 2.0, 4.5);
  camera.position.copy(EYE);

  scene.add(new THREE.HemisphereLight(0x8a6a88, 0x2a1a10, 1.5));
  const sun = new THREE.DirectionalLight(0xff8a4a, 1.7); sun.position.set(-20, 6, -30); scene.add(sun);
  const fill = new THREE.PointLight(0xffa860, 16, 12, 1.4); fill.position.set(1.8, 2.8, 4.2); scene.add(fill);

  const peekLight = new THREE.PointLight(0xffd0a0, 0, 4, 1.5); scene.add(peekLight);
  // đường đất
  const gt = groundTexture().clone(); gt.needsUpdate = true; gt.repeat.set(30, 30);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ map: gt, color: 0x9a7a5a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 120), new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1, transparent: true, opacity: 0.55 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -40); scene.add(road);
  // hai hàng cây
  {
    const r = rng(17), N = 70, mat = new THREE.MeshStandardMaterial({ color: 0x14140f, roughness: 1 });
    const ti = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.35, 7, 6), mat, N), ci = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3, 2), mat, N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const side = i % 2 ? 1 : -1, k = 0.7 + r() * 0.9;
      p.set(side * (5 + r() * 9), 3.5 * k, 6 - r() * 70); s.set(k, k, k); m.compose(p, q, s); ti.setMatrixAt(i, m);
      p.y += 4.5 * k; s.set(k * (0.8 + r() * 0.5), k * (0.7 + r() * 0.5), k); m.compose(p, q, s); ci.setMatrixAt(i, m);
    }
    scene.add(ti, ci);
  }
  // Điện Voi Ré phía xa: cổng tam quan, đèn lồng le lói
  {
    const g = new THREE.Group(); g.position.set(0, 0, -34);
    const wall = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 1 }), roofM = new THREE.MeshStandardMaterial({ color: 0x3a2018, roughness: 1 }), black = new THREE.MeshBasicMaterial({ color: 0x050302 });
    [[-4.2, 3, 3.6], [0, 4.4, 4.8], [4.2, 3, 3.6]].forEach(([x, h, w]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.6), wall); b.position.set(x, h / 2, 0); g.add(b);
      const a = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.4, h * 0.6), black); a.position.set(x, h * 0.3, 0.81); g.add(a);
      const rf = new THREE.Mesh(new THREE.ConeGeometry(w * 0.85, 1.4, 4), roofM); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, 0.45); rf.position.set(x, h + 0.6, 0); g.add(rf);
    });
    const lan = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite(), color: 0xff7a30, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    lan.position.set(0, 2.2, 1.2); lan.scale.setScalar(1.4); g.add(lan);
    const ll = new THREE.PointLight(0xff7a30, 12, 14, 1.6); ll.position.set(0, 2.2, 2); g.add(ll);
    scene.add(g);
  }

  // ba chiếc rương
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2516, roughness: 0.85 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.5, metalness: 0.6 });
  const inside = new THREE.MeshStandardMaterial({ color: 0x120a06, roughness: 1, side: THREE.BackSide });
  const contents = [
    () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.72, 8, 6), new THREE.MeshStandardMaterial({ map: peltTexture(), transparent: true, alphaTest: 0.05, roughness: 0.9, side: THREE.DoubleSide }));
      const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 7) * 0.04 + Math.cos(p.getY(i) * 9) * 0.03); m.geometry.computeVertexNormals();
      m.rotation.x = -Math.PI / 2; m.position.y = 0.6; return m; },
    () => { const g = new THREE.Group();
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.38), [wood, wood, new THREE.MeshStandardMaterial({ map: plaqueTexture(), roughness: 0.7 }), wood, wood, wood]);
      p.position.set(-0.15, 0.58, 0); p.rotation.y = 0.3; g.add(p);
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xd8cbb0, roughness: 0.9 })); sc.rotation.z = Math.PI / 2; sc.rotation.y = -0.5; sc.position.set(0.2, 0.6, 0.1); g.add(sc);
      return g; },
    () => { const g = new THREE.Group(); const gold = new THREE.MeshStandardMaterial({ map: goldTexture(), roughness: 0.25, metalness: 0.9, emissive: 0x4a3008, emissiveIntensity: 0.6 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.18), [gold, gold, gold, gold, gold, gold]); b.position.set(0, 0.6, 0); b.rotation.y = 0.4; g.add(b);
      const glow = new THREE.PointLight(0xffc040, 3, 2.5, 2); glow.position.set(0, 0.9, 0); g.add(glow); return g; },
  ];
  const chests = [-1.75, 0, 1.75].map((x, i) => {
    const root = new THREE.Group(); root.position.set(x, 0, 0); root.rotation.y = (i - 1) * -0.18 + (i === 1 ? 0.06 : 0); scene.add(root);
    const shake = new THREE.Group(); root.add(shake);
    const body = new THREE.Mesh(openBox(1.1, 0.68, 0.76), wood); body.position.y = 0.34; shake.add(body);   // miệng rương để hở
    const hollow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.66), inside); hollow.position.y = 0.4; shake.add(hollow);
    [-0.4, 0.4].forEach((bx) => { const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.78), iron); band.position.set(bx, 0.34, 0); shake.add(band); });
    const hinge = new THREE.Group(); hinge.position.set(0, 0.68, -0.38); shake.add(hinge);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.12, 0.8), wood); lid.position.set(0, 0.06, 0.4); hinge.add(lid);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.04), iron); lock.position.set(0, -0.02, 0.81); hinge.add(lock);
    const c = contents[i](); c.visible = false; shake.add(c);
    // ruồi
    const fp = new Float32Array(36 * 3), fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    const flies = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0x0a0806, size: 0.025, transparent: true, opacity: 0.9 })); root.add(flies);
    return { root, shake, hinge, body, lid, c, flies, fp, open: 0, opening: false, hover: 0, knock: 0, seed: i * 3.1 };
  });
  const pickables = chests.flatMap((c, i) => [c.body, c.lid].map((m) => { m.userData.chest = i; return m; }));
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let focus = -1, focusUntil = 0, hovered = -1, opened = 0, endAt = -1, yaw = 0, pitch = 0, voice = null, enteredAt = 0;

  function pick() {
    ndc.set(ctx.ptrS.x * 2 - 1, ctx.ptrS.y * 2 - 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.chest : -1;
  }

  return {
    scene, camera,
    get opened() { return opened; },
    _screen(i) { const v = chests[i].root.position.clone(); v.y = 0.45; v.project(camera); return [(v.x + 1) / 2, (1 - v.y) / 2]; },
    enter() {
      enteredAt = performance.now();
      ctx.fx.natural = 0.75; ctx.fx.radius = 0;
      ctx.stamp('CHẠNG VẠNG'); ctx.souls(-1); ctx.hint('');
      ctx.say('Chạng vạng, đường đất sang Điện Voi Ré. Ba chiếc rương đậy kín, ruồi bâu. Bấm vào từng chiếc để cạy nắp.');
      A.startAmbience(); A.startFlies();
      voice = A.tigerVoice(9); A.placeVoice(voice, 0, 1.2, -30);
    },
    exit() { A.fliesLevel(0); },
    onDown() {
      const i = pick();
      if (i < 0) return;
      const c = chests[i];
      if (c.opening) return;
      c.opening = true; c.c.visible = true; A.creak(); ctx.shake(0.25);
      opened++; focus = i; focusUntil = performance.now() + 2600;
      ctx.say(['Da hổ, còn vết máu mới.', 'Một lệnh bài đóng dấu lệch, và tờ giấy thu mua.', 'Một đĩnh vàng mang ký hiệu lạ.'][i]);
    },
    update(dt, time) {
      hovered = pick();
      let near = 0;
      chests.forEach((c, i) => {
        c.hover = THREE.MathUtils.damp(c.hover, hovered === i && !c.opening ? 1 : 0, 8, dt);
        // rương rung như có gì bên trong; chiếc đang được rê vào rung mạnh, thỉnh thoảng bật lên
        if (!c.opening && Math.random() < dt * (0.25 + c.hover * 2.5)) c.knock = 1;
        c.knock = Math.max(0, c.knock - dt * 4);
        const j = (0.004 + c.hover * 0.02) * (1 + c.knock * 3);
        c.shake.rotation.set((Math.random() - 0.5) * j, (Math.random() - 0.5) * j * 0.5, (Math.random() - 0.5) * j);
        c.shake.position.y = c.knock * 0.03;
        if (c.opening) c.open = Math.min(1, c.open + dt * 1.4);
        const e = c.open < 0.55 ? (c.open / 0.55) * 0.12 : 0.12 + ((c.open - 0.55) / 0.45) ** 0.6 * 1.85;   // cạy hé rồi bật ngửa
        c.hinge.rotation.x = -e;
        // ruồi bay vòng quanh, tán ra khi nắp bật
        for (let k = 0; k < 36; k++) {
          const a = time * (2 + (k % 5)) + k * 1.7 + c.seed, rad = 0.35 + (k % 7) * 0.07 + c.open * 0.6;
          c.fp[k * 3] = Math.cos(a) * rad; c.fp[k * 3 + 1] = 0.8 + Math.sin(a * 1.7 + k) * 0.2 + c.open * (k % 3) * 0.3; c.fp[k * 3 + 2] = Math.sin(a) * rad * 0.8;
        }
        c.flies.geometry.attributes.position.needsUpdate = true;
        near = Math.max(near, c.hover * 0.6 + 0.15 + c.open * 0.2);
      });
      A.fliesLevel(near * (endAt > 0 ? 0.3 : 1));
      A.updateAmbience(0, 0, 99);
      document.body.style.cursor = hovered >= 0 && !chests[hovered].opening ? 'pointer' : '';
      if (opened >= 3 && endAt < 0) endAt = time + 2.2;
      if (endAt > 0 && time > endAt) {
        endAt = Infinity; A.roar(voice); ctx.shake(0.5);
        ctx.say('Từ phía đấu trường, một tiếng gầm.');
        setTimeout(() => { document.body.style.cursor = ''; ctx.next(); }, 2600);
      }
      ctx.hint(opened < 3 && ctx.idle() > 3500 && performance.now() - enteredAt > 2000 ? 'click' : '');
      // máy quay nhìn theo con trỏ, nhích tới rương đang rê vào
      let ty = -(ctx.ptrS.x - 0.5) * 0.6, tp = (ctx.ptrS.y - 0.5) * 0.3;
      if (ctx.gyro) ty += -ctx.gyro.g * 0.008;
      // vừa cạy một rương: máy quay cúi xuống nhìn vào trong một lúc
      const peek = focus >= 0 && performance.now() < focusUntil ? chests[focus].root.position : null;
      if (peek) { ty = Math.atan2(-(peek.x - camera.position.x), 1.6) * 0.6; tp = -0.62; }
      else tp -= 0.3;
      yaw = THREE.MathUtils.damp(yaw, ty, 2.5, dt); pitch = THREE.MathUtils.damp(pitch, tp, 2.5, dt);
      camera.rotation.set(pitch, yaw, 0);
      if (peek) peekLight.position.set(peek.x, 1.6, peek.z + 0.9);
      peekLight.intensity = THREE.MathUtils.damp(peekLight.intensity, peek ? 7 : 0, 3, dt);
      const target = peek || (hovered >= 0 ? chests[hovered].root.position : null);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, target ? target.x * (peek ? 0.8 : 0.35) : 0, 2, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, peek ? peek.z + 2.5 : target ? EYE.z - 0.5 : EYE.z, 2, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, peek ? 2.4 : EYE.y, 2, dt);
    },
  };
}
