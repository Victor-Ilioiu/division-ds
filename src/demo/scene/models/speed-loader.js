// Speed loader, 150 BBs: the magazine-shaped BB loader with a thumb plunger.
//
// Origin: centre of the body's footprint, lying on its broad face on y = 0 (it has a nozzle
// at one end and a plunger at the other, so lying down is how it rests). The feed nozzle
// points +X, the spring-loaded plunger sticks out toward -X, the fill door is on top.
// `fillDoor` is a group pivoted on its hinge: rotate it about Z to open the door.
// Authored in millimetres, scaled to metres when each geometry is created.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { polymer } from '../lib/materials.js'
import { clearShell, glossMaterial, tintMaterial, roundedRing, loft, rng } from './_magazine-clear.js'

const MM = 0.001
const HX = 75 // half length of the body
const HY = 11 // half height (lying)
const HZ = 15 // half width
const CAP = 19 // length of each opaque end cap
const WALL = 1.6
const BB_R = 3
const CH_Z = -9.5 // centreline of the feed channel
const DIV_Z = -4.6 // divider between channel and reservoir

const metres = (g) => g.scale(MM, MM, MM)
function part(geo, material, name) {
  const m = new THREE.Mesh(metres(geo), material)
  if (name) m.name = name
  return m
}
const rbox = (sx, sy, sz, r, x, y, z, seg = 2) => new RoundedBoxGeometry(sx, sy, sz, seg, r).translate(x, y, z)

/** Tube along +X from x0 to x1 with a bore, built on the lathe. */
function tubeX(profile, segments, x, y, z) {
  const g = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), segments)
  g.rotateZ(-Math.PI / 2) // +Y becomes +X
  g.translate(x, y, z)
  return g
}

/**
 * BBs poured into the reservoir and left where they came to rest: each one is dropped at
 * several random spots and kept at the lowest, so the heap is dense but never a lattice.
 */
function settle(count, rand) {
  const x0 = -HX + CAP + BB_R + 0.4
  const x1 = HX - CAP - BB_R - 0.4
  const z0 = DIV_Z + 0.7 + BB_R
  const z1 = HZ - WALL - BB_R
  const floor = WALL + BB_R
  const ceil = 2 * HY - WALL - BB_R
  const placed = []
  const restAt = (x, z) => {
    let y = floor
    for (const p of placed) {
      const d2 = (p[0] - x) ** 2 + (p[2] - z) ** 2
      if (d2 < 4 * BB_R * BB_R) y = Math.max(y, p[1] + Math.sqrt(4 * BB_R * BB_R - d2))
    }
    return y
  }
  let misses = 0
  while (placed.length < count && misses < 400) {
    let best = null
    for (let k = 0; k < 7; k++) {
      // Lean the heap toward the nozzle end, the way it sits after the loader was last tipped.
      const x = x0 + (x1 - x0) * Math.pow(rand(), 0.8)
      const z = z0 + (z1 - z0) * rand()
      const y = restAt(x, z)
      if (!best || y < best[1]) best = [x, y, z]
    }
    if (best[1] > ceil) misses++
    else placed.push(best)
  }
  return placed
}

function helix(x0, x1, radius, turns, y, z) {
  return new (class extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const a = t * turns * Math.PI * 2
      return target.set(x0 + (x1 - x0) * t, y + Math.cos(a) * radius, z + Math.sin(a) * radius)
    }
  })()
}

function sideMark() {
  const w = 1024
  const h = 192
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#eceae4'
  ctx.strokeStyle = '#eceae4'
  ctx.lineWidth = 8
  ctx.beginPath()
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6
    ctx[k ? 'lineTo' : 'moveTo'](70 + Math.cos(a) * 38, 96 + Math.sin(a) * 38)
  }
  ctx.closePath()
  ctx.stroke()
  ctx.fillRect(65, 76, 10, 40)
  ctx.font = '700 84px Arial, Helvetica, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('HEXLINE', 136, 100)
  ctx.font = '400 50px Arial, Helvetica, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('150 × 6 mm BB', w - 20, 102)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  return tex
}

