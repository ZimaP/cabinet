import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
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
  const viewportWidth = useThree((state) => state.size.width)
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
  // Desktop labels use the full tuned fan-out. On a phone the camera steps
  // farther back and these offsets contract so annotations remain on-screen.
  const horizontalScale =
    viewportWidth <= 760 ? 0.39 - Math.min(1, exploded) * 0.17 : 1
  const verticalScale = viewportWidth <= 760 ? 0.9 : 1
  const isTripleDrawerPart = ['topDrawer', 'middleDrawer', 'bottomDrawer'].some(
    (prefix) => spec.partId.startsWith(prefix),
  )
  const isDoubleDrawerPart = ['leftDrawer', 'rightDrawer'].some((prefix) =>
    spec.partId.startsWith(prefix),
  )
  const mobileHorizontalNudge =
    viewportWidth <= 760
      ? isTripleDrawerPart
        ? 13
        : isDoubleDrawerPart
          ? 7
          : 0
      : 0
  const mobilePositionLift =
    viewportWidth <= 760
      ? Math.min(180, Math.max(0, 22 - spec.part.position.y) * 10.25)
      : 0
  const mobilePartLift =
    viewportWidth <= 760 && spec.partId.endsWith('BoxBottom') ? 12 : 0
  const mobileVerticalLift = mobilePositionLift + mobilePartLift

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
          transform: `translate(${screenOffset.x * fanOut * horizontalScale + mobileHorizontalNudge}px, ${screenOffset.y * fanOut * verticalScale - mobileVerticalLift}px)`,
        }}
        aria-label={`${spec.displayName}: ${value}`}
      >
        <span className="dimension-label__name">{spec.displayName}</span>
        <span className="dimension-label__value">{value}</span>
      </div>
    </Html>
  )
}
