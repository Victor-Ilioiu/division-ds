// Hexline "Kestrel": a fictional airsoft replica family, bare (no magazine, no optic), built from
// code only. One build, three variants:
//
//   create({ variant: 'c' })   default. Kestrel C carbine replica, 720 mm, stock open.
//   create({ variant: 'l' })   Kestrel L rifle replica: long barrel and handguard, three vents a side.
//   create({ variant: 'k' })   Kestrel K compact replica: short handguard and barrel, stock folded
//                              forward along the right-hand side.
//
// In the viewer (which only calls create() with defaults) add ?variant=l or ?variant=k to the URL.
// Receiver, grip, magazine well, trigger group and sights are shared; only the handguard length,
// the barrel length and the stock pose are parameters.
//
// Axes per spike/CONTRACT.md: +X muzzle, +Y up, the left side of the rifle faces -Z. Origin on the
// bore axis, directly above the centre of the magazine well. Real size, metres.
//
// The side silhouette is traced from spike/assets/rifle1.webp (a private, git-ignored reference photo). Coordinates written as `[px, py]` are
// pixels of that photo (see _rifle-kit.js for the px -> mm mapping), so any outline here can be
// checked against the picture by reading the same pixel. Z thicknesses are in millimetres.
//
// Form: the main bodies (receiver, handguard, grip) are lofts through rounded cross-sections,
// not extruded slabs. Extrusions are used for the parts that really are plates, and CSG for
// pockets (magazine well, ejection port, vents, the recessed webs of the stock).

import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { polymer, anodized } from '../lib/materials.js'
import { S, X, Y, P, shapePx, shapeMM, rawPx, pathPx, pathMM, rrect, ext, finish, loftX, latheX, strokePts, cutLined, offsetPoly, picatinny } from './_rifle-kit.js'

const RAIL_TOP_PY = 176 // top of the carry-handle rail teeth
const HG_HALF = 21 // handguard half thickness at the front; the rails stand fully proud of it
const HG_SKIRT = 23 // handguard half thickness where its skirt laps over the receiver
const SIDE_RAIL_Z = 27.5 // side rail top surface: 55 mm across both rails
const RX_HALF = 22.3 // receiver side wall half thickness
const SEL_Z = 23.3 // selector plate surface
const MAG_RAKE = THREE.MathUtils.degToRad(10)
const MAG_PX = [357, 304.5] // centre of the magazine well's bottom opening

// What differs between the three. `front` and `barrel` are millimetres added ahead of the
// carbine's handguard nose and muzzle; vents are [pxA, pxB] in photo pixels, already in their
// final place; rails are [length mm, teeth] and keep their rear end where the carbine has it.
const VARIANTS = {
  c: { label: 'C', front: 0, barrel: 0, vents: [[115, 134.5], [144, 163.5]], sideRail: [98, 7], bottomRail: [96, 8], fold: 0, serial: 'HX-C 048-2217' },
  l: { label: 'L', front: 135, barrel: 280, vents: [[-15, 4.5], [64.5, 84], [144, 163.5]], sideRail: [198, 17], bottomRail: [196, 18], fold: 0, serial: 'HX-L 051-0932' },
  k: { label: 'K', front: -40, barrel: -42, vents: [[154, 166]], sideRail: [58, 3], bottomRail: [56, 4], fold: 178, serial: 'HX-K 044-1705' },
}

function materials() {
  const grain = 0.045 // UVs are in mm; one grain tile every ~22 mm
  // The shared polymer, toned down so both sides of the rifle stay dark under the studio's
  // room environment (its bright panels otherwise wash the +Z side to mid grey).
  const poly = (o, extra = {}) => {
    const m = polymer(o)
    m.envMapIntensity = 0.7
    m.clearcoat = 0
    m.sheen = 0
    m.specularIntensity = 0.5
    Object.assign(m, extra)
    return m
  }
  const metal = (o) => {
    const m = new THREE.MeshPhysicalMaterial({ metalness: 0.9, ...o })
    m.envMapIntensity = 0.75
    return m
  }
  // The body shares the satin anodised finish of the suppressor and the sight. Only the parts
  // a hand or shoulder touches (grip, stock, butt pad) keep the coarse moulded polymer.
  const satin = (o) => {
    const m = anodized({ repeat: grain * 0.6, ...o })
    m.envMapIntensity = 0.75
    return m
  }
  const gripTex = poly({ color: 0x121315, roughness: 0.9, repeat: grain * 7 })
  gripTex.normalScale.set(1.5, 1.5)
  return {
    receiver: satin({ color: 0x131417, roughness: 0.38 }),
    panel: satin({ color: 0x15161a, roughness: 0.34 }),
    handguard: satin({ color: 0x141518, roughness: 0.4 }),
    stock: poly({ color: 0x1c1d20, roughness: 0.78, repeat: grain }),
    grip: poly({ color: 0x1a1b1e, roughness: 0.82, repeat: grain * 1.6 }),
    gripTex,
    carry: satin({ color: 0x121316, roughness: 0.36 }),
    control: satin({ color: 0x0e0f11, roughness: 0.34 }),
    rail: new THREE.MeshPhysicalMaterial({ color: 0x17181b, roughness: 0.5, metalness: 0.55, envMapIntensity: 0.7 }),
    rubber: new THREE.MeshPhysicalMaterial({ color: 0x0d0d0e, roughness: 0.92, metalness: 0, envMapIntensity: 0.4 }),
    steel: metal({ color: 0x1d1e21, roughness: 0.44 }),
    steelDark: metal({ color: 0x131416, roughness: 0.5 }),
    screw: metal({ color: 0x232427, roughness: 0.36 }),
    brass: new THREE.MeshPhysicalMaterial({ color: 0x8c6a2c, roughness: 0.32, metalness: 1 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x040405, roughness: 0.95, metalness: 0 }),
    pocket: new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.9, metalness: 0, envMapIntensity: 0.25 }),
    white: new THREE.MeshStandardMaterial({ color: 0xc9c9c5, roughness: 0.7 }),
  }
}

/** Canvas-drawn marking on a transparent plane. Draw in millimetres; y runs down. */
function decal(w, h, draw, { res = 22 } = {}) {
  const c = document.createElement('canvas')
  c.width = Math.round(w * res)
  c.height = Math.round(h * res)
  const g = c.getContext('2d')
  g.scale(res, res)
  draw(g, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    roughness: 0.8,
    metalness: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w / 1000, h / 1000), mat)
  mesh.userData.shadow = false
  return mesh
}

