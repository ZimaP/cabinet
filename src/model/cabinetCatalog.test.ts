import { describe, expect, it } from 'vitest'

import { CABINET_CONFIG } from './cabinetConstants'
import {
  CABINET_CATALOG,
  CABINET_TYPES,
  DEFAULT_CABINET_TYPE,
  getCabinetCatalogEntry,
} from './cabinetCatalog'
import { calculateCabinetLayout } from './calculateCabinetLayout'
import { calculateCatalogCabinetLayout } from './calculateCatalogCabinetLayout'
import type { CabinetLayout, CabinetType } from './types'

const expectedCatalog = {
  'door-drawer': {
    defaults: { width: 24, height: 34.5, depth: 24 },
    widthRange: { min: 18, max: 42, step: 0.25 },
    standardWidths: [18, 21, 24, 27, 30, 33, 36, 39, 42],
  },
  'triple-drawer': {
    defaults: { width: 24, height: 34.5, depth: 24 },
    widthRange: { min: 12, max: 36, step: 0.25 },
    standardWidths: [12, 15, 18, 21, 24, 30, 36],
  },
  'double-door-double-drawer': {
    defaults: { width: 36, height: 34.5, depth: 24 },
    widthRange: { min: 33, max: 42, step: 0.25 },
    standardWidths: [33, 36, 39, 42],
  },
} as const satisfies Record<
  CabinetType,
  {
    defaults: { width: number; height: number; depth: number }
    widthRange: { min: number; max: number; step: number }
    standardWidths: readonly number[]
  }
>

const countParts = (
  layout: CabinetLayout,
  predicate: (part: CabinetLayout['parts'][number]) => boolean,
) => layout.parts.filter(predicate).length

