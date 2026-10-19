/**
 * The WebGL side of the footer terrain, and the only module here that imports the renderer.
 * `Terrain.tsx` reaches it through a dynamic `import()` once the footer is near the viewport, so
 * three.js stays its own chunk and a page whose footer is never reached never downloads it.
 *
 * Two draw calls over one set of vertices: `Points` for the dots and `LineSegments` for the mesh
 * between them. Both run the same vertex shader, so a dot is on every crossing by construction.
 * No post-processing: the depth of field and the fog are arithmetic in that shader (`dotLook` in
 * field.ts is the same arithmetic in TypeScript). `createLoop` (src/fx/core) stops it while the
 * tab is hidden or the footer is off screen.
 *
 * The pointer does nothing here. The surface moves on its own, slowly, and that is all.
 */

import {
  AddEquation,
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  LineSegments,
  NormalBlending,
  OneFactor,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  SrcAlphaFactor,
  Vector3,
  WebGLRenderer,
  ZeroFactor,
} from 'three'
import { createLoop } from '../../fx/core/loop'
import { dprCap } from '../../fx/core/quality'
import { createSwells, frameHeight, gridLines, gridPositions, SWELL_STRIDE, TERRAIN, type TerrainPalette } from './field'

export type TerrainOptions = {
  /** The stage's CSS size. */
  width: number
  height: number
  readPalette(): TerrainPalette
  /** The browser took the WebGL context away. The caller falls back to its still. */
  onLost?(): void
}

export type TerrainHandle = {
  resize(width: number, height: number): void
  dispose(): void
}

const f = (n: number) => n.toFixed(5)
const T = TERRAIN

// The noise is Ian McEwan and Stefan Gustavson's 3D simplex noise (MIT licence), unchanged.
// `snoise` in field.ts is the same function in TypeScript, and `terrain()` below is `heightAt`.
const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uScale;
uniform vec4 uSwell[${T.swells}];
varying float vAlpha;
varying float vSoft;
varying float vLine;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float terrain(float x, float depth) {
  float flow = depth + uTime * ${f(T.drift)};
  float h = ${f(T.amp1)} * snoise(vec3(x * ${f(T.freq1)}, flow * ${f(T.freq1)}, uTime * ${f(T.speed1)}))
          + ${f(T.amp2)} * snoise(vec3(x * ${f(T.freq2)} + 17.3, flow * ${f(T.freq2)}, uTime * ${f(T.speed2)} + 5.1));
  for (int s = 0; s < ${T.swells}; s++) {
    vec2 away = vec2(x, depth) - uSwell[s].xy;
    h += uSwell[s].w * exp(-dot(away, away) * uSwell[s].z);
  }
  return h;
}

void main() {
  float height = terrain(position.x, -position.z);
  vec4 mv = modelViewMatrix * vec4(position.x, height, position.z, 1.0);
  gl_Position = projectionMatrix * mv;
  float view = -mv.z;

  float fog = 1.0 - smoothstep(${f(T.fogStart)}, ${f(T.fogEnd)}, view);
  float nearBlur = clamp((${f(T.focus)} - view) / ${f(T.focus - T.focusNear)}, 0.0, 1.0);
  float farBlur = clamp((view - ${f(T.focus)}) / ${f(T.fogEnd - T.focus)}, 0.0, 1.0);
  float grow = 1.0 + ${f(T.blurNear - 1)} * nearBlur * nearBlur + ${f(T.blurFar - 1)} * farBlur;
  float natural = ${f(T.dot)} * uScale / view;
  float sharp = max(${f(T.minPx)}, natural);
  float floorLight = min(1.0, natural / ${f(T.minPx)});
  float lit = ${f(T.valley)} + ${f(1 - T.valley)} * smoothstep(${f(-T.amp1)}, ${f(T.amp1)}, height);

  gl_PointSize = sharp * grow;
  vAlpha = ${f(T.dotAlpha)} * fog * floorLight * lit / pow(grow, 1.35);
  vSoft = 0.25 + 0.75 * max(nearBlur, farBlur * 0.6);
  vLine = ${f(T.lineAlpha)} * fog * fog * lit * (1.0 - 0.9 * nearBlur);
}
`

// The colours are the theme's own sRGB values, written out as they are: no colour-space chunk,
// so a dot is exactly the token's colour, laid on the page the way CSS would lay it.
const DOT_FRAGMENT = /* glsl */ `
uniform vec3 uDot;
varying float vAlpha;
varying float vSoft;

void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = vAlpha * (1.0 - smoothstep(1.0 - vSoft, 1.0, r));
  if (a < 0.003) discard;
  gl_FragColor = vec4(uDot, a);
}
`

const LINE_FRAGMENT = /* glsl */ `
uniform vec3 uLine;
varying float vLine;

