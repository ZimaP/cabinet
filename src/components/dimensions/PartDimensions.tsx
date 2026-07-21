import type { DimensionSpec } from '../../dimensions'
import { DimensionLabel } from './DimensionLabel'
import { DimensionLine } from './DimensionLine'

export interface PartDimensionsProps {
  spec: DimensionSpec
  exploded: number
}

/**
 * Complete local-space annotation for one semantic manufacturing part.
 * Render this inside that part's AnimatedPart so it inherits the exact same
 * assembled and exploded transforms without duplicating transform math.
 */
export function PartDimensions({ spec, exploded }: PartDimensionsProps) {
  return (
    <group
      name={`${spec.partId}-dimensions`}
      userData={{
        dimensionPartId: spec.partId,
        dimensionLabel: spec.label,
        dimensionable: true,
      }}
    >
      {spec.measurements.map((measurement) => (
        <DimensionLine
          key={`${measurement.localAxis}-${measurement.axisLabel}`}
          spec={spec}
          measurement={measurement}
        />
      ))}
      <DimensionLabel spec={spec} exploded={exploded} />
    </group>
  )
}

export default PartDimensions
