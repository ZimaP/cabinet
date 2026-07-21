import { describe, expect, it } from 'vitest'

import { createDimensionSpecs } from '.'
import { calculateCabinetLayout } from '../model/calculateCabinetLayout'
import { calculateDoubleDoorDoubleDrawerLayout } from '../model/calculateDoubleDoorDoubleDrawerLayout'
import { calculateTripleDrawerCabinetLayout } from '../model/calculateTripleDrawerCabinetLayout'
import { finalizeCabinetLayout } from '../model/semanticManufacturing'
import type { CabinetLayout } from '../model/types'

const withSemanticManufacturing = (layout: CabinetLayout) =>
  finalizeCabinetLayout(
    layout.cabinetType,
    layout.parameters,
    layout.derived,
    layout.parts,
  )

const dimensionsFor = (layout: CabinetLayout, id: string) => {
  const target = createDimensionSpecs(layout).find(({ partId }) => partId === id)
  if (!target) throw new Error(`Missing dimensions for ${id}`)
  return target
}

describe('catalog manufacturing dimensions', () => {
  it('annotates every semantic triple-drawer board exactly once', () => {
    const layout = withSemanticManufacturing(
      calculateTripleDrawerCabinetLayout(),
    )
    const specs = createDimensionSpecs(layout)

    expect(specs).toHaveLength(26)
    expect(new Set(specs.map(({ partId }) => partId)).size).toBe(26)
    expect(dimensionsFor(layout, 'topDrawerFront').measurements.map(
      ({ axisLabel }) => axisLabel,
    )).toEqual(['W', 'H'])
    expect(dimensionsFor(layout, 'middleDrawerBoxLeftSide').measurements.map(
      ({ axisLabel }) => axisLabel,
    )).toEqual(['L', 'H'])
    expect(dimensionsFor(layout, 'bottomDrawerBoxBottom').measurements.map(
      ({ axisLabel }) => axisLabel,
    )).toEqual(['W', 'D'])
  })

  it('annotates both double-cabinet bays plus the shelf and center divider', () => {
    const layout = withSemanticManufacturing(
      calculateDoubleDoorDoubleDrawerLayout(),
    )
    const specs = createDimensionSpecs(layout)

    expect(specs).toHaveLength(24)
    expect(dimensionsFor(layout, 'leftDoor').measurements.map(
      ({ axisLabel }) => axisLabel,
    )).toEqual(['W', 'H'])
    expect(dimensionsFor(layout, 'rightDrawerBoxBottom').measurements.map(
      ({ axisLabel }) => axisLabel,
    )).toEqual(['W', 'D'])
    expect(dimensionsFor(layout, 'centerVerticalDivider').measurements.map(
      ({ axisLabel }) => axisLabel,
    )).toEqual(['D', 'H'])
    expect(specs.map(({ partId }) => partId)).toContain('fullDepthShelf')
  })

  it('reads resized catalog values from live nominal part dimensions', () => {
    const narrowTriple = withSemanticManufacturing(
      calculateTripleDrawerCabinetLayout({ width: 12, depth: 18 }),
    )
    const wideTriple = withSemanticManufacturing(
      calculateTripleDrawerCabinetLayout({ width: 36, depth: 30 }),
    )
    expect(
      dimensionsFor(wideTriple, 'topDrawerFront').measurements[0].value,
    ).toBeGreaterThan(
      dimensionsFor(narrowTriple, 'topDrawerFront').measurements[0].value,
    )
    expect(
      dimensionsFor(wideTriple, 'topDrawerBoxLeftSide').measurements[0].value,
    ).toBeGreaterThan(
      dimensionsFor(narrowTriple, 'topDrawerBoxLeftSide').measurements[0].value,
    )

    const lowDouble = withSemanticManufacturing(
      calculateDoubleDoorDoubleDrawerLayout({ height: 28 }),
    )
    const highDouble = withSemanticManufacturing(
      calculateDoubleDoorDoubleDrawerLayout({ height: 42 }),
    )
    expect(dimensionsFor(highDouble, 'leftDoor').measurements[1].value).toBeGreaterThan(
      dimensionsFor(lowDouble, 'leftDoor').measurements[1].value,
    )
  })

  it('never annotates hardware, dovetails, holes, or other detail meshes', () => {
    const layouts = [
      withSemanticManufacturing(calculateCabinetLayout()),
      withSemanticManufacturing(calculateTripleDrawerCabinetLayout()),
      withSemanticManufacturing(calculateDoubleDoorDoubleDrawerLayout()),
    ]

    for (const layout of layouts) {
      const dimensionIds = new Set(
        createDimensionSpecs(layout).map(({ partId }) => partId),
      )
      for (const part of layout.parts) {
        if (part.category === 'hardware' || part.category === 'detail') {
          expect(dimensionIds.has(part.id)).toBe(false)
        }
      }
    }
  })
})
