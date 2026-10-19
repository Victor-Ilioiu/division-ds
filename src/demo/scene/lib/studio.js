// The product studio: the three lights, the shadow-catching ground and the camera placement a
// single model is shown with. Two callers, and that is the point of the file:
//
//   - the workbench viewer (spike/src/viewer.js), which `spike/tools/renders.mjs` screenshots to
//     make every product photo;
//   - the product page's live viewer (../viewer.js).
//
// Both build the studio by calling these functions with the same arguments, so the live model is
// lit and framed exactly as its photo was. Change a light here and both change; then re-run the
// renders, because the photos are files.

import * as THREE from 'three'

/**
 * The backdrop: a soft pool of light behind the product, fading to a darker edge, the way a
 * product photographer lights a seamless paper roll. `stage` is PRODUCT_STAGE (its `spotlight`
 * and `background` colours). Returned as a texture for `scene.background`, which three.js
 * draws to fill the frame whatever the aspect, so the photo and the live viewer get the same
 * picture behind the model. Drawn once into a small canvas; no image file.
 */
export function studioBackdrop(stage) {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#' + stage.background
  ctx.fillRect(0, 0, size, size)
  // Centred a little above the middle and wider than tall: the pool sits behind the product,
  // not under it, and the bottom edge stays dark so the shadow has something to fall into.
  ctx.save()
  ctx.translate(size / 2, size * 0.44)
  ctx.scale(1.25, 0.9)
  const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.5)
  pool.addColorStop(0, '#' + stage.spotlight)
  pool.addColorStop(0.45, '#' + stage.spotlight + 'aa')
  pool.addColorStop(1, '#' + stage.spotlight + '00')
  ctx.fillStyle = pool
  ctx.fillRect(-size, -size, size * 2, size * 2)
  ctx.restore()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** How strongly the room environment lights a model in the studio. */
export const STUDIO_ENV_INTENSITY = 1.25

/**
 * A white key from above and behind the camera's left (the only light that casts a shadow), a
 * cool fill from the other side and an orange rim. Everything is placed relative to the model's
 * bounding sphere (`center`, `radius`), so a 40 mm sight and a 900 mm replica get the same look.
 */
export function addStudioLights(scene, center, radius) {
  const key = new THREE.DirectionalLight(0xffffff, 3.4)
  key.position.copy(center).add(new THREE.Vector3(-0.6, 1.4, -1).multiplyScalar(radius * 3))
  key.target.position.copy(center)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  const sc = key.shadow.camera
  sc.left = sc.bottom = -radius * 1.6
  sc.right = sc.top = radius * 1.6
  sc.near = radius * 0.2
  sc.far = radius * 9
  key.shadow.bias = -0.0004
  key.shadow.normalBias = radius * 0.004
  scene.add(key, key.target)

  const fill = new THREE.DirectionalLight(0xbfd4ff, 0.7)
  fill.position.copy(center).add(new THREE.Vector3(1, 0.4, 1).multiplyScalar(radius * 3))
  scene.add(fill)

  const rim = new THREE.DirectionalLight(0xff6a1f, 1.6)
  rim.position.copy(center).add(new THREE.Vector3(1, 0.8, -0.2).multiplyScalar(radius * 3))
  scene.add(rim)

  return { key, fill, rim }
}

/** An invisible plane just under the model that shows only the key light's shadow. */
export function addStudioGround(scene, box, center, radius) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(radius * 12, radius * 12), new THREE.ShadowMaterial({ opacity: 0.35 }))
  ground.rotation.x = -Math.PI / 2
  ground.position.set(center.x, box.min.y - radius * 0.02, center.z)
  ground.receiveShadow = true
  scene.add(ground)
  return ground
}

/** The distance at which a sphere of `radius` just fits a camera with this vertical field of
 *  view (degrees). A product's `zoom` multiplies it. */
export function fitDistance(radius, fov) {
  return radius / Math.sin(THREE.MathUtils.degToRad(fov / 2))
}

/**
 * Puts `position` on a sphere of radius `distance` around `center`. Azimuth and elevation are in
 * degrees; azimuth is measured from +X toward +Z, so a replica (muzzle on +X) seen from -90 shows
 * its marked side with the muzzle on screen-left.
 */
export function orbitPosition(position, center, distance, az, el) {
  const a = THREE.MathUtils.degToRad(az)
  const e = THREE.MathUtils.degToRad(el)
  return position.set(
    center.x + distance * Math.cos(e) * Math.cos(a),
    center.y + distance * Math.sin(e),
    center.z + distance * Math.cos(e) * Math.sin(a),
  )
}
