import { Line } from '@react-three/drei'
import { useMemo } from 'react'

import type { DimensionMeasurement, DimensionSpec } from '../../dimensions'
import { createDimensionLineGeometry } from './dimensionGeometry'

export interface DimensionLineProps {
  spec: DimensionSpec
  measurement: DimensionMeasurement
  color?: string
}

/** A single primary cut dimension with extensions and open arrowheads. */
export function DimensionLine({
  spec,
  measurement,
  color = '#27333b',
}: DimensionLineProps) {
  const geometry = useMemo(
    () => createDimensionLineGeometry(spec, measurement),
    [measurement, spec],
  )

  return (
    <Line
      name={`${spec.partId}-${measurement.axisLabel.toLowerCase()}-dimension-line`}
      points={geometry.segments}
      segments
      color={color}
      lineWidth={1.35}
      depthTest={false}
      transparent
      opacity={0.92}
      renderOrder={900}
      userData={{
        dimensionPartId: spec.partId,
        localAxis: geometry.measuredAxis,
        offsetAxis: geometry.offsetAxis,
        nominalInches: measurement.value,
      }}
    />
  )
}
