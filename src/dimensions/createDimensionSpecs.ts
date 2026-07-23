import type {
  CabinetLayout,
  ManufacturingMeasurementDefinition,
  PartLayout,
  Vector3Value,
} from '../model'
import { getManufacturingDefinitions } from '../model/semanticManufacturing'
import { formatInches } from './formatInches'
import type {
  DimensionAnnotationPlacement,
  DimensionMeasurement,
  DimensionSpec,
} from './types'

const DEFAULT_SURFACE_OFFSET = 0.22
const DEFAULT_LINE_OFFSET = 0.72
const ZERO_OFFSET: Vector3Value = { x: 0, y: 0, z: 0 }

function createMeasurement(
  part: PartLayout,
  definition: ManufacturingMeasurementDefinition,
): DimensionMeasurement {
  return {
    localAxis: definition.localAxis,
    axisLabel: definition.axisLabel,
    edgeSign: definition.edgeSign,
    lineOffset: definition.lineOffset ?? DEFAULT_LINE_OFFSET,
    // The displayed value comes directly from the same nominal board geometry
    // used by the model. World transforms and explosion never affect it.
    value: part.dimensions[definition.localAxis],
  }
}

/**
 * Builds annotations by walking the explicit semantic manufacturing metadata
 * attached by the selected cabinet layout. Hardware, dovetail inserts,
 * shelf-pin details, and other visual submeshes intentionally omit this field.
 */
export function createDimensionSpecs(
  layout: CabinetLayout,
): readonly DimensionSpec[] {
  const semanticOrder = new Map(
    Object.keys(getManufacturingDefinitions(layout.cabinetType)).map(
      (partId, index) => [partId, index],
    ),
  )
  const dimensionableParts = layout.parts
    .filter((part) => part.manufacturing)
    .sort(
      (first, second) =>
        (semanticOrder.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
        (semanticOrder.get(second.id) ?? Number.MAX_SAFE_INTEGER),
    )

  return dimensionableParts.flatMap((part): readonly DimensionSpec[] => {
    const definition = part.manufacturing
    if (!definition) return []

    const isWoodCategory =
      part.category === 'carcass' ||
      part.category === 'front' ||
      part.category === 'drawer'
    if (!isWoodCategory) return []

    const measurements = [
      createMeasurement(part, definition.measurements[0]),
      createMeasurement(part, definition.measurements[1]),
    ] as const
    const annotation: DimensionAnnotationPlacement = {
      faceAxis: definition.annotation.faceAxis,
      faceSign: definition.annotation.faceSign,
      surfaceOffset:
        definition.annotation.surfaceOffset ?? DEFAULT_SURFACE_OFFSET,
      labelOffset: definition.annotation.labelOffset ?? ZERO_OFFSET,
      labelScreenOffset: definition.annotation.labelScreenOffset,
      mobileLabelScreenOffset:
        definition.annotation.mobileLabelScreenOffset,
    }
    const [first, second] = measurements

    return [
      {
        partId: part.id,
        displayName: definition.displayName,
        part,
        measurements,
        annotation,
        label: `${definition.displayName} — ${formatInches(first.value)} ${first.axisLabel} × ${formatInches(second.value)} ${second.axisLabel}`,
      },
    ]
  })
}
