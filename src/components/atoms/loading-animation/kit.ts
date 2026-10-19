/**
 * The drawing kit every loader dial is built from. One shader draws almost everything: a flat
 * annulus that can be cut to an angular window (an arc), repeated around the circle (a tick crown,
 * a dash ring), faded along its sweep (a shaded blade) and lit by a travelling highlight (the tick
 * crown catching the accent as it passes). An arc's window and its highlight are uniforms, so an
 * arc that grows, slides or sweeps is a uniform write per frame and never a geometry rebuild.
 *
 * Antialiasing: the radial edges are real geometry, so the renderer's MSAA smooths them. The
 * angular cuts are made in the fragment shader, so they are smoothed there, over one device pixel
 * measured with `fwidth`, or the ends of every arc and every tick would stair-step.
 *
 * Every mesh is flat, transparent and drawn in creation order (`renderOrder`), with depth off: the
 * dial is a stack of layers, and the stack order is the order the variant builds them in. Each
 * layer also sits at its own small `z`, which is what gives the gentle sway its parallax.
 */

import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  ShaderMaterial,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three'
import type { Palette, Role } from './palette'

export const TAU = Math.PI * 2

/**
 * `--ease-snap`, cubic-bezier(0.2, 0.8, 0.2, 1), solved exactly: the dial's draw-on and its indexed
 * steps use the same curve as every CSS transition in the system, not an approximation of it.
 */
export function easeSnap(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const [x1, y1, x2, y2] = [0.2, 0.8, 0.2, 1]
  const bez = (u: number, a: number, b: number) => 3 * a * u * (1 - u) ** 2 + 3 * b * u ** 2 * (1 - u) + u ** 3
  // Newton on x(u) = t, then read y(u). x is monotonic for these control points.
  let u = t
  for (let i = 0; i < 8; i++) {
    const x = bez(u, x1, x2) - t
    const dx = 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u ** 2
    if (Math.abs(x) < 1e-6 || dx === 0) break
    u = Math.min(1, Math.max(0, u - x / dx))
  }
  return bez(u, y1, y2)
}

/** How long one element takes to draw itself on, in seconds. */
export const DRAW_ON = 0.6

/** An indexed move: hold, then snap forward one `step` over `move` seconds, every `period`. The
 *  mechanical cadence of a dial clicking to its next detent, on the system's own easing. */
export function stepped(t: number, period: number, move: number, step: number): number {
  const k = Math.floor(t / period)
  return (k + easeSnap((t - k * period) / move)) * step
}

/** A value that breathes between `min` and `max` with period `period`, starting at `min`. */
export function breathe(t: number, min: number, max: number, period: number): number {
  return min + (max - min) * (0.5 - 0.5 * Math.cos((t / period) * TAU))
}

export function polar(r: number, angle: number): [number, number] {
  return [r * Math.cos(angle), r * Math.sin(angle)]
}

const VERT = /* glsl */ `
varying vec2 vLocal;
void main() {
  vLocal = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uStart;
uniform float uLength;
uniform float uCount;
uniform float uDuty;
uniform float uFade;
uniform float uHead;
uniform float uHeadWidth;
uniform vec3 uHeadColor;
varying vec2 vLocal;
const float TAU = 6.28318530718;

void main() {
  float r = max(length(vLocal), 1e-4);
  float ang = atan(vLocal.y, vLocal.x);
  float rel = mod(ang - uStart, TAU);
  // One device pixel, as an angle at this radius. fwidth(ang) would spike at atan's +-PI seam.
  float px = length(fwidth(vLocal)) / r;

  float a = 1.0;
  if (uLength < TAU - 1e-4) {
    a *= smoothstep(0.0, px, rel) * (1.0 - smoothstep(uLength - px, uLength, rel));
  }
  if (uCount > 0.0) {
    float cell = fract(rel / TAU * uCount);
    float cellPx = px / TAU * uCount;
    a *= smoothstep(0.0, cellPx, cell) * (1.0 - smoothstep(uDuty - cellPx, uDuty, cell));
  }
  if (uFade > 0.0) {
    float along = clamp(rel / max(uLength, 1e-4), 0.0, 1.0);
    a *= mix(1.0 - uFade, 1.0, along);
  }

  vec3 col = uColor;
  if (uHeadWidth > 0.0) {
    float d = abs(mod(ang - uHead + TAU * 0.5, TAU) - TAU * 0.5);
    float h = 1.0 - smoothstep(0.0, uHeadWidth, d);
    col = mix(col, uHeadColor, h);
    a = min(1.0, a * (1.0 + 1.5 * h));
  }

  a *= uOpacity;
  if (a < 0.002) discard;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`

