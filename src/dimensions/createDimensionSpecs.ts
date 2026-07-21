import type { CabinetLayout, Vector3Value } from '../model'
import { formatInches } from './formatInches'
import {
  DIMENSIONABLE_PART_IDS,
  type DimensionAnnotationPlacement,
  type DimensionAxisLabel,
  type DimensionDirection,
  type DimensionLocalAxis,
  type DimensionSpec,
  type DimensionablePartId,
} from './types'

interface MeasurementDefinition {
  localAxis: DimensionLocalAxis
  axisLabel: DimensionAxisLabel
  edgeSign: DimensionDirection
  lineOffset: number
}

interface DimensionDefinition {
  displayName: string
  measurements: readonly [MeasurementDefinition, MeasurementDefinition]
  annotation: DimensionAnnotationPlacement
}

const zeroLabelOffset = (): Vector3Value => ({ x: 0, y: 0, z: 0 })

const annotation = (
  faceAxis: DimensionLocalAxis,
  faceSign: DimensionDirection,
  labelOffset: Vector3Value = zeroLabelOffset(),
  labelScreenOffset?: Readonly<{ x: number; y: number }>,
): DimensionAnnotationPlacement => ({
  faceAxis,
  faceSign,
  surfaceOffset: 0.22,
  labelOffset,
  labelScreenOffset,
})

const measurement = (
  localAxis: DimensionLocalAxis,
  axisLabel: DimensionAxisLabel,
  edgeSign: DimensionDirection,
  lineOffset = 0.72,
): MeasurementDefinition => ({
  localAxis,
  axisLabel,
  edgeSign,
  lineOffset,
})

/**
 * Semantic manufacturing definitions. This is deliberately an ID allowlist,
 * not a category/material heuristic: hardware, shelf-pin holes, dovetail
 * inserts, plywood edge layers, and other visual submeshes cannot acquire a
 * cut-size annotation accidentally.
 */
