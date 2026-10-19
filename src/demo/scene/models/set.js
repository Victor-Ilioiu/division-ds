// The composed backdrop: hex wall + floor + stage, lit like the reference frame.
//
// Set space: the floor is y = 0, the wall's face stands at z = WALL_Z (negative) facing +Z,
// the stage sits at STAGE, right of centre. The camera in `viewer` is on +Z looking at -Z.

import * as THREE from 'three'
import { create as createWall } from './hexwall.js'
import { create as createPlatform } from './platform.js'
import { createFloor } from './_set-floor.js'

const WALL_Z = -1.5
const STAGE = [0.64, 0, 0.05]

/**
 * @param {object} [options]
 * @param {number} [options.seed=7]            wall layout and flicker seed
 * @param {number} [options.wallWidth=9]
 * @param {number} [options.wallHeight=3.2]
 * @param {number} [options.cell=0.26]
 * @param {number} [options.reflection=0.5]    mirror target size relative to the drawing buffer
 */
export function create(options = {}) {
  const { seed = 7, wallWidth = 9, wallHeight = 3.2, cell = 0.26, reflection = 0.5, wallBrightness = 1, wallVariation = 1, stageIntensity = 1, stageLights = true, wallMute = [] } = options
  const group = new THREE.Group()
  group.name = 'set'

  const wall = createWall({ width: wallWidth, height: wallHeight, cell, seed, keyLight: false, brightness: wallBrightness, variation: wallVariation, mute: wallMute })
  wall.position.set(0, 0, WALL_Z - 0.03) // the tile faces sit about 30 mm proud of the wall plane
  group.add(wall)

  const stage = createPlatform({ intensity: stageIntensity, lights: stageLights })
  stage.position.set(STAGE[0], STAGE[1], STAGE[2])
  group.add(stage)

  const floor = createFloor({
    width: 30,
    depth: 16,
    centerZ: WALL_Z + 8 - 0.05,
    wallZ: WALL_Z,
    stage: [STAGE[0], STAGE[2], stage.userData.radius],
    resolution: reflection,
  })
  group.add(floor)

  // Cool key from the upper left, in front of the wall. It is the only shadow caster.
  const key = new THREE.DirectionalLight(0xc6d6f5, 2.7)
  key.name = 'key'
  const keyDir = new THREE.Vector3(-0.52, 0.56, 0.64).normalize()
  key.target.position.set(STAGE[0], 0.2, STAGE[2])
  key.position.copy(key.target.position).addScaledVector(keyDir, 7)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  const sc = key.shadow.camera
  sc.left = sc.bottom = -1.7
  sc.right = sc.top = 1.7
  sc.near = 2
  sc.far = 12
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.004
  group.add(key, key.target)
  wall.userData.setKeyDirection(keyDir)

  // A whisper of cool fill from the right so the stage's shadow side is not pure black.
  const fill = new THREE.DirectionalLight(0x8fa8d8, 0.25)
  fill.name = 'fill'
  fill.position.set(4, 2.2, 3.5)
  fill.target.position.set(STAGE[0], 0.1, STAGE[2])
  group.add(fill, fill.target)

  const stageTop = new THREE.Vector3(STAGE[0], stage.userData.height, STAGE[2])
  const fu = floor.userData.uniforms
  const POOL = 1.25
  function update(t, dt) {
    wall.userData.update(t, dt)
    stage.userData.update(t, dt)
    fu.uPool.value = POOL * stage.userData.glow
  }
  update(0, 0)

  group.userData.update = update
  group.userData.stageTop = stageTop
  group.userData.wall = wall
  group.userData.stage = stage
  group.userData.floor = floor
  group.userData.key = key
  /** Pass-through to the stage: brighten the underglow (and the floor pool with it). */
  group.userData.setBoost = (k) => stage.userData.setBoost(k)
  /** Master dimmer for the wall's LEDs. */
  group.userData.setWallIntensity = (k) => wall.userData.setIntensity(k)
  group.userData.dispose = () => floor.userData.dispose()
  return group
}

export const viewer = {
  bloom: true,
  bloomParams: { strength: 0.23, radius: 0.2, threshold: 0.6 },
  background: 0x020203,
  studioLights: false,
  envIntensity: 0.08,
  ground: false,
  exposure: 1,
  camera: { position: [0, 0.5, 3.15], target: [0, 0.4, WALL_Z], fov: 31 },
}
