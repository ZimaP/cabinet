import type { PartLayout } from '../model'
import type { DimensionSpec } from '../dimensions'
import { PartDimensions } from './dimensions'
import { AnimatedPart } from './model/AnimatedPart'
import { numericPartMetadata } from './model/partMetadata'
import {
  BeveledPartBox,
  DovetailInsert,
  GenericCylinder,
  ScrewGeometry,
} from './visual/PartGeometry'
import type { CabinetSubassemblyProps } from './Carcass'

function DrawerPart({
  part,
  exploded,
  dimensionSpec,
}: {
  part: PartLayout
  exploded: number
  dimensionSpec?: DimensionSpec
}) {
  const isDrawerBoard = part.category === 'drawer'

  return (
    <AnimatedPart part={part} exploded={exploded}>
      {part.kind === 'box' && (
        <BeveledPartBox
          dimensions={part.dimensions}
          name={part.id}
          material={part.material}
          showPlywoodEdge={part.category === 'front'}
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
    </AnimatedPart>
  )
}

/** Decorative fronts remain independent from every solid-wood drawer board. */
export function DrawerAssembly({
  parts,
  exploded,
  dimensionSpecs,
}: CabinetSubassemblyProps) {
  return (
    <group name="drawer-and-front-assembly">
      {parts.map((part) => (
        <DrawerPart
          key={part.id}
          part={part}
          exploded={exploded}
          dimensionSpec={dimensionSpecs?.get(part.id)}
        />
      ))}
    </group>
  )
}

export default DrawerAssembly
