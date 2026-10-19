// The homepage hero scene: the set, the Kestrel C floating over the stage, the kit on the floor,
// and the Assemble / Disassemble sequence. Everything it shows is built by the modules in
// ./models. The interface (copy, buttons, preloader, the still fallback) is
// ../pages/HomeHero.tsx, which reaches this file only through a dynamic import(), so three.js and
// every model stay out of the main chunk, and drives it through `startScene`.
//
// Plain JavaScript on purpose, like the models: hero.d.ts beside this file is the typed surface
// the React side imports.
//
// `options` are the screenshot switches HomeHero reads off the URL (see hero.d.ts): start
// assembled, freeze the clock, pin the assemble progress, turn the rifle.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { createLoop } from '../../fx/core/loop'
import * as Backdrop from './models/set.js'
import * as Rifle from './models/rifle.js'
import * as Magazine from './models/magazine.js'
import * as TubeSight from './models/red-dot.js'
import * as HoloSight from './models/holo-sight.js'
import * as Suppressor from './models/suppressor.js'
import * as Foregrip from './models/foregrip.js'
import * as TacLight from './models/tac-light.js'
import * as Battery from './models/battery.js'
import * as BbBottle from './models/bb-bottle.js'

// The kit is shown larger than life so it holds the frame against a 1.25 m stage.
const KIT_SCALE = 1.5
const FLOAT_HEIGHT = 0.46
const DURATION = 1.5 // seconds each part takes to travel
const deg = THREE.MathUtils.degToRad
const ORANGE = new THREE.Color(1.0, 0.36, 0.08)
const FLOOR_GREY = 0x2b2f35
// The stage band's resting level, and how the light changes while the kit is assembled: the band
// and its floor pool step up, the key from above gets stronger, and the deck carries a steady
// glow spreading from its centre. All of it eases in with `glow` and back out on Disassemble.
const STAGE_LEVEL = 0.62
const STAGE_BOOST_ASSEMBLED = 0.75 // band and floor pool are (1 + this) times brighter
const KEY_INTENSITY = 200
const KEY_BOOST_ASSEMBLED = 0.4 // key light is (1 + this) times brighter
// Wall-space position of the amber tile that sat right above the stage, behind the rifle. It
// pulled the eye off the product, so the wall is told to switch it off and paint it dark.
const AMBER_TILE_BEHIND_STAGE = [0.44, 0.2]

const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const easeOut = (x) => 1 - Math.pow(1 - x, 3)
const clamp01 = (x) => Math.min(1, Math.max(0, x))

