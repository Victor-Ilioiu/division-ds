// Hexline "Harrier LR": a fictional bolt-action long-range airsoft replica, built from code only.
// The listing is a kit, so the model is complete: chassis, fluted barrel, action and bolt, top
// rail, telescopic sight on two rings, folding bipod, thumbhole stock with cheek rest, butt pad
// and rear monopod, trigger group, short box magazine.
//
//   create({ bipod: 'down' })     default: legs down, splayed.
//   create({ bipod: 'folded' })   legs swung forward under the barrel.
//
// The workbench viewer only forwards `variant` from its URL, so `variant: 'folded'` is accepted
// as the same switch.
//
// Axes per the model contract: +X muzzle, +Y up, the left side faces -Z. Origin on the bore
// axis above the magazine. Real size, metres: about 1160 mm from muzzle to butt pad.
//
// The side silhouette is traced from the flat-on left reference photo (1200 x 800 px) in the
// workbench's private assets folder. Muzzle at px 43, butt pad at px 1141: 1098 px = 1160 mm.
// Coordinates written as `[px, py]` are pixels of that photo; Z thicknesses are millimetres.
//
// The barrel fluting is real geometry: six shallow helical grooves displaced into the tube.
//
// Sub-assemblies are groups, so they can be posed: `chassis`, `barrel`, `bolt`, `scope`,
// `bipod` (with `bipodLegLeft` / `bipodLegRight` inside), `stock`, `magazine`.

import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { polymer, anodized } from '../lib/materials.js'
import { shapeMM, pathMM, rrect, ext, finish, loftX, latheX, strokePts, cutLined, picatinny } from './_rifle-kit.js'

const S = 1160 / 1098 // mm per photo pixel
const OX = 735 // above the magazine
const OY = 293 // bore axis
const X = (px) => (OX - px) * S
const Y = (py) => (OY - py) * S
const sh = (pts) => shapeMM(pts.map(([px, py, r]) => [X(px), Y(py), r ?? 0]))

const RAIL_TOP = Y(277)
const SCOPE_Y = Y(235)
const HALF = 23 // chassis and stock half thickness

function materials() {
  const grain = 0.045 // UVs are in mm
  const stock = polymer({ color: 0x1a1b1d, roughness: 0.8, repeat: grain })
  stock.clearcoat = 0
  stock.sheen = 0
  stock.specularIntensity = 0.5
  stock.envMapIntensity = 0.7
  const metal = anodized({ color: 0x131417, roughness: 0.48, repeat: grain * 0.6 })
  metal.clearcoat = 0.1
  metal.envMapIntensity = 0.75
  const metalDark = anodized({ color: 0x0d0e10, roughness: 0.52, repeat: grain * 0.6 })
  metalDark.clearcoat = 0
  metalDark.envMapIntensity = 0.7
  return {
    stock,
    metal,
    metalDark,
    rubber: new THREE.MeshPhysicalMaterial({ color: 0x0d0d0e, roughness: 0.92, metalness: 0, envMapIntensity: 0.4 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x040405, roughness: 0.95, metalness: 0 }),
    // Clear coated optical glass: you see through the tube, with a faint violet reflection.
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.02,
      metalness: 0,
      transmission: 1,
      thickness: 0.003,
      ior: 1.52,
      attenuationColor: new THREE.Color(0xc9b6ff),
      attenuationDistance: 0.05,
      iridescence: 1,
      iridescenceIOR: 1.7,
      iridescenceThicknessRange: [180, 380],
      specularColor: new THREE.Color(0x8a5cff),
      specularIntensity: 1,
    }),
  }
}

/** Canvas-drawn marking on a transparent plane. Draw in millimetres; y runs down. */
function decal(w, h, draw, res = 22) {
  const c = document.createElement('canvas')
  c.width = Math.round(w * res)
  c.height = Math.round(h * res)
  const g = c.getContext('2d')
  g.scale(res, res)
  draw(g, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w / 1000, h / 1000), mat)
  mesh.userData.shadow = false
  return mesh
}

