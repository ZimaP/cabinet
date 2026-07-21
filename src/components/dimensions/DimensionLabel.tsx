import { Html } from '@react-three/drei'
import { useMemo } from 'react'

import { formatInches, type DimensionSpec } from '../../dimensions'
import { createDimensionLabelPosition } from './dimensionGeometry'

export interface DimensionLabelProps {
  spec: DimensionSpec
  exploded: number
}

// Above the viewer wash (z=1), but below headings and controls (z=3/4).
const LABEL_Z_INDEX_RANGE: [number, number] = [2, 2]

/**
 * Drei's non-transform Html mode is screen-space HTML: it always faces the
 * camera, never mirrors, and stays a compact readable size while zooming.
 */
export function DimensionLabel({ spec, exploded }: DimensionLabelProps) {
  const position = useMemo(
    () => createDimensionLabelPosition(spec),
    [spec],
  )
  const value = useMemo(
    () =>
      spec.measurements
        .map(
          (measurement) =>
            `${formatInches(measurement.value)} ${measurement.axisLabel}`,
        )
        .join(' × '),
    [spec.measurements],
  )
  const screenOffset = spec.annotation.labelScreenOffset ?? { x: 0, y: 0 }
  const fanOutProgress = Math.min(1, Math.max(0, exploded * 2))
  const fanOut = fanOutProgress * fanOutProgress * (3 - 2 * fanOutProgress)

  return (
    <Html
      position={position}
      center
      wrapperClass="dimension-annotation"
      pointerEvents="none"
      zIndexRange={LABEL_Z_INDEX_RANGE}
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="dimension-label"
        style={{
          pointerEvents: 'none',
          transform: `translate(${screenOffset.x * fanOut}px, ${screenOffset.y * fanOut}px)`,
        }}
        aria-label={`${spec.displayName}: ${value}`}
      >
        <span className="dimension-label__name">{spec.displayName}</span>
        <span className="dimension-label__value">{value}</span>
      </div>
    </Html>
  )
}
