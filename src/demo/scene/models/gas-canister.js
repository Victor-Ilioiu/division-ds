// Green gas, 600 ml: a tall aerosol-style steel can with a long charging nozzle and a cap.
//
// Origin: centre of the footprint, standing on y = 0. The front of the printed wrap faces +X.
// The cap is the group named `cap`; hide it (`visible = false`) to show the valve and nozzle.
// Authored in millimetres, scaled to metres when each geometry is created.

import * as THREE from 'three'
import { normalMapFromHeight } from '../lib/materials.js'
import { clearShell, glossMaterial, tintMaterial } from './_magazine-clear.js'

const MM = 0.001
const R = 33 // body radius
const WALL_Y0 = 4.4
const WALL_Y1 = 186
const SEG = 72

/** Lathe a [radius, y] profile (mm). Corners are hard unless the point has a third truthy entry. */
function lathe(profile, segments = SEG) {
  const pts = []
  profile.forEach((p, i) => {
    pts.push(new THREE.Vector2(p[0], p[1]))
    if (i > 0 && i < profile.length - 1 && !p[2]) pts.push(new THREE.Vector2(p[0], p[1]))
  })
  const geo = new THREE.LatheGeometry(pts, segments)
  // Drop the zero-area triangles made by the doubled rows and by points on the axis.
  const pos = geo.attributes.position
  const src = geo.index.array
  const out = []
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  for (let i = 0; i < src.length; i += 3) {
    a.fromBufferAttribute(pos, src[i])
    b.fromBufferAttribute(pos, src[i + 1])
    c.fromBufferAttribute(pos, src[i + 2])
    if (b.sub(a).cross(c.sub(a)).lengthSq() > 1e-10) out.push(src[i], src[i + 1], src[i + 2])
  }
  geo.setIndex(out)
  return geo.scale(MM, MM, MM)
}

function part(geo, material, name) {
  const m = new THREE.Mesh(geo, material)
  m.name = name
  return m
}

// ---------------------------------------------------------------- textures

/** The soft dimpling of sprayed and stoved paint. */
function orangePeel() {
  const tex = normalMapFromHeight('canister-orange-peel', 256, (ctx, size, rand) => {
    for (let i = 0; i < 520; i++) {
      const x = rand() * size
      const y = rand() * size
      const r = 5 + rand() * 11
      const v = rand() < 0.5 ? 150 : 106
      for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r)
        g.addColorStop(0, `rgba(${v},${v},${v},0.55)`)
        g.addColorStop(1, `rgba(${v},${v},${v},0)`)
        ctx.fillStyle = g
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2)
      }
    }
  }, 1.1).clone()
  tex.needsUpdate = true
  return tex
}

const GREEN = '#27913f'
const GRAPHITE = '#1c1f21'
const PAPER = '#f1f0ea'