/**
 * A tube along X whose radius dips into `flutes` shallow helical grooves between x0 and x1 (mm).
 * Real displaced geometry: the grooves catch the light the way milled flutes do.
 */
function flutedTube({ xa, xb, x0, x1, radius, depth, flutes = 6, turnLength = 250, radial = 96, step = 3.5 }) {
  const nx = Math.ceil((xb - xa) / step)
  const pos = []
  const idx = []
  const groove = (u) => {
    // u: angular distance to the nearest flute centre, as a fraction of the pitch (0..0.5)
    const w = 0.2
    if (u >= w) return 0
    const c = Math.cos((u / w) * Math.PI * 0.5)
    return c * c
  }
  for (let i = 0; i <= nx; i++) {
    const x = xa + ((xb - xa) * i) / nx
    // fade the grooves in and out over 14 mm at each end of the fluted length
    const fade = THREE.MathUtils.smoothstep(x, x0, x0 + 14) * (1 - THREE.MathUtils.smoothstep(x, x1 - 14, x1))
    const twist = (x / turnLength) * Math.PI * 2
    for (let j = 0; j <= radial; j++) {
      const t = (j / radial) * Math.PI * 2
      const phase = (((t - twist) / (Math.PI * 2)) * flutes) % 1
      const u = Math.abs(((phase + 1) % 1) - 0.5)
      const r = radius - depth * fade * groove(0.5 - u)
      pos.push(x, r * Math.cos(t), r * Math.sin(t))
    }
  }
  const row = radial + 1
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j
      const b = a + 1
      const c = a + row
      const d = c + 1
      idx.push(a, b, c, b, d, c)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  // close the seam: the first and last column are the same points
  const n = geo.attributes.normal
  for (let i = 0; i <= nx; i++) {
    const a = i * row
    const b = a + radial
    const x = (n.getX(a) + n.getX(b)) / 2
    const y = (n.getY(a) + n.getY(b)) / 2
    const z = (n.getZ(a) + n.getZ(b)) / 2
    const l = Math.hypot(x, y, z) || 1
    n.setXYZ(a, x / l, y / l, z / l)
    n.setXYZ(b, x / l, y / l, z / l)
  }
  // faces were wound for a tube seen from outside with +X to the left; make sure they face out
  const p0 = new THREE.Vector3().fromBufferAttribute(geo.attributes.position, 0)
  const n0 = new THREE.Vector3().fromBufferAttribute(n, 0)
  if (n0.dot(new THREE.Vector3(0, p0.y, p0.z)) < 0) {
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1]
      idx[i + 1] = idx[i + 2]
      idx[i + 2] = t
    }
    geo.setIndex(idx)
    geo.computeVertexNormals()
  }
  return geo
}

