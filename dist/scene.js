// Karma -- the living handscroll.
//
// Twelve paintings mounted side by side on paper, viewed through a gentle perspective camera.
// The focused painting lies flat and is alive; its neighbours turn a little away, recede and
// quieten. Every painting carries its own set of subtle motions, declared in ARTWORKS below:
//   mist and clouds      drifting fBm washes in a band of the picture
//   water                a masked reflection shimmer, optional slow flow, up to two ripple rings
//   wind                 up to two sway regions (reeds, bamboo, boughs, branches), anchored on one edge
//   drift                falling leaves or petals
//   glow                 a breathing light (lantern, moon)
//   sparks               fireflies, or moonlight sparkle on water
// Everything is low amplitude and slow, scaled by focus and by the session phase.
// The <img> underneath stays as the static fallback; this canvas fades in over it when ready.
//
// Coordinates are image uv with the origin at the bottom-left: y = 1 - (distance from the top).
import * as THREE from './assets/three.module.js';
import { Gallery } from './gallery.js';

const A = (file, title, description, tone, scene) => ({ file, title, description, tone, scene });

export const ARTWORKS = [
  A('15', 'First light', 'Still water beneath the mountains.', 0, {
    mist: [0.34, 0.62], clouds: [0.56, 0.96], water: [0.03, 0.46], reeds: [0.30, 0.26],
    ripple: [0.46, 0.26], ripple2: [0.66, 0.18],
    wind: [{ rect: [0.0, 0.0, 0.34, 0.32], anchor: 'bottom', strength: 0.0030, speed: 0.85 }],
  }),
  A('02', 'Songbird', 'A golden bird rests among pine needles.', 0, {
    mist: [0.28, 0.64], clouds: [0.55, 0.98],
    wind: [{ rect: [0.52, 0.28, 1.0, 0.82], anchor: 'right', strength: 0.0028, speed: 0.7 }],
  }),
  A('04', 'Autumn leaves', 'Vermilion maple leaves drift down.', 0, {
    wind: [{ rect: [0.34, 0.48, 1.0, 0.86], anchor: 'right', strength: 0.0030, speed: 0.7 }],
    drift: { count: 6, size: 0.0075, speed: 1.1, kind: 'leaf', color: [0.80, 0.30, 0.12], range: [0.36, 0.94, 0.03, 0.72] },
  }),
  A('06', 'Lakeside rest', 'A quiet shore opens across the lake.', 0, {
    mist: [0.36, 0.60], clouds: [0.58, 0.95], water: [0.05, 0.42], reeds: [0.38, 0.34],
    ripple: [0.525, 0.248], ripple2: [0.62, 0.20],
    wind: [{ rect: [0.0, 0.02, 0.40, 0.38], anchor: 'bottom', strength: 0.0035, speed: 0.9 }],
  }),
  A('07', 'Golden garden', 'Yellow leaves fall beside a garden bridge.', 0, {
    mist: [0.42, 0.70], clouds: [0.66, 0.98], water: [0.10, 0.36], ripple: [0.50, 0.24],
    wind: [
      { rect: [0.0, 0.28, 0.46, 0.88], anchor: 'left', strength: 0.0026, speed: 0.7 },
      { rect: [0.58, 0.28, 1.0, 0.78], anchor: 'right', strength: 0.0022, speed: 0.8 },
    ],
    drift: { count: 3, size: 0.0050, speed: 0.8, kind: 'petal', color: [0.86, 0.50, 0.58], range: [0.60, 0.94, 0.34, 0.72] },
  }),
  A('08', 'Blossom lake', 'Pink blossoms frame clear still water.', 0, {
    mist: [0.34, 0.62], clouds: [0.56, 0.96], water: [0.02, 0.30], waterFlow: [0.004, 0.0],
    ripple: [0.34, 0.15], ripple2: [0.58, 0.10],
    wind: [
      { rect: [0.28, 0.04, 1.0, 0.56], anchor: 'right', strength: 0.0028, speed: 0.65 },
      { rect: [0.0, 0.16, 0.32, 0.46], anchor: 'bottom', strength: 0.0030, speed: 0.85 },
    ],
    drift: { count: 5, size: 0.0055, speed: 0.8, kind: 'petal', color: [0.90, 0.42, 0.56], range: [0.32, 0.92, 0.04, 0.52] },
  }),
  A('09', 'Lantern dusk', 'A lantern glows under red maple leaves.', 1, {
    mist: [0.12, 0.78], clouds: [0.55, 0.98],
    wind: [
      { rect: [0.0, 0.40, 0.62, 0.84], anchor: 'left', strength: 0.0018, speed: 0.55 },
      { rect: [0.38, 0.26, 0.64, 0.58], anchor: 'top', strength: 0.0016, speed: 0.45 },
    ],
    glow: { center: [0.50, 0.42], radius: 0.17, strength: 0.14, color: [1.0, 0.56, 0.24] },
    sparks: { count: 6, center: [0.52, 0.40], radius: 0.26, color: [1.0, 0.78, 0.40], size: 0.0035, mode: 'fireflies' },
  }),
  A('11', 'Lantern path', 'A warm light rests in the dark valley.', 1, {
    mist: [0.18, 0.66], clouds: [0.58, 0.98], water: [0.02, 0.22], ripple: [0.48, 0.13],
    wind: [{ rect: [0.06, 0.16, 0.52, 0.62], anchor: 'bottom', strength: 0.0022, speed: 0.6 }],
    glow: { center: [0.50, 0.24], radius: 0.14, strength: 0.12, color: [1.0, 0.60, 0.28] },
    sparks: { count: 5, center: [0.50, 0.30], radius: 0.22, color: [1.0, 0.80, 0.45], size: 0.0032, mode: 'fireflies' },
  }),
  A('12', 'Koi current', 'Koi drift through swirling water.', 0, {
    mist: [0.62, 0.90], water: [0.04, 0.66], waterFlow: [0.012, -0.006],
    ripple: [0.30, 0.36], ripple2: [0.66, 0.24],
    wind: [{ rect: [0.08, 0.06, 0.92, 0.52], anchor: 'left', strength: 0.0014, speed: 0.5 }],
    sparks: { count: 8, center: [0.5, 0.35], radius: 0.30, color: [0.9, 0.92, 0.9], size: 0.0028, mode: 'water' },
  }),
  A('13', 'Golden ridge', 'A yellow tree brightens the high cliffs.', 0, {
    mist: [0.26, 0.62], clouds: [0.50, 0.98],
    wind: [{ rect: [0.0, 0.0, 0.52, 0.48], anchor: 'bottom', strength: 0.0026, speed: 0.75 }],
    drift: { count: 5, size: 0.0065, speed: 1.0, kind: 'leaf', color: [0.86, 0.66, 0.20], range: [0.06, 0.46, 0.02, 0.44] },
  }),
  A('17', 'Lotus moon', 'A lotus rests beside the moonlit water.', 1, {
    mist: [0.28, 0.56], clouds: [0.56, 0.98], water: [0.06, 0.38], ripple: [0.53, 0.22],
    wind: [{ rect: [0.0, 0.0, 0.36, 0.36], anchor: 'bottom', strength: 0.0018, speed: 0.6 }],
    glow: { center: [0.53, 0.69], radius: 0.13, strength: 0.07, color: [0.96, 0.92, 0.80] },
    sparks: { count: 9, center: [0.53, 0.22], radius: 0.12, color: [0.95, 0.93, 0.85], size: 0.0026, mode: 'water' },
  }),
  A('18', 'Kingfisher bamboo', 'A kingfisher waits among bamboo leaves.', 0, {
    mist: [0.44, 0.82],
    wind: [
      { rect: [0.0, 0.0, 0.48, 1.0], anchor: 'bottom', strength: 0.0038, speed: 0.85 },
      { rect: [0.52, 0.0, 1.0, 1.0], anchor: 'bottom', strength: 0.0032, speed: 0.95 },
    ],
    drift: { count: 3, size: 0.0060, speed: 0.9, kind: 'leaf', color: [0.36, 0.56, 0.36], range: [0.10, 0.90, 0.02, 0.80] },
  }),
];

