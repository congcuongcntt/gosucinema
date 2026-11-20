// RỪNG TRÚC — trúc dựng thủ tục, hướng tới chân thực:
//  · thân có đốt (gờ mắt, vòng phấn trắng dưới mắt, rêu mốc, sọc dọc), thon dần, ngọn võng xuống
//  · cành mọc từ mắt ở nửa trên, chùm lá thuôn dài vẽ bằng canvas (alpha), lá xuyên sáng khi ngược nắng
//  · gió: cả cây lắc theo cơn gió chung, ngọn lắc mạnh hơn gốc, lá rung riêng
//  · sương: sương mù theo độ cao + ánh tán xạ về phía nguồn sáng
// Dùng chung cho trang rung-truc/ và vùng "Rừng Trúc Âm" trong storyboard (js/lands.js).
import * as THREE from 'three';

export function rng(seed = 1) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ------------------------------------------------------------------ GLSL dùng chung */
const GLSL_NOISE = /* glsl */ `
float bh(vec3 p){ p = fract(p*.3183099 + .1); p *= 17.; return fract(p.x*p.y*p.z*(p.x + p.y + p.z)); }
float bn(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3. - 2.*f);
  return mix(mix(mix(bh(i), bh(i + vec3(1,0,0)), f.x), mix(bh(i + vec3(0,1,0)), bh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(bh(i + vec3(0,0,1)), bh(i + vec3(1,0,1)), f.x), mix(bh(i + vec3(0,1,1)), bh(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float bfbm(vec3 p){ return bn(p)*.5 + bn(p*2.03 + 7.1)*.25 + bn(p*4.01 + 3.7)*.125 + bn(p*8.1 + 1.3)*.0625; }
`;

const GLSL_WIND = /* glsl */ `
uniform float uTime, uWind;
uniform vec3 uWindDir;
float culmSeed(vec2 b){ return fract(sin(dot(b, vec2(12.9898, 78.233)))*43758.5453); }
// độ lệch ngang của một cây trúc ở độ cao tương đối f (0 gốc → 1 ngọn), H là chiều cao thật
vec3 culmSway(vec2 base, float f, float H){
  float s = culmSeed(base);
  // cơn gió lớn lan qua rừng theo hướng gió
  float front = dot(base, uWindDir.xz)*.045 - uTime*.55;
  float gust = .45 + .55*(.5 + .5*sin(front))*(.6 + .4*sin(front*.37 + 1.7));
  float sway = sin(uTime*(.75 + s*.35) + s*6.283)*.55 + sin(uTime*(1.6 + s*.6) + s*19.)*.18;
  vec3 side = vec3(-uWindDir.z, 0., uWindDir.x);
  vec3 d = uWindDir*(gust*.9 + sway*.45) + side*sin(uTime*(.6 + s*.3) + s*40.)*.35;
  return d*uWind*f*f*H*.028;
}
`;

