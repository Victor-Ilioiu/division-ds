// Vertical foregrip, 95 mm tall. Rail-mount convention: origin on the rail's top surface,
// centred on the rail, the grip growing toward +Y, the clamp jaws wrapping 6 mm below the
// origin. On the rifle it hangs from anchor:railBottom; `viewer.rotation` shows it that way.
// Dimensions are millimetres (see _suppressor-kit.js).

import * as THREE from 'three'
import { polymer, normalMapFromHeight } from '../lib/materials.js'
import { MM, rng, turn, skin, filletShape, extrudeX, turned, knurled, crossBolt } from './_suppressor-kit.js'

export const viewer = { rotation: [Math.PI, 0, 0] }

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Grip body: y from Y0 to Y1, then a rolled-over edge that tucks under the end cap.
const Y0 = 13
const Y1 = 78

/** Radius of the grip at angle `th` (0 = front, toward the muzzle) and height fraction `t`. */
function gripRadius(th, t) {
  const c = Math.cos(th)
  const s = Math.sin(th)
  const swell = Math.sin(Math.PI * Math.pow(t, 0.85))
  const a = c > 0 ? 16.2 : 17.0 + 1.2 * swell // front flatter, palm swell at the back
  const b = 14.4 + 0.7 * swell
  const n = 2.5
  let r = Math.pow(Math.pow(Math.abs(c / a), n) + Math.pow(Math.abs(s / b), n), -1 / n)
  // three finger grooves on the front
  const groove = 0.5 + 0.5 * Math.cos(2 * Math.PI * 3 * (t - 1 / 6))
  r -= 2.1 * groove * Math.pow(Math.max(0, c), 1.3)
  // fine horizontal ribs on the back strap
  const y = t * (Y1 - Y0)
  const rib = 0.5 + 0.5 * Math.sin((2 * Math.PI * y) / 3.6)
  r += 0.42 * rib * Math.pow(Math.max(0, -c), 2) * smooth(0.1, 0.2, t) * (1 - smooth(0.82, 0.92, t))
  // flare at the free end
  r += 1.3 * smooth(0.86, 1, t)
  // round neck where it meets the collar
  return THREE.MathUtils.lerp(15, r, smooth(0, 0.14, t))
}

function gripGeometry() {
  const body = 0.95
  return skin(
    (u, v) => {
      const th = u * Math.PI * 2
      let r
      let y
      if (v <= body) {
        const t = v / body
        r = gripRadius(th, t)
        y = Y0 + (Y1 - Y0) * t
      } else {
        const w = (v - body) / (1 - body)
        r = gripRadius(th, 1) - 3.4 * (1 - Math.cos((w * Math.PI) / 2))
        y = Y1 + 2.2 * Math.sin((w * Math.PI) / 2)
      }
      return [r * Math.cos(th), y, r * Math.sin(th)]
    },
    64,
    150,
  )
}

/**
 * Subdued four-tone camouflage. Two fields of value noise, periodic around the grip, are
 * thresholded into flat patches: the look of a hydro-dipped or two-shot moulded part rather
 * than a printed toy.
 */