export function create() {
  const group = new THREE.Group()
  group.name = 'speed-loader'
  const rand = rng(150)

  const body = polymer({ color: 0x1b1c1f, roughness: 0.62, repeat: 5 })
  const inner = polymer({ color: 0x26272b, roughness: 0.66, repeat: 5 })
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x9da1a6, metalness: 1, roughness: 0.45 })

  // ---- opaque contents first: they are what the smoked shell is there to show.
  const divider = part(rbox(2 * (HX - CAP) + 4, 2 * HY - 2 * WALL, 1.3, 0.4, 0, HY, DIV_Z), inner, 'divider')
  group.add(divider)

  // Reservoir BBs plus the single file waiting in the feed channel.
  const heap = settle(128, rand)
  const file = []
  for (let x = HX - CAP + 1; x > -10; x -= 2 * BB_R + 0.04) file.push([x, HY + (rand() - 0.5) * 0.5, CH_Z + (rand() - 0.5) * 0.5])
  const all = [...heap, ...file]
  const bbs = new THREE.InstancedMesh(
    metres(new THREE.SphereGeometry(BB_R, 11, 6)),
    new THREE.MeshPhysicalMaterial({ color: 0xe8e7e1, roughness: 0.34, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    all.length,
  )
  bbs.name = 'bbs'
  const d = new THREE.Object3D()
  all.forEach(([x, y, z], i) => {
    d.position.set(x * MM, y * MM, z * MM)
    d.rotation.set(rand() * 6.28, rand() * 6.28, 0)
    d.updateMatrix()
    bbs.setMatrixAt(i, d.matrix)
  })
  group.add(bbs)
  group.userData.bbCount = all.length

  // Plunger: thumb pad, rod, return spring, and the pusher behind the file of BBs.
  const plunger = new THREE.Group()
  plunger.name = 'plunger'
  const fileEnd = file[file.length - 1][0] - BB_R
  const padX = -HX - 37
  const rod = new THREE.CylinderGeometry(2.4, 2.4, fileEnd - padX, 16).rotateZ(Math.PI / 2).translate((fileEnd + padX) / 2, HY, CH_Z)
  plunger.add(part(rod, steel, 'plungerRod'))
  plunger.add(part(new THREE.CylinderGeometry(3.1, 3.1, 5, 16).rotateZ(Math.PI / 2).translate(fileEnd - 2.5, HY, CH_Z), inner, 'pusher'))
  plunger.add(part(rbox(7, 17, 17, 2.4, padX, HY, CH_Z + 1.5), body, 'thumbPad'))
  for (let i = -2; i <= 2; i++) plunger.add(part(rbox(1.6, 1.4, 14, 0.5, padX - 3.6, HY + i * 3, CH_Z + 1.5), body, 'thumbRib'))
  plunger.add(part(new THREE.CylinderGeometry(5.2, 5.2, 2, 20).rotateZ(Math.PI / 2).translate(padX + 4.2, HY, CH_Z), body, 'plungerCollar'))
  group.add(plunger)

  const spring = part(
    new THREE.TubeGeometry(helix(-HX + 2, fileEnd - 6, 3.7, 15, HY, CH_Z), 210, 0.42, 4, false),
    new THREE.MeshPhysicalMaterial({ color: 0xb4b8bd, metalness: 1, roughness: 0.4 }),
    'spring',
  )
  group.add(spring)
  // The exposed part of the spring, between the body and the thumb pad.
  group.add(
    part(
      new THREE.TubeGeometry(helix(padX + 5, -HX + 2, 3.7, 7, HY, CH_Z), 100, 0.42, 4, false),
      spring.material,
      'springOuter',
    ),
  )

  // ---- end caps
  const capGeo = (x) => rbox(CAP, 2 * HY + 0.9, 2 * HZ + 0.9, 3.4, x, HY, 0, 4)
  const topCap = part(capGeo(-HX + CAP / 2), body, 'capPlunger')
  topCap.geometry.translate(0, 0, 0)
  const bottomCap = part(capGeo(HX - CAP / 2), body, 'capNozzle')
  group.add(topCap, bottomCap)
  // Grip ribs across both caps.
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = sx * (HX - 4.5 - i * 3.4)
      group.add(part(rbox(1.5, 2 * HY + 1.9, 2 * HZ - 7, 0.5, x, HY, 0), body, 'capRib'))
    }
  }
  // Guide bush where the plunger enters.
  group.add(part(tubeX([[2.7, 0], [5.6, 0], [5.6, 3.4], [4.6, 4.4], [2.7, 4.4]], 20, -HX - 4.2, HY, CH_Z), body, 'plungerBush'))

  // Feed nozzle: a stepped tube with a real bore, sized for 6 mm BBs.
  const nozzle = part(
    tubeX(
      [
        [3.2, 0],
        [7.2, 0],
        [7.2, 2.2],
        [6.2, 3.4],
        [5.4, 3.4],
        [5.4, 5.2],
        [4.7, 5.6],
        [4.5, 15.4],
        [4.1, 16],
        [3.2, 16],
        [3.2, 0],
      ],
      24,
      HX - 0.3,
      HY,
      CH_Z,
    ),
    body,
    'nozzle',
  )
  nozzle.material = body.clone()
  nozzle.material.side = THREE.DoubleSide
  group.add(nozzle)

  // ---- fill door on the top face, hinged at its plunger-side edge.
  const door = new THREE.Group()
  door.name = 'fillDoor'
  const doorX0 = -HX + CAP + 4
  const doorLen = 30
  const doorZ = 5
  door.position.set(doorX0 * MM, (2 * HY + 0.9) * MM, doorZ * MM)
  door.add(part(rbox(doorLen, 1.7, 16.5, 0.6, doorLen / 2 + 1, 0.2, 0), body, 'doorPanel'))
  door.add(part(new THREE.CylinderGeometry(1.5, 1.5, 17.5, 12).rotateX(Math.PI / 2).translate(0, 0.2, 0), body, 'doorHinge'))
  door.add(part(rbox(3.2, 2.6, 9, 0.8, doorLen + 0.6, 0.9, 0), body, 'doorTab'))
  group.add(door)
  for (const z of [-9.6, 9.6]) group.add(part(rbox(4, 2.2, 2.2, 0.6, doorX0, 2 * HY + 0.7, doorZ + z), body, 'hingeLug'))

  // ---- smoked clear shell between the caps
  const ring = roundedRing(HZ, HY, 4, 6, 8, 6)
  const stations = [-HX + CAP - 3, -HX + CAP + 6, 0, HX - CAP - 6, HX - CAP + 3]
  const rings = stations.map((x) => ring.map(([a, b]) => [x * MM, (HY + b) * MM, a * MM]))
  const shell = clearShell(loft(rings), {
    name: 'shell',
    tint: tintMaterial({ tint: [0.42, 0.42, 0.45], density: 1, edge: 2.3 }),
    gloss: glossMaterial({ haze: 0x030304, roughness: 0.2, specular: 0.6, clearcoat: 0.15, cap: 0.15 }),
  })
  group.add(shell)

  // Printed mark on the camera-side wall.
  const markGeo = new THREE.PlaneGeometry(64, 12).translate(4, HY, HZ + 0.06)
  const mark = part(
    markGeo,
    new THREE.MeshStandardMaterial({ map: sideMark(), transparent: true, opacity: 0.92, roughness: 0.5, depthWrite: false }),
    'sideMark',
  )
  mark.renderOrder = 4
  mark.userData.shadow = false
  group.add(mark)

  // The caps and their grip ribs stand a little proud of the shell: rest on those.
  const LIFT = 0.95 * MM
  for (const child of group.children) child.position.y += LIFT

  return group
}
