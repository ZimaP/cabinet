import type { PartLayout } from '../model'
import type { DimensionSpec } from '../dimensions'
import { PartDimensions } from './dimensions'
import { PartTransform } from './model/AnimatedPart'
import {
  numericPartMetadata,
  stringPartMetadata,
} from './model/partMetadata'
import {
  BeveledPartBox,
  DovetailInsert,
  GenericCylinder,
  ShakerFrontPanel,
  ScrewGeometry,
} from './visual/PartGeometry'
import type { CabinetSubassemblyProps } from './Carcass'

function DrawerPart({
  part,
  exploded,
  dimensionSpec,
  staticParts,
}: {
  part: PartLayout
  exploded: number
  dimensionSpec?: DimensionSpec
  staticParts?: boolean
}) {
  const isDrawerBoard = part.category === 'drawer'
  const isShakerFront =
    stringPartMetadata(part, 'frontStyle') === 'shaker' ||
    stringPartMetadata(part, 'frontProfile') === 'shaker-inset'
  const edgeTreatment = stringPartMetadata(part, 'edgeTreatment')
  const hasFinishedWhiteEdge =
    edgeTreatment === 'white-edge-band' ||
    edgeTreatment === 'pvc-edge' ||
    edgeTreatment === 'postformed' ||
    edgeTreatment === 'thermafoil'

  return (
    <PartTransform
      part={part}
      exploded={exploded}
      animate={!staticParts}
    >
      {part.kind === 'box' && isShakerFront && (
        <ShakerFrontPanel dimensions={part.dimensions} name={part.id} />
      )}
      {part.kind === 'box' && !isShakerFront && (
        <BeveledPartBox
          dimensions={part.dimensions}
          name={part.id}
          material={part.material}
          // Opted-in slab fronts keep the white factory edge treatment visible
          // instead of receiving the exposed plywood-core detail.
          showPlywoodEdge={part.category === 'front' && !hasFinishedWhiteEdge}
          showWoodGrain={isDrawerBoard && part.material === 'natural-wood'}
        />
      )}
      {part.kind === 'dovetail' && (
        <DovetailInsert dimensions={part.dimensions} name={part.id} />
      )}
      {part.kind === 'cylinder' && (
        <GenericCylinder
          dimensions={part.dimensions}
          name={part.id}
          material={part.material}
          radius={numericPartMetadata(part, 'radius')}
          segments={numericPartMetadata(part, 'segments')}
        />
      )}
      {part.kind === 'screw' && (
        <ScrewGeometry dimensions={part.dimensions} name={part.id} />
      )}
      {dimensionSpec && (
        <PartDimensions spec={dimensionSpec} exploded={exploded} />
      )}
    </PartTransform>
  )
}

/** Decorative fronts remain independent from every solid-wood drawer board. */
export function DrawerAssembly({
  parts,
  exploded,
  dimensionSpecs,
  staticParts,
}: CabinetSubassemblyProps) {
  return (
    <group name="drawer-and-front-assembly">
      {parts.map((part) => (
        <DrawerPart
          key={part.id}
          part={part}
          exploded={exploded}
          dimensionSpec={dimensionSpecs?.get(part.id)}
          staticParts={staticParts}
        />
      ))}
    </group>
  )
}

export default DrawerAssembly