const DIMENSION_DEFINITIONS = {
  leftSidePanel: {
    displayName: 'Left Side',
    measurements: [measurement('z', 'D', 1), measurement('y', 'H', 1)],
    annotation: annotation(
      'x',
      -1,
      { x: 0, y: 0.3, z: -6 },
      { x: -90, y: -9 },
    ),
  },
  rightSidePanel: {
    displayName: 'Right Side',
    measurements: [measurement('z', 'D', 1), measurement('y', 'H', 1)],
    annotation: annotation(
      'x',
      1,
      { x: 0, y: -0.3, z: 6 },
      { x: 34, y: -49 },
    ),
  },
  bottomPanel: {
    displayName: 'Bottom Panel',
    measurements: [measurement('x', 'W', 1), measurement('z', 'D', 1)],
    annotation: annotation(
      'y',
      -1,
      { x: 7, y: 0, z: 0 },
      { x: 40, y: -13 },
    ),
  },
  backPanel: {
    displayName: 'Back Panel',
    measurements: [measurement('x', 'W', 1), measurement('y', 'H', 1)],
    annotation: annotation(
      'z',
      1,
      { x: 0, y: 0.45, z: 0 },
      { x: -65, y: -13 },
    ),
  },
  fullDepthShelf: {
    displayName: 'Shelf',
    measurements: [measurement('x', 'W', 1), measurement('z', 'D', 1)],
    annotation: annotation(
      'y',
      1,
      { x: 0, y: 0, z: 0.3 },
      { x: -61, y: -18 },
    ),
  },
  upperStrengtheningPanel: {
    displayName: 'Upper Strengthening Panel',
    measurements: [measurement('x', 'L', 1), measurement('z', 'H', 1)],
    annotation: annotation(
      'y',
      1,
      { x: -6, y: 0, z: 0.2 },
      { x: -45, y: -60 },
    ),
  },
  backUpperReinforcingRail: {
    displayName: 'Upper Back Reinforcing Rail',
    measurements: [measurement('x', 'L', 1), measurement('y', 'H', 1)],
    annotation: annotation(
      'z',
      1,
      { x: 4, y: 0.2, z: 0 },
      { x: 12, y: -56 },
    ),
  },
  backLowerReinforcingRail: {
    displayName: 'Lower Back Reinforcing Rail',
    measurements: [measurement('x', 'L', -1), measurement('y', 'H', 1)],
    annotation: annotation('z', 1, { x: 0, y: -0.2, z: 0 }),
  },
  toeKickPanel: {
    displayName: 'Toe Kick',
    measurements: [measurement('x', 'W', -1), measurement('y', 'H', 1)],
    annotation: annotation('z', 1, { x: 0, y: -0.2, z: 0 }),
  },
  drawerFront: {
    displayName: 'Drawer Front',
    measurements: [
      measurement('x', 'W', 1, 1.6),
      measurement('y', 'H', 1),
    ],
    annotation: annotation(
      'z',
      1,
      { x: 8, y: 0.8, z: 0 },
      { x: 15, y: -6 },
    ),
  },
  lowerDoor: {
    displayName: 'Lower Door',
    measurements: [measurement('x', 'W', -1), measurement('y', 'H', 1)],
    annotation: annotation('z', 1, { x: 0, y: -0.25, z: 0 }),
  },
  drawerBoxLeftSide: {
    displayName: 'Drawer Box Left Side',
    measurements: [
      measurement('z', 'L', 1, 2),
      measurement('y', 'H', 1),
    ],
    annotation: annotation(
      'x',
      -1,
      { x: 0, y: 0.9, z: -7 },
      { x: -56, y: 20 },
    ),
  },
  drawerBoxRightSide: {
    displayName: 'Drawer Box Right Side',
    measurements: [measurement('z', 'L', -1), measurement('y', 'H', 1)],
    annotation: annotation(
      'x',
      1,
      { x: 0, y: -0.9, z: 7 },
      { x: 94, y: -2 },
    ),
  },
  drawerBoxFrontBoard: {
    displayName: 'Drawer Box Front Board',
    measurements: [measurement('x', 'W', 1), measurement('y', 'H', 1)],
    annotation: annotation(
      'z',
      1,
      { x: -2.2, y: 0.75, z: 0 },
      { x: -17, y: 17 },
    ),
  },
  drawerBoxBackBoard: {
    displayName: 'Drawer Box Back Board',
    measurements: [
      measurement('x', 'W', -1, 1.8),
      measurement('y', 'H', 1),
    ],
    annotation: annotation(
      'z',
      -1,
      { x: 8, y: -0.75, z: 0 },
      { x: -32, y: -14 },
    ),
  },
  drawerBoxBottom: {
    displayName: 'Drawer Box Bottom',
    measurements: [measurement('x', 'W', -1), measurement('z', 'D', 1)],
    annotation: annotation(
      'y',
      1,
      { x: 8, y: 0, z: -1.5 },
      { x: 78, y: -23 },
    ),
  },
} as const satisfies Readonly<
  Record<DimensionablePartId, DimensionDefinition>
>

/**
 * Builds the 16 semantic wooden-part annotations from the same live PartLayout
 * objects and nominal dimensions that drive cabinet geometry.
 */
export function createDimensionSpecs(
  layout: CabinetLayout,
): readonly DimensionSpec[] {
  return DIMENSIONABLE_PART_IDS.map((partId) => {
    const definition = DIMENSION_DEFINITIONS[partId]
    const part = layout.partMap[partId]

    if (!part) {
      throw new Error(`Dimensionable cabinet part is missing: ${partId}`)
    }

    const makeMeasurement = (
      item: (typeof definition.measurements)[number],
    ) => ({
      ...item,
      value: part.dimensions[item.localAxis],
    })
    const measurements = [
      makeMeasurement(definition.measurements[0]),
      makeMeasurement(definition.measurements[1]),
    ] as const
    const [first, second] = measurements

    return {
      partId,
      displayName: definition.displayName,
      part,
      measurements,
      annotation: definition.annotation,
      label: `${definition.displayName} — ${formatInches(first.value)} ${first.axisLabel} × ${formatInches(second.value)} ${second.axisLabel}`,
    }
  })
}