export type BandOptions = {
  /** Centre radius of the annulus, in dial units (1 is the dial's outer edge). */
  r: number
  /** Radial width, in dial units. Use `kit.px(n)` for a hairline that stays n CSS pixels wide. */
  w: number
  role: Role
  /** Window start, radians, counter-clockwise from 3 o'clock. */
  start?: number
  /** Window length, radians. TAU (the default) is a full ring. */
  length?: number
  opacity?: number
  /** Repeat the window's content `count` times around the circle, each `duty` of its cell lit. */
  count?: number
  duty?: number
  /** 0: flat. 1: alpha ramps from 0 at the window's start to full at its end. */
  fade?: number
  /** A highlight that lights the band in `head.role` near `head.angle`, `head.width` radians wide. */
  head?: { role: Role; width: number }
  /** Seconds after mount before this element draws itself on. */
  delay?: number
  /** Draw on by growing from the centre rather than by sweeping: for dots and small circles. */
  pop?: boolean
  parent?: Object3D
}

/** A live handle: a variant moves an arc by writing `start`, `length` or `head` each frame, and the
 *  kit's `sync` pushes those (times the draw-on) into the shader. */
export type Band = {
  mesh: Mesh<BufferGeometry, ShaderMaterial>
  mat: ShaderMaterial
  role: Role
  start: number
  length: number
  head: number
  delay: number
  pop: boolean
  opacity: number
  headRole?: Role
}

type Line = { mesh: Mesh<BufferGeometry, MeshBasicMaterial>; role: Role; opacity: number; delay: number }

export class Kit {
  readonly group = new Group()
  readonly bands: Band[] = []
  private readonly lines: Line[] = []
  private readonly owned: { dispose(): void }[] = []
  private palette: Palette
  private readonly pxToWorld: number
  private order = 0
  private z = 0

  constructor(opts: { pxToWorld: number; palette: Palette }) {
    this.pxToWorld = opts.pxToWorld
    this.palette = opts.palette
  }

  /** n CSS pixels, in dial units, for this loader's rendered size. */
  px(n: number): number {
    return n * this.pxToWorld
  }

  /** Sets the depth for every element created after it. */
  layer(z: number): this {
    this.z = z
    return this
  }

  /** A group at the current depth: the variant rotates it to move everything inside together. */
  node(parent: Object3D = this.group): Group {
    const g = new Group()
    g.position.z = this.z
    parent.add(g)
    return g
  }

