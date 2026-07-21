import { describe, expect, it } from 'vitest'

import { CABINET_CONFIG, calculateCabinetLayout } from '../model'
import {
  DIMENSIONABLE_PART_IDS,
  createDimensionSpecs,
  formatInches,
  type DimensionSpec,
  type DimensionablePartId,
} from '.'

const spec = (
  specs: readonly DimensionSpec[],
  partId: DimensionablePartId,
) => {
  const result = specs.find((candidate) => candidate.partId === partId)
  if (!result) throw new Error(`Missing dimension spec: ${partId}`)
  return result
}

const axes = (target: DimensionSpec) =>
  target.measurements.map((measurement) => measurement.localAxis)

describe('formatInches', () => {
  it('formats a whole inch without an unnecessary fraction', () => {
    expect(formatInches(24)).toBe('24"')
  })

  it('formats and reduces mixed fractions', () => {
    expect(formatInches(34.5)).toBe('34 1/2"')
    expect(formatInches(0.75)).toBe('3/4"')
  })

  it('formats exact sixteenths', () => {
    expect(formatInches(3.9375)).toBe('3 15/16"')
  })

  it('carries a fraction that rounds to 16/16 into the whole inch', () => {
    expect(formatInches(7.999)).toBe('8"')
  })

  it('absorbs floating-point noise near a valid architectural fraction', () => {
    expect(formatInches(23.749999999)).toBe('23 3/4"')
    expect(formatInches(22.437500001)).toBe('22 7/16"')
  })
})