describe('cabinet catalog', () => {
  it('defines the three models with their defaults, safe ranges, and reference widths', () => {
    expect(CABINET_TYPES).toEqual([
      'door-drawer',
      'triple-drawer',
      'double-door-double-drawer',
    ])
    expect(DEFAULT_CABINET_TYPE).toBe('door-drawer')
    expect(Object.keys(CABINET_CATALOG)).toEqual([...CABINET_TYPES])

    for (const type of CABINET_TYPES) {
      const entry = getCabinetCatalogEntry(type)
      const expected = expectedCatalog[type]

      expect(entry.id).toBe(type)
      expect(entry.defaultParameters).toEqual(expected.defaults)
      expect(entry.parameterRanges.width).toEqual(expected.widthRange)
      expect(entry.parameterRanges.height).toEqual({
        min: 28,
        max: 42,
        step: 0.25,
      })
      expect(entry.parameterRanges.depth).toEqual({
        min: 18,
        max: 30,
        step: 0.25,
      })
      expect(entry.standardWidths).toEqual(expected.standardWidths)
    }
  })

  it('dispatches each model to its own calculator and model-specific default', () => {
    for (const type of CABINET_TYPES) {
      const layout = calculateCatalogCabinetLayout(type)

      expect(layout.cabinetType).toBe(type)
      expect(layout.parameters).toEqual(expectedCatalog[type].defaults)
    }
  })

  it('preserves the original door-and-drawer calculator contract', () => {
    const parameters = { width: 31.25, height: 37.75, depth: 26.5 }
    const original = calculateCabinetLayout(parameters)
    const dispatched = calculateCatalogCabinetLayout(
      'door-drawer',
      parameters,
    )

    expect(dispatched.cabinetType).toBe('door-drawer')
    expect(dispatched.parameters).toEqual(original.parameters)
    expect(dispatched.derived).toEqual(original.derived)
    expect(dispatched.parts.map((part) => part.id)).toEqual(
      original.parts.map((part) => part.id),
    )
  })

  it('creates unique positive parts and preserves fixed construction stock at every catalog extreme', () => {
    for (const type of CABINET_TYPES) {
      const { parameterRanges } = getCabinetCatalogEntry(type)
      for (const parameters of [
        {
          width: parameterRanges.width.min,
          height: parameterRanges.height.min,
          depth: parameterRanges.depth.min,
        },
        {
          width: parameterRanges.width.max,
          height: parameterRanges.height.max,
          depth: parameterRanges.depth.max,
        },
      ]) {
        const layout = calculateCatalogCabinetLayout(type, parameters)
        const part = (id: string) => {
          const result = layout.partMap[id]
          if (!result) throw new Error(`${type} is missing ${id}`)
          return result
        }

        expect(new Set(layout.parts.map((target) => target.id)).size).toBe(
          layout.parts.length,
        )
        for (const target of layout.parts) {
          expect(target.dimensions.x, `${type}:${target.id}`).toBeGreaterThan(0)
          expect(target.dimensions.y, `${type}:${target.id}`).toBeGreaterThan(0)
          expect(target.dimensions.z, `${type}:${target.id}`).toBeGreaterThan(0)
        }

        expect(part('leftSidePanel').dimensions.x).toBe(
          CABINET_CONFIG.panelThickness,
        )
        expect(part('rightSidePanel').dimensions.x).toBe(
          CABINET_CONFIG.panelThickness,
        )
        expect(part('bottomPanel').dimensions.y).toBe(
          CABINET_CONFIG.panelThickness,
        )
        expect(part('backPanel').dimensions.z).toBe(
          CABINET_CONFIG.backThickness,
        )
        expect(part('toeKickPanel').dimensions.y).toBe(
          CABINET_CONFIG.toeKickHeight,
        )
        expect(part('upperStrengtheningPanel').dimensions.y).toBe(
          CABINET_CONFIG.panelThickness,
        )
        expect(part('upperStrengtheningPanel').dimensions.z).toBe(
          CABINET_CONFIG.railWidth,
        )

        for (const front of layout.parts.filter(
          (target) => target.category === 'front',
        )) {
          expect(front.dimensions.z, `${type}:${front.id}`).toBe(
            CABINET_CONFIG.panelThickness,
          )
        }
        for (const drawerPart of layout.parts.filter(
          (target) => target.category === 'drawer',
        )) {
          if (drawerPart.id.endsWith('LeftSide') || drawerPart.id.endsWith('RightSide')) {
            expect(drawerPart.dimensions.x, `${type}:${drawerPart.id}`).toBe(
              CABINET_CONFIG.drawerStock,
            )
          } else if (drawerPart.id.endsWith('Board')) {
            expect(drawerPart.dimensions.z, `${type}:${drawerPart.id}`).toBe(
              CABINET_CONFIG.drawerStock,
            )
          } else if (drawerPart.id.endsWith('Bottom')) {
            expect(drawerPart.dimensions.y, `${type}:${drawerPart.id}`).toBe(
              CABINET_CONFIG.drawerBottomThickness,
            )
          }
        }
      }
    }
  })

  it('keeps each model as the intended high-level assembly', () => {
    const original = calculateCatalogCabinetLayout('door-drawer')
    expect(countParts(original, (part) => part.category === 'front')).toBe(2)
    expect(countParts(original, (part) => part.category === 'drawer')).toBe(5)
    expect(countParts(original, (part) => part.kind === 'dovetail')).toBe(4)
    expect(countParts(original, (part) => part.id.includes('Slide'))).toBe(8)
    expect(
      countParts(original, (part) =>
        part.id.toLowerCase().includes('hinge'),
      ),
    ).toBe(10)
    expect(original.partMap.fullDepthShelf).toBeDefined()
    expect(original.partMap.centerVerticalDivider).toBeUndefined()

    const triple = calculateCatalogCabinetLayout('triple-drawer')
    expect(countParts(triple, (part) => part.category === 'front')).toBe(3)
    expect(countParts(triple, (part) => part.category === 'drawer')).toBe(15)
    expect(countParts(triple, (part) => part.kind === 'dovetail')).toBe(12)
    expect(countParts(triple, (part) => part.id.includes('Slide'))).toBe(36)
    expect(countParts(triple, (part) => part.id.includes('Door'))).toBe(0)
    expect(
      countParts(triple, (part) =>
        part.id.toLowerCase().includes('hinge'),
      ),
    ).toBe(0)
    expect(triple.partMap.fullDepthShelf).toBeUndefined()

    const double = calculateCatalogCabinetLayout(
      'double-door-double-drawer',
    )
    expect(countParts(double, (part) => part.category === 'front')).toBe(4)
    expect(countParts(double, (part) => part.category === 'drawer')).toBe(10)
    expect(countParts(double, (part) => part.kind === 'dovetail')).toBe(8)
    expect(countParts(double, (part) => part.id.includes('Slide'))).toBe(16)
    expect(
      countParts(double, (part) =>
        part.id.toLowerCase().includes('hinge'),
      ),
    ).toBe(20)
    expect(double.partMap.fullDepthShelf).toBeDefined()
    expect(double.partMap.centerVerticalDivider).toBeDefined()
  })
})
