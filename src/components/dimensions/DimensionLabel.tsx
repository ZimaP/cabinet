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
  const viewportHeight = useThree((state) => state.size.height)
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
  const isMobile = viewportWidth <= 760
  const baseScreenOffset =
    (isMobile ? spec.annotation.mobileLabelScreenOffset : undefined) ??
    spec.annotation.labelScreenOffset ??
    { x: 0, y: 0 }
  const mobileExplodedOffset = isMobile
    ? spec.annotation.mobileExplodedLabelScreenOffset
    : undefined
  const mobileExplosionProgress = Math.min(
    1,
    Math.max(0, (exploded - 0.55) / 0.45),
  )
  const mobileExplosionBlend =
    mobileExplosionProgress *
    mobileExplosionProgress *
    (3 - 2 * mobileExplosionProgress)
  const screenOffset = mobileExplodedOffset
    ? {
        x:
          baseScreenOffset.x +
          (mobileExplodedOffset.x - baseScreenOffset.x) *
            mobileExplosionBlend,
        y:
          baseScreenOffset.y +
          (mobileExplodedOffset.y - baseScreenOffset.y) *
            mobileExplosionBlend,
      }
    : baseScreenOffset
  const fanOutProgress = Math.min(1, Math.max(0, exploded * 2))
  const fanOut = fanOutProgress * fanOutProgress * (3 - 2 * fanOutProgress)
  // Desktop labels use the full tuned fan-out. On a phone the camera steps
  // farther back and these offsets contract so annotations remain on-screen.
  const horizontalScale =
    isMobile ? 0.39 - Math.min(1, exploded) * 0.17 : 1
  // Very tall phone viewports have enough clear canvas above the controls to
  // spread dense assemblies farther vertically; standard phones keep the
  // established compact layout.
  const tallPhoneScale =
    isMobile && spec.cabinetType === 'vanity-sink-base'
    ? Math.min(1.45, Math.max(1, viewportHeight / 844))
    : 1
  const verticalScale = isMobile ? 0.9 * tallPhoneScale : 1
  const isTripleDrawerPart = ['topDrawer', 'middleDrawer', 'bottomDrawer'].some(
    (prefix) => spec.partId.startsWith(prefix),
  )
  const isDoubleDrawerPart = ['leftDrawer', 'rightDrawer'].some((prefix) =>
    spec.partId.startsWith(prefix),
  )
  const mobileHorizontalNudge =
    isMobile
      ? isTripleDrawerPart
        ? 14
        : isDoubleDrawerPart
          ? 7
          : 0
      : 0
  const mobilePositionLift =
    isMobile
      ? Math.min(180, Math.max(0, 22 - spec.part.position.y) * 10.25)
      : 0
  const mobilePartLift =
    isMobile && spec.partId.endsWith('BoxBottom') ? 12 : 0
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
