import type {
  DimensionLocalAxis,
  DimensionMeasurement,
  DimensionSpec,
} from '../../dimensions'

export type Point3 = readonly [number, number, number]

const LOCAL_AXES: readonly DimensionLocalAxis[] = ['x', 'y', 'z']

function axisValue(
  dimensions: DimensionSpec['part']['dimensions'],
  axis: DimensionLocalAxis,
) {
  return dimensions[axis]
}

function withAxis(
  point: Point3,
  axis: DimensionLocalAxis,
  value: number,
): Point3 {
  const next: [number, number, number] = [...point]
  next[LOCAL_AXES.indexOf(axis)] = value
  return next
}

function offsetAxisFor(
  faceAxis: DimensionLocalAxis,
  measurementAxis: DimensionLocalAxis,
) {
  const offsetAxis = LOCAL_AXES.find(
    (axis) => axis !== faceAxis && axis !== measurementAxis,
  )

  if (!offsetAxis) {
    throw new Error(
      `Dimension axis ${measurementAxis} must lie on face ${faceAxis}`,
    )
  }

  return offsetAxis
}

export interface DimensionLineGeometry {
  segments: readonly Point3[]
  measuredAxis: DimensionLocalAxis
  offsetAxis: DimensionLocalAxis
}

/**
 * Anchors the combined label just beyond the first (primary) dimension line.
 * Per-part metadata is then applied as a small additive nudge, keeping all
 * nominal placement logic centralized in the renderer.
 */
export function createDimensionLabelPosition(spec: DimensionSpec): Point3 {
  const primary = spec.measurements[0]
  const offsetAxis = offsetAxisFor(
    spec.annotation.faceAxis,
    primary.localAxis,
  )
  const faceCoordinate =
    spec.annotation.faceSign *
    (axisValue(spec.part.dimensions, spec.annotation.faceAxis) / 2 +
      spec.annotation.surfaceOffset)
  const lineCoordinate =
    primary.edgeSign * axisValue(spec.part.dimensions, offsetAxis) / 2 +
    primary.edgeSign * primary.lineOffset
  const labelClearance = 0.5

  let position: Point3 = [
    spec.annotation.labelOffset.x,
    spec.annotation.labelOffset.y,
    spec.annotation.labelOffset.z,
  ]
  position = withAxis(
    position,
    spec.annotation.faceAxis,
    faceCoordinate + spec.annotation.labelOffset[spec.annotation.faceAxis],
  )
  position = withAxis(
    position,
    offsetAxis,
    lineCoordinate +
      primary.edgeSign * labelClearance +
      spec.annotation.labelOffset[offsetAxis],
  )

  return position
}

/**
 * Produces paired line segments in a part's centered local coordinate system.
 * The dimension line sits outside one edge of the nominated annotation face;
 * the measured stock thickness is never consulted as a displayed value.
 */
export function createDimensionLineGeometry(
  spec: DimensionSpec,
  measurement: DimensionMeasurement,
): DimensionLineGeometry {
  const { annotation, part } = spec
  const measuredAxis = measurement.localAxis
  const offsetAxis = offsetAxisFor(annotation.faceAxis, measuredAxis)
  const halfLength = measurement.value / 2
  const faceCoordinate =
    annotation.faceSign *
    (axisValue(part.dimensions, annotation.faceAxis) / 2 +
      annotation.surfaceOffset)
  const partEdgeCoordinate =
    measurement.edgeSign * axisValue(part.dimensions, offsetAxis) / 2
  const lineCoordinate =
    partEdgeCoordinate + measurement.edgeSign * measurement.lineOffset

  let origin: Point3 = [0, 0, 0]
  origin = withAxis(origin, annotation.faceAxis, faceCoordinate)
  origin = withAxis(origin, offsetAxis, lineCoordinate)

  const start = withAxis(origin, measuredAxis, -halfLength)
  const end = withAxis(origin, measuredAxis, halfLength)

  const extensionGap = 0.07
  const extensionOverrun = 0.14
  const extensionStartCoordinate =
    partEdgeCoordinate + measurement.edgeSign * extensionGap
  const extensionEndCoordinate =
    lineCoordinate + measurement.edgeSign * extensionOverrun

  const startExtensionAtPart = withAxis(
    withAxis(origin, measuredAxis, -halfLength),
    offsetAxis,
    extensionStartCoordinate,
  )
  const startExtensionPastLine = withAxis(
    startExtensionAtPart,
    offsetAxis,
    extensionEndCoordinate,
  )
  const endExtensionAtPart = withAxis(
    withAxis(origin, measuredAxis, halfLength),
    offsetAxis,
    extensionStartCoordinate,
  )
  const endExtensionPastLine = withAxis(
    endExtensionAtPart,
    offsetAxis,
    extensionEndCoordinate,
  )

  // Open arrowheads remain clear at both short rail sizes and long cabinet
  // dimensions without introducing geometry whose apparent size is excessive.
  const arrowLength = Math.min(0.42, Math.max(0.2, measurement.value * 0.035))
  const arrowWidth = arrowLength * 0.42

  const startArrowCenter = withAxis(
    start,
    measuredAxis,
    -halfLength + arrowLength,
  )
  const endArrowCenter = withAxis(
    end,
    measuredAxis,
    halfLength - arrowLength,
  )
  const startArrowA = withAxis(
    startArrowCenter,
    offsetAxis,
    lineCoordinate - arrowWidth,
  )
  const startArrowB = withAxis(
    startArrowCenter,
    offsetAxis,
    lineCoordinate + arrowWidth,
  )
  const endArrowA = withAxis(
    endArrowCenter,
    offsetAxis,
    lineCoordinate - arrowWidth,
  )
  const endArrowB = withAxis(
    endArrowCenter,
    offsetAxis,
    lineCoordinate + arrowWidth,
  )

  // `Line` receives these as independent pairs via its `segments` mode.
  return {
    measuredAxis,
    offsetAxis,
    segments: [
      start,
      end,
      startExtensionAtPart,
      startExtensionPastLine,
      endExtensionAtPart,
      endExtensionPastLine,
      start,
      startArrowA,
      start,
      startArrowB,
      end,
      endArrowA,
      end,
      endArrowB,
    ],
  }
}
