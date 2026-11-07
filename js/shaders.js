// GLSL dùng chung: noise, panel "đốt giấy" (burn reveal), tàn nhang, khói, film pass.

export const NOISE = /* glsl */ `
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
  vec2 u = f*f*(3.-2.*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v = 0., a = .5;
  for(int i=0;i<5;i++){ v += a*vnoise(p); p = p*2.03 + 17.1; a *= .5; }
  return v;
}
`;

/* ---------- Panel ảnh/video: hiện hình như tờ giấy bén lửa ---------- */
export const panelVertex = /* glsl */ `
uniform float uBend;
varying vec2 vUv;
varying float vDepth;
void main(){
  vUv = uv;
  vec3 p = position;
  p.z -= sin(uv.x*3.14159)*uBend;
  vec4 mv = modelViewMatrix*vec4(p,1.);
  vDepth = -mv.z;
  gl_Position = projectionMatrix*mv;
}`;

export const panelFragment = /* glsl */ `
uniform sampler2D uTex;
uniform float uHasTex, uUseAlpha, uReveal, uTime, uFocus, uHover, uOpacity, uSeed, uGain;
uniform vec3 uGlow;      // xy = uv của nguồn sáng (đầu nhang), z = cường độ
uniform float uAspect;
uniform vec3 uFogColor; uniform float uFogNear, uFogFar;
varying vec2 vUv;
varying float vDepth;
${NOISE}
void main(){
  vec2 uv = vUv;
  vec4 tex = texture2D(uTex, uv);
  float n = fbm(uv*vec2(3.2, 2.4) + uSeed*7.3 + vec2(0., uTime*.02));
  n = n*.8 + (1.-uv.y)*.2;                 // lửa ăn từ mép dưới lên
  float r = uReveal*1.3 - .15;
  float d = r - n;
  float alpha = smoothstep(0., .012, d);
  float edge = alpha*(1. - smoothstep(.012, .09, d));

  vec3 col = mix(vec3(.02,.015,.012), tex.rgb, uHasTex);
  float lum = dot(col, vec3(.299,.587,.114));
  col = mix(vec3(lum)*vec3(1.,.9,.82), col, .3 + .7*uFocus);   // mất nét màu khi không được chọn
  col *= .38 + .62*uFocus + .18*uHover;
  vec2 q = uv - .5;
  col *= (1. - dot(q,q)*.85)*uGain;
  vec2 gd = (uv - uGlow.xy)*vec2(uAspect, 1.);
  col += vec3(1.,.42,.12)*uGlow.z*(exp(-dot(gd,gd)*60.)*1.1 + exp(-dot(gd,gd)*9.)*.12);

  vec3 ember = mix(vec3(1.,.28,.06), vec3(1.,.82,.45), edge*edge);
  col += ember*edge*3.2;

  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  col = mix(col, uFogColor, fog);

  float a = alpha*uOpacity*mix(1., tex.a*uHasTex, uUseAlpha);
  if(a < .003) discard;
  gl_FragColor = vec4(col, a);
}`;

/* ---------- Tàn nhang bay lên ---------- */
export const emberVertex = /* glsl */ `
attribute float aSeed;
attribute float aOff;
uniform float uTime, uHeight, uSize, uPixelRatio;
varying float vAlpha;
void main(){
  vec3 p = position;
  float t = uTime*(.25 + aSeed*.55);
  float y = mod(aOff + t*1.6, uHeight);
  p.y += y - uHeight*.5;
  p.x += sin(t*1.3 + aSeed*20.)*.7;
  p.z += cos(t*.9 + aSeed*13.)*.7;
  vec4 mv = modelViewMatrix*vec4(p,1.);
  gl_Position = projectionMatrix*mv;
  gl_PointSize = uSize*uPixelRatio*(.35 + aSeed)*(12./max(1., -mv.z));
  float h = y/uHeight;
  float flick = .5 + .5*sin(uTime*(3. + aSeed*7.) + aSeed*50.);
  vAlpha = smoothstep(0., .12, h)*(1. - smoothstep(.65, 1., h))*(.3 + .7*flick)*(1. - smoothstep(30., 70., -mv.z));
}`;

export const emberFragment = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, 0., d);
  a *= a;
  gl_FragColor = vec4(uColor*(1. + a*2.), a*vAlpha);
}`;

/* ---------- Khói / sương ---------- */
export const smokeVertex = /* glsl */ `
varying vec2 vUv; varying float vDepth;
void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vDepth = -mv.z; gl_Position = projectionMatrix*mv; }`;

export const smokeFragment = /* glsl */ `
uniform float uTime, uSeed, uOpacity;
uniform vec3 uColor;
varying vec2 vUv; varying float vDepth;
${NOISE}
void main(){
  vec2 p = vUv*2.2 + vec2(uSeed*3.1, 0.);
  float n = fbm(p + vec2(uTime*.015, -uTime*.035));
  n = fbm(p + n*1.6 + vec2(-uTime*.01, 0.));
  float mask = smoothstep(.5, .05, length(vUv - .5));
  float a = smoothstep(.38, .85, n)*mask*uOpacity;
  a *= smoothstep(2., 8., vDepth)*(1. - smoothstep(35., 70., vDepth));
  gl_FragColor = vec4(uColor, a);
}`;

/* ---------- Film pass (sau OutputPass, không gian sRGB) ---------- */
export const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: [1, 1] },
    uGrain: { value: 0.07 },
    uAberration: { value: 0 },
    uDip: { value: 0 },
    uVignette: { value: 1 },
    uHaze: { value: 1 },
    uGhost: { value: 0 }
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uTime, uGrain, uAberration, uDip, uVignette, uHaze, uGhost;
uniform vec2 uRes;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
void main(){
  vec2 c = vUv - .5;
  // khí âm: không gian gợn nhẹ như hơi nóng trên lư hương, mạnh hơn ở rìa khung
  vec2 w = vec2(sin(vUv.y*23. + uTime*1.3) + sin(vUv.y*61. - uTime*.8)*.5,
                cos(vUv.x*19. + uTime*1.1) + cos(vUv.x*47. + uTime*.6)*.5);
  vec2 uv = vUv + w*.0011*uHaze*(.3 + smoothstep(.2, .75, length(c))*1.4);

  float ab = (.0015 + uAberration*.012)*length(c);
  vec3 col;
  col.r = texture2D(tDiffuse, uv + c*ab*4.).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - c*ab*4.).b;

  // hồn lướt qua: bóng nhân đôi lệch, ngả xanh ngọc
  if (uGhost > .001) {
    vec3 g = texture2D(tDiffuse, uv + vec2(.014, -.003)*uGhost).rgb;
    col = mix(col, max(col, g*vec3(.5, 1., .92)), .55*uGhost);
  }

  // split-tone: bóng tối xanh ngọc âm u, vùng sáng ngả hổ phách
  float l = dot(col, vec3(.299,.587,.114));
  vec3 shadow = col*vec3(.84, 1.02, 1.) + vec3(0., .012, .011);
  vec3 light = col*vec3(1.08, .96, .86);
  col = mix(shadow, light, smoothstep(.12, .55, l));
  col = pow(col, vec3(1.06));

  float vig = smoothstep(.95, .2, length(c*vec2(1.15, 1.)));
  col *= mix(1., vig, uVignette*.85);
  col *= 1. - uDip;
  col *= 1. + sin(uTime*37.)*.006;

  float g = h(vUv*uRes + fract(uTime*7.)*91.) - .5;
  col += g*uGrain;
  gl_FragColor = vec4(col, 1.);
}`
};
