import type { PartLayout } from '../model'
import { TOE_KICK_SIDE_PROFILE } from '../model/toeKickSideProfile'
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
  ScrewGeometry,
  ToeKickSidePanel,
} from './visual/PartGeometry'

export interface CabinetSubassemblyProps {
  parts: readonly PartLayout[]
  exploded: number
  dimensionSpecs?: ReadonlyMap<string, DimensionSpec>
  staticParts?: boolean
}

function CarcassPart({
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
  const radius = numericPartMetadata(part, 'radius')
  const segments = numericPartMetadata(part, 'segments')
  const profile = stringPartMetadata(part, 'profile')
  const edgeTreatment = stringPartMetadata(part, 'edgeTreatment')
  const toeKickHeight = numericPartMetadata(part, 'toeKickHeight')
  const toeKickSetback = numericPartMetadata(part, 'toeKickSetback')
  const isToeKickSide =
    profile === TOE_KICK_SIDE_PROFILE &&
    toeKickHeight !== undefined &&
    toeKickSetback !== undefined

  return (
    <PartTransform
      part={part}
      exploded={exploded}
      animate={!staticParts}
    >
      {part.kind === 'box' && isToeKickSide && (
        <ToeKickSidePanel
          dimensions={part.dimensions}
          name={part.id}
          toeKickHeight={toeKickHeight}
          toeKickSetback={toeKickSetback}
        />
      )}
      {part.kind === 'box' && !isToeKickSide && (
        <BeveledPartBox
          dimensions={part.dimensions}
          name={part.id}
          material={part.material}
          showPlywoodEdge={
            (part.material === 'white-melamine' ||
              part.material === 'plywood-edge') &&
            edgeTreatment !== 'pvc-edge' &&
            edgeTreatment !== 'white-edge-band'
          }
          showWoodGrain={part.material === 'natural-wood'}
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
      {dimensionSpec && (
        <PartDimensions spec={dimensionSpec} exploded={exploded} />
      )}
    </PartTransform>
  )
}

/** Renders carcass panels, rails, shelf, toe kick, and shelf-pin details. */
export function Carcass({
  parts,
  exploded,
  dimensionSpecs,
  staticParts,
}: CabinetSubassemblyProps) {
  return (
    <group name="carcass-assembly">
      {parts.map((part) => (
        <CarcassPart
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

export default Carcass
