// The product page's live model: one catalogue product, floating over the same SVG plinth the
// shop's cards show it on, which the visitor can turn and zoom. The interface (the toolbar, the
// keyboard, the text, the fallback) is ../pages/shop/ProductMedia.tsx, which reaches this file
// only through a dynamic import(), so three.js and the models stay out of the product page's
// chunk, and drives it through `startViewer`.
//
// Plain JavaScript like hero.js; viewer.d.ts beside this file is the typed surface.
//
// **Same picture as the cutout.** Which model, which options and which starting camera come from
// ./products.js, the table `spike/tools/renders.mjs --cutout` shoots the cards' cutouts from. The
// lights and the camera placement come from ./lib/studio.js, which the workbench viewer those
// cutouts are screenshots of calls too. Same tone mapping, same field of view, no
// post-processing in either, and, like a cutout (`?bg=none&ground=0` in the workbench), no
// background and no ground: the canvas is transparent (`alpha: true`) and the page's plinth
// stage (ProductStage.tsx) shows through it, in either theme. The stage draws the product's
// shadow on its plinth itself. The page shrinks and moves the cutout to sit above the plinth;
// `options.place` passes that placement, and the camera's view offset applies it to the render
// (`frameTo`), so the first frame here lands on the cutout, at the box's own resolution, and
// the swap from one to the other does not jump.
//
// **Load discipline, the hero's.** Shaders are compiled before the first visible frame
// (`compileAsync`, then one real frame for what that cannot reach: the shadow pass), the render
// loop starts only after that, and it is the shared `createLoop`, so nothing is drawn while the
// viewer is off screen or the tab is hidden. `PCFShadowMap` is stated outright, shader error
// checking is off and there is no `RectAreaLight`, for the reasons hero.js gives. There is no
// composer here, so no multisampled target to ask for: the canvas's own `antialias` does it.
// Lenses are left as the models make them, as the cutouts are.
//
// **It draws only when something changed.** No catalogue model animates, so a frame is rendered
// when the camera moved (a drag, a key, the idle turn) or the box changed size, and at no other
// time.
//
// **One context, given back.** `dispose()` stops the loop, removes every listener, disposes the
// scene's geometry, materials and textures, and calls `forceContextLoss()`: a browser allows a
// page about sixteen WebGL contexts, and a visitor walking through the catalogue opens one per
// product.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createLoop } from '../../fx/core/loop'
import { STUDIO_ENV_INTENSITY, addStudioLights, fitDistance, orbitPosition } from './lib/studio.js'
import { PRODUCT_STAGE, VIEW_LIMITS, productModel } from './products.js'

/** Every model module, each behind its own import(): only the one a product names is fetched.
 *  The underscore files are parts other models import, never a product. */
const MODULES = import.meta.glob(['./models/*.js', '!./models/_*.js'])

/** Degrees per second of the idle turn: one revolution in about forty-five seconds. */
const IDLE_SPEED = 8
/** Degrees per pixel of a drag. */
const DRAG_AZ = 0.4
const DRAG_EL = 0.25

const clamp = THREE.MathUtils.clamp
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))

class Cancelled extends Error {}

const NOTHING = { orbit() {}, zoom() {}, reset() {}, dispose() {} }

/**
 * How far the visitor may tilt, in degrees: tighter than VIEW_LIMITS, which suits a model in a
 * studio of its own. Here the model floats over a flat drawing of a plinth seen from about
 * 10 to 14 degrees above, and the plinth does not turn with it. The catalogue's starting
 * cameras run 10 to 32 degrees and read fine over it (the cards show exactly that); past about
 * 40 the visitor looks down on the model while the plinth stays nearly edge-on, and the two
 * stop agreeing on where the floor is. The floor stays VIEW_LIMITS' own.
 */
const STAGE_EL_MAX = 40

/**
 * Renders the frame `place` describes: the camera's full picture (the cutout's frame) drawn at
 * `scale` of the box, with its top-left corner at (`left`, `top`), all as fractions of the box.
 * A view offset is exactly that: the box becomes a window onto a larger (or smaller) virtual
 * picture. Without `place`, the camera fills the box.
 */
function frameTo(camera, w, h, place) {
  camera.aspect = w / h
  if (!place) {
    camera.clearViewOffset()
    return
  }
  const { scale, left, top } = place
  camera.setViewOffset(scale * w, scale * h, -left * w, -top * h, w, h)
}