void main() {
  if (vLine < 0.003) discard;
  gl_FragColor = vec4(uLine, vLine);
}
`

export function mountTerrain(canvas: HTMLCanvasElement, opts: TerrainOptions): TerrainHandle {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' })
  const dpr = dprCap()
  renderer.setPixelRatio(dpr)
  renderer.setClearColor(0x000000, 0)

  const camera = new PerspectiveCamera(T.fovDeg, 1, 0.5, 80)
  camera.position.set(0, T.camY, 0)
  camera.rotation.x = -T.pitch

  // One set of vertices: the lines index into the points' own positions.
  const positions = new BufferAttribute(gridPositions(), 3)
  const dotGeometry = new BufferGeometry()
  dotGeometry.setAttribute('position', positions)
  const lineGeometry = new BufferGeometry()
  lineGeometry.setAttribute('position', positions)
  lineGeometry.setIndex(new BufferAttribute(gridLines(), 1))

  const swells = createSwells()
  const swellState = new Float32Array(T.swells * SWELL_STRIDE)
  const uniforms = {
    uTime: { value: T.stillT as number },
    uScale: { value: 1 },
    // A flat array is how a `vec4[]` uniform is fed.
    uSwell: { value: swellState },
    uDot: { value: new Vector3() },
    uLine: { value: new Vector3() },
  }
  const shared = { uniforms, vertexShader: VERTEX, transparent: true, depthTest: false, depthWrite: false }
  const dotMaterial = new ShaderMaterial({ ...shared, fragmentShader: DOT_FRAGMENT })
  const lineMaterial = new ShaderMaterial({ ...shared, fragmentShader: LINE_FRAGMENT })

  const lines = new LineSegments(lineGeometry, lineMaterial)
  const dots = new Points(dotGeometry, dotMaterial)
  // The shader moves every vertex, so the flat grid's own bounds say nothing about the frame.
  lines.frustumCulled = false
  dots.frustumCulled = false
  const scene = new Scene()
  scene.add(lines, dots)

  const applyPalette = () => {
    const { dot, line, additive } = opts.readPalette()
    uniforms.uDot.value.set(dot.r, dot.g, dot.b)
    uniforms.uLine.value.set(line.r, line.g, line.b)
    for (const material of [dotMaterial, lineMaterial]) {
      if (additive) {
        // Light added to the page: colour is summed, and the canvas's own alpha is left at zero,
        // so the page shows through everywhere and overlapping dots glow.
        material.blending = CustomBlending
        material.blendEquation = AddEquation
        material.blendSrc = SrcAlphaFactor
        material.blendDst = OneFactor
        material.blendSrcAlpha = ZeroFactor
        material.blendDstAlpha = OneFactor
      } else {
        // On a light page adding light only reaches white: paint over it instead.
        material.blending = NormalBlending
      }
      material.needsUpdate = true
    }
  }
  applyPalette()

  const setSize = (width: number, height: number) => {
    const w = Math.max(1, Math.round(width))
    const h = Math.max(1, Math.round(height))
    renderer.setSize(w, h, false)
    // The canvas is the top of the frame: all of it, unless the stage is shorter than
    // `frameMin`, in which case it is a window onto the top of a frame that tall.
    const frame = frameHeight(h)
    camera.aspect = w / frame
    camera.setViewOffset(w, frame, 0, 0, w, h)
    // Device pixels per world unit at view depth 1.
    uniforms.uScale.value = (frame * dpr) / (2 * T.halfFovTan)
  }
  setSize(opts.width, opts.height)

  const frame = (dt: number) => {
    uniforms.uTime.value += dt
    swells.at(uniforms.uTime.value, swellState)
    renderer.render(scene, camera)
  }

  const loop = createLoop({ el: canvas, frame })

  // Colours only change when the theme does.
  const themes = new MutationObserver(applyPalette)
  themes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  let disposed = false
  const onContextLost = (event: Event) => {
    event.preventDefault()
    if (!disposed) opts.onLost?.()
  }
  canvas.addEventListener('webglcontextlost', onContextLost)

  // The first frame is drawn here, at the still's own time, not on the next animation frame, so
  // the caller can swap its still for this canvas the moment this function returns.
  frame(0)
  loop.start()

  return {
    resize(width, height) {
      setSize(width, height)
      renderer.render(scene, camera)
    },
    dispose() {
      disposed = true
      canvas.removeEventListener('webglcontextlost', onContextLost)
      themes.disconnect()
      loop.dispose()
      dotGeometry.dispose()
      lineGeometry.dispose()
      dotMaterial.dispose()
      lineMaterial.dispose()
      renderer.dispose()
      // Browsers cap live WebGL contexts and drop the oldest past the cap. The homepage hero
      // holds one too, so this one is handed back, not left for garbage collection.
      renderer.forceContextLoss()
    },
  }
}