const IMAGE_ASPECT = 1024 / 1536;
const GUTTER = 18;          // paper between mounted paintings, CSS px
const FOV = 28;             // degrees; shallow, so the tilt reads as a turn, not a distortion

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uTex;
  uniform float uHasTex;
  uniform vec2  uRes;       // plane size in device pixels (for grain)
  uniform vec4  uRect;      // image rect inside the plane, in plane uv: x, y, w, h
  uniform float uTime;
  uniform float uMist;      // session-phase scalars
  uniform float uWater;
  uniform float uRipple;
  uniform float uMotion;
  uniform float uLife;      // 1 = focused and alive, 0 = resting
  uniform float uDim;       // 0..1, quieten when not focused
  uniform float uTone;      // 0 = day painting, 1 = night painting
  uniform float uQuality;

  // per-painting effect layout, all in image uv (origin bottom-left)
  uniform vec2  uMistBand;
  uniform vec2  uCloudBand;
  uniform vec2  uWaterBand;
  uniform vec2  uWaterFlow;
  uniform vec2  uReeds;     // lower-left exclusion for the water shimmer; 0 disables
  uniform vec2  uRippleA;   // negative disables
  uniform vec2  uRippleB;
  uniform vec4  uWindA;     // rect x0 y0 x1 y1; x1 <= x0 disables
  uniform vec4  uWindAP;    // anchor (0 bottom, 1 right, 2 left, 3 top), strength, speed, phase
  uniform vec4  uWindB;
  uniform vec4  uWindBP;
  uniform vec4  uDriftP;    // count, size, speed, kind (0 leaf, 1 petal)
  uniform vec4  uDriftR;    // spawn x0, x1, fall from y1 down to y0  -> (x0, x1, y0, y1)
  uniform vec3  uDriftColor;
  uniform vec4  uGlow;      // cx, cy, radius, strength (0 disables)
  uniform vec3  uGlowColor;
  uniform vec4  uSpark;     // count, cx, cy, radius (count 0 disables)
  uniform vec3  uSparkColor;
  uniform vec2  uSparkP;    // size, mode (0 fireflies, 1 water sparkle)

  // touches: x, y, start time, kind (1 water ripple, 5 paper ring); kind 0 = empty slot
  uniform vec4  uTouches[4];
  uniform vec2  uGust;      // gust energy for wind region A and B, decaying on the CPU
  uniform float uFlare;     // extra glow after a tap on the light
  uniform vec4  uBurst;     // x, y, start time, count of loosened leaves

  const vec3 PAPER      = vec3(0.957, 0.941, 0.902);
  const vec3 PAPER_DEEP = vec3(0.929, 0.906, 0.855);
  const vec3 WASH       = vec3(0.604, 0.604, 0.565);
  const vec3 NIGHT      = vec3(0.075, 0.082, 0.098);

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float hash1(float n) { return fract(sin(n * 91.17) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    int octaves = uQuality > 0.5 ? 4 : 2;
    for (int i = 0; i < 4; i++) {
      if (i >= octaves) break;
      v += a * vnoise(p);
      p = p * 2.03 + vec2(17.1, 9.7);
      a *= 0.5;
    }
    return v;
  }
  float band(float y, vec2 b) {
    if (b.x > b.y) return 0.0;
    float w = (b.y - b.x) * 0.25;
    return smoothstep(b.x, b.x + w, y) * (1.0 - smoothstep(b.y - w, b.y, y));
  }
  float boxMask(vec2 p, vec4 r, float soft) {
    vec2 a = smoothstep(r.xy - soft, r.xy + soft, p);
    vec2 b = 1.0 - smoothstep(r.zw - soft, r.zw + soft, p);
    return a.x * a.y * b.x * b.y;
  }

  // Wind: a sway that grows with distance from the anchored edge, so a reed bends from its root
  // and a bough bobs at its tip. Returns a uv displacement.
  vec2 wind(vec2 p, vec4 rect, vec4 prm, float energy) {
    if (rect.z <= rect.x) return vec2(0.0);
    float m = boxMask(p, rect, 0.06);
    if (m <= 0.001) return vec2(0.0);
    float anchor = prm.x;
    float reach;
    if (anchor < 0.5)      reach = (p.y - rect.y) / max(rect.w - rect.y, 0.001);        // bottom
    else if (anchor < 1.5) reach = (rect.z - p.x) / max(rect.z - rect.x, 0.001);        // right
    else if (anchor < 2.5) reach = (p.x - rect.x) / max(rect.z - rect.x, 0.001);        // left
    else                   reach = (rect.w - p.y) / max(rect.w - rect.y, 0.001);        // top
    reach = clamp(reach, 0.0, 1.0);
    reach = reach * reach;
    float t = uTime * prm.z + prm.w;
    float gust = vnoise(vec2(t * 0.35, p.y * 2.0 + p.x)) - 0.5;
    float sway = sin(t + p.y * 5.0 + p.x * 3.0) * 0.55 + gust * 0.9;
    // A tap sends a gust through: the whole region heaves, and every leaf shakes on its own.
    float heave = sin(uTime * 5.0 + p.y * 6.0) * 0.9 + 0.6;
    float leaves = (vnoise(vec2(p.x * 42.0 + uTime * 7.0, p.y * 42.0 - uTime * 5.0)) - 0.5) * 3.2;
    sway += energy * (heave * 4.2 + leaves * 3.0);
    float amp = prm.y * reach * m * sway;
    if (anchor < 0.5 || anchor > 2.5) return vec2(amp, amp * 0.15);   // rooted: side to side
    return vec2(amp * 0.35, amp);                                        // hanging bough: bobs
  }

  // Ripple ring from a centre; returns (edge, crest) intensities and adds a refraction to offset.
  vec2 ripple(vec2 p, vec2 c, float period, float seed, inout vec2 offset) {
    if (c.x < 0.0) return vec2(0.0);
    vec2 d = (p - c) * vec2(1.0, 3.1);
    float dist = length(d);
    float phase = fract(uTime / period + seed);
    float radius = 0.02 + phase * 0.26;
    float fade = pow(1.0 - phase, 1.6) * smoothstep(0.0, 0.06, phase);
    float edge = exp(-pow((dist - radius) * 48.0, 2.0)) * fade;
    float crest = exp(-pow((dist - radius + 0.012) * 60.0, 2.0)) * fade;
    offset += normalize(d + 1e-5) * edge * 0.0028;
    return vec2(edge, crest);
  }

  // A soft rotated ellipse: 1 at centre, 0 at the rim.
  float leafShape(vec2 d, float ang, float sx, float sy) {
    float cs = cos(ang), sn = sin(ang);
    vec2 r = vec2(d.x * cs - d.y * sn, d.x * sn + d.y * cs);
    float q = (r.x * r.x) / (sx * sx) + (r.y * r.y) / (sy * sy);
    return 1.0 - smoothstep(0.55, 1.0, q);
  }

  void main() {
    vec2 st = vUv;
    vec2 iuv = (st - uRect.xy) / uRect.zw;
    float grain = (hash(floor(st * uRes * 0.5)) - 0.5) * 0.026;
    float fibre = (vnoise(st * uRes * 0.08) - 0.5) * 0.02;

    vec3 paper = mix(PAPER, PAPER_DEEP, vnoise(st * 6.0) * 0.5);
    vec3 mistColor = mix(PAPER, vec3(0.42, 0.45, 0.50), uTone);

    vec3 col;
    bool inside = iuv.x >= 0.0 && iuv.x <= 1.0 && iuv.y >= 0.0 && iuv.y <= 1.0;

    if (uHasTex < 0.5) {
      col = paper;
    } else if (inside) {
      float life = uLife;
      float motion = uMotion * life;

      // --- water --------------------------------------------------------------------------
      float water = band(iuv.y, uWaterBand);
      if (uReeds.x > 0.0) {
        float reeds = (1.0 - smoothstep(uReeds.x - 0.08, uReeds.x + 0.02, iuv.x)) * (1.0 - smoothstep(uReeds.y - 0.08, uReeds.y + 0.02, iuv.y));
        water *= (1.0 - reeds);
      }
      vec2 flow = uWaterFlow * uTime;
      float w1 = vnoise(vec2(iuv.x * 7.0 + uTime * 0.05 + flow.x * 4.0, iuv.y * 48.0 - uTime * 0.11 + flow.y * 30.0)) - 0.5;
      float w2 = vnoise(vec2(iuv.x * 3.0 - uTime * 0.03 + flow.x * 2.0, iuv.y * 22.0 + uTime * 0.07 + flow.y * 12.0)) - 0.5;
      vec2 offset = vec2(w1 * 0.0032 + w2 * 0.0018, w2 * 0.0010) * water * uWater * life;

      vec2 rA = ripple(iuv, uRippleA, 18.0, 0.0, offset) * water * uRipple * life;
      vec2 rB = ripple(iuv, uRippleB, 23.0, 0.47, offset) * water * uRipple * life;

      // --- wind ---------------------------------------------------------------------------
      offset += wind(iuv, uWindA, uWindAP, uGust.x) * max(motion, 0.35 * uLife);
      offset += wind(iuv, uWindB, uWindBP, uGust.y) * max(motion, 0.35 * uLife);

      // --- touch ripples: a ring from where the water was touched ------------------------
      float tEdge = 0.0, tCrest = 0.0;
      for (int i = 0; i < 4; i++) {
        vec4 tc = uTouches[i];
        if (tc.w < 0.5) continue;
        float age = uTime - tc.z;
        if (age < 0.0 || age > 6.0) continue;
        vec2 d = (iuv - tc.xy) * vec2(1.0, 2.4);
        float dist = length(d);
        float radius = age * 0.075;
        float fade = exp(-age * 0.75) * smoothstep(0.0, 0.05, age);
        float width = 36.0 + age * 10.0;
        float ring = exp(-pow((dist - radius) * width, 2.0)) * fade;
        float ring2 = exp(-pow((dist - radius * 0.55 - 0.01) * width * 1.3, 2.0)) * fade * 0.6;
        float w = band(tc.y, uWaterBand) > 0.0 ? 1.0 : 0.0;
        tEdge += (ring + ring2) * w * life;
        tCrest += exp(-pow((dist - radius + 0.01) * width * 1.2, 2.0)) * fade * w * life;
        offset += normalize(d + 1e-5) * ring * 0.004 * w * life;
      }

      col = texture2D(uTex, clamp(iuv + offset, 0.001, 0.999)).rgb;

      vec3 wet = mix(WASH, vec3(0.55, 0.58, 0.62), uTone);
      col = mix(col, wet, (rA.x + rB.x + tEdge) * 0.30);
      col = mix(col, mistColor, (rA.y + rB.y + tCrest) * 0.10);

      // --- mist and clouds ----------------------------------------------------------------
      float mband = band(iuv.y, uMistBand);
      if (mband > 0.001) {
        float m = fbm(vec2(iuv.x * 3.2 + uTime * 0.014, iuv.y * 7.0 + uTime * 0.004));
        col = mix(col, mistColor, mband * smoothstep(0.42, 0.78, m) * 0.28 * uMist * life);
      }
      float cband = band(iuv.y, uCloudBand);
      if (cband > 0.001) {
        float c1 = fbm(vec2(iuv.x * 1.6 - uTime * 0.011, iuv.y * 2.4 + uTime * 0.002));
        float c2 = vnoise(vec2(iuv.x * 4.0 - uTime * 0.02, iuv.y * 6.0));
        float cloud = smoothstep(0.48, 0.80, c1 * 0.8 + c2 * 0.2);
        vec3 cloudColor = mix(PAPER, vec3(0.30, 0.32, 0.38), uTone);
        col = mix(col, cloudColor, cband * cloud * mix(0.16, 0.10, uTone) * (0.4 + 0.6 * uMist) * life);
      }

      // --- glow: a light that breathes ---------------------------------------------------
      if (uGlow.w > 0.0) {
        vec2 gd = (iuv - uGlow.xy) * vec2(1.0, 0.85);
        float g = exp(-dot(gd, gd) / (uGlow.z * uGlow.z));
        float breath = 0.65 + 0.35 * sin(uTime * 0.55 + vnoise(vec2(uTime * 0.2, 1.7)) * 2.0);
        col += uGlowColor * g * (uGlow.w * breath * (0.35 + 0.65 * motion) + uFlare * 0.7);
      }

      // --- drift: leaves or petals ---------------------------------------------------------
      if (uDriftP.x > 0.5 && motion > 0.02) {
        float count = uDriftP.x;
        float size = uDriftP.y;
        float speed = uDriftP.z;
        float petal = uDriftP.w;
        for (int i = 0; i < 8; i++) {
          if (float(i) >= count) break;
          float s = float(i) * 7.31 + 3.0;
          float life01 = fract(uTime * speed * 0.055 + hash1(s));
          float y = uDriftR.w - life01 * (uDriftR.w - uDriftR.z);
          float x = mix(uDriftR.x, uDriftR.y, hash1(s + 1.0)) + sin(uTime * 0.7 + s) * 0.025 + (life01 * 0.06) * (hash1(s + 2.0) - 0.5);
          vec2 d = iuv - vec2(x, y);
          d.y *= 0.667;                                   // image is 2:3, keep the shape round-ish
          float ang = uTime * (1.2 + hash1(s + 3.0)) + s;
          float sh = leafShape(d, ang, size, size * mix(0.45, 0.8, petal));
          float fade = smoothstep(0.0, 0.08, life01) * (1.0 - smoothstep(0.85, 1.0, life01));
          float a = sh * fade * motion * 0.85;
          vec3 tint = uDriftColor * (0.85 + 0.3 * hash1(s + 4.0));
          col = mix(col, tint, a);
        }
      }

      // --- burst: leaves or petals loosened by a tap ---------------------------------------
      if (uBurst.w > 0.5 && uDriftP.x > 0.5 && life > 0.02) {
        float age = uTime - uBurst.z;
        if (age > 0.0 && age < 4.0) {
          float size = uDriftP.y * 1.25;
          float petal = uDriftP.w;
          for (int i = 0; i < 8; i++) {
            if (float(i) >= uBurst.w) break;
            float s = float(i) * 3.77 + 21.0;
            vec2 vel = vec2((hash1(s) - 0.5) * 0.16, 0.03 + hash1(s + 1.0) * 0.05);
            vec2 pos = uBurst.xy + vel * age + vec2(sin(age * 2.6 + s) * 0.02, -0.024 * age * age);
            vec2 d = iuv - pos;
            d.y *= 0.667;
            float ang = age * (2.5 + hash1(s + 3.0) * 2.0) + s;
            float sh = leafShape(d, ang, size, size * mix(0.45, 0.8, petal));
            float fade = smoothstep(0.0, 0.12, age) * (1.0 - smoothstep(2.8, 4.0, age));
            vec3 tint = uDriftColor * (0.85 + 0.3 * hash1(s + 4.0));
            col = mix(col, tint, sh * fade * life);
          }
        }
      }

      // --- sparks: fireflies, or sparkle on moonlit water -----------------------------------
      if (uSpark.x > 0.5 && motion > 0.02) {
        float count = uSpark.x;
        for (int i = 0; i < 10; i++) {
          if (float(i) >= count) break;
          float s = float(i) * 5.17 + 11.0;
          vec2 pos;
          float tw;
          if (uSparkP.y < 0.5) {
            float t = uTime * (0.10 + 0.08 * hash1(s));
            pos = uSpark.yz + uSpark.w * vec2(sin(t * 1.3 + s) * 0.9, cos(t * 0.9 + s * 1.7) * 0.6);
            tw = 0.5 + 0.5 * sin(uTime * (1.5 + hash1(s + 1.0)) + s);
          } else {
            pos = uSpark.yz + (vec2(hash1(s), hash1(s + 1.0)) - 0.5) * uSpark.w * 2.0;
            tw = pow(0.5 + 0.5 * sin(uTime * (2.0 + 2.0 * hash1(s + 2.0)) + s), 6.0);
          }
          vec2 d = (iuv - pos) * vec2(1.0, 0.667);
          float dd = dot(d, d);
          float dot1 = exp(-dd / (uSparkP.x * uSparkP.x));
          float halo = exp(-dd / (uSparkP.x * uSparkP.x * 9.0)) * 0.25;
          col += uSparkColor * (dot1 + halo) * tw * motion * 0.9;
        }
      }
    } else {
      // Paper continues beyond the painting: above it the painting's own top edge carries on
      // (dark stays dark, paper stays paper); beside it the gutter settles quickly into paper.
      vec2 edge = clamp(iuv, 0.002, 0.998);
      float above = max(0.0, iuv.y - 1.0);
      float beside = max(max(-iuv.x, iuv.x - 1.0), 0.0);
      // Near the seam: a local average so the join is invisible. Further up: the average of the
      // whole top strip, so busy edges (leaves, boughs) do not streak into the sky.
      vec3 near = vec3(0.0);
      vec3 wide = vec3(0.0);
      for (int k = -3; k <= 3; k++) {
        float nx = clamp(edge.x + float(k) * 0.03, 0.002, 0.998);
        near += texture2D(uTex, vec2(nx, edge.y)).rgb;
        near += texture2D(uTex, vec2(nx, clamp(edge.y - 0.035 * sign(iuv.y - 0.5), 0.002, 0.998))).rgb;
        float wx = 0.08 + (float(k) + 3.0) * 0.14;
        wide += texture2D(uTex, vec2(wx, 0.975)).rgb;
        wide += texture2D(uTex, vec2(wx, 0.93)).rgb;
      }
      near /= 14.0;
      wide /= 14.0;
      vec3 e = mix(near, wide, smoothstep(0.0, 0.14, above));
      float haze = (fbm(vec2(iuv.x * 2.2, iuv.y * 1.6 + uTime * 0.008)) - 0.5) * 0.05;
      vec3 up = e + haze;
      // clouds drift on into the extended sky as well
      if (uCloudBand.x <= uCloudBand.y && above > 0.0) {
        float c1 = fbm(vec2(iuv.x * 1.6 - uTime * 0.011, iuv.y * 2.4 + uTime * 0.002));
        vec3 cloudColor = mix(PAPER, vec3(0.30, 0.32, 0.38), uTone);
        up = mix(up, cloudColor, smoothstep(0.48, 0.80, c1) * mix(0.10, 0.07, uTone) * uLife * (1.0 - smoothstep(0.0, 0.6, above)));
      }
      vec3 side = mix(e, paper, smoothstep(0.0, 0.012, beside));
      col = beside > 0.0 ? side : up;
      if (above > 0.0 && beside <= 0.0) col = mix(col, mix(paper, e * 0.8, uTone), smoothstep(0.0, 1.4, above) * 0.22);
    }

    // Neighbours fade almost entirely into the paper, so the painting in front is the only thing that speaks.
    col = mix(col, paper, uDim * 0.84);
    col += grain + fibre;
    vec2 q = st - 0.5;
    col *= 1.0 - dot(q, q) * 0.10;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const BG_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uRes;
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  void main() {
    vec3 paper = mix(vec3(0.957, 0.941, 0.902), vec3(0.929, 0.906, 0.855), vnoise(vUv * 5.0) * 0.6);
    paper += (hash(floor(vUv * uRes * 0.5)) - 0.5) * 0.03;
    gl_FragColor = vec4(paper, 1.0);
  }
`;

// Targets per phase of the session; see PRD "Session time -> visual behaviour".
// motion drives wind, drift, glow breathing and sparks.
const PHASES = [
  { until: 58,  mist: 0.35, water: 0.00, ripple: 0.00, motion: 0.70 },
  { until: 111, mist: 0.50, water: 1.00, ripple: 0.00, motion: 1.00 },
  { until: 196, mist: 0.60, water: 0.80, ripple: 1.00, motion: 1.00 },
  { until: 257, mist: 0.30, water: 0.25, ripple: 0.12, motion: 0.45 },
  { until: 301, mist: 0.10, water: 0.08, ripple: 0.00, motion: 0.20 },
];
const IDLE = { mist: 0.45, water: 0.35, ripple: 0.4, motion: 0.8 };
const ANCHORS = { bottom: 0, right: 1, left: 2, top: 3 };

export class KarmaScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.paintings = ARTWORKS;
    this.ready = false;
    this.running = false;      // the render loop
    this.active = false;       // what the app last asked for
    this.reduced = false;
    this.lost = false;
    this.time = 0;
    this.last = 0;
    this.scroll = 0;           // painting units; integer = centred
    this.target = { ...IDLE };
    this.value = { ...IDLE };
    this.slowFrames = 0;
    this.degraded = 0;
    this.raf = 0;
    this.columns = [];
    this.lastEmitted = -1;
    this.onResize = () => this.resize();
  }

  urlFor(file) { return `assets/artwork/${file}.webp`; }

  buildUniforms(p, focused) {
    const sc = p.scene || {};
    const v2 = (a, d) => new THREE.Vector2(...(a || d));
    const v3 = (a, d) => new THREE.Vector3(...(a || d));
    const v4 = (a, d) => new THREE.Vector4(...(a || d));
    const winds = (sc.wind || []).slice(0, 2);
    const windRect = (w) => (w ? w.rect : [0, 0, 0, 0]);
    const windPrm = (w, phase) => (w ? [ANCHORS[w.anchor] ?? 0, w.strength ?? 0.003, w.speed ?? 0.8, phase] : [0, 0, 0, 0]);
    const drift = sc.drift;
    const glow = sc.glow;
    const sparks = sc.sparks;
    return {
      uTex: { value: null },
      uHasTex: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
      uTime: { value: 0 },
      uMist: { value: IDLE.mist },
      uWater: { value: IDLE.water },
      uRipple: { value: IDLE.ripple },
      uMotion: { value: IDLE.motion },
      uLife: { value: focused ? 1 : 0 },
      uDim: { value: focused ? 0 : 1 },
      uTone: { value: p.tone ? 1 : 0 },
      uQuality: { value: 1 },
      uMistBand: { value: v2(sc.mist, [1, 0]) },
      uCloudBand: { value: v2(sc.clouds, [1, 0]) },
      uWaterBand: { value: v2(sc.water, [1, 0]) },
      uWaterFlow: { value: v2(sc.waterFlow, [0, 0]) },
      uReeds: { value: v2(sc.reeds, [0, 0]) },
      uRippleA: { value: v2(sc.ripple, [-1, -1]) },
      uRippleB: { value: v2(sc.ripple2, [-1, -1]) },
      uWindA: { value: v4(windRect(winds[0]), [0, 0, 0, 0]) },
      uWindAP: { value: v4(windPrm(winds[0], 0.0)) },
      uWindB: { value: v4(windRect(winds[1]), [0, 0, 0, 0]) },
      uWindBP: { value: v4(windPrm(winds[1], 2.1)) },
      uDriftP: { value: drift ? new THREE.Vector4(drift.count ?? 4, drift.size ?? 0.008, drift.speed ?? 1, drift.kind === 'petal' ? 1 : 0) : new THREE.Vector4(0, 0, 0, 0) },
      uDriftR: { value: v4(drift?.range, [0, 1, 0, 1]) },
      uDriftColor: { value: v3(drift?.color, [0.8, 0.3, 0.1]) },
      uGlow: { value: glow ? new THREE.Vector4(glow.center[0], glow.center[1], glow.radius ?? 0.15, glow.strength ?? 0.1) : new THREE.Vector4(0, 0, 0, 0) },
      uGlowColor: { value: v3(glow?.color, [1, 0.6, 0.3]) },
      uSpark: { value: sparks ? new THREE.Vector4(sparks.count ?? 6, sparks.center[0], sparks.center[1], sparks.radius ?? 0.2) : new THREE.Vector4(0, 0, 0, 0) },
      uSparkColor: { value: v3(sparks?.color, [1, 0.8, 0.5]) },
      uSparkP: { value: new THREE.Vector2(sparks?.size ?? 0.004, sparks?.mode === 'water' ? 1 : 0) },
      uTouches: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 0, 0)) },
      uGust: { value: new THREE.Vector2(0, 0) },
      uFlare: { value: 0 },
      uBurst: { value: new THREE.Vector4(0, 0, 0, 0) },
    };
  }

  async init(firstIndex = 0) {
    if (this.ready) return true;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    } catch (err) {
      console.warn('Karma: WebGL unavailable, keeping the still painting.', err);
      return false;
    }
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xf4f0e6, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 10, 6000);
    this.loader = new THREE.TextureLoader();

    // Paper behind everything.
    this.bgUniforms = { uRes: { value: new THREE.Vector2(1, 1) } };
    this.bg = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: BG_FRAG, uniforms: this.bgUniforms, depthWrite: false })
    );
    this.scene.add(this.bg);

    // One column per painting: full viewport height, image bottom-anchored, paper above.
    const geometry = new THREE.PlaneGeometry(1, 1);
    this.geometry = geometry;
    this.columns = this.paintings.map((p, i) => {
      const uniforms = this.buildUniforms(p, i === firstIndex);
      const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms }));
      mesh.frustumCulled = true;
      this.scene.add(mesh);
      return { mesh, uniforms, painting: p, loaded: false, loading: null };
    });

    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; this.stop(); this.canvas.classList.remove('ready'); });
    this.canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.canvas.classList.add('ready'); this.resize(); this.setActive(this.active); });
    window.addEventListener('resize', this.onResize);

    this.scroll = firstIndex;
    this.resize();
    await this.loadTexture(firstIndex);
    this.ready = true;
    this.render();
    this.canvas.classList.add('ready');

    this.gallery = new Gallery(this.canvas, this.paintings.length, {
      onScroll: (s) => this.setScroll(s),
      onFocus: (i) => this.emitArtwork(i),
      unitPx: () => this.colW || 1,
      onTap: (x, y) => this.touch(x, y),
    });
    this.gallery.dragEnabled = !this.reduced;
    this.gallery.jumpTo(firstIndex);
    this.canvas.addEventListener('keydown', (e) => {
      const back = ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key);
      const on = back || ['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key);
      if (!on) return;
      e.preventDefault();
      this.shiftArtwork(back ? -1 : 1);
    });

    // Neighbours first, then the rest, without blocking.
    const order = [...this.columns.keys()].sort((a, b) => Math.abs(a - firstIndex) - Math.abs(b - firstIndex));
    (async () => { for (const i of order) await this.loadTexture(i); })();
    return true;
  }

  loadTexture(i) {
    const c = this.columns[i];
    if (!c || c.loaded) return Promise.resolve();
    if (c.loading) return c.loading;
    c.loading = this.loader.loadAsync(this.urlFor(c.painting.file)).then((tex) => {
      tex.colorSpace = THREE.NoColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      c.uniforms.uTex.value = tex;
      c.uniforms.uHasTex.value = 1;
      c.loaded = true;
      if (!this.running) this.render();
    }).catch((err) => { console.warn('Karma: a painting did not load.', c.painting.file, err); });
    return c.loading;
  }

  resize() {
    if (!this.renderer || this.lost) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    this.renderer.setSize(W, H, false);
    const dpr = this.renderer.getPixelRatio();
    this.W = W; this.H = H;

    // World units are CSS pixels at z = 0.
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.camDist = (H / 2) / Math.tan((FOV / 2) * Math.PI / 180);

    // Mirror the CSS object-fit rules on the <img> exactly.
    let imgW, imgH;
    if (W / H < IMAGE_ASPECT) { imgW = W; imgH = W / IMAGE_ASPECT; }       // tall: width-fit, bottom-anchored
    else { imgH = H; imgW = H * IMAGE_ASPECT; }                             // wide: height-fit, centred
    this.colW = imgW + GUTTER;
    this.pitch = this.colW;
    const rect = [GUTTER / 2 / this.colW, 0, imgW / this.colW, imgH / H];

    for (const c of this.columns) {
      c.mesh.scale.set(this.colW, H, 1);
      c.uniforms.uRes.value.set(this.colW * dpr, H * dpr);
      c.uniforms.uRect.value.set(...rect);
    }
    const bgDepth = 900;
    const bgScale = (this.camDist + bgDepth) / this.camDist;
    this.bg.scale.set(W * bgScale * 1.2, H * bgScale * 1.2, 1);
    this.bg.position.z = -bgDepth;
    this.bgUniforms.uRes.value.set(W * dpr, H * dpr);
    this.layout();
    if (!this.running) this.render();
  }

  /** Position every column for the current scroll value. */
  layout() {
    const s = this.scroll;
    this.camera.position.set(s * this.pitch, 0, this.camDist);
    this.camera.lookAt(s * this.pitch, 0, 0);
    this.bg.position.x = s * this.pitch;
    for (let i = 0; i < this.columns.length; i++) {
      const c = this.columns[i];
      const d = i - s;
      const a = Math.min(1, Math.abs(d));
      const ease = a * a * (3 - 2 * a);
      c.mesh.position.set(i * this.pitch, 0, -ease * 90);
      c.mesh.rotation.y = -Math.max(-1.6, Math.min(1.6, d)) * 0.24;
      const sc = 1 - ease * 0.05;
      c.mesh.scale.set(this.colW * sc, this.H * sc, 1);
      c.uniforms.uLife.value = 1 - ease;
      c.uniforms.uDim.value = ease;
      c.mesh.visible = Math.abs(d) < 2.5;
    }
  }

  setScroll(s) {
    this.scroll = s;
    if (this.ready) { this.layout(); if (!this.running) this.render(); }
  }

  get focusedIndex() { return Math.max(0, Math.min(this.columns.length - 1, Math.round(this.scroll))); }

  emitArtwork(index = this.focusedIndex) {
    if (index === this.lastEmitted) return;
    this.lastEmitted = index;
    const item = this.paintings[index];
    if (!item) return;
    this.canvas.dispatchEvent(new CustomEvent('artworkchange', {
      detail: { index, count: this.paintings.length, title: item.title, description: item.description, tone: item.tone },
    }));
  }

  /** The chevrons, and anything else that moves one painting at a time. */
  shiftArtwork(step) {
    if (!this.gallery) return;
    this.gallery.goTo(this.gallery.targetIndex + step);
  }

  /** Screen point (CSS px) to image uv on the focused painting; null when the scroll is moving or the point is off the picture. */
  pointToImage(x, y) {
    if (!this.ready || Math.abs(this.scroll - Math.round(this.scroll)) > 0.06) return null;
    const W = this.W, H = this.H;
    let imgW, imgH;
    if (W / H < IMAGE_ASPECT) { imgW = W; imgH = W / IMAGE_ASPECT; } else { imgH = H; imgW = H * IMAGE_ASPECT; }
    const left = (W - imgW) / 2;
    const top = H - imgH;
    const u = (x - left) / imgW;
    const v = 1 - (y - top) / imgH;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    return { u, v };
  }

  /** A tap on the painting. Decides what was touched and answers accordingly. */
  touch(x, y) {
    if (this.reduced) return null;
    const p = this.pointToImage(x, y);
    if (!p) return null;
    const c = this.columns[this.focusedIndex];
    if (!c || !c.loaded) return null;
    const sc = c.painting.scene || {};
    const inBand = (b, v) => Array.isArray(b) && v >= b[0] && v <= b[1];
    const inRect = (r) => r && p.u >= r[0] && p.v >= r[1] && p.u <= r[2] && p.v <= r[3];
    const inReeds = sc.reeds && p.u < sc.reeds[0] && p.v < sc.reeds[1];
    const now = this.time;
    c.touchState ??= { slot: 0, gustA: -99, gustB: -99, flare: -99 };
    const st = c.touchState;
    const winds = sc.wind || [];
    let kind = null;
    // Only real foliage counts as a wind target; the koi's slow undulation (very low strength) does not.
    const foliage = (w) => w && (w.strength ?? 0) >= 0.002 && inRect(w.rect);

    if (sc.glow && Math.hypot(p.u - sc.glow.center[0], (p.v - sc.glow.center[1]) * 0.85) < sc.glow.radius * 1.5) {
      kind = 'light';
      st.flare = now;
      if (inRect(winds[1]?.rect)) st.gustB = now; else if (inRect(winds[0]?.rect)) st.gustA = now; else st.gustB = now;
    } else if (foliage(winds[0]) || foliage(winds[1])) {
      kind = 'wind';
      if (foliage(winds[0])) st.gustA = now;
      if (foliage(winds[1])) st.gustB = now;
      if (sc.drift) c.uniforms.uBurst.value.set(p.u, p.v, now, 5 + Math.floor(Math.random() * 4));
    } else if (inBand(sc.water, p.v) && !inReeds) {
      kind = 'water';
      c.uniforms.uTouches.value[st.slot].set(p.u, p.v, now, 1);
      st.slot = (st.slot + 1) % 4;
    }
    if (!kind) return null;
    // A tap while the loop is stopped still has to show, so apply it before drawing.
    if (!this.running) { this.updateTouches(); this.render(); }
    return kind;
  }

  /** Decay the tap responses; called every frame. */
  updateTouches() {
    for (const c of this.columns) {
      const st = c.touchState;
      if (!st) continue;
      const e = (t0) => { const a = this.time - t0; return a < 0 ? 0 : Math.exp(-a * 0.75) * Math.min(1, a * 8); };
      c.uniforms.uGust.value.set(e(st.gustA), e(st.gustB));
      c.uniforms.uFlare.value = e(st.flare) * 0.5;
    }
  }

  /** Under reduced motion nothing breathes, so the targets are pinned at rest. */
  setTargets(t) {
    this.target = this.reduced ? { mist: 0, water: 0, ripple: 0, motion: 0 } : t;
    if (this.reduced) this.value = { ...this.target };
  }

  idle() { this.setTargets({ ...IDLE }); }

  setTime(t) {
    const p = PHASES.find((ph) => t < ph.until) || PHASES[PHASES.length - 1];
    if (t >= 257) {
      const k = Math.min(1, (t - 257) / 43);
      this.setTargets({ mist: p.mist * (1 - k), water: p.water * (1 - k), ripple: 0, motion: p.motion * (1 - k) });
    } else {
      this.setTargets({ mist: p.mist, water: p.water, ripple: p.ripple, motion: p.motion });
    }
  }

  settle() { this.setTargets({ mist: 0.05, water: 0, ripple: 0, motion: 0 }); }

  setReduced(value) {
    const was = this.reduced;
    this.reduced = Boolean(value);
    if (this.gallery) this.gallery.dragEnabled = !this.reduced;
    if (this.reduced) this.setTargets(null);
    else if (was) this.idle();
    this.setActive(this.active);
  }

  setActive(value) {
    this.active = Boolean(value);
    if (!this.ready || this.lost) return;
    if (this.active && !this.reduced) this.start();
    else { this.stop(); this.render(); }
  }

  start() {
    if (!this.ready || this.running || this.lost) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.time += dt;
      const k = 1 - Math.exp(-dt / 2.8);
      for (const key of ['mist', 'water', 'ripple', 'motion']) this.value[key] += (this.target[key] - this.value[key]) * k;
      this.updateTouches();
      const t0 = performance.now();
      this.render();
      this.watchPerformance(performance.now() - t0);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  render() {
    if (!this.renderer || this.lost) return;
    for (const c of this.columns) {
      c.uniforms.uTime.value = this.time;
      c.uniforms.uMist.value = this.value.mist;
      c.uniforms.uWater.value = this.value.water;
      c.uniforms.uRipple.value = this.value.ripple;
      c.uniforms.uMotion.value = this.value.motion;
    }
    this.renderer.render(this.scene, this.camera);
  }

  watchPerformance(ms) {
    if (ms > 24) this.slowFrames++; else this.slowFrames = 0;
    if (this.slowFrames >= 60 && this.degraded === 0) {
      this.degraded = 1; this.slowFrames = 0;
      this.renderer.setPixelRatio(1);
      this.resize();
    } else if (this.slowFrames >= 60 && this.degraded === 1) {
      this.degraded = 2; this.slowFrames = 0;
      for (const c of this.columns) c.uniforms.uQuality.value = 0;
    }
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    for (const c of this.columns) { c.uniforms.uTex.value?.dispose(); c.mesh.material.dispose(); }
    this.geometry?.dispose();
    this.bg?.geometry.dispose(); this.bg?.material.dispose();
    this.renderer?.dispose();
    this.ready = false;
    this.canvas.classList.remove('ready');
  }
}