function camoTexture() {
  const W = 1536
  const H = 1024
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(W, H)

  const field = (seed, cellsX, cellsY) => {
    const rand = rng(seed)
    const grid = Array.from({ length: cellsX * (cellsY + 1) }, () => rand())
    const at = (ix, iy) => grid[iy * cellsX + (((ix % cellsX) + cellsX) % cellsX)]
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
    return (u, v) => {
      const x = u * cellsX
      const y = v * cellsY
      const ix = Math.floor(x)
      const iy = Math.min(cellsY - 1, Math.floor(y))
      const fx = fade(x - ix)
      const fy = fade(y - iy)
      const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * fx
      const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * fx
      return a + (b - a) * fy
    }
  }
  const fbm = (seed, cx, cy) => {
    const o1 = field(seed, cx, cy)
    const o2 = field(seed + 1, cx * 2, cy * 2)
    const o3 = field(seed + 2, cx * 5, cy * 5)
    return (u, v) => o1(u, v) * 0.6 + o2(u, v) * 0.28 + o3(u, v) * 0.12
  }
  const A = fbm(11, 7, 5)
  const B = fbm(57, 9, 6)
  const C = fbm(131, 6, 7)
  const grain = rng(9)

  // charcoal base, dark olive, dark earth, near-black, and a sparse grey-green accent
  const tones = { base: [36, 38, 37], olive: [50, 54, 43], earth: [54, 50, 43], dark: [21, 22, 23], accent: [60, 63, 57] }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W
      const v = y / H
      const a = A(u, v)
      const b = B(u, v)
      const k = C(u, v)
      let t = tones.base
      if (a > 0.56) t = tones.olive
      if (b > 0.6) t = tones.earth
      if (k < 0.39) t = tones.dark
      if (a < 0.36 && b < 0.45) t = tones.accent
      const n = (grain() - 0.5) * 5
      const i = (y * W + x) * 4
      img.data[i] = t[0] + n
      img.data[i + 1] = t[1] + n
      img.data[i + 2] = t[2] + n
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  // soften the patch edges by one pixel, as sprayed or dipped camouflage has
  ctx.filter = 'blur(1.4px)'
  ctx.drawImage(c, 0, 0)
  ctx.filter = 'none'
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

export function create() {
  const group = new THREE.Group()
  group.name = 'foregrip'

  const alu = turned({ color: 0x18191c, roughness: 0.4, repeat: 60 })
  alu.normalMap.repeat.set(60, 60)
  const black = polymer({ color: 0x1a1b1d, roughness: 0.6 })

  const add = (name, geometry, material) => {
    const m = new THREE.Mesh(geometry, material)
    m.name = name
    group.add(m)
    return m
  }

  // --- rail clamp: fixed jaw on -Z, a separate clamping plate on +Z ---------------------------
  const base = filletShape(
    [
      [-8.6, -6, 0.4],
      [-8.6, -5.2, 0.3],
      [-10.8, -3, 0.3],
      [-10.8, 0, 0.3],
      [11.4, 0, 0.3],
      [11.4, 8.2, 0.8],
      [9.6, 10, 0.8],
      [-13.6, 10, 1.4],
      [-17, 6.6, 1.4],
      [-17, -4.6, 1],
      [-15.6, -6, 0.6],
    ],
    1,
  )
  add('clamp-base', extrudeX(base, 40, 0.7), alu)

  const jaw = filletShape(
    [
      [8.6, -6, 0.4],
      [8.6, -5.2, 0.3],
      [10.8, -3, 0.3],
      [10.8, -0.5, 0.3],
      [11.9, -0.5, 0.3],
      [11.9, 7.6, 0.6],
      [14.4, 7.6, 1.2],
      [17, 5, 1.2],
      [17, -4.6, 1],
      [15.6, -6, 0.6],
    ],
    1,
  )
  add('clamp-jaw', extrudeX(jaw, 27, 0.6), alu)

  group.add(crossBolt({ y: 3.9, zHead: -17, zNut: 17 }))

  // two recoil-lug witness screws on the fixed side, for scale and detail
  const screwGeo = turn([[0, 2.3], [0.9, 2.3], [1.2, 2.0], [1.2, 1.2], [0.3, 1.0], [0.3, 0]], { segs: 20, axis: 'z' })
  screwGeo.rotateY(Math.PI) // heads face -Z
  for (const x of [-13, 13]) {
    const s = add('clamp-screw', screwGeo, alu)
    s.position.set(x * MM, 3.9 * MM, -17 * MM)
  }

  // --- collar between clamp and grip ----------------------------------------------------------
  add(
    'collar',
    turn(
      [[8.6, 9], [8.6, 15.6], [9.2, 16.2], [11.4, 16.2], [12, 15.6], [12, 15.2], [13.4, 15.05]],
      { segs: 56, axis: 'y' },
    ),
    black,
  )

  // --- the grip -------------------------------------------------------------------------------
  const camo = polymer({ color: 0xd2d2d2, roughness: 0.66, repeat: 60 })
  camo.map = camoTexture()
  // a moulded stipple coarse enough to read in a hero shot, instead of the fine shared grain
  const stipple = normalMapFromHeight(
    'foregrip-stipple',
    256,
    (ctx, size, rand) => {
      for (let i = 0; i < 1500; i++) {
        const v = rand() < 0.5 ? 70 + rand() * 30 : 160 + rand() * 40
        ctx.fillStyle = `rgb(${v},${v},${v})`
        const x = rand() * size
        const y = rand() * size
        const r = 2 + rand() * 2.6
        for (const ox of [-size, 0, size]) {
          for (const oy of [-size, 0, size]) {
            ctx.beginPath()
            ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
    },
    1.6,
  ).clone()
  stipple.repeat.set(9, 6)
  stipple.needsUpdate = true
  camo.normalMap = stipple
  camo.normalScale.set(0.5, 0.5)
  camo.sheen = 0.12
  add('grip', gripGeometry(), camo)

  // --- screw cap at the free end --------------------------------------------------------------
  const yc = Y1 + 1.2
  add(
    'cap-flange',
    turn([[yc, 11], [yc, 15.4], [yc + 0.5, 15.9], [yc + 1.7, 15.9], [yc + 2.2, 15.4], [yc + 2.2, 15.2]], { segs: 56, axis: 'y' }),
    black,
  )
  add(
    'cap',
    turn([[yc + 2.2, 15.2], [yc + 8.3, 15.2]], { segs: 56, axis: 'y' }),
    knurled({ circ: 2 * Math.PI * 15.2, tile: 12, color: 0x1a1b1d, metal: false, scale: 1.6 }),
  )
  add(
    'cap-rim',
    turn([[yc + 8.3, 15.2], [yc + 9.3, 14.2], [yc + 9.3, 12.2]], { segs: 56, axis: 'y' }),
    black,
  )

  // end face: a disc with a real coin slot cut through it, over a dark floor
  const disc = new THREE.Shape()
  disc.absarc(0, 0, 12.4 * MM, 0, Math.PI * 2, false)
  const slot = filletShape([[-8.5, -1.4], [8.5, -1.4], [8.5, 1.4], [-8.5, 1.4]], 1.3)
  disc.holes.push(new THREE.Path(slot.getPoints(6).reverse()))
  const fb = 0.5
  const faceDepth = 2.4
  const faceGeo = new THREE.ExtrudeGeometry(disc, {
    depth: (faceDepth - 2 * fb) * MM,
    bevelEnabled: true,
    bevelThickness: fb * MM,
    bevelSize: fb * MM,
    bevelOffset: -fb * MM,
    bevelSegments: 2,
    curveSegments: 40,
  })
  faceGeo.translate(0, 0, fb * MM)
  faceGeo.rotateX(-Math.PI / 2) // extrusion now runs along +Y
  const face = add('cap-face', faceGeo, black)
  const yEnd = 95 - 6 // overall height is 95 mm, 6 of it below the origin
  face.position.y = (yEnd - faceDepth) * MM
  const floor = add(
    'cap-slot-floor',
    new THREE.CircleGeometry(10 * MM, 24).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: 0.9 }),
  )
  floor.position.y = (yEnd - faceDepth + 0.6) * MM

  return group
}
