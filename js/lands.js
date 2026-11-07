// VÙNG ĐẤT — địa hình âm giới trải dọc hành trình, giữa mỗi hai cảnh là một vùng đất riêng.
// Máy quay rời cảnh, lặn xuống bay sát mặt đất xuyên qua vùng đó rồi vút lên cảnh kế tiếp.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NOISE } from './shaders.js';
import { radialTexture } from './fx.js';

export const LANDS = [
  { name: 'Ngàn Sơn Mù Sương', han: '霧', key: 'peaks' },
  { name: 'Rừng Trúc Âm', han: '竹', key: 'bamboo' },
  { name: 'Bãi Tha Ma', han: '墳', key: 'graves' },
  { name: 'Thành Quách Hoang Phế', han: '城', key: 'fort' },
  { name: 'Dòng Sông Hồn', han: '河', key: 'river' },
  { name: 'Lối Tam Quan', han: '廟', key: 'shrine' },
  { name: 'Rừng Cây Chết', han: '枯', key: 'deadwood' },
  { name: 'Hồ Sen Mộng', han: '蓮', key: 'lotus' },
  { name: 'Bậc Đá Đăng Thiên', han: '梯', key: 'stairs' }
];

/* ---------- noise phía CPU để dựng địa hình ---------- */
const fr = (x) => x - Math.floor(x);
const hash = (x, y) => fr(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy * (1 - ux) + (d - b) * ux * uy;
}
function fbm(x, y, o = 4) {
  let v = 0, a = 0.5;
  for (let i = 0; i < o; i++) { v += a * vnoise(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; a *= 0.5; }
  return v;
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;

/** bảng tra tuyến tính theo z (z giảm dần) */
function table(points) {
  return (z) => {
    if (z >= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      if (z >= points[i][0]) {
        const [z0, v0] = points[i - 1], [z1, v1] = points[i];
        const t = (z - z0) / (z1 - z0);
        return lerp(v0, v1, t * t * (3 - 2 * t));
      }
    }
    return points[points.length - 1][1];
  };
}

/* ---------- vật liệu bóng đen viền ngọc (dùng cho mọi công trình, có instancing) ---------- */
function silhouetteMaterial(fog, { tint = [0.02, 0.03, 0.028], rim = [0.2, 0.75, 0.62] } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTint: { value: new THREE.Vector3(...tint) },
      uRim: { value: new THREE.Vector3(...rim) },
      uFogColor: { value: fog.color }, uFogNear: fog.nearU, uFogFar: fog.farU
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vW; varying float vDepth;
      void main(){
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = m*instanceMatrix;
        #endif
        vec4 w = m*vec4(position, 1.);
        vW = w.xyz;
        vN = normalize(mat3(m)*normal);
        vec4 mv = viewMatrix*w;
        vDepth = -mv.z;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTint, uRim, uFogColor; uniform float uFogNear, uFogFar;
      varying vec3 vN; varying vec3 vW; varying float vDepth;
      void main(){
        vec3 n = normalize(vN);
        vec3 v = normalize(cameraPosition - vW);
        float fres = pow(1. - max(dot(n, v), 0.), 3.);
        float moon = max(dot(n, normalize(vec3(-.35, .8, -.5))), 0.);
        vec3 col = uTint*(.5 + moon*1.4) + uRim*fres*.55;
        float f = smoothstep(uFogNear, uFogFar, vDepth);
        gl_FragColor = vec4(mix(col, uFogColor, f), 1.);
      }`
  });
}

export function createLands({ scene, shots, fog, sharedTime, isMobile, pixelRatio }) {
  const N = shots.length;
  const camZ = shots.map((s) => s.camPos.z);

  /* ---- mặt đất nền: thấp hơn mỗi cảnh 9 đơn vị ---- */
  const gyAt = table(shots.map((s) => [s.camPos.z, Math.min(s.anchor.y, s.camPos.y) - 9]));

  /* ---- đường bay của từng đoạn (Bezier bậc 3: cảnh A → lặn xuống → lướt sát đất → vút lên cảnh B) ---- */
  const ALT = 3.2;
  const segs = [];
  for (let i = 0; i < N - 1; i++) {
    const A = shots[i].camPos, B = shots[i + 1].camPos;
    const wander = (i % 2 ? 1 : -1) * 5;
    const z1 = lerp(A.z, B.z, 0.3), z2 = lerp(A.z, B.z, 0.7);
    const c1 = new THREE.Vector3(lerp(A.x, B.x, 0.25) + wander, gyAt(z1) + ALT - 3.2, z1);
    const c2 = new THREE.Vector3(lerp(A.x, B.x, 0.75) - wander * 0.6, gyAt(z2) + ALT - 3.2, z2);
    segs.push({ c1, c2 });
  }
  const bez = (a, b, c, d, t, out) => {
    const u = 1 - t;
    return out.set(0, 0, 0)
      .addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t)
      .addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t);
  };
  /** điểm trên đường bay (A, B có thể đã cộng offset lấy nét của từng cảnh) */
  function pathPoint(i, t, A, B, out) {
    return bez(A, segs[i].c1, segs[i].c2, B, t, out);
  }

  // trục thung lũng = hình chiếu đường bay lên mặt đất
  const tmp = new THREE.Vector3();
  const axis = [];
  for (let i = 0; i < N - 1; i++) {
    for (let k = 0; k < 24; k++) {
      pathPoint(i, k / 24, shots[i].camPos, shots[i + 1].camPos, tmp);
      axis.push([tmp.z, tmp.x]);
    }
  }
  axis.push([shots[N - 1].camPos.z, shots[N - 1].camPos.x]);
  axis.sort((a, b) => b[0] - a[0]);
  const xcAt = table(axis);

  /* ---- vùng đất theo z ---- */
  const regionAt = (z) => {
    for (let i = 0; i < N - 1; i++) if (z <= camZ[i] && z >= camZ[i + 1]) return i + (camZ[i] - z) / (camZ[i] - camZ[i + 1]);
    return z > camZ[0] ? 0 : N - 1.001;
  };
  // tham số địa hình mỗi vùng: [nửa bề rộng lòng chảo, biên độ núi, độ sắc sống núi, có nước]
  const P = {
    peaks: [5, 34, 1, 0], bamboo: [7, 14, 0.2, 0], graves: [9, 10, 0.1, 0], fort: [10, 16, 0.3, 0],
    river: [11, 18, 0.5, 1], shrine: [7, 20, 0.4, 0], deadwood: [8, 13, 0.3, 0], lotus: [18, 9, 0.2, 1], stairs: [4, 38, 0.9, 0]
  };
  function params(z) {
    const r = regionAt(z);
    const i = Math.min(N - 2, Math.floor(r)), f = r - i;
    const a = P[LANDS[i].key];
    // pha trộn mềm với vùng lân cận ở mép
    const nb = f > 0.5 ? P[LANDS[Math.min(N - 2, i + 1)].key] : P[LANDS[Math.max(0, i - 1)].key];
    const w = f > 0.5 ? sstep(0.85, 1.15, f) * 0.5 : sstep(0.15, -0.15, f) * 0.5;
    return a.map((v, k) => lerp(v, nb[k], w));
  }

  // gần mỗi cảnh: lòng chảo mở rộng, núi lùi xa để không che nội dung
  const anchorZ = shots.map((s) => s.anchor.z);
  const nearShot = (z) => {
    let v = 0;
    for (let i = 0; i < N; i++) v = Math.max(v, 1 - sstep(14, 34, Math.abs(z - (anchorZ[i] + 4))));
    return v;
  };
  function heightAt(x, z) {
    const gy = gyAt(z), xc = xcAt(z), d = Math.abs(x - xc);
    let [hw, amp, ridgeK, water] = params(z);
    const ns = nearShot(z);
    hw += ns * 34;
    amp *= 1 - ns * 0.6;
    const rise = Math.pow(sstep(hw, hw + 30, d), 1.4);
    const n = fbm(x * 0.028, z * 0.028);
    const ridge = 1 - Math.abs(2 * fbm(x * 0.05 + 3, z * 0.05) - 1);
    let h = gy + rise * amp * (0.45 + n) + ridge * ridge * rise * amp * 0.7 * ridgeK;
    h += (fbm(x * 0.16, z * 0.16) - 0.5) * 1.4 * (1 - rise * 0.4);
    if (water > 0.5) h -= (1 - sstep(hw * 0.6, hw, d)) * 1.2;
    return h;
  }

  /* ---- lưới địa hình ---- */
  const zTop = camZ[0] + 30, zBot = camZ[N - 1] - 70;
  const L = zTop - zBot, Wd = 280;
  const geo = new THREE.PlaneGeometry(Wd, L, isMobile ? 90 : 150, isMobile ? 260 : 420);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const aH = new Float32Array(pos.count);
  const zMid = (zTop + zBot) / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i) + zMid;
    const h = heightAt(x, z);
    pos.setY(i, h);
    pos.setZ(i, z);
    aH[i] = h - gyAt(z);
  }
  geo.setAttribute('aH', new THREE.BufferAttribute(aH, 1));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { uTime: sharedTime, uWake: { value: 0 }, uFogColor: { value: fog.color }, uFogNear: fog.nearU, uFogFar: fog.farU },
    vertexShader: /* glsl */ `
      attribute float aH;
      varying float vH; varying vec3 vN; varying vec3 vW; varying float vDepth;
      void main(){
        vH = aH; vN = normal;
        vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz;
        vec4 mv = viewMatrix*w; vDepth = -mv.z;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uWake; uniform vec3 uFogColor; uniform float uFogNear, uFogFar;
      varying float vH; varying vec3 vN; varying vec3 vW; varying float vDepth;
      ${NOISE}
      void main(){
        vec3 n = normalize(vN);
        float moon = max(dot(n, normalize(vec3(-.35, .8, -.5))), 0.);
        float wash = vnoise(vW.xz*.05)*.65 + vnoise(vW.xz*.17)*.35;
        vec3 col = mix(vec3(.010,.016,.014), vec3(.03,.045,.04), wash)*(.45 + moon*1.3);
        // đường đồng mức như địa đồ âm phủ: xanh ngọc mảnh, cứ 5 đường có một đường vàng
        float h = vH/1.4;
        float fw = fwidth(h);
        float line = 1. - smoothstep(fw*.6, fw*1.6, abs(fract(h + .5) - .5));
        line *= 1. - smoothstep(.25, .7, fw);
        float major = (1. - smoothstep(fw*.6, fw*1.8, abs(fract(h/5. + .5) - .5)*5.))*(1. - smoothstep(.4, 1.2, fw));
        float near = (1. - smoothstep(6., 50., vDepth))*(.3 + .7*uWake);
        float pulse = .7 + .3*sin(vH*.6 - uTime*1.2);
        col += vec3(.05,.2,.16)*line*near*pulse*.6 + vec3(.32,.22,.1)*major*near*.45;
        float f = smoothstep(uFogNear, uFogFar, vDepth);
        gl_FragColor = vec4(mix(col, uFogColor, f), 1.);
      }`
  }));
  scene.add(ground);

  /* ---- công cụ rải vật thể ---- */
  const dummy = new THREE.Object3D();
  const sil = silhouetteMaterial(fog);
  const silWarm = silhouetteMaterial(fog, { tint: [0.035, 0.026, 0.02], rim: [0.7, 0.45, 0.2] });
  const rand = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const zIn = (i, a = 0.4, b = 0.97) => lerp(camZ[i], camZ[i + 1], lerp(a, b, rand()));
  function instanced(geom, mat, list) {
    const m = new THREE.InstancedMesh(geom, mat, list.length);
    list.forEach((o, k) => {
      dummy.position.set(o.x, o.y, o.z);
      dummy.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
      dummy.scale.set(o.sx || 1, o.sy || 1, o.sz || 1);
      dummy.updateMatrix();
      m.setMatrixAt(k, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    scene.add(m);
    return m;
  }
  /** rải n vật thể trong vùng i, cách trục bay [dMin, dMax] */
  function scatter(i, n, dMin, dMax, fn, a, b) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const z = zIn(i, a, b);
      const side = rand() < 0.5 ? -1 : 1;
      const x = xcAt(z) + side * lerp(dMin, dMax, Math.pow(rand(), 0.8));
      out.push(fn(x, heightAt(x, z), z, k));
    }
    return out;
  }
  const lights = []; // [x,y,z,r,g,b,size]
  const light = (x, y, z, c, s) => lights.push([x, y, z, c[0], c[1], c[2], s]);
  const JADE = [0.3, 1, 0.8], AMBER = [1, 0.55, 0.2], RED = [1, 0.25, 0.12], PEARL = [1, 0.8, 0.85];
  const waters = [];
  const movers = [];

  const regionBuilders = {
    peaks(i) {
      const g = new THREE.ConeGeometry(1, 1, 6, 1);
      instanced(g, sil, scatter(i, isMobile ? 12 : 20, 16, 70, (x, y, z) => ({ x, y: y + 8, z, sx: 6 + rand() * 9, sz: 6 + rand() * 9, sy: 26 + rand() * 30, ry: rand() * 6 })));
      // chùa cô độc trên đỉnh: mái tầng
      const pag = mergeGeometries([
        new THREE.CylinderGeometry(0.9, 1.1, 1.6, 6).translate(0, 0.8, 0),
        new THREE.ConeGeometry(2.2, 0.9, 4).rotateY(Math.PI / 4).translate(0, 1.9, 0),
        new THREE.CylinderGeometry(0.7, 0.8, 1.1, 6).translate(0, 2.8, 0),
        new THREE.ConeGeometry(1.7, 0.8, 4).rotateY(Math.PI / 4).translate(0, 3.6, 0),
        new THREE.ConeGeometry(0.3, 1.4, 4).translate(0, 4.6, 0)
      ]);
      const z = lerp(camZ[i], camZ[i + 1], 0.62), x = xcAt(z) + 22;
      instanced(pag, silWarm, [{ x, y: heightAt(x, z) - 0.2, z, sx: 1.6, sy: 1.6, sz: 1.6 }]);
      light(x, heightAt(x, z) + 2.4, z, AMBER, 3);
    },
    bamboo(i) {
      const g = new THREE.CylinderGeometry(0.09, 0.13, 1, 5, 1).translate(0, 0.5, 0);
      instanced(g, sil, scatter(i, isMobile ? 220 : 480, 3.2, 34, (x, y, z) => ({ x, y: y - 0.3, z, sy: 8 + rand() * 11, rx: (rand() - 0.5) * 0.14, rz: (rand() - 0.5) * 0.14 })));
      const leaf = new THREE.PlaneGeometry(1, 0.22);
      instanced(leaf, sil, scatter(i, isMobile ? 160 : 360, 3, 30, (x, y, z) => ({ x, y: y + 6 + rand() * 11, z, ry: rand() * 6, rz: (rand() - 0.5) * 1.4, sx: 0.8 + rand() * 0.7 })));
      scatter(i, 18, 3, 20, (x, y, z) => light(x, y + 1 + rand() * 4, z, JADE, 1.4));
    },
    graves(i) {
      const stone = new THREE.BoxGeometry(0.75, 1.1, 0.18).translate(0, 0.55, 0);
      instanced(stone, sil, scatter(i, isMobile ? 60 : 120, 2.5, 26, (x, y, z) => ({ x, y: y - 0.1, z, ry: (rand() - 0.5) * 0.6, rz: (rand() - 0.5) * 0.25, sy: 0.7 + rand() * 0.8 })));
      const mound = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      instanced(mound, sil, scatter(i, isMobile ? 40 : 80, 3, 28, (x, y, z) => ({ x, y: y - 0.25, z, sx: 1.2 + rand(), sz: 1.2 + rand(), sy: 0.6 + rand() * 0.4 })));
      scatter(i, isMobile ? 26 : 50, 2.5, 22, (x, y, z) => light(x, y + 0.8 + rand() * 2.5, z, JADE, 1.6 + rand()));
      // nhang cắm trên mộ
      scatter(i, 30, 2.5, 18, (x, y, z) => light(x, y + 0.9, z, RED, 0.5));
    },
    fort(i) {
      const wall = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
      const list = [];
      for (let k = 0; k < 26; k++) {
        const z = lerp(camZ[i], camZ[i + 1], 0.3 + (k / 26) * 0.68);
        for (const side of [-1, 1]) {
          if (rand() < 0.22) continue; // tường đổ nát
          const x = xcAt(z) + side * (9 + Math.sin(k * 0.7) * 1.5);
          list.push({ x, y: heightAt(x, z) - 0.5, z, sx: 1.2, sy: 3 + rand() * 2.5, sz: 2.6 });
        }
      }
      instanced(wall, sil, list);
      const tower = mergeGeometries([
        new THREE.BoxGeometry(2.6, 7, 2.6).translate(0, 3.5, 0),
        new THREE.ConeGeometry(2.6, 2.2, 4).rotateY(Math.PI / 4).translate(0, 8.1, 0)
      ]);
      const towers = [];
      for (let k = 0; k < 6; k++) {
        const z = lerp(camZ[i], camZ[i + 1], 0.34 + k * 0.12);
        const side = k % 2 ? 1 : -1;
        const x = xcAt(z) + side * 10.5;
        const y = heightAt(x, z) - 0.4;
        towers.push({ x, y, z });
        light(x - side * 1.4, y + 5.5, z, RED, 2.2);
      }
      instanced(tower, silWarm, towers);
    },
    river(i) {
      waters.push(i);
      // đèn hoa đăng trôi trên sông
      for (let k = 0; k < (isMobile ? 40 : 90); k++) {
        const z = zIn(i, 0.25, 1);
        movers.push({ i, z, off: (rand() - 0.5) * 6, k: 0.4 + rand() * 0.6 });
      }
      const g = new THREE.ConeGeometry(1, 1, 5);
      instanced(g, sil, scatter(i, 14, 18, 60, (x, y, z) => ({ x, y: y + 6, z, sx: 5 + rand() * 6, sz: 5 + rand() * 6, sy: 14 + rand() * 16 })));
    },
    shrine(i) {
      // dãy cổng tam quan nằm ngay trên đường bay — máy quay chui qua từng cổng
      const gate = mergeGeometries([
        new THREE.CylinderGeometry(0.32, 0.38, 8, 8).translate(-3.6, 4, 0),
        new THREE.CylinderGeometry(0.32, 0.38, 8, 8).translate(3.6, 4, 0),
        new THREE.BoxGeometry(9.6, 0.55, 0.7).translate(0, 8.2, 0),
        new THREE.BoxGeometry(8.4, 0.35, 0.5).translate(0, 6.9, 0),
        new THREE.BoxGeometry(10.6, 0.25, 1.1).translate(0, 8.6, 0)
      ]);
      const list = [];
      const A = shots[i].camPos, B = shots[i + 1].camPos;
      for (let k = 0; k < 7; k++) {
        const t = 0.3 + k * 0.065;
        pathPoint(i, t, A, B, tmp);
        const p2 = pathPoint(i, t + 0.01, A, B, new THREE.Vector3());
        const ry = Math.atan2(p2.x - tmp.x, p2.z - tmp.z);
        const y = heightAt(tmp.x, tmp.z) - 0.3;
        list.push({ x: tmp.x, y, z: tmp.z, ry });
        light(tmp.x + Math.cos(ry) * 3.6, y + 7.6, tmp.z - Math.sin(ry) * 3.6, RED, 1.8);
        light(tmp.x - Math.cos(ry) * 3.6, y + 7.6, tmp.z + Math.sin(ry) * 3.6, RED, 1.8);
      }
      instanced(gate, silWarm, list);
      const lantern = mergeGeometries([
        new THREE.BoxGeometry(0.5, 1.2, 0.5).translate(0, 0.6, 0),
        new THREE.BoxGeometry(0.9, 0.7, 0.9).translate(0, 1.55, 0),
        new THREE.ConeGeometry(0.8, 0.5, 4).rotateY(Math.PI / 4).translate(0, 2.15, 0)
      ]);
      instanced(lantern, sil, scatter(i, 30, 5, 9, (x, y, z) => { light(x, y + 1.55, z, AMBER, 1.3); return { x, y: y - 0.1, z }; }));
    },
    deadwood(i) {
      const parts = [new THREE.CylinderGeometry(0.12, 0.35, 6, 5).translate(0, 3, 0)];
      for (let b = 0; b < 4; b++) {
        const br = new THREE.CylinderGeometry(0.04, 0.12, 2.8, 4).translate(0, 1.4, 0);
        br.rotateZ((b % 2 ? 1 : -1) * (0.6 + b * 0.15));
        br.rotateY(b * 1.7);
        br.translate(0, 2.8 + b * 0.8, 0);
        parts.push(br);
      }
      const tree = mergeGeometries(parts);
      instanced(tree, sil, scatter(i, isMobile ? 60 : 130, 3, 34, (x, y, z) => ({ x, y: y - 0.3, z, ry: rand() * 6, rz: (rand() - 0.5) * 0.3, sx: 0.8 + rand() * 0.6, sy: 0.8 + rand() * 0.9, sz: 0.8 + rand() * 0.6 })));
      // quạ đen? — đốm mắt đỏ lấp ló trên cành
      scatter(i, 24, 4, 24, (x, y, z) => light(x, y + 4 + rand() * 3, z, RED, 0.45));
      scatter(i, 16, 3, 20, (x, y, z) => light(x, y + 1 + rand() * 3, z, JADE, 1.5));
    },
    lotus(i) {
      waters.push(i);
      const pad = new THREE.CylinderGeometry(1, 1, 0.04, 10);
      instanced(pad, sil, scatter(i, isMobile ? 90 : 200, 1.5, 17, (x, y, z) => {
        const s = 0.4 + rand() * 0.8;
        return { x, y: gyAt(z) + 0.03, z, sx: s, sz: s };
      }, 0.2, 1));
      scatter(i, isMobile ? 50 : 110, 1.5, 16, (x, y, z) => light(x, gyAt(z) + 0.35, z, rand() < 0.7 ? PEARL : AMBER, 1 + rand() * 0.8), 0.2, 1);
    },
    stairs(i) {
      // bậc đá dẫn lên trời, hai bên là cột đá treo bùa
      const step = new THREE.BoxGeometry(5, 0.4, 1.4).translate(0, 0.2, 0);
      const list = [];
      for (let k = 0; k < 46; k++) {
        const z = lerp(camZ[i], camZ[i + 1], 0.3 + (k / 46) * 0.68);
        const x = xcAt(z);
        list.push({ x, y: heightAt(x, z) - 0.1 + k * 0.05, z });
      }
      instanced(step, sil, list);
      const pillar = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
      instanced(pillar, silWarm, scatter(i, 16, 4.5, 7, (x, y, z) => { const h = 6 + rand() * 6; light(x, y + h + 0.4, z, AMBER, 1.6); return { x, y, z, sx: 0.9, sz: 0.9, sy: h }; }));
      const g = new THREE.ConeGeometry(1, 1, 5);
      instanced(g, sil, scatter(i, 16, 10, 50, (x, y, z) => ({ x, y: y + 4, z, sx: 4 + rand() * 5, sz: 4 + rand() * 5, sy: 30 + rand() * 25 })));
    }
  };
  LANDS.forEach((l, i) => regionBuilders[l.key](i));

  /* ---- mặt nước (sông, hồ): đen bóng, gợn ánh trăng xanh ---- */
  const waterMat = new THREE.ShaderMaterial({
    uniforms: { uTime: sharedTime, uFogColor: { value: fog.color }, uFogNear: fog.nearU, uFogFar: fog.farU },
    vertexShader: `varying vec3 vW; varying float vDepth; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vec4 mv = viewMatrix*w; vDepth = -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uFogColor; uniform float uFogNear, uFogFar;
      varying vec3 vW; varying float vDepth;
      ${NOISE}
      void main(){
        float n = fbm(vW.xz*vec2(.25, .08) + vec2(0., uTime*.25));
        float s = pow(smoothstep(.55, .8, n), 2.);
        vec3 col = vec3(.006,.014,.013) + vec3(.12,.4,.34)*s*.5 + vec3(.6,.4,.2)*pow(s, 4.)*.25;
        float f = smoothstep(uFogNear, uFogFar, vDepth);
        gl_FragColor = vec4(mix(col, uFogColor, f), .93);
      }`,
    transparent: true, depthWrite: false
  });
  waters.forEach((i) => {
    const z0 = lerp(camZ[i], camZ[i + 1], 0.15), z1 = lerp(camZ[i], camZ[i + 1], 1.05);
    const len = z0 - z1, n = 40;
    const g = new THREE.PlaneGeometry(1, 1, 1, n);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const hw = LANDS[i].key === 'lotus' ? 26 : 16;
    for (let k = 0; k < p.count; k++) {
      const z = z0 - (p.getZ(k) + 0.5) * len;
      p.setXYZ(k, xcAt(z) + p.getX(k) * hw * 2, gyAt(z) - 0.15, z);
    }
    const m = new THREE.Mesh(g, waterMat);
    m.frustumCulled = false;
    scene.add(m);
  });

  /* ---- đốm sáng: đèn, ma trơi, hoa đăng (một Points duy nhất) ---- */
  const lanternBase = lights.length;
  movers.forEach(() => lights.push([0, 0, 0, 1, 0.6, 0.25, 1.5]));
  const lp = new Float32Array(lights.length * 3), lc = new Float32Array(lights.length * 3), ls = new Float32Array(lights.length), lseed = new Float32Array(lights.length);
  lights.forEach((l, k) => { lp.set(l.slice(0, 3), k * 3); lc.set(l.slice(3, 6), k * 3); ls[k] = l[6]; lseed[k] = rand(); });
  const lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute('position', new THREE.BufferAttribute(lp, 3).setUsage(THREE.DynamicDrawUsage));
  lgeo.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  lgeo.setAttribute('aSize', new THREE.BufferAttribute(ls, 1));
  lgeo.setAttribute('aSeed', new THREE.BufferAttribute(lseed, 1));
  const glow = radialTexture([[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,.55)'], [0.5, 'rgba(255,255,255,.08)'], [1, 'rgba(255,255,255,0)']], 64);
  const lmat = new THREE.ShaderMaterial({
    uniforms: { uTime: sharedTime, uMap: { value: glow }, uPR: { value: pixelRatio }, uFogNear: fog.nearU, uFogFar: fog.farU },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aSeed; attribute vec3 color;
      uniform float uTime, uPR, uFogNear, uFogFar;
      varying vec3 vC; varying float vA;
      void main(){
        vec4 mv = modelViewMatrix*vec4(position + vec3(0., sin(uTime*(.6 + aSeed) + aSeed*30.)*.25, 0.), 1.);
        gl_Position = projectionMatrix*mv;
        float flick = .65 + .35*sin(uTime*(2. + aSeed*5.) + aSeed*40.);
        gl_PointSize = aSize*uPR*90./max(1., -mv.z);
        vC = color*flick;
        vA = 1. - smoothstep(uFogNear, uFogFar + 20., -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; varying vec3 vC; varying float vA;
      void main(){ float a = texture2D(uMap, gl_PointCoord).r; gl_FragColor = vec4(vC*a*vA*1.6, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const lpts = new THREE.Points(lgeo, lmat);
  lpts.frustumCulled = false;
  scene.add(lpts);

  function updateMovers(dt) {
    if (!movers.length) return;
    const arr = lgeo.attributes.position.array;
    movers.forEach((m, k) => {
      const zs = camZ[m.i], ze = camZ[m.i + 1];
      m.z -= m.k * dt * 0.9;
      if (m.z < ze) m.z = zs - (zs - ze) * 0.25;
      const j = (lanternBase + k) * 3;
      arr[j] = xcAt(m.z) + m.off;
      arr[j + 1] = gyAt(m.z) + 0.15;
      arr[j + 2] = m.z;
    });
    lgeo.attributes.position.needsUpdate = true;
  }

  return {
    pathPoint, heightAt, gyAt, xcAt, ground,
    update(dt, wake) { updateMovers(dt); ground.material.uniforms.uWake.value = wake; }
  };
}
