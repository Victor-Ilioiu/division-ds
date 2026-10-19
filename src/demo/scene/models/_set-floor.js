// The set's floor: a dark, slightly glossy plane with a blurred planar reflection.
//
// A stock Reflector gives a perfect mirror. This one renders the mirrored scene into a
// half-resolution HDR target, then builds three progressively blurrier copies (separable
// Gaussian, stretched vertically the way a rough floor smears a reflection toward the
// viewer). The floor shader picks a blur level per pixel from how far the reflected ray
// travels before it hits the wall or the stage, and fades the reflection with the height of
// that hit, so only what is close to the floor reads: the contact glow of the wall LEDs and
// the stage's band. Lighting (the stage's RectAreaLights, the key) is ordinary
// MeshStandardMaterial lighting on top.
//
// Everything analytic runs in the floor's local space, so the set can be moved or rotated.

import * as THREE from 'three'

const BLUR_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uStep;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb * 0.227027;
  c += (texture2D(tSrc, vUv + uStep * 1.3846).rgb + texture2D(tSrc, vUv - uStep * 1.3846).rgb) * 0.316216;
  c += (texture2D(tSrc, vUv + uStep * 3.2308).rgb + texture2D(tSrc, vUv - uStep * 3.2308).rgb) * 0.070270;
  // Firefly guard: one non-finite or absurdly hot pixel would smear into a white flare.
  if (!(dot(c, vec3(1.0)) < 1.0e3)) c = vec3(0.0);
  gl_FragColor = vec4(min(c, vec3(12.0)), 1.0);
}
`
const BLUR_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const FLOOR_VERT_PARS = /* glsl */ `
uniform mat4 uTexMat;
varying vec4 vRefl;
varying vec3 vLp;
`
const FLOOR_VERT_MAIN = /* glsl */ `
vLp = position;
vRefl = uTexMat * vec4(position, 1.0);
`
const FLOOR_FRAG_PARS = /* glsl */ `
uniform sampler2D tRefl0;
uniform sampler2D tRefl1;
uniform sampler2D tRefl2;
uniform sampler2D tRefl3;
uniform vec3 uCamLocal;
uniform float uWallZ;
uniform vec4 uStage;      // x, z, radius, height of the occluder cylinder
uniform float uReflect;
uniform float uBlurMin;
uniform float uBlurGain;
uniform float uFadeHeight;
uniform vec3 uPoolColor;
uniform float uPool;
uniform float uPoolRadius;
uniform float uStageR;
uniform vec4 uVignette;   // centre x, centre z, inner radius, outer radius
varying vec4 vRefl;
varying vec3 vLp;
float floorHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float floorNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(floorHash(i), floorHash(i + vec2(1, 0)), f.x), mix(floorHash(i + vec2(0, 1)), floorHash(i + vec2(1, 1)), f.x), f.y);
}
// Signed distance to a hexagon with vertices on +-X.
float sdHexX(vec2 p, float r) {
  const vec3 k = vec3(-0.8660254, 0.5, 0.5773503);
  p = abs(p.yx);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}