/** Resolves on the next animation frame, so the page can paint (and the preloader can turn)
 *  between two heavy, synchronous geometry builds. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))

class Cancelled extends Error {}

export async function startScene(mount, onChange, signal, options = {}) {
  // Cancelled before it began (React Strict Mode mounts twice in dev, and the first mount is
  // already gone by the time this module has loaded): take no context and touch no global.
  if (signal?.aborted) return { toggle() {}, dispose() {} }
  const state = { ready: false, progress: 0, phase: 'Building geometry', assembled: false, busy: false, error: null }
  const emit = () => onChange({ ...state })
  // One step per module built, plus one for compiling shaders. Checked between steps so a
  // cancelled start (React Strict Mode mounts twice in dev) stops building straight away.
  let stepsDone = 0
  let stepsTotal = 14 // the rifle plus the kit; set exactly once the kit is declared
  // Per-step build times, for spike/tools/loader-shot.mjs: [label, milliseconds].
  const timings = (window.__heroTimings = [])
  let mark = performance.now()
  const step = async (label) => {
    timings.push([label, Math.round(performance.now() - mark)])
    state.progress = Math.min(1, ++stepsDone / stepsTotal)
    emit()
    await nextFrame()
    mark = performance.now()
    if (signal?.aborted) throw new Cancelled()
  }
  const listeners = []
  const listen = (target, type, fn) => {
    target.addEventListener(type, fn)
    listeners.push(() => target.removeEventListener(type, fn))
  }

  let renderer
  let loop
  try {
    RectAreaLightUniformsLib.init()

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    // With error checking on, three asks the driver for each program's link status the moment it is
    // created, which forces every shader to finish compiling on the main thread: measured at 13 s
    // of frozen page here. Off, compileAsync can poll the parallel-compile extension instead and
    // the preloader keeps turning.
    renderer.debug.checkShaderErrors = false
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.shadowMap.enabled = true
    // PCFShadowMap, stated outright. three 0.186 quietly replaces the deprecated PCFSoftShadowMap
    // with it on the first rendered frame, which changes every lit material's program key: shaders
    // compiled ahead of that frame were all for the wrong key and were compiled again.
    renderer.shadowMap.type = THREE.PCFShadowMap
    mount.appendChild(renderer.domElement)
    // A lost context (a driver reset, the browser reclaiming one of its sixteen) leaves a blank
    // canvas that never recovers on its own. Reported as an error, so the hero swaps to its still.
    listen(renderer.domElement, 'webglcontextlost', () => {
      state.error = 'The WebGL context was lost'
      emit()
    })

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(Backdrop.viewer.background)
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = Backdrop.viewer.envIntensity

    // The camera is fixed: the set is a backdrop, only the rifle moves.
    const view = Backdrop.viewer.camera
    const camera = new THREE.PerspectiveCamera(view.fov, 16 / 9, 0.05, 80)
    camera.position.fromArray(view.position)
    camera.lookAt(new THREE.Vector3().fromArray(view.target))

    // ---- the set: a darker, flatter wall than the reference so the black rifle separates from
    // it, and a dimmer stage so the underglow does not flood the floor -------------------------
    await nextFrame()
    const set = await Backdrop.create({ wallBrightness: 0.34, wallVariation: 0.3, stageIntensity: STAGE_LEVEL, stageLights: false, wallMute: [AMBER_TILE_BEHIND_STAGE] })
    timings.push(['set', Math.round(performance.now() - mark)])
    mark = performance.now()
    scene.add(set)
    // A grey floor in the shade of the stage's own deck, so the floor line against the near-black
    // wall is unmistakable.
    set.userData.floor.material.color.set(FLOOR_GREY)
    set.traverse((o) => {
      if (o.isMesh && o.userData.shadow !== false) o.receiveShadow = true
    })
    const stageTop = set.userData.stageTop.clone()

    // ---- the rifle rig: rig (position, scale) > spin (user + idle rotation) > rifle ---------
    const rig = new THREE.Group()
    rig.position.copy(stageTop).add(new THREE.Vector3(0, FLOAT_HEIGHT, 0))
    rig.scale.setScalar(KIT_SCALE)
    const spin = new THREE.Group()
    rig.add(spin)
    scene.add(rig)

    const rifle = await Rifle.create({ variant: 'c' })
    await step('rifle')
    // Muzzle to screen-left with the marked side toward the camera, and
    // pivoting about the middle of the replica rather than the magazine well.
    const holder = new THREE.Group()
    holder.rotation.y = Math.PI
    holder.add(rifle)
    rifle.position.sub(new THREE.Box3().setFromObject(rifle).getCenter(new THREE.Vector3()))
    spin.add(holder)
    const rifleMaterials = new Set()
    rifle.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = true
      for (const m of [].concat(o.material)) if (m.emissive) rifleMaterials.add(m)
    })
    const anchor = (name) => {
      const found = rifle.getObjectByName(`anchor:${name}`)
      if (!found) throw new Error(`rifle has no anchor:${name}`)
      return found
    }

    // ---- the kit ---------------------------------------------------------------------------
    // `floor` is where the part rests: [x, z] on the floor, a yaw, and an optional tilt that lays
    // it on its side. `to` names the rifle anchor it mounts on; `approach` is the direction, in
    // the anchor's own space, it slides in from. `stock: true` marks the part the rifle ships
    // with: it starts mounted and Assemble takes it off, the opposite of everything else.
    const kit = [
      // What the rifle ships with: mounted at rest, taken off by Assemble.
      { name: 'tube-sight', mod: TubeSight, floor: { at: [0.62, 1.04], yaw: 205 }, to: 'optic', approach: [0, 1, 0], delay: 0.0, stock: true },
      { name: 'magazine-smoke', mod: Magazine, options: { variant: 'smoke' }, floor: { at: [0.22, 1.08], yaw: 80, tilt: [90, 0, 0] }, to: 'mag', approach: [0, -1, 0], standoff: 0.07, delay: 0.15, stock: true },
      // What Assemble puts on.
      { name: 'suppressor', mod: Suppressor, floor: { at: [0.68, 1.26], yaw: 172 }, to: 'muzzle', approach: [1, 0, 0], delay: 0.3 },
      { name: 'foregrip', mod: Foregrip, floor: { at: [0.94, 1.02], yaw: 25, tilt: [90, 0, 0] }, to: 'railBottom', approach: [0, 1, 0], delay: 0.45 },
      { name: 'holo-sight', mod: HoloSight, floor: { at: [0.98, 0.74], yaw: 150 }, to: 'optic', approach: [0, 1, 0], delay: 0.6 },
      { name: 'magazine-accent', mod: Magazine, options: { variant: 'accent' }, floor: { at: [0.44, 0.9], yaw: 60, tilt: [90, 0, 0] }, to: 'mag', approach: [0, -1, 0], standoff: 0.07, delay: 0.75 },
      { name: 'tac-light', mod: TacLight, floor: { at: [0.74, 0.86], asMounted: true }, to: 'railSide', approach: [0, 1, 0], delay: 0.9 },
      // The rest of the kit stays on the floor.
      { name: 'magazine-accent-2', mod: Magazine, options: { variant: 'accent' }, floor: { at: [0.2, 0.68], yaw: 20 } },
      { name: 'bottle-1', mod: BbBottle, floor: { at: [-0.08, 0.5], yaw: 12 } },
      { name: 'bottle-2', mod: BbBottle, floor: { at: [0.05, 0.62], yaw: -18 } },
      { name: 'bottle-3', mod: BbBottle, floor: { at: [-0.05, 0.84], yaw: 100 }, options: { lying: true } },
      { name: 'battery', mod: Battery, floor: { at: [0.24, 1.3], yaw: 18 } },
    ]
    stepsTotal = kit.length + 1 // + the rifle

    const box = new THREE.Box3()
    for (const item of kit) {
      const part = await item.mod.create(item.options ?? {})
      part.traverse((o) => {
        if (o.isMesh && o.userData.shadow !== false) {
          o.castShadow = true
          o.receiveShadow = true
        }
      })
      part.scale.setScalar(KIT_SCALE)
      const tilt = item.floor.tilt ?? [0, 0, 0]
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, deg(item.floor.yaw ?? 0), 0))
      q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(deg(tilt[0]), deg(tilt[1]), deg(tilt[2]))))
      // `asMounted`: rest on the floor in exactly the orientation the part has on the rifle. The
      // trip to its rail is then a plain lift and slide with no turn in it. The light used to rest
      // upright on its clamp, a quarter-roll and a part-turn away from its side-rail pose, and
      // blending between the two read as a flip in mid-air.
      if (item.floor.asMounted) {
        rig.updateMatrixWorld(true)
        anchor(item.to).getWorldQuaternion(q)
      }
      part.quaternion.copy(q)
      part.position.set(0, 0, 0)
      scene.add(part)
      part.updateMatrixWorld(true)
      // Rest it on the floor wherever its own origin happens to be.
      box.setFromObject(part)
      const c = box.getCenter(new THREE.Vector3())
      part.position.set(item.floor.at[0] - c.x, -box.min.y + 0.0005, item.floor.at[1] - c.z)
      item.part = part
      item.floorPos = part.position.clone()
      item.floorQuat = part.quaternion.clone()
      // The part's longest dimension: how far it could reach below its own origin in any pose.
      item.reach = Math.max(...box.getSize(new THREE.Vector3()).toArray())
      await step(item.name)
      if (item.to) {
        item.anchor = anchor(item.to)
        item.approachDir = new THREE.Vector3().fromArray(item.approach)
      }
    }
    // Soften the highlights. A glint narrower than a pixel cannot be anti-aliased: it lands on a
    // pixel or misses it, so it twinkles as the part moves. Widening the specular lobe (a floor
    // under roughness, a duller clearcoat) spreads each glint over several pixels, which is what
    // lets multisampling average it. Done here, not in the model modules, so the workbench viewer
    // (spike/) and the product photos still show each part with its own finish.
    const soften = (root) =>
      root.traverse((o) => {
        if (!o.isMesh) return
        for (const m of [].concat(o.material)) {
          // Not glass and not anything that emits. A lens is a transmission material: raising its
          // roughness frosts it, which is what turned both sights opaque.
          const glows = m.emissive && m.emissiveIntensity > 0 && m.emissive.getHex() !== 0
          if (!m.isMeshStandardMaterial || m.transparent || m.opacity < 1 || m.transmission > 0 || glows) continue
          m.roughness = Math.max(m.roughness, 0.5)
          if (m.clearcoat > 0) {
            m.clearcoat = Math.min(m.clearcoat, 0.12)
            m.clearcoatRoughness = Math.max(m.clearcoatRoughness, 0.65)
          }
          if (m.normalScale) m.normalScale.multiplyScalar(0.6)
        }
      })
    // Clear glass. A lens that transmits 85% still shades the other 15% as a matt surface in its
    // own pale colour, and under the hero's strong key light that 15% washed the whole lens out
    // to an opaque grey disc. Fully transmissive, only the glass's reflections and tint remain,
    // so you see through it again.
    const clearGlass = (root) =>
      root.traverse((o) => {
        if (!o.isMesh) return
        for (const m of [].concat(o.material)) if (m.transmission > 0.5) m.transmission = 1
      })
    for (const item of kit) clearGlass(item.part)
    soften(rifle)
    for (const item of kit) if (item.to) soften(item.part)

    const movers = kit.filter((i) => i.to)
    const added = movers.filter((m) => !m.stock)
    const light = kit.find((i) => i.name === 'tac-light').part
    const total = DURATION + Math.max(...movers.map((m) => m.delay))
    // `seq` is each part's place in the sequence, 0 = the idle pose, 1 = the assembled pose.
    // A stock part is mounted at 0 and on the floor at 1.
    movers.forEach((m) => (m.seq = 0))
    const mounted = (m) => (m.stock ? 1 - m.seq : m.seq)

    // ---- lighting for the hero object ---------------------------------------------------------
    // The set lights itself. These only shape the rifle: a cool key from the upper left, a cool
    // edge from behind, and a touch of the stage's orange from below.
    const key = new THREE.SpotLight(0xdfe9ff, KEY_INTENSITY, 0, deg(11), 0.9, 2)
    key.position.set(-0.6, 3.1, 2.6)
    key.target = rig
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.bias = -0.0003
    key.shadow.normalBias = 0.01
    key.shadow.camera.near = 1
    key.shadow.camera.far = 8
    scene.add(key)

    const edge = new THREE.SpotLight(0x9fc0ff, 140, 0, deg(16), 0.9, 2)
    edge.position.set(2.4, 2.2, -0.9)
    edge.target = rig
    scene.add(edge)

    const under = new THREE.PointLight(ORANGE, 0.22, 2.2, 2)
    under.position.copy(stageTop).add(new THREE.Vector3(0, 0.12, 0.25))
    scene.add(under)

    // The stage band's light on the floor and on the kit lying around it. The stage module can do
    // this with six RectAreaLights, which look a little better and cost about nine seconds of
    // shader compilation across the scene's materials (measured: 12.2 s with them, 3.5 s without),
    // so the hero turns those off and uses three point lights at band height instead.
    const bandLights = [-1, 0, 1].map((k) => {
      // Kept well clear of the stage: a point light close to a surface burns a hotspot into it.
      const l = new THREE.PointLight(ORANGE, 0, 2.6, 2)
      l.position.set(stageTop.x + k * 0.75, 0.32, stageTop.z + 1.05 - Math.abs(k) * 0.25)
      scene.add(l)
      return l
    })

    // The deck glow: a soft orange light on the stage's top, strongest at the centre and fading
    // to nothing before the rim. Off at rest; the assembled state's steady signature. A flat
    // additive disc just above the deck, so it costs one draw call and no light.
    const deckGlowCanvas = document.createElement('canvas')
    deckGlowCanvas.width = deckGlowCanvas.height = 256
    const dg = deckGlowCanvas.getContext('2d')
    const gradient = dg.createRadialGradient(128, 128, 0, 128, 128, 128)
    gradient.addColorStop(0, 'rgba(255, 196, 150, 1)')
    gradient.addColorStop(0.18, 'rgba(255, 128, 48, 0.8)')
    gradient.addColorStop(0.55, 'rgba(255, 92, 20, 0.28)')
    gradient.addColorStop(1, 'rgba(255, 92, 20, 0)')
    dg.fillStyle = gradient
    dg.fillRect(0, 0, 256, 256)
    const deckGlowTexture = new THREE.CanvasTexture(deckGlowCanvas)
    deckGlowTexture.colorSpace = THREE.SRGBColorSpace
    const deckGlow = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 48),
      new THREE.MeshBasicMaterial({ map: deckGlowTexture, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    deckGlow.rotation.x = -Math.PI / 2
    deckGlow.position.copy(stageTop).add(new THREE.Vector3(0, 0.003, 0))
    deckGlow.userData.shadow = false
    deckGlow.visible = false
    scene.add(deckGlow)

    // The "rifle emits an orange glow" light, off until the kit is assembled.
    const aura = new THREE.PointLight(ORANGE, 0, 3, 2)
    aura.position.copy(rig.position).add(new THREE.Vector3(0, -0.05, 0.55))
    scene.add(aura)

    // ---- post ----------------------------------------------------------------------------------
    // `antialias: true` only smooths the canvas itself. The composer draws the scene into its own
    // off-screen target first, which has no multisampling unless asked for, so every edge came out
    // stair-stepped and crawled as the rifle bobbed. A multisampled HDR target fixes that at source.
    const samples = Math.min(8, renderer.capabilities.maxSamples)
    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples }))
    composer.setPixelRatio(renderer.getPixelRatio())
    composer.addPass(new RenderPass(scene, camera))
    const bp = Backdrop.viewer.bloomParams
    const bloom = new UnrealBloomPass(new THREE.Vector2(mount.clientWidth, mount.clientHeight), bp.strength, bp.radius, bp.threshold)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    // Three framings, chosen from the box the scene is given, not from a device list:
    //  - side by side, 16:9 or wider: hold the vertical field of view. Extra width only shows
    //    more wall, so the floor and the kit on it are never cropped off the bottom.
    //  - side by side, narrower than 16:9: hold the horizontal field of view instead, so the
    //    stage stays in frame and the extra height goes to wall and floor.
    //  - stacked (the copy sits below the scene, under the lg breakpoint): centre the camera on
    //    the stage and back away until the assembled rifle fits the width.
    const stacked = window.matchMedia('(max-width: 1023.98px)')
    const baseDistance = view.position[2] - stageTop.z
    const camTarget = new THREE.Vector3()
    function resize() {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h)
      composer.setSize(w, h)
      camera.aspect = w / h
      const tanV = Math.tan(deg(view.fov) / 2)
      if (stacked.matches) {
        camera.fov = view.fov
        const halfWidth = 1.0 // metres either side of the stage centre that must stay in frame
        const distance = Math.max(baseDistance, halfWidth / (tanV * camera.aspect))
        camera.position.set(stageTop.x, view.position[1] + (distance - baseDistance) * 0.06, stageTop.z + distance)
        camTarget.set(stageTop.x, view.target[1], view.target[2])
      } else {
        const hfov = 2 * Math.atan(tanV * (16 / 9))
        camera.fov = camera.aspect >= 16 / 9 ? view.fov : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / camera.aspect))
        camera.position.fromArray(view.position)
        camTarget.fromArray(view.target)
      }
      camera.lookAt(camTarget)
      camera.updateProjectionMatrix()
    }
    listen(window, 'resize', resize)
    listen(stacked, 'change', resize)
    resize()

    // ---- drag to rotate the rifle ----------------------------------------------------------------
    let yaw = deg(options.yaw ?? 0)
    let pitch = 0
    let yawVel = 0
    let dragging = false
    let lastX = 0
    let lastY = 0
    listen(mount, 'pointerdown', (e) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      mount.classList.add('dragging')
      mount.setPointerCapture(e.pointerId)
    })
    listen(mount, 'pointermove', (e) => {
      if (!dragging) return
      yawVel = (e.clientX - lastX) * 0.007
      yaw += yawVel
      pitch = THREE.MathUtils.clamp(pitch + (e.clientY - lastY) * 0.004, -0.45, 0.45)
      lastX = e.clientX
      lastY = e.clientY
    })
    const release = () => {
      dragging = false
      mount.classList.remove('dragging')
    }
    listen(mount, 'pointerup', release)
    listen(mount, 'pointercancel', release)

    // ---- assemble / disassemble -----------------------------------------------------------------
    let direction = 0 // +1 assembling, -1 disassembling, 0 idle
    let clockAt = 0 // seconds into the current sequence
    let glow = 0

    if (options.assembled) {
      movers.forEach((m) => (m.seq = 1))
      state.assembled = true
      glow = 1
    }
    const pinned = options.progress ?? null

    const aPos = new THREE.Vector3()
    const aQuat = new THREE.Quaternion()
    const aScale = new THREE.Vector3()
    const dir = new THREE.Vector3()
    const from = new THREE.Vector3()

    function place(item) {
      const p = mounted(item)
      if (p <= 0) {
        item.part.position.copy(item.floorPos)
        item.part.quaternion.copy(item.floorQuat)
        return
      }
      item.anchor.matrixWorld.decompose(aPos, aQuat, aScale)
      dir.copy(item.approachDir).applyQuaternion(aQuat)
      // How far out along the mounting axis the part lines up before sliding home. The magazines
      // come from below, so theirs is short: a long one starts inside the stage.
      const standoff = (item.standoff ?? 0.16) * KIT_SCALE
      if (p < 0.72) {
        // Lift off the floor, arc up, and turn to face the anchor while still clear of it.
        const u = easeInOut(p / 0.72)
        from.copy(aPos).addScaledVector(dir, standoff)
        item.part.position.lerpVectors(item.floorPos, from, u)
        item.part.position.y += Math.sin(Math.PI * u) * 0.22
        item.part.quaternion.slerpQuaternions(item.floorQuat, aQuat, easeInOut(clamp01(p / 0.6)))
      } else {
        // Slide home along the mounting axis.
        const v = easeOut((p - 0.72) / 0.28)
        item.part.position.copy(aPos).addScaledVector(dir, standoff * (1 - v))
        item.part.quaternion.copy(aQuat)
      }
      // Nothing passes through the stage. While a part is over the deck it is held at least its
      // own length above it; the hold fades out just past the stage's edge, so parts resting on
      // the floor beside the stage are untouched.
      const over = 1 - THREE.MathUtils.smoothstep(Math.hypot(item.part.position.x - stageTop.x, item.part.position.z - stageTop.z), 0.6, 0.72)
      if (over > 0) {
        const floorY = stageTop.y + item.reach
        if (item.part.position.y < floorY) item.part.position.y += (floorY - item.part.position.y) * over
      }
    }

    // ---- loop ------------------------------------------------------------------------------------
    const frozen = options.time ?? null
    let elapsed = 0
    let frames = 0
    let live = false // false while frames are only warming shaders behind the preloader

    // `dt` comes from the shared loop (src/fx/core/loop), already capped, so a tab wake slows the
    // motion instead of teleporting it. The clock is the sum of those steps: it stands still while
    // the loop is paused (tab hidden, hero scrolled out of view) and picks up where it stopped.
    const frame = (dt) => {
      elapsed += dt
      const t = frozen ?? elapsed

      if (direction !== 0) {
        clockAt += dt
        for (const m of movers) {
          // Disassembly runs the same stagger in reverse order.
          const delay = direction > 0 ? m.delay : total - DURATION - m.delay
          const local = clamp01((clockAt - delay) / DURATION)
          m.seq = direction > 0 ? local : 1 - local
        }
        if (clockAt >= total) {
          state.assembled = direction > 0
          state.busy = false
          direction = 0
          emit()
        }
      }
      if (pinned !== null) movers.forEach((m) => (m.seq = clamp01(pinned * (1 + 0.75) - m.delay)))

      // The glow comes up as the last added part seats and falls away as the first one leaves.
      const seated = Math.min(...added.map((m) => m.seq))
      glow += ((seated > 0.98 ? 1 : 0) - glow) * Math.min(1, dt * 3.5)
      const pulse = 0.82 + 0.18 * Math.sin(t * 2.2)
      aura.intensity = glow * 0.6 * pulse
      for (const m of rifleMaterials) m.emissive.copy(ORANGE).multiplyScalar(glow * 0.012 * pulse)
      set.userData.setBoost?.(1 + glow * STAGE_BOOST_ASSEMBLED)
      key.intensity = KEY_INTENSITY * (1 + glow * KEY_BOOST_ASSEMBLED)
      deckGlow.visible = glow > 0.003
      deckGlow.material.opacity = glow * (0.86 + 0.14 * Math.sin(t * 1.3))
      bloom.strength = bp.strength * (1 + glow * 0.3)
      light.userData.setOn?.(glow > 0.5)
      for (const l of bandLights) l.intensity = 0.42 * (set.userData.stage.userData.glow ?? STAGE_LEVEL)

      // Idle: a slow bob and sway. A drag adds to it and coasts to rest.
      if (!dragging) {
        yaw += yawVel
        yawVel *= 0.93
        pitch *= 0.97
      }
      rig.position.y = stageTop.y + FLOAT_HEIGHT + Math.sin(t * 0.42) * 0.012
      spin.rotation.set(pitch + Math.sin(t * 0.3) * 0.012, yaw + Math.sin(t * 0.18) * 0.09, Math.sin(t * 0.25) * 0.008)
      rig.updateMatrixWorld(true)
      for (const m of movers) place(m)

      set.userData.update?.(t, dt)
      composer.render()
      if (live && ++frames === 4) window.__ready = true
    }

    // Warm the shaders behind the preloader, a little at a time. Drawing the scene cold makes the
    // browser compile every program inside one frame, which froze the page, and the preloader
    // with it, for seconds. So everything starts hidden and is revealed one material at a time,
    // each followed by a real frame through the real pipeline (shadow pass, the floor's mirror
    // pass, the composer). Each frame then compiles only what the newly shown mesh needs.
    //
    //
    // Before that, compileAsync does the bulk of it properly in the background: it hands each
    // material to the driver's parallel compiler and resolves when the program is linked, so no
    // frame is blocked at all. It has to run with the composer's target bound, because a program
    // is specific to where it draws (no tone mapping into the linear HDR target). What it cannot
    // reach (shadow depth, the mirror pass, the bloom chain) is what the reveal loop is for.
    timings.push(['@warm-start', Math.round(performance.now())])
    state.phase = 'Preparing materials'
    state.progress = 0
    emit()
    await nextFrame()
    renderer.setRenderTarget(composer.readBuffer)
    {
      const done = new Set()
      const queue = []
      scene.traverse((o) => {
        if (!o.isMesh || !o.visible) return
        const fresh = [].concat(o.material).filter((m) => m && !done.has(m.uuid + (o.isInstancedMesh ? ':instanced' : '')))
        for (const m of fresh) done.add(m.uuid + (o.isInstancedMesh ? ':instanced' : ''))
        if (fresh.length) queue.push(o)
      })
      let last = performance.now()
      for (let i = 0; i < queue.length; i++) {
        await renderer.compileAsync(queue[i], camera, scene)
        if (performance.now() - last < 24) continue
        state.progress = (0.9 * (i + 1)) / queue.length
        emit()
        await nextFrame()
        last = performance.now()
        if (signal?.aborted) throw new Cancelled()
      }
    }
    renderer.setRenderTarget(null)
    timings.push(['compileAsync', Math.round(performance.now() - mark)], ['programs after compileAsync', renderer.info.programs.length])
    const seen = new Set()
    const hidden = []
    const reveal = []
    scene.traverse((o) => {
      if (!o.isMesh && !o.isPoints && !o.isLine) return
      if (!o.visible) return
      const key = (m) => m.uuid + (o.isInstancedMesh ? ':instanced' : '')
      const fresh = [].concat(o.material).filter((m) => m && !seen.has(key(m)))
      for (const m of fresh) seen.add(key(m))
      o.visible = false
      ;(fresh.length ? reveal : hidden).push(o)
    })
    let lastPaint = performance.now()
    for (let i = 0; i < reveal.length; i++) {
      reveal[i].visible = true
      frame(0)
      // Most meshes reuse a program that is already warm and cost a millisecond or two. Only hand
      // the frame back to the browser once real time has gone by, or the wait is all vsync.
      if (performance.now() - lastPaint < 24) continue
      state.progress = 0.9 + (0.1 * (i + 1)) / reveal.length
      emit()
      await nextFrame()
      lastPaint = performance.now()
      if (signal?.aborted) throw new Cancelled()
    }
    for (const o of hidden) o.visible = true
    live = true
    // For the tools in spike/tools: lets a script reach into the running scene.
    window.__hero = { scene, camera, renderer, set, rifle, kit }
    timings.push(['warm shaders', Math.round(performance.now() - mark)], ['programs', renderer.info.programs.length], ['@loop-start', Math.round(performance.now())])
    // The loop starts here and not a line earlier: a frame drawn before the warm-up above compiles
    // every program at once and freezes the page. It runs only while the hero is on screen and
    // the tab is visible.
    loop = createLoop({ el: mount, frame })
    loop.start()
    for (let i = 0; i < 3; i++) await nextFrame()
    timings.push(['@ready', Math.round(performance.now())])
    state.ready = true
    state.progress = 1
    emit()

    return {
      toggle() {
        if (direction !== 0) return
        direction = state.assembled ? -1 : 1
        clockAt = 0
        state.busy = true
        emit()
      },
      dispose() {
        loop.dispose()
        listeners.forEach((off) => off())
        set.userData.dispose?.()
        renderer.dispose()
        renderer.forceContextLoss()
        renderer.domElement.remove()
      },
    }
  } catch (error) {
    // Either way the canvas goes: a cancelled start has nobody left to show it to, and a failed
    // one hands the box to the hero's still image.
    loop?.dispose()
    listeners.forEach((off) => off())
    renderer?.dispose()
    renderer?.forceContextLoss()
    renderer?.domElement.remove()
    if (error instanceof Cancelled) return { toggle() {}, dispose() {} }
    console.error(error)
    state.error = error.message
    emit()
    window.__error = error.message
    window.__ready = true
    return { toggle() {}, dispose() {} }
  }
}