const GLSL_LIGHT = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir, uSunCol, uSkyCol, uGndCol, uFogCol, uFogSunCol;
uniform float uFogDensity, uFogHeight, uGroundY, uFogLinear, uFogNear, uFogFar, uCanopyY, uDapple;
// ánh nắng lọt qua tán: vệt sáng loang lổ, dịch chậm theo gió
float dapple(vec3 w){
  vec2 p = w.xz + uSunDir.xz/max(uSunDir.y, .2)*(uCanopyY - w.y);
  float n = bn(vec3(p*.32, uTime*.05)) *.65 + bn(vec3(p*1.1, uTime*.12))*.35;
  return smoothstep(.5, .78, n);
}
vec3 bambooFog(vec3 col, vec3 w){
  vec3 v = w - cameraPosition; float d = length(v); vec3 vd = v/max(d, 1e-4);
  float f;
  if (uFogLinear > .5) f = smoothstep(uFogNear, uFogFar, d);
  else {
    float hAvg = (max(w.y - uGroundY, 0.) + max(cameraPosition.y - uGroundY, 0.))*.5;
    float dens = uFogDensity*(.45 + 1.4*exp(-hAvg/uFogHeight));
    f = 1. - exp(-d*dens);
  }
  float sunAmt = pow(max(dot(vd, uSunDir), 0.), 5.);
  vec3 fc = mix(uFogCol, uFogSunCol, sunAmt);
  return mix(col, fc, f);
}
`;

/* ------------------------------------------------------------------ hình học một cây trúc */
/**
 * Dựng một "mẫu" cây trúc (gốc tại 0,0,0, mọc theo +Y). Trả về hình học + danh sách mắt + hàm đường cong trục.
 * H: chiều cao (m), R: bán kính gốc (m), radial: số cạnh, detail: số vòng mỗi lóng.
 */
export function buildCulm(rand, { H = 15, R = 0.06, radial = 10, detail = true, bow = 0.05, detailH = 6 } = {}) {
  const opts_detailH = detail ? detailH : -1;
  const nodes = [];
  let y = 0;
  // lóng dài nhất ~ 0.3–0.42 m ở giữa thân; sát gốc vài lóng ngắn, gần ngọn ngắn dần
  const Lmax = (0.3 + rand() * 0.12) * (0.75 + 0.25 * H / 15) * (0.85 + R * 2.5);
  nodes.push(0);
  y = 0.05 + rand() * 0.05;
  while (y < H - 0.25) {
    nodes.push(y);
    const f = y / H;
    let L = Lmax * (0.3 + 0.7 * ss(0, 0.11, f)) * (1 - 0.4 * ss(0.65, 1, f));
    L *= 0.9 + rand() * 0.2;
    y += Math.max(0.045, L);
  }
  nodes.push(H);
  const bowK = bow * (0.5 + rand());
  const sK = (rand() - 0.5) * 0.012;
  const curve = (yy) => {
    const f = yy / H;
    return [H * (bowK * Math.pow(f, 3.2) + 0.006 * f), H * sK * Math.sin(f * Math.PI * 1.4)];
  };
  const radius = (yy) => {
    const f = yy / H;
    return R * Math.max(0.05, 1 - 0.8 * Math.pow(f, 1.35)) * (1 + 0.12 * Math.exp(-yy / 0.3));
  };

  const P = [], ND = [], F = [], U = [], idx = [];
  const ring = (yy, rs, y0, y1) => {
    const [cx, cz] = curve(yy);
    const r = radius(yy) * rs;
    const base = P.length / 3;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      P.push(cx + Math.cos(a) * r, yy, cz + Math.sin(a) * r);
      ND.push(yy - y0, y1 - yy);
      F.push(yy / H);
      U.push(j / radial);
    }
    return base;
  };
  for (let k = 0; k < nodes.length - 1; k++) {
    const y0 = nodes[k], y1 = nodes[k + 1], L = y1 - y0;
    const last = k === nodes.length - 2;
    const ys = [];
    if (detail && y0 < (opts_detailH ?? 6)) {
      ys.push([y0, k === 0 ? 1 : 1.055], [y0 + Math.min(0.008, L * 0.1), 1.025], [y0 + Math.min(0.022, L * 0.2), 1.0]);
      const m = Math.max(1, Math.round(L / 0.3));
      for (let i = 1; i <= m; i++) ys.push([y0 + L * (0.2 + 0.7 * (i / (m + 1))), 0.992]);
      ys.push([y1 - Math.min(0.016, L * 0.12), 1.0], [y1, last ? 0.2 : 1.03]);
    } else {
      ys.push([y0, 1.03], [y1, last ? 0.2 : 1.02]);
    }
    if (last) ys[ys.length - 1][1] = 0.15;
    let prev = -1;
    for (const [yy, rs] of ys) {
      const b = ring(yy, rs, y0, y1);
      if (prev >= 0) {
        for (let j = 0; j < radial; j++) {
          const a = prev + j, bb = prev + j + 1, c = b + j, d = b + j + 1;
          idx.push(a, c, bb, bb, c, d);
        }
      }
      prev = b;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('aND', new THREE.Float32BufferAttribute(ND, 2));
  geo.setAttribute('aF', new THREE.Float32BufferAttribute(F, 1));
  geo.setAttribute('aU', new THREE.Float32BufferAttribute(U, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { geo, nodes, curve, radius, H, R };
}

/* ------------------------------------------------------------------ texture chùm lá */
function leafAtlas(size = 1024) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const r = rng(77);
  const cell = size / 2;
  const drawLeaf = (x, y, ang, len, wid, hue) => {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    // lá trúc: thuôn dài, cuống ngắn, mũi nhọn, hơi cong
    const bend = (r() - 0.5) * wid * 1.6;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(wid * 0.9, len * 0.12, wid * 0.75 + bend * 0.3, len * 0.55, bend, len);
    g.bezierCurveTo(-wid * 0.55 + bend * 0.3, len * 0.55, -wid * 0.8, len * 0.12, 0, 0);
    const gr = g.createLinearGradient(0, 0, 0, len);
    const [h, s, l] = hue;
    gr.addColorStop(0, `hsl(${h - 4},${s}%,${l - 7}%)`);
    gr.addColorStop(0.45, `hsl(${h},${s + 4}%,${l}%)`);
    gr.addColorStop(1, `hsl(${h + 6},${s - 6}%,${l + 6}%)`);
    g.fillStyle = gr;
    g.fill();
    // gân giữa
    g.strokeStyle = `hsla(${h + 8},${s - 10}%,${l + 14}%,.55)`;
    g.lineWidth = Math.max(1, wid * 0.09);
    g.beginPath();
    g.moveTo(0, len * 0.04);
    g.quadraticCurveTo(bend * 0.4, len * 0.5, bend * 0.96, len * 0.97);
    g.stroke();
    // mép lá sẫm hơn một chút
    g.strokeStyle = `hsla(${h},${s}%,${l - 14}%,.35)`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(wid * 0.9, len * 0.12, wid * 0.75 + bend * 0.3, len * 0.55, bend, len);
    g.stroke();
    // đầu lá khô cháy
    if (r() < 0.06) {
      g.globalCompositeOperation = 'source-atop';
      const dg = g.createLinearGradient(0, len * 0.7, 0, len);
      dg.addColorStop(0, 'rgba(150,120,60,0)');
      dg.addColorStop(1, 'rgba(165,130,70,.95)');
      g.fillStyle = dg;
      g.fillRect(-wid * 2, len * 0.6, wid * 4, len * 0.5);
      g.globalCompositeOperation = 'source-over';
    }
    g.restore();
  };
  for (let v = 0; v < 4; v++) {
    const ox = (v % 2) * cell, oy = Math.floor(v / 2) * cell;
    g.save();
    g.beginPath();
    g.rect(ox, oy, cell, cell);
    g.clip();
    const sprays = 3 + Math.floor(r() * 2);
    for (let s = 0; s < sprays; s++) {
      // cành con rủ xuống từ điểm treo ở mép trên
      const sx = ox + cell * (0.5 + (r() - 0.5) * 0.25), sy = oy + cell * 0.03;
      const ang = (r() - 0.5) * 1.5 + (s - sprays / 2) * 0.35;
      const twigLen = cell * (0.38 + r() * 0.3);
      const ex = sx + Math.sin(ang) * twigLen, ey = sy + Math.cos(ang) * twigLen * 0.9;
      const mx = (sx + ex) / 2 + (r() - 0.5) * 30, my = (sy + ey) / 2;
      g.strokeStyle = 'rgba(72,78,40,.95)';
      g.lineWidth = cell * 0.006;
      g.beginPath();
      g.moveTo(sx, sy);
      g.quadraticCurveTo(mx, my, ex, ey);
      g.stroke();
      const nLeaves = 4 + Math.floor(r() * 4);
      for (let k = 0; k < nLeaves; k++) {
        const t = 0.35 + (k / nLeaves) * 0.68;
        const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * ex;
        const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ey;
        const side = k % 2 ? 1 : -1;
        const la = -ang + side * (0.35 + r() * 0.75) + (r() - 0.5) * 0.3;
        const len = cell * (0.2 + r() * 0.11) * (k === nLeaves - 1 ? 1.1 : 1);
        const hue = [78 + r() * 22, 34 + r() * 22, 22 + r() * 16];
        drawLeaf(px, py, la, len, len * (0.085 + r() * 0.03), hue);
      }
    }
    g.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

/* ------------------------------------------------------------------ vật liệu */
function makeUniforms(o) {
  const v = (a) => new THREE.Vector3(...a);
  return {
    uTime: o.time || { value: 0 },
    uWind: { value: o.wind ?? 1 },
    uWindDir: { value: v(o.windDir || [0.8, 0, -0.6]).normalize() },
    uSunDir: { value: v(o.sunDir || [0.25, 0.42, -1]).normalize() },
    uSunCol: { value: v(o.sunCol || [2.4, 2.0, 1.45]) },
    uSkyCol: { value: v(o.skyCol || [0.16, 0.22, 0.21]) },
    uGndCol: { value: v(o.gndCol || [0.05, 0.045, 0.03]) },
    uFogCol: { value: o.fogColor instanceof THREE.Color ? o.fogColor : v(o.fogCol || [0.2, 0.25, 0.24]) },
    uFogSunCol: { value: v(o.fogSunCol || [0.75, 0.72, 0.6]) },
    uFogDensity: { value: o.fogDensity ?? 0.035 },
    uFogHeight: { value: o.fogHeight ?? 3 },
    uGroundY: { value: o.groundY ?? 0 },
    uFogLinear: { value: o.fogLinear ? 1 : 0 },
    uFogNear: o.fogNearU || { value: 20 },
    uFogFar: o.fogFarU || { value: 80 },
    uCanopyY: { value: o.canopyY ?? 12 },
    uDapple: { value: o.dapple ?? 1 },
    uExposure: { value: o.exposure ?? 1 }
  };
}

function culmMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */ `
      attribute vec2 aND; attribute float aF; attribute float aU;
      attribute vec4 iData; // seed, tuổi (0 non → 1 già/khô), sắc, chiều cao thật
      attribute float iWind;
      ${GLSL_WIND}
      varying vec3 vW, vN, vL; varying vec2 vND; varying float vF, vU; varying vec4 vI;
      void main(){
        mat4 m = modelMatrix*instanceMatrix;
        vec4 w = m*vec4(position, 1.);
        vec3 base = (m*vec4(0., 0., 0., 1.)).xyz;
        w.xyz += culmSway(base.xz, aF, iData.w)*iWind;
        vW = w.xyz; vN = normalize(mat3(m)*normal); vL = position;
        vND = aND; vF = aF; vU = aU; vI = iData;
        gl_Position = projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uExposure;
      ${GLSL_NOISE}
      ${GLSL_LIGHT}
      varying vec3 vW, vN, vL; varying vec2 vND; varying float vF, vU; varying vec4 vI;
      void main(){
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        vec3 V = normalize(cameraPosition - vW);
        float seed = vI.x, age = vI.y, H = vI.w;
        float y = vF*H;
        float a = vU*6.2831853;
        vec3 cp = vec3(cos(a)*1.6, sin(a)*1.6, y);
        // màu vỏ: non xanh lá, trưởng thành xanh xám, già ngả vàng xám
        vec3 young = vec3(.09, .17, .05), mature = vec3(.2, .26, .24), old = vec3(.36, .3, .15);
        vec3 alb = age < .5 ? mix(young, mature, age*2.) : mix(mature, old, (age - .5)*2.);
        alb *= .85 + vI.z*.3;
        // sọc dọc mảnh + loang màu theo thân
        float streak = bn(vec3(cp.xy*7., y*.35 + seed*9.));
        alb *= .86 + .26*streak;
        float patchy = bfbm(vec3(cp.xy*1.4, y*.5 + seed*13.));
        alb = mix(alb, alb*vec3(1.12, 1.05, .82), smoothstep(.45, .7, patchy)*.6);
        // địa y, mốc trắng xám thành mảng
        float lich = bfbm(vec3(cp.xy*3.2, y*1.4 + seed*31.));
        alb = mix(alb, vec3(.4, .42, .38), smoothstep(.5, .68, lich)*.7*(.45 + age));
        // gốc bẩn đất, ẩm mốc
        alb *= mix(.45, 1., smoothstep(.0, 1.6, y));
        // MẮT TRÚC: vòng phấn trắng ngay dưới mắt, gờ mắt sẫm, vết bẹ ngay trên mắt
        float dUp = vND.y, dDn = vND.x;
        float powder = smoothstep(.07, .01, dUp)*(1. - age*.6)*smoothstep(.3, 2.5, y);
        alb = mix(alb, vec3(.5, .53, .48), powder*.6);
        float ridge = smoothstep(.0045, .0015, min(dUp, dDn));
        float scar = smoothstep(.02, .006, dDn)*(1. - ridge);
        alb *= 1. - ridge*.62;
        alb = mix(alb, alb*vec3(1.25, 1.12, .8), scar*.5);

        // ánh sáng
        float occ = mix(.32, 1., smoothstep(.12, .9, vF));          // tán trên che bớt nắng cho thân dưới
        float sunVis = occ*mix(1., .25 + .75*dapple(vW), uDapple);
        float ndl = dot(n, uSunDir);
        float wrap = max((ndl + .25)/1.25, 0.);
        vec3 amb = mix(uGndCol, uSkyCol, n.y*.5 + .5)*mix(.55, 1., smoothstep(0., 3., y));
        vec3 col = alb*(uSunCol*wrap*sunVis + amb);
        // vỏ trúc bóng sáp: highlight hẹp + phản chiếu bầu trời ở viền
        vec3 Hh = normalize(uSunDir + V);
        float rough = .35 + .25*lich + age*.25 - powder*.15;
        float spec = pow(max(dot(n, Hh), 0.), 2./(rough*rough*rough) )*(1. - rough)*.9;
        float fr = pow(1. - max(dot(n, V), 0.), 4.);
        col += uSunCol*spec*sunVis*.35 + mix(uGndCol, uSkyCol, .8)*fr*(.6 - rough*.4);
        // ngược sáng: viền sáng mỏng ở mép thân
        float back = pow(max(dot(-V, uSunDir), 0.), 6.);
        col += uSunCol*alb*fr*back*sunVis*1.4;
        col *= uExposure;
        gl_FragColor = vec4(bambooFog(col, vW), 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

function leafMaterial(U, map) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uMap: { value: map } },
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec4 iCulm;   // gốc cây x,y,z, chiều cao
      attribute vec4 iLeaf;   // seed, độ cao tương đối f, sắc, ô atlas
      attribute vec3 iCN;     // pháp tuyến "tán" (hướng ra ngoài khối lá)
      ${GLSL_WIND}
      varying vec2 vUv; varying vec3 vW, vN, vCN; varying vec4 vLeaf;
      void main(){
        mat4 m = modelMatrix*instanceMatrix;
        vec4 w = m*vec4(position, 1.);
        w.xyz += culmSway(iCulm.xz, iLeaf.y, iCulm.w);
        // lá rung riêng, mạnh dần về đầu chùm
        float tip = 1. - uv.y;
        float s = iLeaf.x*40.;
        vec3 fl = vec3(sin(uTime*3.3 + s + w.y*.7), sin(uTime*2.1 + s*1.3)*.4, cos(uTime*2.8 + s*.7 + w.x*.5));
        w.xyz += fl*(.035 + .05*tip)*(.35 + uWind*.8)*tip;
        float cellx = mod(iLeaf.w, 2.), celly = floor(iLeaf.w/2.);
        vUv = (uv + vec2(cellx, 1. - celly) - vec2(0., 1.))*.5;
        vUv.y += .5;
        vW = w.xyz; vN = normalize(mat3(m)*normal); vCN = iCN; vLeaf = iLeaf;
        gl_Position = projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform float uExposure;
      ${GLSL_NOISE}
      ${GLSL_LIGHT}
      varying vec2 vUv; varying vec3 vW, vN, vCN; varying vec4 vLeaf;
      void main(){
        vec4 t = texture2D(uMap, vUv);
        // giữ lá không "tan" ở xa: nâng alpha theo mức mipmap
        vec2 px = vUv*1024.;
        float lod = max(0., .5*log2(max(dot(dFdx(px), dFdx(px)), dot(dFdy(px), dFdy(px)))));
        float alpha = t.a*(1. + lod*.28);
        if (alpha < .5) discard;
        vec3 n = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        if (dot(n, V) < 0.) n = -n;
        n = normalize(mix(n, vCN, .6));
        vec3 alb = t.rgb*(.75 + vLeaf.z*.5);
        float sunVis = mix(1., .3 + .7*dapple(vW), uDapple*.6)*mix(.45, 1., smoothstep(.55, 1., vLeaf.y));
        float ndl = dot(n, uSunDir);
        vec3 amb = mix(uGndCol, uSkyCol, n.y*.5 + .5);
        vec3 col = alb*(uSunCol*max(ndl*.6 + .4, 0.)*sunVis*.75 + amb*1.1);
        // lá mỏng xuyên sáng: nhìn ngược nắng thì lá sáng vàng lục
        float tr = pow(max(dot(-V, uSunDir), 0.), 3.);
        col += alb*vec3(1.25, 1.45, .55)*uSunCol*tr*sunVis*.9;
        col *= uExposure;
        gl_FragColor = vec4(bambooFog(col, vW), 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

function branchMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */ `
      attribute vec4 iCulm; attribute float iF;
      ${GLSL_WIND}
      varying vec3 vW, vN;
      void main(){
        mat4 m = modelMatrix*instanceMatrix;
        vec4 w = m*vec4(position, 1.);
        w.xyz += culmSway(iCulm.xz, iF, iCulm.w);
        vW = w.xyz; vN = normalize(mat3(m)*normal);
        gl_Position = projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uExposure;
      ${GLSL_NOISE}
      ${GLSL_LIGHT}
      varying vec3 vW, vN;
      void main(){
        vec3 n = normalize(vN);
        vec3 alb = vec3(.16, .17, .08);
        vec3 col = alb*(uSunCol*max(dot(n, uSunDir)*.5 + .5, 0.)*.5 + mix(uGndCol, uSkyCol, n.y*.5 + .5));
        col *= uExposure;
        gl_FragColor = vec4(bambooFog(col, vW), 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

/* ------------------------------------------------------------------ rừng */
/**
 * placements: [{ x, y, z, h?, r?, age?, near? }] — y là cao độ mặt đất tại gốc.
 * near=true dùng mẫu chi tiết + lá dày; còn lại dùng mẫu nhẹ.
 * opts: uniforms ánh sáng/sương (xem makeUniforms), leafDensity, seed.
 */
export function createBambooGrove(scene, placements, opts = {}) {
  const rand = rng(opts.seed || 9);
  const U = makeUniforms(opts);
  const leafTex = leafAtlas(opts.isMobile ? 512 : 1024);
  const culmMat = culmMaterial(U), leafMat = leafMaterial(U, leafTex), brMat = branchMaterial(U);
  const group = new THREE.Group();
  scene.add(group);

  // mẫu cây: vài kích cỡ, mỗi cỡ một bản chi tiết và một bản nhẹ
  const protoDefs = [];
  const nProto = opts.isMobile ? 4 : 7;
  for (let k = 0; k < nProto; k++) {
    const H = 11 + k * 1.6 + rand() * 1.2;
    const R = 0.03 + Math.pow(k / Math.max(1, nProto - 1), 1.2) * 0.07 + rand() * 0.008;
    protoDefs.push({ H, R, seed: rand() * 1e6 | 0 });
  }
  const protos = protoDefs.map((d) => ({
    hi: buildCulm(rng(d.seed), { H: d.H, R: d.R, radial: opts.isMobile ? 7 : 10, detail: true }),
    lo: buildCulm(rng(d.seed), { H: d.H, R: d.R, radial: 6, detail: false })
  }));

  const buckets = protos.map(() => ({ hi: [], lo: [] }));
  const leaves = [], branches = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const leafDensity = opts.leafDensity ?? 1;

  for (const p of placements) {
    // chọn mẫu theo chiều cao mong muốn
    const want = p.h || 11 + rand() * 11;
    let pi = 0, best = 1e9;
    protoDefs.forEach((d, k) => { const s = Math.abs(d.H - want) + rand() * 2.5; if (s < best) { best = s; pi = k; } });
    const proto = protos[pi];
    const s = THREE.MathUtils.clamp(want / protoDefs[pi].H, 0.8, 1.25);
    // nghiêng: mặc định ngẫu nhiên; có leanDir thì ngả về hướng đó (vd. trúc hai bên lối đi ngả vào nhau)
    const tilt = p.tilt ?? 0.05 * Math.pow(rand(), 1.5);
    const tiltDir = p.leanDir ?? rand() * Math.PI * 2;
    const ldx = Math.cos(tiltDir), ldz = Math.sin(tiltDir);
    const yaw = p.leanDir != null ? Math.atan2(-ldz, ldx) + (rand() - 0.5) * 0.8 : rand() * Math.PI * 2;
    q.setFromAxisAngle(new THREE.Vector3(ldz, 0, -ldx), tilt).multiply(new THREE.Quaternion().setFromAxisAngle(up, yaw));
    pos.set(p.x, p.y - 0.06, p.z);
    sc.set(s, s, s);
    m4.compose(pos, q, sc);
    const H = protoDefs[pi].H * s;
    const age = p.age ?? Math.pow(rand(), 1.6) * 0.85;
    const inst = { m: m4.clone(), data: [rand(), age, rand(), H], wind: p.fallen ? 0 : 1 };
    (p.near ? buckets[pi].hi : buckets[pi].lo).push(inst);
    if (p.fallen || p.noLeaves) continue;

    // cành + chùm lá: từ mắt ở nửa trên, so le hai bên
    const geo = proto.hi;
    const fb = (p.branchFrom ?? 0.32) + rand() * 0.14;
    const nodes = geo.nodes.filter((y) => y / geo.H > fb && y / geo.H < 0.985);
    const cw = p.near ? 1 : 0.32;
    let az = rand() * Math.PI * 2;
    const culmInfo = [p.x, p.y, p.z, H];
    nodes.forEach((ny, k) => {
      az += Math.PI + (rand() - 0.5) * 0.9;
      if (rand() > 0.82 * leafDensity * (p.near ? 1 : 0.8)) return;
      const f = ny / geo.H;
      const [cx, cz] = geo.curve(ny);
      const rel = (f - fb) / (1 - fb);
      const nb = rand() < 0.55 ? 2 : 1;
      for (let b = 0; b < nb; b++) {
        const baz = az + (b ? 0.5 + rand() * 0.4 : 0);
        const elev = 0.55 + rand() * 0.35 + rel * 0.25;           // cành chếch lên
        const len = (0.55 + rand() * 0.9) * (1 - rel * 0.55) * (b ? 0.6 : 1);
        const dir = new THREE.Vector3(Math.cos(baz) * Math.cos(elev), Math.sin(elev), Math.sin(baz) * Math.cos(elev));
        const local0 = new THREE.Vector3(cx, ny, cz);
        const w0 = local0.clone().applyMatrix4(inst.m);
        const wdir = dir.clone().transformDirection(inst.m);
        if (p.near && rand() < 0.6) {
          const bq = new THREE.Quaternion().setFromUnitVectors(up, wdir);
          branches.push({ m: new THREE.Matrix4().compose(w0, bq, new THREE.Vector3(1, len * s, 1)), culm: culmInfo, f });
        }
        // chùm lá dọc theo cành, dày ở đầu cành
        const nCards = Math.round((1.6 + rand() * 1.8) * cw * leafDensity + rand() * 0.6);
        for (let c = 0; c < nCards; c++) {
          const t = nCards === 1 ? 0.9 : 0.35 + (c / (nCards - 1)) * 0.75;
          const wp = w0.clone().addScaledVector(wdir, len * s * t);
          const size = (0.6 + rand() * 0.45) * (p.near ? 1 : 1.7) * (1 - rel * 0.25);
          const yawC = baz + (rand() - 0.5) * 1.6;
          const lq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-(0.15 + rand() * 0.75), -yawC + Math.PI / 2, (rand() - 0.5) * 0.6, 'YXZ'));
          const lm = new THREE.Matrix4().compose(wp, q.clone().multiply(lq), new THREE.Vector3(size * 0.85, size, size));
          const axis = new THREE.Vector3(cx, ny, cz).applyMatrix4(inst.m);
          const cn = wp.clone().sub(axis).setY(0).normalize().multiplyScalar(0.8).add(new THREE.Vector3(0, 0.6, 0)).normalize();
          leaves.push({ m: lm, culm: culmInfo, leaf: [rand(), f, rand(), Math.floor(rand() * 4)], cn });
        }
      }
    });
    // ngọn: một chùm rủ quanh đỉnh
    const topY = geo.H * 0.97;
    const [tx, tz] = geo.curve(topY);
    const nTop = Math.round((p.near ? 5 : 2) * leafDensity);
    for (let c = 0; c < nTop; c++) {
      const wp = new THREE.Vector3(tx, topY - rand() * 0.8, tz).applyMatrix4(inst.m);
      const yawC = rand() * Math.PI * 2;
      const size = 0.6 + rand() * 0.5;
      const lq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-(0.4 + rand() * 0.6), yawC, (rand() - 0.5) * 0.5, 'YXZ'));
      const lm = new THREE.Matrix4().compose(wp, lq, new THREE.Vector3(size * 0.85, size, size));
      const cn = new THREE.Vector3(Math.cos(yawC), 1.2, Math.sin(yawC)).normalize();
      leaves.push({ m: lm, culm: culmInfo, leaf: [rand(), 0.98, rand(), Math.floor(rand() * 4)], cn });
    }
  }

  // chia theo ô không gian để máy tự bỏ qua phần rừng nằm ngoài khung hình (frustum culling theo từng ô)
  const CH = opts.chunk || 14;
  const keyOf = (m) => { const e = m.elements; return Math.floor(e[12] / CH) + ',' + Math.floor(e[14] / CH); };
  const byChunk = (list) => {
    const map = new Map();
    for (const it of list) { const k = keyOf(it.m); if (!map.has(k)) map.set(k, []); map.get(k).push(it); }
    return [...map.values()];
  };
  const finish = (mesh) => {
    mesh.computeBoundingSphere();
    mesh.boundingSphere.radius += 1.5;                       // chừa chỗ cho gió lắc
    mesh.frustumCulled = true;
    group.add(mesh);
    return mesh;
  };

  const meshes = [];
  buckets.forEach((b, k) => {
    for (const lvl of ['hi', 'lo']) {
      for (const list of byChunk(b[lvl])) {
        const geo = protos[k][lvl].geo.clone();
        const data = new Float32Array(list.length * 4), wind = new Float32Array(list.length);
        list.forEach((it, i) => { data.set(it.data, i * 4); wind[i] = it.wind; });
        geo.setAttribute('iData', new THREE.InstancedBufferAttribute(data, 4));
        geo.setAttribute('iWind', new THREE.InstancedBufferAttribute(wind, 1));
        const mesh = new THREE.InstancedMesh(geo, culmMat, list.length);
        list.forEach((it, i) => mesh.setMatrixAt(i, it.m));
        meshes.push(finish(mesh));
      }
    }
  });

  const bgBase = new THREE.CylinderGeometry(0.004, 0.011, 1, 4, 1).translate(0, 0.5, 0);
  for (const list of byChunk(branches)) {
    const bg = bgBase.clone();
    const ci = new Float32Array(list.length * 4), fi = new Float32Array(list.length);
    list.forEach((b, i) => { ci.set(b.culm, i * 4); fi[i] = b.f; });
    bg.setAttribute('iCulm', new THREE.InstancedBufferAttribute(ci, 4));
    bg.setAttribute('iF', new THREE.InstancedBufferAttribute(fi, 1));
    const bm = new THREE.InstancedMesh(bg, brMat, list.length);
    list.forEach((b, i) => bm.setMatrixAt(i, b.m));
    finish(bm);
  }

  // thẻ lá: tấm cong rủ xuống, điểm treo ở mép trên
  const lgBase = new THREE.PlaneGeometry(1, 1, 1, 3).translate(0, -0.5, 0);
  {
    const p = lgBase.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const yy = -p.getY(i), xx = p.getX(i);
      p.setZ(i, 0.28 * yy * yy - 0.12 * Math.abs(xx));
    }
    lgBase.computeVertexNormals();
  }
  for (const list of byChunk(leaves)) {
    const lg = lgBase.clone();
    const ci = new Float32Array(list.length * 4), li = new Float32Array(list.length * 4), cn = new Float32Array(list.length * 3);
    list.forEach((l, i) => { ci.set(l.culm, i * 4); li.set(l.leaf, i * 4); cn.set([l.cn.x, l.cn.y, l.cn.z], i * 3); });
    lg.setAttribute('iCulm', new THREE.InstancedBufferAttribute(ci, 4));
    lg.setAttribute('iLeaf', new THREE.InstancedBufferAttribute(li, 4));
    lg.setAttribute('iCN', new THREE.InstancedBufferAttribute(cn, 3));
    const leafMesh = new THREE.InstancedMesh(lg, leafMat, list.length);
    list.forEach((l, i) => leafMesh.setMatrixAt(i, l.m));
    finish(leafMesh);
  }

  return {
    group, uniforms: U,
    stats: { culms: placements.length, leaves: leaves.length, branches: branches.length },
    materials: { culmMat, leafMat, brMat },
    GLSL: { NOISE: GLSL_NOISE, LIGHT: GLSL_LIGHT, WIND: GLSL_WIND }
  };
}

export const BAMBOO_GLSL = { NOISE: GLSL_NOISE, LIGHT: GLSL_LIGHT, WIND: GLSL_WIND };
export { makeUniforms as bambooUniforms };
