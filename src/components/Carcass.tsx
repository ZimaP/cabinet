import type { PartLayout } from '../model'
import { AnimatedPart } from './model/AnimatedPart'
import { numericPartMetadata } from './model/partMetadata'
import {
  BeveledPartBox,
  DovetailInsert,
  GenericCylinder,
  ScrewGeometry,
} from './visual/PartGeometry'

export interface CabinetSubassemblyProps {
  parts: readonly PartLayout[]
  exploded: number
}

function CarcassPart({
  part,
  exploded,
}: {
  part: PartLayout
  exploded: number
}) {
  const radius = numericPartMetadata(part, 'radius')
  const segments = numericPartMetadata(part, 'segments')

  return (
    <AnimatedPart part={part} exploded={exploded}>
      {part.kind === 'box' && (
        <BeveledPartBox
          dimensions={part.dimensions}
          name={part.id}
          material={part.material}
          showPlywoodEdge={
            part.material === 'white-melamine' ||
            part.material === 'plywood-edge'
          }
        />
      )}
      {part.kind === 'cylinder' && (
        <GenericCylinder
          dimensions={part.dimensions}
          name={part.id}
          material={part.material}
          radius={radius}
          segments={segments}
        />
      )}
      {part.kind === 'screw' && (
        <ScrewGeometry dimensions={part.dimensions} name={part.id} />
      )}
      {part.kind === 'dovetail' && (
        <DovetailInsert dimensions={part.dimensions} name={part.id} />
      )}
    </AnimatedPart>
  )
}

/** Renders carcass panels, rails, shelf, toe kick, and shelf-pin details. */
export function Carcass({ parts, exploded }: CabinetSubassemblyProps) {
  return (
    <group name="carcass-assembly">
      {parts.map((part) => (
        <CarcassPart key={part.id} part={part} exploded={exploded} />
      ))}
    </group>
  )
}

export default Carcass
