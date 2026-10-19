import { describe, expect, it, vi } from 'vitest'
import { Mesh, ShaderMaterial } from 'three'
import { Kit, type Band } from './kit'
import { LOADER_VARIANTS, type LoaderVariant } from './variants'
import type { Palette } from './palette'

const PALETTE: Palette = {
  bright: { r: 0.9, g: 0.92, b: 0.95, a: 1 },
  mid: { r: 0.64, g: 0.68, b: 0.73, a: 1 },
  dim: { r: 0.39, g: 0.42, b: 0.45, a: 1 },
  faint: { r: 0.84, g: 0.88, b: 0.94, a: 0.3 },
  accent: { r: 0.95, g: 0.33, b: 0.06, a: 1 },
}

function build(variant: LoaderVariant) {
  const kit = new Kit({ pxToWorld: 2.2 / 160, palette: PALETTE })
  const update = LOADER_VARIANTS[variant](kit)
  const frame = (t: number) => {
    update(t)
    kit.sync(t)
  }
  return { kit, frame }
}

const lengthOf = (band: Band) => (band.mat.uniforms.uLength.value as number)
const startOf = (band: Band) => (band.mat.uniforms.uStart.value as number)

describe.each(Object.keys(LOADER_VARIANTS) as LoaderVariant[])('the %s dial', variant => {
  it('builds a real scene graph of meshes, not an empty group', () => {
    const { kit } = build(variant)
    let meshes = 0
    kit.group.traverse(node => {
      if (node instanceof Mesh) meshes++
    })
    expect(meshes).toBeGreaterThan(15)
  })

  it('draws itself on: every arc starts at zero length and reaches its full length', () => {
    const { kit, frame } = build(variant)
    frame(0)
    for (const band of kit.bands) expect(lengthOf(band)).toBe(0)
    frame(3)
    for (const band of kit.bands) expect(lengthOf(band)).toBeGreaterThan(0)
  })

  // A pure function of time, so a frame can be reproduced from `t` alone -- the reduced-motion
  // still frame depends on this, and so does any visual comparison.
  it('is deterministic: two dials at the same time are in the same pose', () => {
    const a = build(variant)
    const b = build(variant)
    a.frame(1.7)
    b.frame(1.7)
    expect(a.kit.bands.map(startOf)).toEqual(b.kit.bands.map(startOf))
    expect(a.kit.bands.map(lengthOf)).toEqual(b.kit.bands.map(lengthOf))
    const rotations = (kit: Kit) => {
      const out: number[] = []
      kit.group.traverse(node => out.push(node.rotation.z))
      return out
    }
    expect(rotations(a.kit)).toEqual(rotations(b.kit))
  })

  // The system's rule for the accent: it marks state, never decoration. On a loader the state is
  // "working", so the accent goes only on elements that move -- a still orange arc would be
  // decoration. Mutation: give any static band `role: 'accent'` -> this fails.
  it('puts the signal accent only on elements that move', () => {
    const { kit, frame } = build(variant)
    const accents = kit.bands.filter(band => band.role === 'accent')
    expect(accents.length).toBeGreaterThan(0)
    frame(2.0)
    const before = accents.map(band => [startOf(band), lengthOf(band), band.mesh.rotation.z, worldRotation(band)])
    frame(2.45)
    const after = accents.map(band => [startOf(band), lengthOf(band), band.mesh.rotation.z, worldRotation(band)])
    accents.forEach((_, i) => expect(after[i]).not.toEqual(before[i]))
  })

  it('recolours every material when the theme flips, without rebuilding', () => {
    const { kit } = build(variant)
    const accent = kit.bands.find(band => band.role === 'accent')!
    const before = (accent.mat.uniforms.uColor.value as { r: number }).r
    kit.setPalette({ ...PALETTE, accent: { r: 0.1, g: 0.1, b: 0.1, a: 1 } })
    expect((accent.mat.uniforms.uColor.value as { r: number }).r).not.toBe(before)
  })

  it('disposes every geometry and material it created', () => {
    const { kit } = build(variant)
    const disposals: ReturnType<typeof vi.fn>[] = []
    kit.group.traverse(node => {
      if (node instanceof Mesh) {
        const g = vi.spyOn(node.geometry, 'dispose')
        const m = vi.spyOn(node.material as ShaderMaterial, 'dispose')
        disposals.push(g as never, m as never)
      }
    })
    kit.dispose()
    for (const spy of disposals) expect(spy).toHaveBeenCalled()
  })
})

function worldRotation(band: Band): number {
  let z = 0
  let node: import('three').Object3D | null = band.mesh
  while (node) {
    z += node.rotation.z
    node = node.parent
  }
  return z
}