export function create({ variant } = {}) {
  if (!VARIANTS[variant]) variant = 'c'
  const V = VARIANTS[variant]
  const group = new THREE.Group()
  group.name = 'rifle'
  group.userData.variant = variant
  const M = materials()

  const add = (name, geo, mat, crease = 50, parent = group) => {
    const mesh = new THREE.Mesh(finish(geo, crease), mat)
    mesh.name = name
    parent.add(mesh)
    return mesh
  }
  const merge = (list) => mergeGeometries(list, false)
  const both = (make) => merge([make(1), make(-1)])
  const circle = (cx, cy, r, n = 28) => new THREE.Path().absarc(cx, cy, r, 0, Math.PI * 2, true)
  /** A round boss or disc running through the body: centred on z = 0, so it shows on both sides. */
  const disc = (px, py, r, thick, bevel = 0.7) => ext(new THREE.Shape(circle(X(px), Y(py), r).getPoints(30)), thick, { bevel, seg: 2 })
  const st = (px, top, bot, hw, rt, rb = rt) => ({ x: X(px), top: Y(top), bot: Y(bot), hw, rt, rb })
  /** Same, for stations that ride on the handguard nose and move with the variant. */
  const stF = (px, top, bot, hw, rt, rb = rt) => ({ ...st(px, top, bot, hw, rt, rb), x: X(px) + V.front })
  const XF = (px) => X(px) + V.front
  const pxOf = (x) => (X(0) - x) / S

  // ───────────────────────────── receiver ─────────────────────────────
  // Core: rounded over the top, narrower than the side walls so every junction is a step.
  const port = () => ext(shapeMM(rrect((X(324.5) + X(398)) / 2, (Y(232.5) + Y(248.5)) / 2, (398 - 324.5) * S, 16 * S, 3)), 12, { bevel: 0, z: RX_HALF })
  {
    const core = loftX(
      [
        st(196, 210, 267.5, 20.5, 7.5, 2),
        st(301, 210, 267.5, 20.5, 7.5, 2),
        st(301, 210, 262, 20.5, 7.5, 2),
        st(398, 210, 262, 20.5, 7.5, 2),
        st(398, 204.5, 262, 20.5, 3.5, 2),
        st(505, 204.5, 262, 20.5, 3.5, 2),
      ],
      { arc: 8 },
    )
    add('receiver', ...cutLined(core, M.receiver, [[port(), M.dark]]), 55)

    // Side walls: a wider band with rounded shoulders, standing 1.8 mm proud of the core.
    const walls = loftX(
      [
        st(262, 219.5, 259.4, RX_HALF, 3.6, 4.2),
        st(505, 219.5, 259.4, RX_HALF, 3.6, 4.2),
      ],
      { arc: 8 },
    )
    add('receiverPanel', ...cutLined(walls, M.panel, [[port(), M.dark]]), 55)

    // Inside the ejection port: a steel bolt cover with a dark oval slot.
    add(
      'ejectionPort',
      ext(shapeMM(rrect((X(327) + X(395.5)) / 2, (Y(234) + Y(247)) / 2, 70 * S, 14 * S, 2.6)), 1.2, { bevel: 0.3, z: RX_HALF - 4.6 }),
      M.steel,
    )
    add(
      'ejectionSlot',
      ext(shapeMM(rrect((X(340) + X(382)) / 2, Y(240.5), 42 * S, 4.6, 2.2)), 0.5, { bevel: 0, z: RX_HALF - 3.9 }),
      M.dark,
    )
    // Raised lip around the port, right side only.
    {
      const lip = shapeMM(rrect((X(324.5) + X(398)) / 2, (Y(232.5) + Y(248.5)) / 2, (398 - 324.5) * S + 5, 16 * S + 5, 5))
      lip.holes.push(pathMM(rrect((X(324.5) + X(398)) / 2, (Y(232.5) + Y(248.5)) / 2, (398 - 324.5) * S, 16 * S, 3)))
      add('ejectionPortLip', ext(lip, 1.6, { bevel: 0.5, z: RX_HALF + 0.3 }), M.panel)
    }
    // Case deflector / bolt-release block behind the port: a wedge with grip ridges.
    add(
      'caseDeflector',
      merge([
        ext(shapePx([[400.5, 224, 2], [414, 224, 2], [414, 253, 2], [400.5, 253, 2]]), 7, { bevel: 1.8, bt: 2.4, seg: 4, z: RX_HALF + 2.4 }),
        ...[231, 236, 241, 246].map((py) => ext(shapeMM(rrect(X(407.2), Y(py), 7.4, 2.2, 0.9)), 1.6, { bevel: 0.5, z: RX_HALF + 6 })),
      ]),
      M.control,
    )
  }

  // Lower (trigger housing) and its raised selector plate.
  add(
    'lowerReceiver',
    ext(
      shapePx([
        [400, 258.5, 0],
        [505, 258.5, 0],
        [505, 277.5, 2.5],
        [489, 284, 3],
        [403, 284, 3],
        [400, 280, 0],
      ]),
      43,
      { bevel: 2.2, bt: 2.6, seg: 4 },
    ),
    M.receiver,
  )
  add(
    'selectorPlate',
    ext(
      shapePx([
        [437, 253.5, 2.5],
        [483, 253.5, 2.5],
        [501, 275.5, 2.5],
        [497, 281.5, 2.5],
        [441, 281.5, 2.5],
        [436, 272, 2.5],
      ]),
      SEL_Z * 2,
      { bevel: 1.4, bt: 1.6, seg: 3 },
    ),
    M.panel,
  )
  // Bosses the cross pins sit in.
  add(
    'pinBosses',
    merge([
      disc(306.8, 273.5, 4.8, 48.6),
      disc(499.5, 235.5, 3.9, 46.4),
      disc(499.5, 251.5, 3.9, 46.4),
      disc(411, 196.5, 4.3, 41.2),
      disc(480.5, 196.5, 4.3, 41.2),
      disc(289, 261.2, 5.6, 50.5, 1.2),
      disc(360, 233, 3.4, 46.2),
      disc(300, 240, 3.4, 46.2),
    ]),
    M.panel,
  )

  // ───────────────────────────── magazine well ─────────────────────────────
  const magC = P(...MAG_PX)
  {
    // The pocket: 66 x 31 mm, raked 10 degrees, open at the bottom. Magazine top fits inside.
    const pocket = () => {
      const g = new THREE.BoxGeometry(66, 39, 31)
      g.translate(0, 39 / 2 - 6, 0)
      g.rotateZ(MAG_RAKE)
      g.translate(magC[0], magC[1], 0)
      return g
    }
    const body = ext(
      shapePx([
        [304.5, 263, 3.5],
        [390, 262.5, 0],
        [390, 272.5, 0],
        [400, 273, 0],
        [400.5, 312, 0],
        [319.5, 298, 0],
        [311.5, 285, 14],
        [305, 272, 6],
      ]),
      46,
      { bevel: 2.6, bt: 3, seg: 5 },
    )
    add('magwell', ...cutLined(body, M.receiver, [[pocket(), M.pocket]]))

    // Flared lip around the mouth: a thicker collar that follows the raked bottom edge.
    const c = Math.cos(MAG_RAKE)
    const s = Math.sin(MAG_RAKE)
    const w = (lx, ly) => [magC[0] + lx * c - ly * s, magC[1] + lx * s + ly * c, 0]
    const collar = ext(shapeMM([w(-46, -0.4), w(39.6, -0.4), w(39.6, 7.5), w(-46, 7.5)]), 50.6, { bevel: 2.2, bt: 2.6, seg: 5 })
    add('magwellLip', ...cutLined(collar, M.panel, [[pocket(), M.pocket]]))

    // Raised side panel, both faces.
    add(
      'magwellPanel',
      ext(
        shapePx([
          [313, 268.5, 2.5],
          [370, 268.5, 2.5],
          [370, 296.5, 2.5],
          [324, 288.6, 2.5],
          [317, 280, 4],
        ]),
        47.8,
        { bevel: 1, seg: 3 },
      ),
      M.panel,
    )
  }
  // Magazine catch housing on both sides and the release paddle behind the well.
  add(
    'magCatchHousing',
    ext(shapePx([[374, 273.5, 2], [400.5, 273.5, 2], [400.5, 287.5, 2], [374, 287.5, 2]]), 50.4, { bevel: 1.5, bt: 1.8, seg: 4 }),
    M.panel,
  )
  add(
    'magRelease',
    ext(
      shapePx([
        [387.5, 303, 0.6],
        [396.5, 304.5, 0.6],
        [397, 314, 1],
        [393.5, 324, 1],
        [390.5, 324, 1],
        [388, 314, 1],
      ]),
      18,
      { bevel: 1.2, seg: 3 },
    ),
    M.control,
  )

  // ───────────────────────────── trigger group ─────────────────────────────
  // Guard: a flat moulded strap that leaves the well on a radius and sweeps up into the grip.
  add(
    'triggerGuard',
    ext(
      shapeMM(
        strokePts(
          [
            P(397.5, 304),
            P(399.2, 308.2),
            P(402, 311.4),
            P(406, 313.6),
            P(412, 315.2),
            P(420, 316.6),
            P(428, 317.8),
            P(434, 318.2),
            P(439, 317.4),
            P(443.5, 315),
            P(447.5, 311),
            P(451, 306),
            P(454, 300),
          ],
          3.1,
        ),
      ),
      16,
      { bevel: 1.2, bt: 1.4, seg: 3 },
    ),
    M.receiver,
  )
  add(
    'trigger',
    ext(
      shapePx([
        [423, 281, 0],
        [432, 281, 0],
        [432, 291, 4],
        [428.6, 299.5, 6],
        [422, 305.5, 2],
        [416.5, 308, 0.9],
        [418.6, 303, 3],
        [423.2, 297, 6],
        [424.6, 289, 4],
      ]),
      8.4,
      { bevel: 1.5, bt: 2.6, seg: 5 },
    ),
    M.steelDark,
  )

  // Fire selector. Left: hub with a long paddle pointing back. Right: a shorter, hooked lever.
  {
    const hub = P(450, 261.3)
    const hubDisc = (s) => {
      const d = latheX(
        [
          [0, 0.01],
          [0, 6.6],
          [3.4, 6.6],
          [4.6, 5.6],
          [4.6, 0.01],
        ],
        32,
      ).toNonIndexed()
      d.rotateY(s > 0 ? -Math.PI / 2 : Math.PI / 2)
      d.translate(hub[0], hub[1], s * SEL_Z)
      d.deleteAttribute('uv')
      return d
    }
    const armL = ext(
      shapeMM(strokePts([[hub[0] + 1, hub[1]], [hub[0] - 15, hub[1] + 0.8], [hub[0] - 25, hub[1] + 2.2]], 6.4).map(([x, y]) => [x, y, 2.4])),
      3.8,
      { bevel: 1.2, seg: 4, z: -(SEL_Z + 2.4) },
    )
    const armR = ext(
      shapeMM(
        strokePts(
          [
            [hub[0] + 1, hub[1]],
            [hub[0] - 10, hub[1] - 0.6],
            [hub[0] - 17, hub[1] + 1],
            [hub[0] - 21.5, hub[1] + 5.4],
          ],
          5,
        ).map(([x, y]) => [x, y, 1.6]),
      ),
      3.6,
      { bevel: 1.1, seg: 4, z: SEL_Z + 2.3 },
    )
    armL.deleteAttribute('uv')
    armR.deleteAttribute('uv')
    add('selector', merge([armL, hubDisc(-1)]), M.control, 40)
    add('selectorRight', merge([armR, hubDisc(1)]), M.control, 40)
    const dot = (s) => {
      const d = new THREE.CylinderGeometry(0.9, 0.9, 0.3, 14).toNonIndexed()
      d.rotateX(Math.PI / 2)
      d.translate(hub[0] + 0.5, hub[1] + 0.6, s * (SEL_Z + 4.7))
      return d
    }
    add('selectorDot', both(dot), M.white, 0)
  }

  // ───────────────────────────── pistol grip ─────────────────────────────
  {
    const top = P(471, 284)
    const base = P(502, 367.5)
    const angle = Math.atan2(base[1] - top[1], base[0] - top[0])
    const place = (geo) => {
      geo.rotateZ(angle)
      geo.translate(top[0], top[1], 0)
      return geo
    }
    const hw = (x) => 13.6 + 0.034 * x
    // Local frame: x runs down the grip, `top` is the front strap, `bot` the back strap.
    // The front strap swells under the middle finger; the back strap fills the palm.
    const sec = (x, top2, bot2, r) => ({ x, top: top2, bot: bot2, hw: hw(x), rt: r, rb: r })
    add(
      'grip',
      place(
        loftX(
          [
            sec(-14, 19, -18.5, 8),
            sec(0, 19.6, -19.6, 9.5),
            sec(10, 20.2, -20, 10.5),
            sec(22, 21.4, -20.6, 11),
            sec(34, 22.2, -21.6, 11.5),
            sec(46, 21.8, -22.8, 11.8),
            sec(58, 21.4, -24, 12),
            sec(70, 22.4, -25.2, 12),
            sec(80, 23.8, -26.2, 12),
            sec(88.4, 24.8, -27, 12),
          ],
          { arc: 9 },
        ),
      ),
      M.grip,
      60,
    )
    // Storage-cap base: a separate plug with a parting groove above it and a cap on the end.
    add(
      'gripBase',
      place(
        loftX(
          [
            { x: 87.6, top: 23.6, bot: -25.8, hw: hw(88) - 1.2, rt: 11, rb: 11 },
            { x: 89.4, top: 23.6, bot: -25.8, hw: hw(88) - 1.2, rt: 11, rb: 11 },
            { x: 89.4, top: 25.4, bot: -27.6, hw: hw(90) + 0.5, rt: 12, rb: 12 },
            { x: 92.6, top: 25.4, bot: -27.6, hw: hw(90) + 0.5, rt: 12, rb: 12 },
            { x: 94.2, top: 23.4, bot: -25.6, hw: hw(90) - 1.4, rt: 11, rb: 11 },
          ],
          { arc: 9 },
        ),
      ),
      M.stock,
      60,
    )
    add(
      'gripCap',
      place(
        loftX(
          [
            { x: 93.6, top: 15, bot: -17, hw: 9.4, rt: 8.5, rb: 8.5 },
            { x: 95, top: 15, bot: -17, hw: 9.4, rt: 8.5, rb: 8.5 },
            { x: 95.5, top: 14.2, bot: -16.2, hw: 8.6, rt: 8, rb: 8 },
          ],
          { arc: 8 },
        ),
      ),
      M.control,
      60,
    )
    // Moulded texture panel on each flank, following the taper of the grip.
    const panel = (s) => {
      const g = ext(
        shapeMM([
          [10, -7, 3.5],
          [80, -10, 3.5],
          [80, 10, 3.5],
          [10, 7, 3.5],
        ]),
        1,
        { bevel: 0.4, seg: 2 },
      )
      const p = g.attributes.position
      for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + hw(p.getX(i)) - 0.15)
      if (s < 0) g.rotateX(Math.PI)
      return place(g)
    }
    add('gripTexture', both(panel), M.gripTex)
    // The web that fairs the back strap into the lower receiver.
    add(
      'gripWeb',
      ext(
        shapePx([
          [452, 280, 0],
          [505, 276, 0],
          [505, 278, 0.5],
          [497, 281, 3],
          [494, 296, 6],
          [455, 296, 0],
        ]),
        25,
        { bevel: 4, bt: 5, seg: 5 },
      ),
      M.grip,
    )
  }

  // ───────────────────────────── handguard ─────────────────────────────
  // Rails grow forward from a fixed rear end, so the carbine's centres are X(173.5) and X(152.5).
  const bottomRailC = [X(173.5) - 48 + V.bottomRail[0] / 2, Y(270.5)]
  const sideRailC = [X(152.5) - 49 + V.sideRail[0] / 2, Y(239.2)]
  const NOSE_TILT = Math.atan2(17, 51) // the front face leans back 18 degrees
  const noseMid = [XF(99.5), Y(227.5)]
  {
    const hg = loftX(
      [
        stF(84, 200, 261.2, HG_HALF, 11, 9),
        st(170.5, 200, 261.2, HG_HALF, 11, 9),
        st(170.5, 219, 261.2, HG_HALF, 2.5, 9),
        st(204, 219, 261.2, HG_HALF, 2.5, 9),
        st(222, 219, 261.2, HG_SKIRT, 2.5, 9),
        st(226.5, 219, 266, HG_SKIRT, 2.5, 8),
        st(266, 219, 266, HG_SKIRT, 2.5, 8),
        st(280, 236.5, 266.5, HG_SKIRT, 2.5, 8),
        st(294, 254, 267, HG_SKIRT, 2.5, 5),
        st(298.5, 261.5, 267, HG_SKIRT, 1.5, 1.5),
      ],
      { arc: 9 },
    )
    // Hollow front, like the real shell: the vents open into a cavity with the barrel in it.
    const cavity = loftX(
      [
        stF(112, 232, 256, 8, 3, 3),
        stF(114.5, 212, 257, HG_HALF - 4.6, 6, 4),
        stF(118, 205, 257, HG_HALF - 3.6, 7.5, 5),
        st(166, 205, 257, HG_HALF - 3.6, 7.5, 5),
      ],
      { arc: 7 },
    )
    // Oval vents each side (two on the carbine), high enough to bite into the shoulder radius, cut clean through.
    const vent = (pxA, pxB) => ext(shapeMM(rrect((X(pxA) + X(pxB)) / 2, Y(210.2), (pxB - pxA) * S, 6.6, 3.29)), 70, { bevel: 0 })
    // The nose: one flat cut, leaning back.
    const nose = new THREE.BoxGeometry(60, 140, 80)
    nose.translate(30, 0, 0)
    nose.rotateZ(NOSE_TILT)
    nose.translate(noseMid[0], noseMid[1], 0)
    add(
      'handguard',
      ...cutLined(hg, M.handguard, [
        [cavity, M.pocket],
        ...V.vents.map(([a, b]) => [vent(a, b), M.handguard]),
        [nose, M.handguard],
      ]),
      55,
    )

    // End cap: a separate plate on the slanted face, with the round barrel hole.
    const capShape = shapeMM([
      [-19.4, -31.4, 8.5],
      [19.4, -31.4, 8.5],
      [19.4, 31.4, 10.5],
      [-19.4, 31.4, 10.5],
    ])
    const boreOnCap = -noseMid[1] / Math.cos(NOSE_TILT)
    capShape.holes.push(circle(0, boreOnCap, 8.2))
    const cap = ext(capShape, 4.4, { bevel: 1.5, bt: 1.6, seg: 4 })
    cap.rotateY(Math.PI / 2)
    cap.translate(1.2, 0, 0)
    cap.rotateZ(NOSE_TILT)
    cap.translate(noseMid[0], noseMid[1], 0)
    add('endCap', cap, M.panel)

    // Raised platforms the side rails bolt onto.
    add('railPlatform', ext(shapeMM(rrect(sideRailC[0], sideRailC[1], V.sideRail[0] + 6, 27.5, 3.5)), (HG_HALF + 0.7) * 2, { bevel: 0.9, seg: 3 }), M.handguard)
    // Lower lip band along the bottom edge.
    add(
      'handguardLip',
      loftX(
        [
          stF(106, 254.5, 262.6, HG_HALF - 2.2, 2.5, 4),
          stF(110, 254.5, 262.6, HG_HALF + 0.5, 2.5, 6),
          st(218, 254.5, 262.6, HG_HALF + 0.5, 2.5, 6),
          st(223, 254.5, 262.6, HG_HALF - 2.2, 2.5, 4),
        ],
        { arc: 6 },
      ),
      M.handguard,
      55,
    )
  }
  // Steel collar where the barrel leaves the end cap, and the small stud above it.
  add(
    'barrelCollar',
    latheX([
      [XF(103), 5.9],
      [XF(103), 7.7],
      [XF(95.4), 7.7],
      [XF(94.4), 6.9],
      [XF(94.4), 5.9],
    ]),
    M.steelDark,
    0,
  )
  {
    const stud = latheX(
      [
        [XF(107), 0.01],
        [XF(107), 3.3],
        [XF(100), 3.3],
        [XF(99), 2.6],
        [XF(99), 0.01],
      ],
      20,
    )
    stud.translate(0, Y(210.5), 0)
    add('frontStud', stud, M.steelDark, 0)
  }
  // Lug in front of the bottom rail.
  add(
    'frontLug',
    ext(
      shapePx([
        [114.5, 257, 0],
        [130, 257, 0],
        [130, 273, 0],
        [127, 279.5, 2],
        [117, 279.5, 2],
        [114.5, 274, 2],
      ]),
      15,
      { bevel: 1.6, seg: 4 },
    ).translate(V.front, 0, 0),
    M.handguard,
  )

  // Three accessory rails: full dovetail sections standing proud of the handguard.
  {
    const bottom = merge(picatinny(...V.bottomRail, { pads: true }))
    bottom.rotateX(Math.PI)
    bottom.translate(bottomRailC[0], bottomRailC[1], 0)
    add('railBottom', bottom, M.rail)
    const left = merge(picatinny(...V.sideRail, { pads: true }))
    left.rotateX(-Math.PI / 2)
    left.translate(sideRailC[0], sideRailC[1], -SIDE_RAIL_Z)
    add('railLeft', left, M.rail)
    const right = merge(picatinny(...V.sideRail, { pads: true }))
    right.rotateX(Math.PI / 2)
    right.translate(sideRailC[0], sideRailC[1], SIDE_RAIL_Z)
    add('railRight', right, M.rail)
  }

  // ───────────────────────────── carry handle / top rail ─────────────────────────────
  const railC = [X(328.5), Y(RAIL_TOP_PY)]
  {
    const rail = merge(picatinny(256, 25))
    rail.translate(railC[0], railC[1], 0)
    add('railTop', rail, M.rail)
  }
  // The spine under the rail: bridge with its little trapezoid and the rear leg. Narrower than
  // the rail neck, so a clamp can still hook under the dovetail.
  add(
    'carryHandle',
    ext(
      shapePx([
        [203, 182, 0],
        [454, 182, 0],
        [503, 190, 0],
        [503, 204.5, 0],
        [398, 204.5, 0],
        [398, 201.6, 0],
        [361, 200.6, 4],
        [300.5, 186.6, 4],
        [296, 186.6, 0],
        [287.5, 195.6, 2.5],
        [274.5, 195.6, 2.5],
        [266, 186.6, 0],
        [218.5, 186.6, 3],
        [201.5, 200.6, 0],
        [179, 200.6, 0],
      ]),
      15,
      { bevel: 1.6, bt: 2, seg: 4 },
    ),
    M.carry,
  )
  // Rear leg cheeks: the leg widens as it comes down to the saddle.
  add(
    'carryHandleRearLeg',
    ext(
      shapePx([
        [318, 187.5, 0],
        [361, 187.5, 0],
        [399.5, 187.5, 0],
        [399.5, 201.4, 0],
        [362, 200.6, 0],
      ]),
      24,
      { bevel: 3.2, bt: 4.2, seg: 5 },
    ),
    M.carry,
  )
  // Front leg: a wider strut with chamfered edges, running down to the clamp.
  add(
    'carryHandleFrontLeg',
    ext(
      shapePx([
        [204, 183, 0],
        [219.5, 187, 0],
        [202.5, 201, 0],
        [180, 201, 0],
      ]),
      22,
      { bevel: 2.6, bt: 3.2, seg: 4 },
    ),
    M.carry,
  )
  // Rear saddle: as wide as the receiver top, with sloped shoulders up to the rail.
  add(
    'carryHandleBase',
    ext(
      shapePx([
        [399, 204.6, 0],
        [399, 195, 0],
        [408, 187.2, 0],
        [503.5, 187.2, 0],
        [503.5, 204.6, 0],
      ]),
      39,
      { bevel: 5, bt: 7, seg: 6 },
    ),
    M.carry,
  )
  // Front clamp: three stepped, faceted blocks where the leg lands behind the handguard hump.
  add(
    'frontSightBase',
    merge([
      ext(shapePx([[177, 206, 0], [200.5, 206, 0], [200.5, 216, 0], [190, 227.5, 0], [177, 227.5, 0]]), 45.6, { bevel: 2.2, bt: 2.8, seg: 4 }),
      ext(shapePx([[181, 197, 0], [203, 197, 0], [203, 209, 0], [181, 209, 0]]), 31, { bevel: 2.4, bt: 3, seg: 4 }),
      ext(shapePx([[170.8, 201, 0], [182, 201, 0], [182, 214, 0], [170.8, 214, 0]]), 25, { bevel: 2, bt: 2.4, seg: 4 }),
    ]),
    M.carry,
  )
  // Ring-hooded front sight on its foot.
  {
    const c = P(206.5, 167.4)
    const ring = latheX(
      [
        [-5.5, 8.4],
        [-5.5, 10.5],
        [-4.7, 11.2],
        [4.7, 11.2],
        [5.5, 10.5],
        [5.5, 8.4],
        [4.9, 8],
        [-4.9, 8],
        [-5.5, 8.4],
      ],
      56,
    )
    ring.translate(c[0], c[1], 0)
    add('frontSight', ring, M.carry, 0)
    add(
      'frontSightFoot',
      merge([
        ext(shapePx([[196, 181.5, 0], [217.5, 181.5, 0], [214.5, 174.2, 0], [198.5, 174.2, 0]]), 15, { bevel: 1.6, seg: 3 }),
        ext(shapePx([[194.5, 183.5, 0], [219, 183.5, 0], [219, 178.6, 0], [194.5, 178.6, 0]]), 21, { bevel: 1.2, seg: 3 }),
      ]),
      M.carry,
    )
    const post = new THREE.CylinderGeometry(0.75, 1.1, 8.6, 12).toNonIndexed()
    post.translate(c[0], c[1] - 4.3, 0)
    add('frontSightPost', post, M.steelDark, 0)
  }
  // Rear sight: a stepped foot, the housing with chamfered shoulders, slots, drum and peep ear.
  add('rearSightFoot', ext(shapePx([[451, 191, 0], [451, 184.5, 0], [501.5, 184.5, 0], [501.5, 191, 0]]), 36.5, { bevel: 1.6, bt: 2, seg: 3 }), M.carry)
  add(
    'rearSight',
    ext(
      shapePx([
        [453, 188, 0],
        [453, 169, 0],
        [457, 165.6, 0],
        [478, 165.6, 0],
        [499.5, 180, 0],
        [499.5, 188, 0],
      ]),
      33,
      { bevel: 3.6, bt: 5.4, seg: 6 },
    ),
    M.carry,
  )
  add('rearSightSlots', both((s) => ext(shapeMM(rrect(X(486), Y(182.6), 3, 8.4, 1.45)), 0.6, { bevel: 0, z: s * 16.4 })), M.dark)
  {
    const drum = new THREE.CylinderGeometry(3.4, 3.4, 1.6, 20).toNonIndexed()
    drum.translate(X(470), Y(165.6) + 0.5, 0)
    const slot = new THREE.BoxGeometry(5.6, 0.5, 0.9).toNonIndexed()
    slot.translate(X(470), Y(165.6) + 1.4, 0)
    add('rearSightDrum', drum, M.steelDark, 40)
    add('rearSightDrumSlot', slot, M.dark, 0)
    const ear = shapeMM([
      [-4.6, 0, 0],
      [4.6, 0, 0],
      [4.6, 7.2, 3.2],
      [-4.6, 7.2, 3.2],
    ])
    ear.holes.push(circle(0, 4.3, 1.5))
    const g = ext(ear, 2.6, { bevel: 0.5 })
    g.rotateY(Math.PI / 2)
    g.translate(X(463.5), Y(166.2), 0)
    add('rearSightPeep', g, M.steelDark)
  }

  // Charging handle on top of the receiver, under the rail, and the track it rides on.
  add(
    'chargingHandle',
    merge([
      ext(shapePx([[234.5, 202.6, 2], [270.5, 202.6, 2], [270.5, 210.6, 0], [234.5, 210.6, 0]]), 15, { bevel: 1.8, seg: 4 }),
      ext(shapePx([[236, 204.6, 0], [249, 204.6, 0], [249, 210.6, 0], [236, 210.6, 0]]), 28, { bevel: 2.2, bt: 2.6, seg: 4 }),
    ]),
    M.control,
  )
  add('chargingTrack', ext(shapePx([[204, 207.6, 0], [397.5, 207.6, 0], [397.5, 211, 0], [204, 211, 0]]), 9, { bevel: 0.9, seg: 2 }), M.steelDark)

  // ───────────────────────────── barrel and flash hider ─────────────────────────────
  const HIDER_REAR = X(86) + V.barrel
  const HIDER_TIP = X(48) + V.barrel
  add(
    'barrel',
    latheX(
      [
        [X(205), 0.01],
        [X(205), 5.8],
        [HIDER_REAR + 0.5, 5.8],
        [HIDER_REAR + 0.5, 0.01],
      ],
      40,
    ),
    M.steel,
    0,
  )
  {
    const collarFront = HIDER_REAR + 11.5
    const collar = latheX(
      [
        [HIDER_REAR, 5.6],
        [HIDER_REAR, 9.2],
        [HIDER_REAR + 0.7, 9.9],
        [HIDER_REAR + 4.2, 9.9],
        [HIDER_REAR + 4.6, 9.3],
        [HIDER_REAR + 5.6, 9.3],
        [HIDER_REAR + 6, 9.9],
        [collarFront - 0.6, 9.9],
        [collarFront, 9.4],
        [collarFront, 6.4],
        [collarFront - 3, 6.4],
        [collarFront - 3, 5.6],
      ],
      56,
    )
    // Four prongs on the diagonals: from the side the top pair and the bottom pair overlap and
    // the slot between them shows the background, exactly as in the photo.
    const prongs = []
    const R = 9.6
    const r = 6.3
    const half = THREE.MathUtils.degToRad(21.5)
    const len = HIDER_TIP - collarFront + 1
    for (let k = 0; k < 4; k++) {
      const mid = Math.PI / 4 + (k * Math.PI) / 2
      const pts = []
      for (let i = 0; i <= 10; i++) {
        const t = mid - half + (2 * half * i) / 10
        pts.push(new THREE.Vector2(R * Math.cos(t), R * Math.sin(t)))
      }
      for (let i = 10; i >= 0; i--) {
        const t = mid - half + (2 * half * i) / 10
        pts.push(new THREE.Vector2(r * Math.cos(t), r * Math.sin(t)))
      }
      const g = ext(new THREE.Shape(pts), len, { bevel: 0.9, bt: 1.8, seg: 4, z: len / 2 })
      g.rotateY(Math.PI / 2)
      g.translate(collarFront - 1, 0, 0)
      prongs.push(g)
    }
    add('flashHiderCollar', collar, M.steel, 0)
    add('flashHider', merge(prongs), M.steel, 55)
    // Inner barrel mouth, visible down the hider.
    add(
      'innerBarrel',
      latheX(
        [
          [collarFront - 16, 3.05],
          [collarFront - 16, 4.3],
          [collarFront - 2.6, 4.3],
          [collarFront - 2.6, 3.05],
        ],
        28,
      ),
      M.brass,
      0,
    )
    add(
      'boreFace',
      latheX(
        [
          [collarFront - 3.4, 4.3],
          [collarFront - 3.4, 6.4],
          [collarFront - 3.0, 6.4],
          [collarFront - 3.0, 4.3],
        ],
        28,
      ),
      M.steelDark,
      0,
    )
    const bore = new THREE.CylinderGeometry(3.05, 3.05, 0.2, 20)
    bore.rotateZ(-Math.PI / 2)
    bore.translate(collarFront - 12, 0, 0)
    add('bore', bore, M.dark, 0)
  }

  // ───────────────────────────── stock ─────────────────────────────
  // Hinge block bolted to the receiver, with the knuckles of the folding hinge on the right.
  {
    add(
      'stockHinge',
      ext(
        shapePx([
          [505.7, 203, 0],
          [519, 203, 0],
          [519, 280.5, 0],
          [505.7, 280.5, 0],
        ]),
        45,
        { bevel: 2, bt: 2.6, seg: 4 },
      ),
      M.stock,
    )
    const knuckles = []
    for (const [a, b] of [
      [205.5, 221],
      [223, 240],
      [242, 259.5],
      [261.5, 279.5],
    ]) {
      const k = latheX(
        [
          [Y(b), 0.01],
          [Y(b), 4.6],
          [Y(b) + 0.9, 5.5],
          [Y(a) - 0.9, 5.5],
          [Y(a), 4.6],
          [Y(a), 0.01],
        ],
        26,
      )
      k.rotateZ(Math.PI / 2) // axis X -> axis Y
      k.translate(X(512.3), 0, 21.6)
      knuckles.push(k)
    }
    add('stockHingeKnuckles', mergeGeometries(knuckles, false), M.stock, 0)
    const pin = new THREE.CylinderGeometry(2, 2, 78.5 * S, 16)
    pin.translate(X(512.3), (Y(204) + Y(281)) / 2, 21.6)
    add('stockHingePin', pin, M.steel, 0)
  }
  // Everything behind the hinge hangs off one group that turns about the hinge pin, so the
  // compact variant can carry the stock folded forward along the right-hand side.
  const stockPivot = new THREE.Group()
  stockPivot.name = 'stockAssembly'
  stockPivot.position.set(X(512.3) / 1000, 0, 21.6 / 1000)
  stockPivot.rotation.y = THREE.MathUtils.degToRad(V.fold)
  const stockParts = new THREE.Group()
  stockParts.position.set(-X(512.3) / 1000, 0, -21.6 / 1000)
  stockPivot.add(stockParts)
  group.add(stockPivot)
  // Stock root: nearly as wide as the receiver, with the latch pocket on the left.
  {
    const root = ext(
      shapePx([
        [519.7, 206.5, 0],
        [524, 206.5, 0],
        [551, 221.5, 0],
        [551, 280.5, 0],
        [519.7, 280.5, 0],
      ]),
      41,
      { bevel: 3.4, bt: 5, seg: 6 },
    )
    const pocket = ext(shapeMM(rrect((X(519.5) + X(528.5)) / 2, (Y(247) + Y(265.5)) / 2, 9 * S, 18.5 * S, 2.4)), 9, { bevel: 0, z: -20.5 })
    add('stockRoot', ...cutLined(root, M.stock, [[pocket, M.pocket]]), 50, stockParts)
    const knob = latheX(
      [
        [0, 0.01],
        [0, 8.6],
        [3.2, 8.6],
        [4.4, 7.4],
        [4.4, 0.01],
      ],
      36,
    )
    knob.rotateY(Math.PI / 2) // axis X -> axis -Z
    knob.translate(X(540), Y(252), -19)
    add('stockLatch', knob, M.control, 0, stockParts)
  }
  // Skeleton frame, built as an I-beam: full-thickness flanges round the outside and round each
  // cut-out, with the web between them sunk 4.5 mm on both faces. The small holes go through.
  {
    const outer = [
      [548, 220, 0],
      [566, 226.4, 40],
      [590, 229, 60],
      [722.5, 229, 0],
      [722.5, 353, 0],
      [714.5, 353, 3],
      [704.5, 334, 30],
      [690, 313, 60],
      [668, 297, 60],
      [640, 287.5, 60],
      [600, 280.5, 40],
      [548, 280.5, 0],
    ]
    const rect = [
      [554, 243, 3],
      [599.5, 243, 3],
      [599.5, 269.2, 3],
      [554, 269.2, 3],
    ]
    const tri = [
      [610, 237.2, 3],
      [713.5, 237.2, 3],
      [713.5, 251, 1.5],
      [705.5, 262, 3],
      [705.5, 277, 2],
      [695.5, 280.5, 5],
      [694, 292.6, 4],
      [610, 268.6, 3],
    ]
    const eye = [X(702.5), Y(287.2)]
    const through = [
      [626, 233.1],
      [662, 233.1],
      [698, 233.1],
      [604.8, 256],
      [634, 280.6],
      [666, 290.6],
      [718, 247],
      [716, 322],
      [552, 232],
      [552, 275],
    ]
    const frame = shapePx(outer)
    frame.holes.push(pathPx(rect), pathPx(tri), circle(eye[0], eye[1], 2.7))
    // Small through-holes, drilled after the fact so the bevels do not swallow them.
    const drill = merge(
      through.map(([px, py]) => {
        const c = new THREE.CylinderGeometry(1.25, 1.25, 40, 14).toNonIndexed()
        c.rotateX(Math.PI / 2)
        c.translate(X(px), Y(py), 0)
        return c
      }),
    )
    const T = 27
    const F = 2.5 // flange width
    const web = (s) => {
      const sh = shapeMM(offsetPoly(rawPx(outer), F))
      sh.holes.push(pathMM(offsetPoly(rawPx(rect), -F)), pathMM(offsetPoly(rawPx(tri), -F)))
      return ext(sh, 8, { bevel: 0, z: s * (T / 2 - 4.5 + 4) })
    }
    add(
      'stock',
      ...cutLined(ext(frame, T, { bevel: 2.2, bt: 2.6, seg: 4 }), M.stock, [
        [web(1), M.stock],
        [web(-1), M.stock],
        [drill, M.stock],
      ]),
      50,
      stockParts,
    )
  }
  // Butt: a thick rounded polymer end, then the rubber pad with horizontal ribs on its face.
  add(
    'buttBody',
    ext(
      shapePx([
        [713, 226, 0],
        [725, 226, 0],
        [725, 355.5, 0],
        [716.5, 355.5, 0],
        [713, 349, 0],
      ]),
      34,
      { bevel: 4, bt: 5, seg: 6 },
    ),
    M.stock,
    50,
    stockParts,
  )
  add(
    'buttPlate',
    ext(
      shapePx([
        [724.6, 226, 0],
        [741.6, 224.6, 7],
        [742, 358, 7],
        [724.6, 356, 0],
      ]),
      36,
      { bevel: 5.4, bt: 7, seg: 7 },
    ),
    M.rubber,
    50,
    stockParts,
  )
  {
    const ribGeo = finish(ext(shapeMM(rrect(0, 0, 3.2, 2.6, 1.1)), 21.5, { bevel: 0.8, seg: 3 }))
    const ys = []
    for (let py = 236; py <= 349; py += 6.3) ys.push(py)
    const ribs = new THREE.InstancedMesh(ribGeo, M.rubber, ys.length)
    ribs.name = 'buttRibs'
    const m = new THREE.Matrix4()
    ys.forEach((py, i) => {
      m.makeTranslation((X(742) + 0.1) / 1000, Y(py) / 1000, 0)
      ribs.setMatrixAt(i, m)
    })
    stockParts.add(ribs)
  }

  // Sling loop on the left of the receiver, by the stock hinge.
  {
    const loop = shapeMM(rrect((X(486) + X(511)) / 2, Y(231.5), 25 * S, 8.6, 4.2))
    loop.holes.push(pathMM(rrect((X(486) + X(511)) / 2, Y(231.5), 25 * S - 5.6, 3.2, 1.55)))
    add('slingLoop', ext(loop, 2.6, { bevel: 0.7, seg: 3, z: -(RX_HALF + 1.9) }), M.steelDark)
    add('slingLoopFoot', ext(shapeMM(rrect(X(491), Y(231.5), 6, 8.6, 1.5)), 2.6, { bevel: 0.6, z: -(RX_HALF + 0.6) }), M.steelDark)
  }

  // ───────────────────────────── screws, pins (instanced) ─────────────────────────────
  {
    const mm = 0.001
    // Unit-radius heads, axis +Y. A socket-head screw and a plain cross pin.
    const screwGeo = new THREE.LatheGeometry(
      [
        [0, 0.2],
        [0.5, 0.2],
        [0.56, 0.9],
        [0.84, 0.9],
        [1, 0.66],
        [1, -0.6],
      ].map(([r, y]) => new THREE.Vector2(r * mm, y * mm)),
      6,
    )
    const screwRim = new THREE.LatheGeometry(
      [
        [0.56, 0.9],
        [0.84, 0.9],
        [1, 0.66],
        [1, -0.6],
      ].map(([r, y]) => new THREE.Vector2(r * mm, y * mm)),
      24,
    )
    const pinGeo = new THREE.LatheGeometry(
      [
        [0, 0.5],
        [0.6, 0.45],
        [0.9, 0.26],
        [1, 0],
        [1, -0.6],
      ].map(([r, y]) => new THREE.Vector2(r * mm, y * mm)),
      22,
    )
    const hexGeo = new THREE.CylinderGeometry(mm, mm, 1.8 * mm, 6)

    // [px, py, radius mm, half-thickness of the surface it sits on, sides]
    const screws = [
      [411, 196.5, 2.6, 20.6, 'LR'], // carry handle rear base
      [480.5, 196.5, 2.6, 20.6, 'LR'],
      [197.5, 202, 2.3, 15.5, 'LR'], // front clamp
      [189, 219, 2.1, 22.8, 'LR'],
      [pxOf(sideRailC[0] + V.sideRail[0] / 2 - 3.4), 239.2, 2.1, SIDE_RAIL_Z, 'LR'], // side rail ends
      [pxOf(sideRailC[0] - V.sideRail[0] / 2 + 3.4), 239.2, 2.1, SIDE_RAIL_Z, 'LR'],
      [470, 177, 1.9, 16.5, 'LR'], // rear sight
      [460, 187.6, 1.8, 18.2, 'LR'],
      [493, 187.6, 1.8, 18.2, 'LR'],
      [512.3, 211, 1.8, 22.5, 'L'], // hinge block
      [512.3, 274, 1.8, 22.5, 'L'],
    ]
    const pins = [
      [289, 261.2, 3, 25.25, 'LR'], // handguard retaining pin
      [306.8, 273.5, 2.9, 24.3, 'LR'], // magazine well, front
      [395, 280.5, 2.4, 25.2, 'LR'], // magazine catch
      [444, 277, 1.6, SEL_Z, 'LR'], // trigger pin
      [499.5, 235.5, 2.2, 23.2, 'LR'],
      [499.5, 251.5, 2.2, 23.2, 'LR'],
      [360, 233, 1.9, 23.1, 'LR'],
      [300, 240, 1.9, 23.1, 'LR'],
      [487, 318, 1.5, 15.3, 'LR'], // grip
    ]
    const hexes = [[496.5, 266, 3.4, 21.6, 'LR']]
    const build = (name, geo, mat, list, parent = group) => {
      const items = list.flatMap(([px, py, r, z, sides]) => [...sides].map((s) => [px, py, r, s === 'L' ? -z : z]))
      const mesh = new THREE.InstancedMesh(geo, mat, items.length)
      mesh.name = name
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const up = new THREE.Vector3(0, 1, 0)
      items.forEach(([px, py, r, z], i) => {
        q.setFromUnitVectors(up, new THREE.Vector3(0, 0, Math.sign(z)))
        m.compose(new THREE.Vector3(X(px) * mm, Y(py) * mm, z * mm), q, new THREE.Vector3(r, 1, r))
        mesh.setMatrixAt(i, m)
      })
      parent.add(mesh)
    }
    const rootScrew = [[545, 232, 1.9, 20.5, 'L']]
    build('stockScrews', screwRim, M.screw, rootScrew, stockParts)
    build('stockScrewSockets', screwGeo, M.steelDark, rootScrew, stockParts)
    build('screws', screwRim, M.screw, screws)
    build('screwSockets', screwGeo, M.steelDark, screws)
    build('pins', pinGeo, M.steel, pins)
    build('hexBosses', hexGeo, M.panel, hexes)
  }

  // ───────────────────────────── markings ─────────────────────────────
  // Printed straight on the polymer: small light-grey lettering, one red accent. Invented text.
  {
    const block = decal(30, 20, (g) => {
      g.fillStyle = 'rgba(176, 52, 38, 0.92)'
      g.beginPath()
      g.moveTo(1.2, 5.2)
      g.lineTo(3.4, 1.4)
      g.lineTo(5.6, 5.2)
      g.closePath()
      g.fill()
      g.fillStyle = 'rgba(168, 170, 168, 0.9)'
      g.font = '700 3.5px Arial, Helvetica, sans-serif'
      g.fillText(`KESTREL ${V.label}`, 1, 10.6)
      g.fillStyle = 'rgba(150, 152, 150, 0.8)'
      g.font = '500 1.75px Arial, Helvetica, sans-serif'
      g.fillText('6 mm BB', 1.1, 14)
      g.fillText('E < 1.5 J', 1.1, 16.6)
      g.fillStyle = 'rgba(120, 122, 120, 0.7)'
      g.font = '500 1.3px Arial, Helvetica, sans-serif'
      g.fillText(V.serial, 1.1, 19.2)
    })
    block.name = 'markings'
    block.rotation.y = Math.PI
    block.position.set(X(418) / 1000, Y(247.2) / 1000, -(RX_HALF + 0.05) / 1000)
    group.add(block)

    // Selector positions, left side: thin outline pictograms.
    const marks = decal(34, 18, (g) => {
      const box = (x, y, color, rounds, crossed) => {
        g.strokeStyle = color
        g.fillStyle = color
        g.lineWidth = 0.28
        g.strokeRect(x, y, 8.4, 3.2)
        for (let i = 0; i < rounds; i++) {
          const bx = x + 1.2 + i * 2.2
          g.beginPath()
          g.moveTo(bx, y + 1)
          g.lineTo(bx + 1, y + 1)
          g.lineTo(bx + 1.7, y + 1.6)
          g.lineTo(bx + 1, y + 2.2)
          g.lineTo(bx, y + 2.2)
          g.closePath()
          g.fill()
        }
        if (crossed) {
          g.beginPath()
          g.moveTo(x + 0.4, y + 0.4)
          g.lineTo(x + 8, y + 2.8)
          g.stroke()
        }
      }
      box(24, 2.2, 'rgba(190,190,186,0.9)', 1, true)
      box(8, 13.4, 'rgba(176,52,38,0.9)', 1, false)
      box(19, 13.4, 'rgba(176,52,38,0.9)', 3, false)
    })
    marks.name = 'selectorMarks'
    marks.rotation.y = Math.PI
    marks.position.set(X(467) / 1000, Y(267) / 1000, -(SEL_Z + 0.05) / 1000)
    group.add(marks)

    // Line of small text above the ejection port, right side.
    const line = decal(62, 4, (g) => {
      g.fillStyle = 'rgba(160, 162, 160, 0.85)'
      g.font = '500 2.1px Arial, Helvetica, sans-serif'
      g.textBaseline = 'middle'
      g.fillText(`HEXLINE  ·  KESTREL ${V.label}  ·  6 mm BB`, 0.6, 2.1)
    })
    line.name = 'markingsRight'
    line.position.set((X(330) + X(392)) / 2000, Y(227) / 1000, (RX_HALF + 0.05) / 1000)
    group.add(line)
  }

  // ───────────────────────────── anchors ─────────────────────────────
  const anchor = (name, x, y, z, rx = 0, rz = 0) => {
    const o = new THREE.Object3D()
    o.name = `anchor:${name}`
    o.position.set(x / 1000, y / 1000, z / 1000)
    o.rotation.set(rx, 0, rz)
    group.add(o)
    return o
  }
  anchor('optic', railC[0], railC[1], 0)
  anchor('muzzle', HIDER_REAR, 0, 0)
  anchor('railBottom', bottomRailC[0], bottomRailC[1], 0, Math.PI) // outward is down
  anchor('railSide', sideRailC[0], sideRailC[1], -SIDE_RAIL_Z, -Math.PI / 2) // outward is -Z
  anchor('mag', magC[0], magC[1], 0, 0, MAG_RAKE) // +Y up into the well, raked

  return group
}