export function create({ bipod, variant } = {}) {
  const pose = bipod === 'folded' || variant === 'folded' ? 'folded' : 'down'
  const group = new THREE.Group()
  group.name = 'harrier'
  group.userData.bipod = pose
  const M = materials()

  const sub = (name) => {
    const g = new THREE.Group()
    g.name = name
    group.add(g)
    return g
  }
  const G = {
    chassis: sub('chassis'),
    barrel: sub('barrel'),
    bolt: sub('bolt'),
    scope: sub('scope'),
    bipod: sub('bipod'),
    stock: sub('stock'),
    magazine: sub('magazine'),
  }
  const add = (parent, name, geo, mat, crease = 50) => {
    const mesh = new THREE.Mesh(finish(geo, crease), mat)
    mesh.name = name
    parent.add(mesh)
    return mesh
  }
  const merge = (list) => mergeGeometries(list, false)
  const cyl = (r, h, seg = 24, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg).toNonIndexed()
  /** Cylinder with its axis along Z, centred on (x, y, z) mm. */
  const cylZ = (x, y, z, r, h, seg = 24) => cyl(r, h, seg).rotateX(Math.PI / 2).translate(x, y, z)
  const cylX = (x, y, z, r, h, seg = 24) => cyl(r, h, seg).rotateZ(Math.PI / 2).translate(x, y, z)
  const cylY = (x, y, z, r, h, seg = 24, r2 = r) => cyl(r, h, seg, r2).translate(x, y, z)

  // ───────────────────────────── chassis ─────────────────────────────
  // Fore-end, grip and the front half of the thumbhole: one moulded body with generous radii.
  {
    const body = ext(
      sh([
        [413, 300, 9],
        [756, 300, 0],
        [796, 313, 0],
        [912, 313, 0],
        [912, 341, 0],
        [866, 341, 26],
        [866, 393, 26],
        [912, 393, 0],
        [919, 421, 0],
        [886, 434, 9],
        [842, 434, 9],
        [836, 408, 0],
        [829, 386, 0],
        [829, 351, 0],
        [771, 351, 0],
        [765, 372, 0],
        [750, 372, 0],
        [660, 360, 40],
        [600, 341, 40],
        [413, 341, 9],
      ]),
      HALF * 2,
      { bevel: 6, bt: 7, seg: 6 },
    )
    // The long slot down each flank, and the recess at the front that holds the sling stud.
    const slot = (s) => ext(sh([[440, 305, 3.2], [616, 305, 3.2], [616, 312, 3.2], [440, 312, 3.2]]), 8, { bevel: 0, z: s * HALF })
    const recess = (s) => ext(sh([[421, 311, 4], [440, 311, 4], [440, 328, 4], [421, 328, 4]]), 7, { bevel: 0, z: s * HALF })
    add(
      G.chassis,
      'chassisBody',
      ...cutLined(body, M.stock, [
        [slot(1), M.dark],
        [slot(-1), M.dark],
        [recess(1), M.dark],
        [recess(-1), M.dark],
      ]),
    )
    add(
      G.chassis,
      'slingStud',
      merge([-1, 1].map((s) => ext(sh([[426, 317, 1.5], [435, 317, 1.5], [435, 322.5, 1.5], [426, 322.5, 1.5]]), 2.4, { bevel: 0.6, z: s * (HALF - 2.4) }))),
      M.metalDark,
    )
    // Loop under the fore-end.
    {
      const loop = sh([[450, 340, 0], [460, 340, 0], [460, 346, 3.5], [450, 346, 3.5]])
      loop.holes.push(new THREE.Path().absarc(X(455), Y(344.6), 1.9, 0, Math.PI * 2, true))
      add(G.chassis, 'frontLoop', ext(loop, 5, { bevel: 0.6 }), M.metalDark)
    }
  }

  // Action: a round-topped tube sitting in the chassis, with the top rail bolted on.
  {
    const st = (px, top, bot, hw, rt, rb) => ({ x: X(px), top: Y(top), bot: Y(bot), hw, rt, rb })
    const action = loftX(
      [
        st(624, 286, 306, 15, 9, 3),
        st(627, 284, 306, 17, 10, 3),
        st(800, 284, 306, 17, 10, 3),
        st(800, 287, 313, 16, 8, 3),
        st(829, 287, 313, 16, 8, 3),
        st(832, 290, 313, 13.5, 7, 3),
      ],
      { arc: 8 },
    )
    const port = ext(sh([[690, 287, 2.2], [762, 287, 2.2], [762, 297, 2.2], [690, 297, 2.2]]), 10, { bevel: 0, z: 17 })
    add(G.chassis, 'action', ...cutLined(action, M.metal, [[port, M.dark]]), 55)
    add(G.chassis, 'actionBolt', cylX((X(690) + X(762)) / 2, Y(292), 9, 5.2, (762 - 690) * S - 2, 20), M.metalDark, 40)

    const rail = merge(picatinny((800 - 627) * S, 17))
    rail.translate((X(627) + X(800)) / 2, RAIL_TOP, 0)
    add(G.chassis, 'railTop', rail, M.metalDark)
  }

  // Trigger and guard.
  add(
    G.chassis,
    'triggerGuard',
    ext(
      shapeMM(
        strokePts(
          [
            [X(768), Y(368)],
            [X(766), Y(378)],
            [X(769), Y(384)],
            [X(776), Y(386.5)],
            [X(820), Y(386.5)],
            [X(827), Y(384)],
            [X(831), Y(378)],
          ],
          4.4,
        ),
      ),
      18,
      { bevel: 1.5, seg: 4 },
    ),
    M.stock,
  )
  add(
    G.chassis,
    'trigger',
    ext(
      sh([
        [798, 350, 0],
        [809, 350, 0],
        [808.5, 358, 3],
        [805.5, 370, 4],
        [803, 379, 0.8],
        [800.5, 378.5, 0.8],
        [802, 368, 4],
        [801, 358, 3],
      ]),
      6.5,
      { bevel: 1.2, bt: 2, seg: 4 },
    ),
    M.metalDark,
  )

  // Hinge knuckles on the left, where the stock folds.
  {
    const parts = []
    for (const [a, b] of [
      [314, 322.5],
      [323.5, 332],
      [333, 341.5],
    ]) {
      parts.push(cylY(X(903), (Y(a) + Y(b)) / 2, -(HALF - 4), 10.5, (b - a) * S, 26))
    }
    add(G.chassis, 'hinge', merge(parts), M.stock, 40)
    add(G.chassis, 'hingePin', cylY(X(903), (Y(312) + Y(343)) / 2, -(HALF - 4), 2.2, 33 * S, 14), M.metalDark, 40)
  }

  // ───────────────────────────── barrel ─────────────────────────────
  {
    const R = 12.4
    const tip = X(45)
    const tube = flutedTube({ xa: X(632), xb: tip - 2, x0: X(606), x1: X(74), radius: R, depth: 1.5 })
    add(G.barrel, 'barrelTube', tube, M.metal, 0)
    // Crowned muzzle: a rounded lip, a recessed face and the bore.
    add(
      G.barrel,
      'muzzleCrown',
      latheX(
        [
          [tip - 2.2, 4],
          [tip - 2.2, R],
          [tip - 1, R],
          [tip, R - 1],
          [tip, R - 3.2],
          [tip - 2.4, R - 4.4],
          [tip - 2.4, 3.1],
          [tip - 30, 3.1],
          [tip - 30, 4],
          [tip - 2.2, 4],
        ],
        64,
      ),
      M.metal,
      0,
    )
    add(G.barrel, 'bore', cylX(tip - 26, 0, 0, 3.1, 0.3, 20), M.dark, 0)
    add(
      G.barrel,
      'barrelNut',
      latheX(
        [
          [X(632), R - 0.5],
          [X(632), R + 2.6],
          [X(626), R + 2.6],
          [X(622.5), R + 1.2],
          [X(622.5), R - 0.5],
        ],
        48,
      ),
      M.metalDark,
      0,
    )
  }

  // ───────────────────────────── bolt ─────────────────────────────
  {
    // Shroud at the back of the action and the handle on the right, bent down then out to a ball.
    add(
      G.bolt,
      'boltShroud',
      latheX(
        [
          [X(843), 0.01],
          [X(843), 7.5],
          [X(841), 9],
          [X(832), 9],
          [X(832), 0.01],
        ],
        32,
      ).translate(0, Y(299), 0),
      M.metalDark,
      0,
    )
    const root = [X(797), Y(292), 15]
    const knob = [X(795), Y(273), 43]
    const dir = new THREE.Vector3(knob[0] - root[0], knob[1] - root[1], knob[2] - root[2])
    const len = dir.length()
    const stem = cyl(3.6, len, 16, 4.6)
    stem.translate(0, len / 2, 0)
    stem.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()))
    stem.translate(...root)
    add(G.bolt, 'boltHandle', stem, M.metalDark, 40)
    const ball = new THREE.SphereGeometry(9.6, 28, 20)
    ball.translate(...knob)
    add(G.bolt, 'boltKnob', ball, M.stock, 0)
  }

  // ───────────────────────────── magazine ─────────────────────────────
  add(
    G.magazine,
    'magazineBody',
    merge([
      ext(sh([[714, 356, 0], [757, 356, 0], [757, 379, 0], [714, 377, 0]]), 26, { bevel: 1.4, seg: 3 }),
      ext(sh([[712, 377, 0], [759, 379.5, 0], [759, 384, 2], [712, 382, 2]]), 29, { bevel: 1.6, seg: 3 }),
    ]),
    M.metalDark,
  )

  // ───────────────────────────── stock ─────────────────────────────
  {
    add(
      G.stock,
      'stockBody',
      ext(
        sh([
          [912.6, 313, 0],
          [1088, 313, 0],
          [1088, 393, 0],
          [990, 393, 0],
          [954, 421, 9],
          [919.6, 421, 0],
          [912.6, 393, 0],
          [927, 393, 15],
          [927, 341, 15],
          [912.6, 341, 0],
        ]),
        HALF * 2,
        { bevel: 5.5, bt: 6.5, seg: 6 },
      ),
      M.stock,
    )
    // Cheek rest, on two posts so its height reads as adjustable.
    add(
      G.stock,
      'cheekRest',
      ext(
        sh([
          [956, 311, 0],
          [956, 301, 0],
          [963, 293.5, 0],
          [1076, 293.5, 0],
          [1088, 301, 0],
          [1088, 311, 0],
        ]),
        40,
        { bevel: 5, bt: 6, seg: 6 },
      ),
      M.stock,
    )
    add(G.stock, 'cheekPosts', merge([cylY(X(985), Y(312), 0, 4, 6, 16), cylY(X(1060), Y(312), 0, 4, 6, 16)]), M.metalDark, 40)
    // Butt: three spacer plates and the rubber pad.
    const plates = []
    for (let i = 0; i < 3; i++) {
      const a = 1088.6 + i * 6.6
      plates.push(ext(sh([[a, 300, 0], [a + 6, 300, 0], [a + 6, 425, 0], [a, 425, 0]]), 47, { bevel: 1.3, seg: 3 }))
    }
    add(G.stock, 'buttSpacers', merge(plates), M.stock)
    add(
      G.stock,
      'buttPad',
      ext(
        sh([
          [1108.6, 298, 0],
          [1138, 297, 8],
          [1141, 430, 8],
          [1108.6, 425, 0],
        ]),
        47,
        { bevel: 6, bt: 8, seg: 7 },
      ),
      M.rubber,
    )
    // Length-of-pull adjuster on the side, the badge disc, and the cross bolts.
    add(
      G.stock,
      'adjuster',
      merge([
        ...[-1, 1].map((s) => ext(sh([[1059, 315, 3], [1088, 315, 3], [1088, 343, 3], [1059, 343, 3]]), 2.4, { bevel: 0.8, z: s * (HALF + 0.4) })),
        cylZ(X(1077), Y(329), -(HALF + 3), 5.4, 6, 20),
        cylZ(X(1077), Y(329), HALF + 3, 5.4, 6, 20),
      ]),
      M.metalDark,
      40,
    )
    add(G.stock, 'badge', merge([cylZ(X(997), Y(328), -HALF, 10.4, 1.6, 36), cylZ(X(997), Y(328), HALF, 10.4, 1.6, 36)]), M.metalDark, 40)

    // Rear monopod: a block, two knurled wheels, a threaded spike and a foot.
    const mx = X(1045)
    add(G.stock, 'monopodBlock', ext(sh([[1031, 391, 0], [1060, 391, 0], [1060, 405, 2], [1031, 405, 2]]), 22, { bevel: 1.5, seg: 3 }), M.stock)
    const wheel = (py0, py1) =>
      latheX(
        [
          [Y(py1), 0.01],
          [Y(py1), 18.4],
          [Y(py1) + 1, 19.4],
          [Y(py0) - 1, 19.4],
          [Y(py0), 18.4],
          [Y(py0), 0.01],
        ],
        40,
      )
        .rotateZ(Math.PI / 2)
        .translate(mx, 0, 0)
    add(G.stock, 'monopodWheels', mergeGeometries([wheel(405.5, 412.5), wheel(416.5, 424.5)], false), M.metalDark, 0)
    const rings = []
    for (let py = 428; py < 494; py += 3.2) rings.push(cylY(mx, Y(py), 0, 3.5, 1.5, 14, 3.1))
    add(G.stock, 'monopodSpike', merge([cylY(mx, (Y(424) + Y(496)) / 2, 0, 2.8, 72 * S, 14), ...rings]), M.metalDark, 40)
    add(
      G.stock,
      'monopodFoot',
      latheX(
        [
          [Y(503), 0.01],
          [Y(503), 16.5],
          [Y(502), 18.2],
          [Y(497.5), 18.2],
          [Y(495.5), 8],
          [Y(495.5), 0.01],
        ],
        40,
      )
        .rotateZ(Math.PI / 2)
        .translate(mx, 0, 0),
      M.rubber,
      0,
    )
  }

  // ───────────────────────────── scope ─────────────────────────────
  {
    const sx = (px) => X(px)
    const front = sx(572)
    const rear = sx(852)
    const body = latheX(
      [
        [rear, 16],
        [rear, 19],
        [rear + 1.2, 19.8],
        [rear + 9, 19.8],
        [rear + 10, 19],
        [sx(812), 19],
        [sx(803), 15.4],
        [sx(800), 16.6],
        [sx(782), 16.6],
        [sx(780.5), 12.7],
        [sx(724), 12.7],
        [sx(722), 17.4],
        [sx(695), 17.4],
        [sx(693), 12.7],
        [sx(642), 12.7],
        [sx(602), 21.6],
        [front - 2, 21.6],
        [front, 20.8],
        [front, 19.4],
        [sx(600), 19.4],
        [sx(642), 10.6],
        [sx(800), 10.6],
        [sx(815), 16],
        [rear, 16],
      ],
      72,
    )
    add(G.scope, 'scopeTube', body.translate(0, SCOPE_Y, 0), M.metal, 0)
    // Two turrets: elevation on top, windage on the right.
    const turret = () =>
      latheX(
        [
          [0, 0.01],
          [0, 9],
          [3, 9],
          [3.4, 11.6],
          [11.4, 11.6],
          [12.4, 10.4],
          [12.4, 0.01],
        ],
        40,
      )
    const tx = sx(708.5)
    add(G.scope, 'turretTop', turret().rotateZ(Math.PI / 2).translate(tx, SCOPE_Y + 16.4, 0), M.metalDark, 0)
    add(G.scope, 'turretSide', turret().rotateY(-Math.PI / 2).translate(tx, SCOPE_Y, 16.4), M.metalDark, 0)
    // Lenses: clear coated glass, so the tube really is see-through.
    const lens = (x, r, name) => {
      const g = new THREE.SphereGeometry(r * 2.6, 40, 12, 0, Math.PI * 2, 0, Math.asin(1 / 2.6))
      g.rotateZ(-Math.PI / 2) // dome toward +X
      g.translate(-r * 2.6 * Math.cos(Math.asin(1 / 2.6)), 0, 0)
      const back = g.clone().rotateY(Math.PI)
      const m = add(G.scope, name, mergeGeometries([g, back], false).translate(x, SCOPE_Y, 0), M.glass, 0)
      m.userData.shadow = false
    }
    lens(front - 9, 19.4, 'objectiveLens')
    lens(rear + 6, 16, 'ocularLens')
    // Rings: a clamp round the tube on a foot that grips the rail.
    const ring = (px) => {
      const x = sx(px)
      const band = latheX(
        [
          [-7, 12.6],
          [-7, 16.6],
          [-6, 17.6],
          [6, 17.6],
          [7, 16.6],
          [7, 12.6],
        ],
        48,
      ).toNonIndexed()
      band.deleteAttribute('uv')
      band.translate(x, SCOPE_Y, 0)
      const drop = SCOPE_Y - RAIL_TOP
      const post = ext(
        shapeMM([
          [-8, -drop - 6, 0],
          [8, -drop - 6, 0],
          [13.4, -drop - 2.2, 0],
          [13.4, -drop + 4.5, 0],
          [9, -drop + 9, 0],
          [9, -14, 0],
          [-9, -14, 0],
          [-9, -drop + 9, 0],
          [-13.4, -drop + 4.5, 0],
          [-13.4, -drop - 2.2, 0],
        ]),
        14,
        { bevel: 1, seg: 2 },
      )
      post.rotateY(Math.PI / 2)
      post.translate(x, SCOPE_Y, 0)
      post.deleteAttribute('uv')
      const ears = [-1, 1].map((s) => {
        const e = ext(shapeMM(rrect(0, 0, 14, 5, 1.2)), 9, { bevel: 0.8 })
        e.deleteAttribute('uv')
        return e.translate(x, SCOPE_Y, s * 20.5)
      })
      const screw = cylZ(x, SCOPE_Y - drop + 1, -14.2, 3.4, 3, 6)
      screw.deleteAttribute('uv')
      return merge([weld(band), post, ...ears, screw])
    }
    function weld(g) {
      g.computeVertexNormals()
      return g
    }
    add(G.scope, 'scopeRings', merge([ring(665), ring(742)]), M.metalDark, 40)
  }

  // ───────────────────────────── bipod ─────────────────────────────
  {
    // Adapter clamped under the nose of the fore-end, with a yoke the two legs pivot in.
    const hx = X(399)
    const hy = Y(345)
    add(
      G.bipod,
      'bipodMount',
      merge([
        ext(sh([[387.5, 309, 2], [413.5, 309, 2], [413.5, 336, 2], [387.5, 336, 2]]), 30, { bevel: 1.6, seg: 3 }),
        ...[315, 322, 329].map((py) => ext(sh([[389, py - 1.6, 0], [411, py - 1.6, 0], [411, py + 1.6, 0], [389, py + 1.6, 0]]), 33, { bevel: 0.7 })),
        ext(sh([[390, 335, 0], [408, 335, 0], [408, 349, 4], [390, 349, 4]]), 14, { bevel: 1.4, seg: 3 }),
        cylZ(hx, hy, 0, 3.2, 44, 16),
      ]),
      M.metalDark,
    )
    add(G.bipod, 'bipodClampKnob', cylZ(X(400), Y(322), -(15 + 4), 6.5, 8, 10), M.metalDark, 40)

    const leg = (side) => {
      const g = new THREE.Group()
      g.name = side < 0 ? 'bipodLegLeft' : 'bipodLegRight'
      const L1 = 118 // upper tube
      const L2 = 78 // inner leg
      const parts = [
        cylY(0, -6, 0, 7.2, 14, 20), // knuckle
        cylY(0, -L1 / 2 - 8, 0, 6.2, L1, 22),
        cylY(0, -L1 - 10, 0, 7.6, 12, 22), // lock collar
        cylY(0, -L1 - 14 - L2 / 2, 0, 4.4, L2, 18),
      ]
      // notches on the inner leg
      for (let i = 0; i < 6; i++) parts.push(cylY(0, -L1 - 26 - i * 9, 0, 4.9, 2, 18))
      const m = new THREE.Mesh(finish(merge(parts), 40), M.metalDark)
      m.name = 'bipodLegTube'
      g.add(m)
      // return spring alongside the upper tube
      const pts = []
      const turns = 16
      for (let i = 0; i <= turns * 14; i++) {
        const t = (i / 14) * Math.PI * 2
        pts.push(new THREE.Vector3(8.6 + 2.3 * Math.cos(t), -16 - (i / (turns * 14)) * 62, 2.3 * Math.sin(t)).multiplyScalar(0.001))
      }
      const spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 14, 0.0005, 5), M.metal)
      spring.name = 'bipodSpring'
      g.add(spring)
      const foot = new THREE.Mesh(
        finish(
          latheX(
            [
              [-L1 - L2 - 30, 0.01],
              [-L1 - L2 - 30, 7],
              [-L1 - L2 - 28, 8.6],
              [-L1 - L2 - 16, 8.6],
              [-L1 - L2 - 12, 6],
              [-L1 - L2 - 6, 6],
              [-L1 - L2 - 6, 0.01],
            ],
            28,
          ).rotateZ(Math.PI / 2),
          0,
        ),
        M.rubber,
      )
      foot.name = 'bipodFoot'
      g.add(foot)
      g.position.set(hx / 1000, hy / 1000, (side * 17) / 1000)
      // splay first (about X), then swing forward about Z
      g.rotation.order = 'ZYX'
      const down = pose === 'down'
      g.rotation.set(THREE.MathUtils.degToRad(side * (down ? -17 : -3)), 0, THREE.MathUtils.degToRad(down ? 4 : 88))
      return g
    }
    G.bipod.add(leg(-1), leg(1))
  }

  // ───────────────────────────── screws (instanced) ─────────────────────────────
  {
    const mm = 0.001
    const head = new THREE.LatheGeometry(
      [
        [0, 0.15],
        [0.5, 0.15],
        [0.56, 0.8],
        [0.86, 0.8],
        [1, 0.56],
        [1, -0.6],
      ].map(([r, y]) => new THREE.Vector2(r * mm, y * mm)),
      20,
    )
    // [px, py, radius mm, z of the surface, parent]
    const list = [
      [455, 327, 3.3, HALF, G.chassis],
      [555, 327, 3.3, HALF, G.chassis],
      [655, 335, 3.3, HALF, G.chassis],
      [762, 333, 3.3, HALF, G.chassis],
      [807, 326, 3.3, HALF, G.chassis],
      [873, 327, 3.3, HALF, G.chassis],
      [865, 411, 3.3, HALF, G.chassis],
      [938, 328, 3.3, HALF, G.stock],
      [1035, 328, 3.3, HALF, G.stock],
      [977, 378, 3.3, HALF, G.stock],
      [1058, 378, 3.3, HALF, G.stock],
    ]
    for (const parent of [G.chassis, G.stock]) {
      const items = list.filter((l) => l[4] === parent).flatMap((l) => [-1, 1].map((s) => [l[0], l[1], l[2], s * l[3]]))
      const mesh = new THREE.InstancedMesh(head, M.metalDark, items.length)
      mesh.name = parent === G.chassis ? 'chassisScrews' : 'stockScrews'
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
  }

  // ───────────────────────────── markings ─────────────────────────────
  // Printed straight on the parts: small light-grey lettering, one red accent. Invented text.
  {
    const block = decal(34, 13, (g) => {
      g.fillStyle = 'rgba(176, 52, 38, 0.92)'
      g.fillRect(1, 1.4, 1.1, 3.4)
      g.fillStyle = 'rgba(170, 172, 170, 0.9)'
      g.font = '700 3.4px Arial, Helvetica, sans-serif'
      g.fillText('HARRIER LR', 3.2, 4.6)
      g.fillStyle = 'rgba(150, 152, 150, 0.8)'
      g.font = '500 1.7px Arial, Helvetica, sans-serif'
      g.fillText('6 mm BB', 1.1, 8)
      g.fillText('E < 3.0 J', 13, 8)
      g.fillStyle = 'rgba(120, 122, 120, 0.75)'
      g.font = '500 1.3px Arial, Helvetica, sans-serif'
      g.fillText('HX-LR 062-1184', 1.1, 11)
    })
    block.name = 'markings'
    block.rotation.y = Math.PI
    block.position.set(X(672) / 1000, Y(318) / 1000, -(HALF + 0.06) / 1000)
    G.chassis.add(block)

    const maker = decal(22, 3, (g) => {
      g.fillStyle = 'rgba(160, 162, 160, 0.85)'
      g.font = '600 1.9px Arial, Helvetica, sans-serif'
      g.textBaseline = 'middle'
      g.fillText('H E X L I N E', 0.6, 1.6)
    })
    maker.name = 'markingsMaker'
    maker.rotation.y = Math.PI
    maker.position.set(X(660) / 1000, Y(297.5) / 1000, -17.06 / 1000)
    G.chassis.add(maker)
  }

  return group
}