function labelTexture() {
  const w = 2048
  const h = 1792
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif'
  const text = (str, x, y, px, { weight = 700, squeeze = 0.84, color = PAPER, align = 'center', spacing = 0 } = {}) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(squeeze, 1)
    ctx.font = `${weight} ${px}px ${FONT}`
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.textBaseline = 'alphabetic'
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`
    ctx.fillText(str, 0, 0)
    ctx.restore()
  }
  const hex = (x, y, r, lw, color) => {
    ctx.beginPath()
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6
      ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.lineWidth = lw
    ctx.strokeStyle = color
    ctx.stroke()
  }

  ctx.fillStyle = GRAPHITE
  ctx.fillRect(0, 0, w, h)

  // The green band runs right round the can.
  ctx.fillStyle = GREEN
  ctx.fillRect(0, 560, w, 640)
  ctx.fillStyle = '#b9e53a'
  ctx.fillRect(0, 548, w, 12)
  ctx.fillRect(0, 1200, w, 12)

  // ---- front, centred on u = 0.25 (the +X side of the can)
  const fx = 512
  hex(fx - 236, 316, 46, 13, PAPER)
  ctx.fillStyle = PAPER
  ctx.fillRect(fx - 243, 290, 14, 52)
  text('HEXLINE', fx + 40, 350, 104, { squeeze: 0.86, spacing: 6 })
  text('AIRSOFT SUPPLY', fx + 40, 410, 36, { weight: 400, squeeze: 0.9, spacing: 9, color: '#b6b8ba' })

  text('GREEN', fx, 840, 236, { squeeze: 0.74 })
  text('GAS', fx, 1070, 236, { squeeze: 0.74 })
  text('PROPELLANT FOR GAS BLOWBACK REPLICAS', fx, 1160, 31, { weight: 700, squeeze: 0.88, spacing: 3, color: '#0f2c17' })

  text('600 ml', fx, 1420, 190, { squeeze: 0.84 })
  text('WITH SILICONE LUBRICANT', fx, 1492, 34, { weight: 400, squeeze: 0.9, spacing: 6, color: '#b6b8ba' })
  ctx.strokeStyle = '#b6b8ba'
  ctx.lineWidth = 3
  ctx.strokeRect(fx - 235, 1560, 470, 62)
  text('6 mm BB · AIRSOFT USE ONLY', fx, 1603, 30, { weight: 700, squeeze: 0.86, spacing: 2 })

  // ---- back, centred on u = 0.75
  const bx = 1536
  text('GREEN GAS 600 ml', bx, 330, 60, { squeeze: 0.84, spacing: 3 })
  text('HX-GG600', bx, 386, 34, { weight: 400, squeeze: 0.9, spacing: 6, color: '#b6b8ba' })

  // Hazard pictograms: invented simple shapes inside red-bordered diamonds, on the band.
  const diamond = (x, y, s, draw) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.beginPath()
    ctx.moveTo(0, -s)
    ctx.lineTo(s, 0)
    ctx.lineTo(0, s)
    ctx.lineTo(-s, 0)
    ctx.closePath()
    ctx.fillStyle = PAPER
    ctx.fill()
    ctx.lineWidth = 16
    ctx.strokeStyle = '#c8281e'
    ctx.stroke()
    ctx.fillStyle = '#111'
    ctx.strokeStyle = '#111'
    draw()
    ctx.restore()
  }
  diamond(bx - 190, 760, 150, () => {
    // a flame, as three stacked leaves over a base bar
    ctx.beginPath()
    ctx.moveTo(0, -78)
    ctx.quadraticCurveTo(62, -8, 34, 40)
    ctx.quadraticCurveTo(20, 8, 6, 30)
    ctx.quadraticCurveTo(-8, 4, -30, 40)
    ctx.quadraticCurveTo(-60, -10, 0, -78)
    ctx.fill()
    ctx.fillRect(-56, 52, 112, 14)
  })
  diamond(bx + 190, 760, 150, () => {
    // a pressurised cylinder lying on its side
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.moveTo(-62, -22)
    ctx.lineTo(40, -22)
    ctx.arc(40, 0, 22, -Math.PI / 2, Math.PI / 2)
    ctx.lineTo(-62, 22)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(62, -7, 18, 14)
    ctx.fillRect(-72, 40, 144, 10)
  })
  text('DANGER', bx, 1010, 66, { color: '#0f2c17', squeeze: 0.86, spacing: 8 })
  text('Extremely flammable aerosol. Pressurised container:', bx, 1070, 31, { weight: 700, color: '#0f2c17', squeeze: 0.88 })
  text('may burst if heated. Keep away from heat and sparks.', bx, 1110, 31, { weight: 700, color: '#0f2c17', squeeze: 0.88 })
  text('Protect from sunlight. Do not expose above 50 °C.', bx, 1150, 31, { weight: 700, color: '#0f2c17', squeeze: 0.88 })

  const lines = [
    'HOW TO FILL: shake the can, hold it upside down, press the',
    'nozzle squarely onto the fill valve of the magazine for 3 to 5',
    'seconds. Let the magazine warm to room temperature before use.',
    'For use only with airsoft replicas rated for green gas.',
    'Do not pierce or burn, even after use. Do not spray on an open',
    'flame. Use only in well-ventilated areas. Keep out of the reach',
    'of children. Contains propane and silicone oil.',
  ]
  lines.forEach((l, i) => text(l, bx - 330, 1290 + i * 38, 27, { weight: 400, squeeze: 0.9, align: 'left', color: '#c9cbcc' }))
  ctx.strokeStyle = '#c9cbcc'
  ctx.lineWidth = 3
  ctx.strokeRect(bx - 330, 1576, 250, 60)
  text('LOT 2610-GG', bx - 205, 1617, 28, { weight: 700, squeeze: 0.9 })
  text('NET 600 ml / 340 g', bx + 130, 1617, 30, { weight: 700, squeeze: 0.9 })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.anisotropy = 16
  return tex
}

// ---------------------------------------------------------------- assembly

export function create() {
  const group = new THREE.Group()
  group.name = 'gas-canister'

  const peelWall = orangePeel()
  peelWall.repeat.set(7, 6)
  const peelDome = orangePeel()
  peelDome.repeat.set(7, 1.5)
  const paint = (extra) =>
    new THREE.MeshPhysicalMaterial({
      metalness: 0.15,
      roughness: 0.5,
      clearcoat: 0.45,
      clearcoatRoughness: 0.38,
      normalScale: new THREE.Vector2(0.22, 0.22),
      clearcoatNormalScale: new THREE.Vector2(0.3, 0.3),
      ...extra,
    })
  const tinplate = new THREE.MeshPhysicalMaterial({ color: 0xa9adb0, metalness: 1, roughness: 0.46 })

  // Printed body wall.
  const wall = part(
    lathe([[R, WALL_Y0], [R, WALL_Y1]]),
    paint({ map: labelTexture(), normalMap: peelWall, clearcoatNormalMap: peelWall }),
    'wall',
  )
  group.add(wall)

  // Bottom: concave end with the rolled double seam.
  group.add(
    part(
      lathe([
        [0, 7],
        [18, 6, 1],
        [27, 3.2, 1],
        [30.5, 0.8, 1],
        [31.6, 0],
        [32.8, 0],
        [33.7, 0.9, 1],
        [33.95, 2.2, 1],
        [33.6, 3.6, 1],
        [R, WALL_Y0],
      ]),
      tinplate,
      'bottom',
    ),
  )

  // Top seam and the domed shoulder, painted the label's green.
  const dome = [
    [R, WALL_Y1],
    [33.6, 186.8, 1],
    [33.95, 188.2, 1],
    [33.7, 189.6, 1],
    [32.6, 190.4],
    [31.5, 190.6],
  ]
  for (let i = 1; i <= 12; i++) {
    const t = (i / 12) * (Math.PI / 2)
    dome.push([13.2 + 18.3 * Math.cos(t), 190.6 + 15.4 * Math.sin(t), i < 12 ? 1 : 0])
  }
  group.add(part(lathe(dome), paint({ color: 0x23873a, normalMap: peelDome, clearcoatNormalMap: peelDome }), 'shoulder'))

  // Crimped valve cup.
  group.add(
    part(
      lathe([
        [13.2, 206],
        [13.2, 207.2],
        [14.0, 207.6, 1],
        [14.35, 208.6, 1],
        [14.0, 209.6, 1],
        [13.0, 210],
        [11.6, 210],
        [11.0, 209.4],
        [10.6, 206.6],
        [10.1, 206],
        [5.6, 206],
        [5.1, 206.5],
        [4.7, 209.4],
        [4.2, 210],
        [0, 210],
      ]),
      tinplate,
      'valveCup',
    ),
  )

  // Long charging nozzle.
  const nozzle = part(
    lathe(
      [
        [3.3, 209.5],
        [3.3, 212.4],
        [2.8, 213],
        [2.35, 215],
        [2.35, 231.6],
        [1.95, 232.4],
        [1.1, 232.4],
        [1.1, 228],
        [0, 228],
      ],
      28,
    ),
    new THREE.MeshPhysicalMaterial({ color: 0xc9ccd0, metalness: 1, roughness: 0.45 }),
    'nozzle',
  )
  group.add(nozzle)

  // Protective cap: smoked clear plastic that snaps over the valve cup.
  const capGeo = lathe(
    [
      [16.7, 203.6],
      [16.7, 206],
      [16.2, 207],
      [15.3, 236.4, 1],
      [14.5, 238.8, 1],
      [12.4, 240, 1],
      [0, 240],
    ],
    48,
  )
  const cap = clearShell(capGeo, {
    name: 'cap',
    tint: tintMaterial({ tint: [0.5, 0.56, 0.5], density: 1, edge: 2.4 }),
    gloss: glossMaterial({ haze: 0x0a0c0a, roughness: 0.22, specular: 0.7, clearcoat: 0.2, cap: 0.22 }),
  })
  group.add(cap)

  return group
}