`
const FLOOR_FRAG_EMISSIVE = /* glsl */ `
{
  vec3 P = vLp;
  vec3 Vv = normalize(uCamLocal - P);
  vec3 Rr = reflect(-Vv, vec3(0.0, 1.0, 0.0));

  // How far does the reflected ray travel before it meets the wall or the stage?
  float tHit = Rr.z < -1e-4 ? (uWallZ - P.z) / Rr.z : 40.0;
  vec2 o = P.xz - uStage.xy;
  float qa = dot(Rr.xz, Rr.xz);
  float qb = dot(o, Rr.xz);
  float qc = dot(o, o) - uStage.z * uStage.z;
  float disc = qb * qb - qa * qc;
  if (disc > 0.0 && qa > 1e-6) {
    float tc = (-qb - sqrt(disc)) / qa;
    float wCyl = (1.0 - smoothstep(uStage.w * 0.6, uStage.w * 1.6, tc * Rr.y)) * smoothstep(0.0, 0.45, disc / (qa * uStage.z * uStage.z));
    if (tc > 0.0) tHit = mix(tHit, min(tHit, tc), wCyl);
  }
  tHit = max(tHit, 0.0);
  float hHit = tHit * Rr.y;

  float streak = floorNoise(P.xz * vec2(38.0, 6.0));
  float lod = clamp(uBlurMin + tHit * uBlurGain + (streak - 0.5) * 0.5, 0.0, 3.0);
  vec2 ruv = vRefl.xy / vRefl.w;
  vec3 r0 = texture2D(tRefl0, ruv).rgb;
  vec3 r1 = texture2D(tRefl1, ruv).rgb;
  vec3 r2 = texture2D(tRefl2, ruv).rgb;
  vec3 r3 = texture2D(tRefl3, ruv).rgb;
  vec3 refl = lod < 1.0 ? mix(r0, r1, lod) : lod < 2.0 ? mix(r1, r2, lod - 1.0) : mix(r2, r3, lod - 2.0);

  float fres = 0.04 + 0.96 * pow(1.0 - clamp(Vv.y, 0.0, 1.0), 5.0);
  float fade = exp(-hHit / uFadeHeight);
  float gloss = 0.8 + 0.4 * floorNoise(P.xz * 3.1 + 7.0);
  totalEmissiveRadiance += refl * fres * fade * gloss * uReflect;

  // Painted part of the stage's pool: what the band's bounce off the floor adds on top of
  // the RectAreaLights. Strongest at the base, gone within about a stage radius.
  float dHex = max(sdHexX(P.xz - uStage.xy, uStageR), 0.0);
  float pool = 1.0 / (1.0 + (dHex * dHex) / (uPoolRadius * uPoolRadius));
  pool *= exp(-dHex / (uPoolRadius * 1.35));
  // The glossy part of the bounce throws toward the viewer, so the pool is fuller in front.
  vec2 toCam = normalize(uCamLocal.xz - uStage.xy);
  pool *= mix(0.4, 1.0, smoothstep(-0.5, 0.35, dot(P.xz - uStage.xy, toCam)));
  totalEmissiveRadiance += uPoolColor * uPool * pool * (0.85 + 0.3 * floorNoise(P.xz * 9.0));
}
`
const FLOOR_FRAG_COLOR = /* glsl */ `
{
  // Black crush toward the edges of the set.
  float dv = length(vLp.xz - uVignette.xy);
  diffuseColor.rgb *= 1.0 - 0.85 * smoothstep(uVignette.z, uVignette.w, dv);
  diffuseColor.rgb *= 0.9 + 0.2 * floorNoise(vLp.xz * 2.3);
}
`

/**
 * @param {object} o
 * @param {number} o.width  size along X
 * @param {number} o.depth  size along Z
 * @param {number} o.centerZ where the plane's centre sits on Z
 * @param {number} o.wallZ  z of the wall's face, in the floor's local space
 * @param {number[]} o.stage [x, z, radius] of the stage
 * @param {number} [o.resolution=0.5] mirror target size relative to the drawing buffer
 */
export function createFloor(o) {
  const { width, depth, centerZ, wallZ, stage, resolution = 0.5 } = o
  const geometry = new THREE.PlaneGeometry(width, depth)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, 0, centerZ)

  const rtOptions = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }
  const mirror = new THREE.WebGLRenderTarget(4, 4, { ...rtOptions, depthBuffer: true, samples: 4 })
  const levels = [mirror]
  const temps = [null]
  for (let i = 1; i <= 3; i++) {
    levels.push(new THREE.WebGLRenderTarget(4, 4, rtOptions))
    temps.push(new THREE.WebGLRenderTarget(4, 4, rtOptions))
  }

  const uniforms = {
    uTexMat: { value: new THREE.Matrix4() },
    tRefl0: { value: levels[0].texture },
    tRefl1: { value: levels[1].texture },
    tRefl2: { value: levels[2].texture },
    tRefl3: { value: levels[3].texture },
    uCamLocal: { value: new THREE.Vector3(0, 1, 3) },
    uWallZ: { value: wallZ },
    uStage: { value: new THREE.Vector4(stage[0], stage[1], stage[2] * 1.02, 0.16) },
    uStageR: { value: stage[2] * Math.cos(Math.PI / 6) },
    uReflect: { value: 1.3 },
    uBlurMin: { value: 1.5 },
    uBlurGain: { value: 1.6 },
    uFadeHeight: { value: 0.42 },
    uPoolColor: { value: new THREE.Color(1.0, 0.18, 0.03) },
    uPool: { value: 0.0 },
    uPoolRadius: { value: 0.34 },
    uVignette: { value: new THREE.Vector4(stage[0] * 0.5, 0.4, 2.2, 6.5) },
  }

  const material = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.5, metalness: 0.0, envMapIntensity: 0 })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + FLOOR_VERT_PARS)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + FLOOR_VERT_MAIN)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FLOOR_FRAG_PARS)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + FLOOR_FRAG_COLOR)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + FLOOR_FRAG_EMISSIVE)
  }
  material.customProgramCacheKey = () => 'set-floor-v1'

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'floor'

  // ---- blur chain ---------------------------------------------------------------------
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uStep: { value: new THREE.Vector2() } },
    vertexShader: BLUR_VERT,
    fragmentShader: BLUR_FRAG,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat)
  quad.frustumCulled = false
  const quadScene = new THREE.Scene()
  quadScene.add(quad)
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  // ---- mirror camera (after three's Reflector) ----------------------------------------
  const virtualCamera = new THREE.PerspectiveCamera()
  const reflectorPlane = new THREE.Plane()
  const normal = new THREE.Vector3()
  const planePos = new THREE.Vector3()
  const camPos = new THREE.Vector3()
  const rot = new THREE.Matrix4()
  const lookAt = new THREE.Vector3()
  const clipPlane = new THREE.Vector4()
  const view = new THREE.Vector3()
  const target = new THREE.Vector3()
  const q = new THREE.Vector4()
  const size = new THREE.Vector2()
  const inv = new THREE.Matrix4()
  let busy = false
  let w0 = 0
  let h0 = 0

  mesh.onBeforeRender = (renderer, scene, camera) => {
    if (busy || camera === virtualCamera) return
    planePos.setFromMatrixPosition(mesh.matrixWorld)
    camPos.setFromMatrixPosition(camera.matrixWorld)
    rot.extractRotation(mesh.matrixWorld)
    normal.set(0, 1, 0).applyMatrix4(rot)
    view.subVectors(planePos, camPos)
    if (view.dot(normal) > 0) return // camera below the floor

    view.reflect(normal).negate().add(planePos)
    rot.extractRotation(camera.matrixWorld)
    lookAt.set(0, 0, -1).applyMatrix4(rot).add(camPos)
    target.subVectors(planePos, lookAt).reflect(normal).negate().add(planePos)
    virtualCamera.position.copy(view)
    virtualCamera.up.set(0, 1, 0).applyMatrix4(rot).reflect(normal)
    virtualCamera.lookAt(target)
    virtualCamera.far = camera.far
    virtualCamera.updateMatrixWorld()
    virtualCamera.projectionMatrix.copy(camera.projectionMatrix)

    uniforms.uTexMat.value
      .set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(virtualCamera.projectionMatrix)
      .multiply(virtualCamera.matrixWorldInverse)
      .multiply(mesh.matrixWorld)
    uniforms.uCamLocal.value.copy(camPos).applyMatrix4(inv.copy(mesh.matrixWorld).invert())

    // Oblique near plane, so nothing below the floor leaks into the reflection.
    reflectorPlane.setFromNormalAndCoplanarPoint(normal, planePos)
    reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse)
    clipPlane.set(reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant)
    const pm = virtualCamera.projectionMatrix
    q.x = (Math.sign(clipPlane.x) + pm.elements[8]) / pm.elements[0]
    q.y = (Math.sign(clipPlane.y) + pm.elements[9]) / pm.elements[5]
    q.z = -1.0
    q.w = (1.0 + pm.elements[10]) / pm.elements[14]
    clipPlane.multiplyScalar(2.0 / clipPlane.dot(q))
    pm.elements[2] = clipPlane.x
    pm.elements[6] = clipPlane.y
    pm.elements[10] = clipPlane.z + 1.0 - 0.003
    pm.elements[14] = clipPlane.w

    renderer.getDrawingBufferSize(size)
    const w = Math.max(Math.min(Math.round(size.x * resolution), 1024), 16)
    const h = Math.max(Math.round((w * size.y) / size.x), 16)
    if (w !== w0 || h !== h0) {
      w0 = w
      h0 = h
      levels[0].setSize(w, h)
      for (let i = 1; i <= 3; i++) {
        const lw = Math.max(w >> i, 8)
        const lh = Math.max(h >> i, 8)
        levels[i].setSize(lw, lh)
        temps[i].setSize(lw, lh)
      }
    }

    busy = true
    mesh.visible = false
    const prevTarget = renderer.getRenderTarget()
    const prevXr = renderer.xr.enabled
    const prevShadow = renderer.shadowMap.autoUpdate
    renderer.xr.enabled = false
    renderer.shadowMap.autoUpdate = false

    renderer.setRenderTarget(levels[0])
    renderer.state.buffers.depth.setMask(true)
    if (renderer.autoClear === false) renderer.clear()
    renderer.render(scene, virtualCamera)

    // Blur: each level reads the one above it. The vertical pass is wider, which is the
    // elongated smear a rough floor gives a reflection.
    const stretch = [0, 1.5, 1.9, 2.4]
    for (let i = 1; i <= 3; i++) {
      blurMat.uniforms.tSrc.value = levels[i - 1].texture
      blurMat.uniforms.uStep.value.set(1 / levels[i].width, 0)
      renderer.setRenderTarget(temps[i])
      renderer.render(quadScene, quadCam)
      blurMat.uniforms.tSrc.value = temps[i].texture
      blurMat.uniforms.uStep.value.set(0, stretch[i] / levels[i].height)
      renderer.setRenderTarget(levels[i])
      renderer.render(quadScene, quadCam)
    }

    renderer.xr.enabled = prevXr
    renderer.shadowMap.autoUpdate = prevShadow
    renderer.setRenderTarget(prevTarget)
    const viewport = camera.viewport
    if (viewport !== undefined) renderer.state.viewport(viewport)
    mesh.visible = true
    busy = false
  }

  mesh.userData.uniforms = uniforms
  mesh.userData.dispose = () => {
    for (const t of [...levels, ...temps]) t?.dispose()
    blurMat.dispose()
    material.dispose()
    geometry.dispose()
  }
  return mesh
}
