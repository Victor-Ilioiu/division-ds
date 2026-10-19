// The Kestrel C operator kit as one object: the carbine replica with the parts the kit adds
// mounted on it, for the kit's product photo and its live model on the product page (the
// `kestrel-c-kit` row in ../products.js).
//
// It is the hero's assembled pose without the hero: the same modules on the same anchors that
// ../hero.js mounts them on (the holo sight on the optic rail, the mock suppressor on the muzzle,
// the foregrip under the handguard, the rail light on its side and an amber magazine in the
// well). An anchor's own frame is the mounting frame (see spike/CONTRACT.md, "Anchors and
// origins"), so a part added as the anchor's child sits exactly where the hero's sequence ends.
//
// The magazines, bottles and battery that lie on the hero's floor are part of the kit and not
// part of this model: the photo, and the live model, are of the replica as assembled.

import * as THREE from 'three'
import * as Rifle from './rifle.js'
import * as Magazine from './magazine.js'
import * as HoloSight from './holo-sight.js'
import * as Suppressor from './suppressor.js'
import * as Foregrip from './foregrip.js'
import * as RailLight from './tac-light.js'

/** Anchor on the replica -> the part that mounts there. */
const MOUNTS = [
  ['optic', () => HoloSight.create()],
  ['muzzle', () => Suppressor.create()],
  ['railBottom', () => Foregrip.create()],
  ['railSide', () => RailLight.create()],
  ['mag', () => Magazine.create({ variant: 'accent' })],
]

export async function create() {
  const group = new THREE.Group()
  group.name = 'kestrel-c-kit'

  const rifle = await Rifle.create({ variant: 'c' })
  group.add(rifle)

  for (const [name, build] of MOUNTS) {
    const anchor = rifle.getObjectByName(`anchor:${name}`)
    if (!anchor) throw new Error(`rifle has no anchor:${name}`)
    anchor.add(await build())
  }

  return group
}