  band(o: BandOptions): Band {
    const inner = Math.max(0, o.r - o.w / 2)
    const outer = o.r + o.w / 2
    const segments = Math.max(32, Math.ceil(outer * 160))
    const geometry = new RingGeometry(inner, outer, segments, 1)
    const mat = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uColor: { value: new Color() },
        uOpacity: { value: 1 },
        uStart: { value: o.start ?? 0 },
        uLength: { value: 0 },
        uCount: { value: o.count ?? 0 },
        uDuty: { value: o.duty ?? 0.5 },
        uFade: { value: o.fade ?? 0 },
        uHead: { value: 0 },
        uHeadWidth: { value: o.head?.width ?? 0 },
        uHeadColor: { value: new Color() },
      },
    })
    const mesh = new Mesh(geometry, mat)
    mesh.renderOrder = this.order++
    if (!o.parent) mesh.position.z = this.z
    ;(o.parent ?? this.group).add(mesh)
    this.owned.push(geometry, mat)
    const band: Band = {
      mesh,
      mat,
      role: o.role,
      start: o.start ?? 0,
      length: o.length ?? TAU,
      head: 0,
      delay: o.delay ?? 0,
      pop: o.pop ?? false,
      opacity: o.opacity ?? 1,
      headRole: o.head?.role,
    }
    this.bands.push(band)
    this.tint(band)
    return band
  }

  /** A solid dot of radius `radius` (dial units) centred at (x, y). */
  dot(x: number, y: number, radius: number, role: Role, opts: { delay?: number; parent?: Object3D; opacity?: number } = {}): Band {
    const band = this.band({ r: radius / 2, w: radius, role, pop: true, ...opts })
    band.mesh.position.x = x
    band.mesh.position.y = y
    return band
  }

  /** A hollow circle: a hairline ring of radius `radius` centred at (x, y). */
  circle(
    x: number,
    y: number,
    radius: number,
    w: number,
    role: Role,
    opts: { delay?: number; parent?: Object3D; count?: number; duty?: number; opacity?: number } = {}
  ): Band {
    const band = this.band({ r: radius, w, role, pop: true, ...opts })
    band.mesh.position.x = x
    band.mesh.position.y = y
    return band
  }

  /** A straight hairline from (x1, y1) to (x2, y2). Draws on from its first point. */
  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    w: number,
    role: Role,
    opts: { delay?: number; parent?: Object3D; opacity?: number } = {}
  ): Mesh {
    const length = Math.hypot(x2 - x1, y2 - y1)
    const geometry = new PlaneGeometry(length, w)
    geometry.translate(length / 2, 0, 0)
    const mat = new MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false })
    const mesh = new Mesh(geometry, mat)
    mesh.position.set(x1, y1, opts.parent ? 0 : this.z)
    mesh.rotation.z = Math.atan2(y2 - y1, x2 - x1)
    mesh.renderOrder = this.order++
    ;(opts.parent ?? this.group).add(mesh)
    this.owned.push(geometry, mat)
    const line: Line = { mesh, role, opacity: opts.opacity ?? 1, delay: opts.delay ?? 0 }
    this.lines.push(line)
    this.tintLine(line)
    return mesh
  }

  setPalette(palette: Palette): void {
    this.palette = palette
    for (const band of this.bands) this.tint(band)
    for (const line of this.lines) this.tintLine(line)
  }

  /** Writes every handle's current state into its shader, scaled by its draw-on at time `t`. */
  sync(t: number): void {
    for (const band of this.bands) {
      const drawn = easeSnap((t - band.delay) / DRAW_ON)
      const u = band.mat.uniforms
      u.uStart.value = band.start
      u.uHead.value = band.head
      if (band.pop) {
        u.uLength.value = drawn > 0 ? band.length : 0
        band.mesh.scale.setScalar(Math.max(drawn, 1e-3))
      } else {
        u.uLength.value = band.length * drawn
      }
    }
    for (const line of this.lines) {
      line.mesh.scale.x = Math.max(easeSnap((t - line.delay) / DRAW_ON), 1e-3)
    }
  }

  dispose(): void {
    for (const item of this.owned) item.dispose()
    this.owned.length = 0
  }

  private tint(band: Band): void {
    const c = this.palette[band.role]
    const u = band.mat.uniforms
    ;(u.uColor.value as Color).setRGB(c.r, c.g, c.b, SRGBColorSpace)
    u.uOpacity.value = c.a * band.opacity
    if (band.headRole) {
      const h = this.palette[band.headRole]
      ;(u.uHeadColor.value as Color).setRGB(h.r, h.g, h.b, SRGBColorSpace)
    }
  }

  private tintLine(line: Line): void {
    const c = this.palette[line.role]
    const mat = line.mesh.material as Material & MeshBasicMaterial
    mat.color.setRGB(c.r, c.g, c.b, SRGBColorSpace)
    mat.opacity = c.a * line.opacity
  }
}