export async function startViewer(mount, productId, onChange, signal, options = {}) {
  // Cancelled before it began (React Strict Mode mounts twice in dev): take no context.
  if (signal?.aborted) return NOTHING
  const state = { ready: false, progress: 0, error: null }
  const emit = () => onChange({ ...state })
  const check = () => {
    if (signal?.aborted) throw new Cancelled()
  }
  const listeners = []
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts)
    listeners.push(() => target.removeEventListener(type, fn, opts))
  }

  let renderer
  let loop
  let observer
  let scene
  let environment
  let handle
  const release = () => {
    loop?.dispose()
    observer?.disconnect()
    listeners.forEach((off) => off())
    listeners.length = 0
    mount.classList.remove('dragging')
    scene?.traverse((o) => {
      o.geometry?.dispose()
      for (const m of [].concat(o.material ?? [])) {
        for (const value of Object.values(m)) if (value?.isTexture) value.dispose()
        m.dispose()
      }
    })
    environment?.dispose()
    renderer?.dispose()
    renderer?.forceContextLoss()
    renderer?.domElement.remove()
    if (handle && window.__productViewer === handle) delete window.__productViewer
  }

  try {
    const entry = productModel(productId)
    if (!entry) throw new Error(`no 3D model is listed for "${productId}"`)
    const load = MODULES[`./models/${entry.model}.js`]
    if (!load) throw new Error(`the model module "${entry.model}" does not exist`)

    // `alpha`: nothing is drawn behind the model, so the page's stage shows through.
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth || 4, mount.clientHeight || 3, false)
    // See hero.js: on, every program is forced to finish compiling on the main thread.
    renderer.debug.checkShaderErrors = false
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    renderer.shadowMap.enabled = true
    // Stated outright, see hero.js: the soft type is replaced with this one on the first frame,
    // which would change every program key after the warm-up.
    renderer.shadowMap.type = THREE.PCFShadowMap
    mount.appendChild(renderer.domElement)
    // A lost context leaves a blank canvas that never recovers on its own. Reported as an error,
    // and the product page goes back to the cutout.
    listen(renderer.domElement, 'webglcontextlost', () => {
      loop?.stop()
      state.error = 'The WebGL context was lost'
      emit()
    })

    scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    environment = pmrem.fromScene(room, 0.04).texture
    pmrem.dispose()
    room.dispose?.()
    scene.environment = environment
    scene.environmentIntensity = STUDIO_ENV_INTENSITY

    // ---- the model ------------------------------------------------------------------------------
    const mod = await load()
    check()
    state.progress = 0.2
    emit()
    // A frame for the page to paint the spinner before the geometry build, which is synchronous.
    await nextFrame()
    const built = await mod.create({ ...(entry.options ?? {}) })
    check()
    // Wrapped, so a display-only rotation (the foregrip is shown the natural way up) never
    // touches the model's own transform. The same wrapper the workbench viewer uses.
    const object = new THREE.Group()
    object.add(built)
    if (mod.viewer?.rotation) object.rotation.fromArray(mod.viewer.rotation)
    scene.add(object)
    object.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.01)
    // The lights, and no ground: the cutouts are shot without one, and the page's plinth
    // carries the shadow. The key light still casts the model's shadow on the model itself.
    addStudioLights(scene, center, radius)
    object.traverse((o) => {
      if (o.isMesh && o.userData.shadow !== false) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })

    // ---- the camera: on a sphere round the model's centre, starting where the cutout was shot ---
    const camera = new THREE.PerspectiveCamera(PRODUCT_STAGE.fov, PRODUCT_STAGE.aspect, radius * 0.01, Math.max(radius * 60, 50))
    const fit = fitDistance(radius, PRODUCT_STAGE.fov)
    let az = entry.az
    let el = entry.el
    let distance = fit * entry.zoom
    let dirty = true
    // Never below a row's own starting elevation, so Reset always lands on the cutout's angle.
    const elMax = Math.max(STAGE_EL_MAX, entry.el)
    // The idle turn. Off under reduced motion (the page passes `idle: false`), and off for good
    // after the first thing the visitor does.
    let idle = options.idle !== false
    const settle = () => {
      idle = false
    }
    const clampView = () => {
      el = clamp(el, VIEW_LIMITS.elMin, elMax)
      distance = clamp(distance, fit * VIEW_LIMITS.zoomMin, fit * VIEW_LIMITS.zoomMax)
      dirty = true
    }
    const place = () => {
      orbitPosition(camera.position, center, distance, az, el)
      camera.lookAt(center)
    }

    function resize() {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (!w || !h) return
      // `false`: the canvas is sized by the page's CSS (it fills the box), not by inline pixels.
      renderer.setSize(w, h, false)
      frameTo(camera, w, h, options.place)
      camera.updateProjectionMatrix()
      dirty = true
    }
    observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    // ---- pointer: one pointer turns, two pinch --------------------------------------------------
    const pointers = new Map()
    let pinchSpread = 0
    let pinchDistance = 0
    const spread = () => {
      const [a, b] = [...pointers.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    listen(mount, 'pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      settle()
      mount.classList.add('dragging')
      try {
        mount.setPointerCapture(e.pointerId)
      } catch {
        // A pointer that is already gone cannot be captured. The drag still works inside the box.
      }
      if (pointers.size === 2) {
        pinchSpread = spread()
        pinchDistance = distance
      }
    })
    listen(mount, 'pointermove', (e) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      if (pointers.size === 1) {
        // The near side of the model follows the pointer: right turns it right, down tips the
        // top toward the visitor.
        az += dx * DRAG_AZ
        el += dy * DRAG_EL
      } else if (pointers.size === 2 && pinchSpread > 0) {
        distance = (pinchDistance * pinchSpread) / Math.max(spread(), 1)
      }
      clampView()
    })
    const lift = (e) => {
      pointers.delete(e.pointerId)
      if (pointers.size === 0) mount.classList.remove('dragging')
      pinchSpread = 0
    }
    listen(mount, 'pointerup', lift)
    listen(mount, 'pointercancel', lift)

    // ---- wheel: zoom only with Ctrl or Cmd held -------------------------------------------------
    // A plain wheel over the canvas is the page scrolling, and it is left alone: no
    // preventDefault, no zoom. With Ctrl (or Cmd) held, the wheel zooms the model and the browser's
    // own page zoom is prevented, for this element only. A trackpad pinch arrives in Chromium and
    // Firefox as a wheel event with ctrlKey set, so a pinch zooms without a key. The listener has
    // to be non-passive to be allowed that preventDefault.
    listen(
      mount,
      'wheel',
      (e) => {
        if (!e.ctrlKey && !e.metaKey) return
        e.preventDefault()
        settle()
        // A mouse wheel notch is about 100 units, a trackpad pinch step is a few.
        const perUnit = e.deltaMode === 0 && Math.abs(e.deltaY) < 40 ? 0.01 : 0.0015
        distance *= Math.exp(e.deltaY * (e.deltaMode === 1 ? 0.05 : perUnit))
        clampView()
      },
      { passive: false },
    )

    // ---- loop -----------------------------------------------------------------------------------
    const frame = (dt) => {
      if (idle) {
        az += IDLE_SPEED * dt
        dirty = true
      }
      if (!dirty) return
      dirty = false
      place()
      renderer.render(scene, camera)
    }

    // Warm the shaders before anything is shown. compileAsync hands every material to the
    // driver's parallel compiler and resolves when the programs are linked, so no frame is
    // blocked. What it cannot reach (the shadow depth pass) compiles in the one real frame after
    // it, which is drawn at the cutout's own angle while the page still shows the cutout.
    place()
    state.progress = 0.5
    emit()
    await nextFrame()
    check()
    await renderer.compileAsync(scene, camera)
    check()
    state.progress = 0.9
    emit()
    await nextFrame()
    check()
    frame(0)
    // For scripts and the end-to-end test: the view as numbers, and the scene itself.
    handle = {
      productId,
      scene,
      camera,
      renderer,
      get view() {
        return { az, el, zoom: distance / fit, idle }
      },
      limits: { ...VIEW_LIMITS, elMax },
    }
    window.__productViewer = handle
    // The loop starts here and not a line earlier, as in hero.js.
    loop = createLoop({ el: mount, frame })
    loop.start()
    for (let i = 0; i < 2; i++) await nextFrame()
    check()
    state.ready = true
    state.progress = 1
    emit()

    let disposed = false
    return {
      orbit(dAz, dEl) {
        settle()
        az += dAz
        el += dEl
        clampView()
      },
      zoom(factor) {
        settle()
        distance *= factor
        clampView()
      },
      reset() {
        settle()
        az = entry.az
        el = entry.el
        distance = fit * entry.zoom
        clampView()
      },
      dispose() {
        if (disposed) return
        disposed = true
        release()
      },
    }
  } catch (error) {
    // Either way the canvas goes: a cancelled start has nobody left to show it to, and a failed
    // one hands the box back to the cutout.
    release()
    if (error instanceof Cancelled) return NOTHING
    // A warning, not an error: the failure is reported through `state.error`, the page shows the
    // cutout and says so, and nothing about it should fail a run that watches the console.
    console.warn('The product viewer could not start:', error)
    state.error = error instanceof Error ? error.message : String(error)
    emit()
    return NOTHING
  }
}
