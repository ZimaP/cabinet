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
import { isWallCabinetType } from './wallCabinetCatalog'

const expectedCatalog = {
  'door-drawer': {
    defaults: { width: 24, height: 34.5, depth: 24 },
    widthRange: { min: 18, max: 42, step: 0.25 },
    heightRange: { min: 28, max: 42, step: 0.25 },
    depthRange: { min: 18, max: 30, step: 0.25 },
    standardWidths: [18, 21, 24, 27, 30, 33, 36, 39, 42],
  },
  'triple-drawer': {
    defaults: { width: 24, height: 34.5, depth: 24 },
    widthRange: { min: 12, max: 36, step: 0.25 },
    heightRange: { min: 28, max: 42, step: 0.25 },
    depthRange: { min: 18, max: 30, step: 0.25 },
    standardWidths: [12, 15, 18, 21, 24, 30, 36],
  },
  'double-door-double-drawer': {
    defaults: { width: 36, height: 34.5, depth: 24 },
    widthRange: { min: 33, max: 42, step: 0.25 },
    heightRange: { min: 28, max: 42, step: 0.25 },
    depthRange: { min: 18, max: 30, step: 0.25 },
    standardWidths: [33, 36, 39, 42],
  },
  'vanity-sink-base': {
    defaults: { width: 30, height: 34.5, depth: 21 },
    widthRange: { min: 24, max: 42, step: 0.25 },
    heightRange: { min: 28, max: 42, step: 0.25 },
    depthRange: { min: 18, max: 30, step: 0.25 },
    standardWidths: [30],
  },
  'wall-single-42': {
    defaults: { width: 9, height: 42, depth: 12 },
    widthRange: { min: 9, max: 24, step: 3 },
    heightRange: { min: 42, max: 42, step: 1 },
    depthRange: { min: 12, max: 12, step: 1 },
    standardWidths: [9, 12, 15, 18, 21, 24],
  },
  'wall-double-42': {
    defaults: { width: 24, height: 42, depth: 12 },
    widthRange: { min: 24, max: 48, step: 3 },
    heightRange: { min: 42, max: 42, step: 1 },
    depthRange: { min: 12, max: 12, step: 1 },
    standardWidths: [24, 27, 30, 33, 36, 39, 42, 48],
  },
  'wall-single-36': {
    defaults: { width: 9, height: 36, depth: 12 },
    widthRange: { min: 9, max: 24, step: 3 },
    heightRange: { min: 36, max: 36, step: 1 },
    depthRange: { min: 12, max: 12, step: 1 },
    standardWidths: [9, 12, 15, 18, 21, 24],
  },
  'wall-double-36': {
    defaults: { width: 24, height: 36, depth: 12 },
    widthRange: { min: 24, max: 48, step: 3 },
    heightRange: { min: 36, max: 36, step: 1 },
    depthRange: { min: 12, max: 12, step: 1 },
    standardWidths: [24, 27, 30, 33, 36, 42, 48],
  },
} as const satisfies Record<
  CabinetType,
  {
    defaults: { width: number; height: number; depth: number }
    widthRange: { min: number; max: number; step: number }
    heightRange: { min: number; max: number; step: number }
    depthRange: { min: number; max: number; step: number }
    standardWidths: readonly number[]
  }
>

const countParts = (
  layout: CabinetLayout,
  predicate: (part: CabinetLayout['parts'][number]) => boolean,
) => layout.parts.filter(predicate).length

describe('cabinet catalog', () => {
  it('defines all eight menu models with their defaults, safe ranges, and reference widths', () => {
    expect(CABINET_TYPES).toEqual([
      'door-drawer',
      'triple-drawer',
      'double-door-double-drawer',
      'vanity-sink-base',
      'wall-single-42',
      'wall-double-42',
      'wall-single-36',
      'wall-double-36',
    ])
    expect(DEFAULT_CABINET_TYPE).toBe('door-drawer')
    expect(Object.keys(CABINET_CATALOG)).toEqual([...CABINET_TYPES])

    for (const type of CABINET_TYPES) {
      const entry = getCabinetCatalogEntry(type)
      const expected = expectedCatalog[type]

      expect(entry.id).toBe(type)
      expect(entry.defaultParameters).toEqual(expected.defaults)
      expect(entry.parameterRanges.width).toEqual(expected.widthRange)
      expect(entry.parameterRanges.height).toEqual(expected.heightRange)
      expect(entry.parameterRanges.depth).toEqual(expected.depthRange)
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
        if (isWallCabinetType(type)) {
          expect(part('backPanel').dimensions.z).toBe(0.5)
          expect(part('topPanel').dimensions.y).toBe(
            CABINET_CONFIG.panelThickness,
          )
          expect(layout.partMap.toeKickPanel).toBeUndefined()
          expect(layout.partMap.upperStrengtheningPanel).toBeUndefined()
        } else {
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
        }

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

    const vanity = calculateCatalogCabinetLayout('vanity-sink-base')
    expect(countParts(vanity, (part) => part.category === 'front')).toBe(4)
    expect(countParts(vanity, (part) => part.category === 'drawer')).toBe(0)
    expect(countParts(vanity, (part) => part.kind === 'dovetail')).toBe(0)
    expect(countParts(vanity, (part) => part.id.includes('Slide'))).toBe(0)
    expect(
      countParts(vanity, (part) =>
        part.id.toLowerCase().includes('hinge'),
      ),
    ).toBe(20)
    expect(countParts(vanity, (part) => part.id.includes('Pull'))).toBe(6)
    expect(vanity.partMap.fullDepthShelf).toBeUndefined()
    expect(vanity.partMap.centerVerticalDivider).toBeUndefined()
    expect(vanity.partMap.rearUpperStretcher).toBeDefined()

    const wallAssemblies = [
      { type: 'wall-single-42', doorCount: 1, shelfCount: 3 },
      { type: 'wall-double-42', doorCount: 2, shelfCount: 3 },
      { type: 'wall-single-36', doorCount: 1, shelfCount: 2 },
      { type: 'wall-double-36', doorCount: 2, shelfCount: 2 },
    ] as const

    for (const { type, doorCount, shelfCount } of wallAssemblies) {
      const wall = calculateCatalogCabinetLayout(type)
      const shelves = wall.parts.filter(
        (part) => part.category === 'carcass' && /^shelf\d+$/.test(part.id),
      )

      expect(countParts(wall, (part) => part.category === 'front')).toBe(
        doorCount,
      )
      expect(shelves).toHaveLength(shelfCount)
      expect(countParts(wall, (part) => part.category === 'drawer')).toBe(0)
      expect(countParts(wall, (part) => part.kind === 'dovetail')).toBe(0)
      expect(countParts(wall, (part) => part.id.includes('Slide'))).toBe(0)
      expect(wall.partMap.toeKickPanel).toBeUndefined()
      expect(wall.partMap.topPanel).toBeDefined()

      if (doorCount === 1) {
        expect(wall.partMap.singleDoor).toBeDefined()
        expect(wall.partMap.leftDoor).toBeUndefined()
        expect(wall.partMap.rightDoor).toBeUndefined()
      } else {
        expect(wall.partMap.singleDoor).toBeUndefined()
        expect(wall.partMap.leftDoor).toBeDefined()
        expect(wall.partMap.rightDoor).toBeDefined()
      }
    }
  })
})