describe('createDimensionSpecs', () => {
  it('maps the door to width and height without its thickness axis', () => {
    const layout = calculateCabinetLayout()
    const target = spec(createDimensionSpecs(layout), 'lowerDoor')

    expect(axes(target)).toEqual(['x', 'y'])
    expect(target.measurements.map(({ axisLabel }) => axisLabel)).toEqual([
      'W',
      'H',
    ])
    expect(target.measurements.map(({ value }) => value)).toEqual([
      layout.partMap.lowerDoor.dimensions.x,
      layout.partMap.lowerDoor.dimensions.y,
    ])
    expect(axes(target)).not.toContain('z')
  })

  it('maps each side panel to depth and height without its thickness axis', () => {
    const layout = calculateCabinetLayout()
    const specs = createDimensionSpecs(layout)

    for (const id of ['leftSidePanel', 'rightSidePanel'] as const) {
      const target = spec(specs, id)
      expect(axes(target)).toEqual(['z', 'y'])
      expect(target.measurements.map(({ axisLabel }) => axisLabel)).toEqual([
        'D',
        'H',
      ])
      expect(axes(target)).not.toContain('x')
    }
  })

  it('maps the shelf to width and depth without its thickness axis', () => {
    const target = spec(
      createDimensionSpecs(calculateCabinetLayout()),
      'fullDepthShelf',
    )

    expect(axes(target)).toEqual(['x', 'z'])
    expect(target.measurements.map(({ axisLabel }) => axisLabel)).toEqual([
      'W',
      'D',
    ])
    expect(axes(target)).not.toContain('y')
  })

  it('updates every width-dependent annotation from a resized live layout', () => {
    const narrow = createDimensionSpecs(calculateCabinetLayout({ width: 18 }))
    const wide = createDimensionSpecs(calculateCabinetLayout({ width: 42 }))

    for (const id of [
      'bottomPanel',
      'backPanel',
      'fullDepthShelf',
      'upperStrengtheningPanel',
      'toeKickPanel',
      'drawerFront',
      'lowerDoor',
      'drawerBoxFrontBoard',
      'drawerBoxBottom',
    ] as const) {
      expect(spec(wide, id).measurements[0].value).toBeGreaterThan(
        spec(narrow, id).measurements[0].value,
      )
    }
    expect(spec(wide, 'leftSidePanel').measurements[0].value).toBe(
      spec(narrow, 'leftSidePanel').measurements[0].value,
    )
  })

  it('updates height-dependent annotations while leaving fixed board faces fixed', () => {
    const low = createDimensionSpecs(calculateCabinetLayout({ height: 28 }))
    const high = createDimensionSpecs(calculateCabinetLayout({ height: 42 }))

    expect(spec(high, 'leftSidePanel').measurements[1].value).toBeGreaterThan(
      spec(low, 'leftSidePanel').measurements[1].value,
    )
    expect(spec(high, 'backPanel').measurements[1].value).toBeGreaterThan(
      spec(low, 'backPanel').measurements[1].value,
    )
    expect(spec(high, 'lowerDoor').measurements[1].value).toBeGreaterThan(
      spec(low, 'lowerDoor').measurements[1].value,
    )
    expect(spec(high, 'toeKickPanel').measurements[1].value).toBe(
      spec(low, 'toeKickPanel').measurements[1].value,
    )
  })

  it('updates every depth-dependent cut dimension without changing fronts', () => {
    const shallow = createDimensionSpecs(calculateCabinetLayout({ depth: 18 }))
    const deep = createDimensionSpecs(calculateCabinetLayout({ depth: 30 }))

    for (const id of [
      'leftSidePanel',
      'rightSidePanel',
      'bottomPanel',
      'fullDepthShelf',
      'drawerBoxLeftSide',
      'drawerBoxRightSide',
      'drawerBoxBottom',
    ] as const) {
      const target = spec(deep, id)
      const depthIndex = target.measurements.findIndex(
        ({ axisLabel }) => axisLabel === 'D' || axisLabel === 'L',
      )
      expect(depthIndex).toBeGreaterThanOrEqual(0)
      expect(target.measurements[depthIndex].value).toBeGreaterThan(
        spec(shallow, id).measurements[depthIndex].value,
      )
    }
    expect(spec(deep, 'drawerFront').measurements).toEqual(
      spec(shallow, 'drawerFront').measurements,
    )
  })

  it('preserves fixed toe-kick and reinforcing cross-section dimensions', () => {
    for (const parameters of [
      { width: 18, height: 28, depth: 18 },
      { width: 42, height: 42, depth: 30 },
    ]) {
      const layout = calculateCabinetLayout(parameters)
      const specs = createDimensionSpecs(layout)
      expect(layout.partMap.leftSidePanel.dimensions.x).toBe(
        CABINET_CONFIG.panelThickness,
      )
      expect(layout.partMap.bottomPanel.dimensions.y).toBe(
        CABINET_CONFIG.panelThickness,
      )
      expect(layout.partMap.backPanel.dimensions.z).toBe(
        CABINET_CONFIG.backThickness,
      )
      expect(spec(specs, 'toeKickPanel').measurements[1].value).toBe(
        CABINET_CONFIG.toeKickHeight,
      )
      expect(
        spec(specs, 'upperStrengtheningPanel').measurements[1].value,
      ).toBe(CABINET_CONFIG.railWidth)
      expect(
        spec(specs, 'backUpperReinforcingRail').measurements[1].value,
      ).toBe(CABINET_CONFIG.railWidth)
      expect(
        spec(specs, 'backLowerReinforcingRail').measurements[1].value,
      ).toBe(CABINET_CONFIG.railWidth)
    }
  })

  it('excludes every hardware part through the explicit semantic allowlist', () => {
    const layout = calculateCabinetLayout()
    const specs = createDimensionSpecs(layout)

    expect(specs.some(({ part }) => part.category === 'hardware')).toBe(false)
    for (const hardware of layout.parts.filter(
      ({ category }) => category === 'hardware',
    )) {
      expect(specs.some(({ partId }) => partId === hardware.id)).toBe(false)
    }
  })

  it('creates one spec per semantic board and none for visual detail meshes', () => {
    const layout = calculateCabinetLayout()
    const specs = createDimensionSpecs(layout)

    expect(specs).toHaveLength(16)
    expect(specs.map(({ partId }) => partId)).toEqual(DIMENSIONABLE_PART_IDS)
    expect(new Set(specs.map(({ partId }) => partId)).size).toBe(16)
    expect(specs.every(({ part }) => part.category !== 'detail')).toBe(true)
    expect(
      layout.parts
        .filter(({ category }) => category === 'detail')
        .some((detail) => specs.some(({ partId }) => partId === detail.id)),
    ).toBe(false)
  })

  it('retains the exact live PartLayout reference and formats its two values', () => {
    const layout = calculateCabinetLayout({ width: 31.25, depth: 26.5 })
    const target = spec(createDimensionSpecs(layout), 'bottomPanel')

    expect(target.part).toBe(layout.partMap.bottomPanel)
    expect(target.label).toBe(
      `Bottom Panel — ${formatInches(target.part.dimensions.x)} W × ${formatInches(target.part.dimensions.z)} D`,
    )
  })
})
