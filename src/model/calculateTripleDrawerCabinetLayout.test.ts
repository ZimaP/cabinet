import { describe, expect, it } from 'vitest'

import { CABINET_CONFIG } from './cabinetConstants'
import {
  calculateTripleDrawerCabinetLayout,
  TRIPLE_DRAWER_CATALOG_WIDTHS,
  TRIPLE_DRAWER_CONFIG,
  TRIPLE_DRAWER_DEFAULT_PARAMETERS,
  type TripleDrawerCabinetLayout,
  type TripleDrawerPrefix,
} from './calculateTripleDrawerCabinetLayout'

const DRAWERS: readonly TripleDrawerPrefix[] = [
  'topDrawer',
  'middleDrawer',
  'bottomDrawer',
]

function part(layout: TripleDrawerCabinetLayout, id: string) {
  const result = layout.partMap[id]
  if (!result) throw new Error(`Missing part: ${id}`)
  return result
}

describe('calculateTripleDrawerCabinetLayout', () => {
  it('builds a 24 × 34.5 × 24 cabinet with three independent drawer fronts', () => {
    const layout = calculateTripleDrawerCabinetLayout()

    expect(layout.parameters).toEqual(TRIPLE_DRAWER_DEFAULT_PARAMETERS)
    expect(layout.parts).toHaveLength(74)
    expect(layout.derived.drawerRows).toHaveLength(3)
    expect(part(layout, 'topDrawerFront')).not.toBe(
      part(layout, 'topDrawerBoxFrontBoard'),
    )
    expect(part(layout, 'middleDrawerFront')).not.toBe(
      part(layout, 'middleDrawerBoxFrontBoard'),
    )
    expect(part(layout, 'bottomDrawerFront')).not.toBe(
      part(layout, 'bottomDrawerBoxFrontBoard'),
    )
  })

  it('stacks a shallow top front above two deeper fronts with fixed reveals', () => {
    const layout = calculateTripleDrawerCabinetLayout()
    const [top, middle, bottom] = DRAWERS.map((prefix) =>
      part(layout, `${prefix}Front`),
    )
    const gap = (upper: typeof top, lower: typeof top) =>
      upper.position.y -
      upper.dimensions.y / 2 -
      (lower.position.y + lower.dimensions.y / 2)

    expect(top.dimensions.y).toBeLessThan(middle.dimensions.y)
    expect(top.dimensions.y).toBeLessThan(bottom.dimensions.y)
    expect(bottom.dimensions.y).toBeGreaterThan(middle.dimensions.y)
    expect(gap(top, middle)).toBeCloseTo(
      TRIPLE_DRAWER_CONFIG.frontGap,
      3,
    )
    expect(gap(middle, bottom)).toBeCloseTo(
      TRIPLE_DRAWER_CONFIG.frontGap,
      3,
    )
    expect(
      top.position.y + top.dimensions.y / 2,
    ).toBeCloseTo(
      layout.parameters.height - CABINET_CONFIG.frontReveal,
      4,
    )
    expect(
      bottom.position.y - bottom.dimensions.y / 2,
    ).toBeCloseTo(
      CABINET_CONFIG.toeKickHeight + CABINET_CONFIG.frontReveal,
      4,
    )
  })

  it('gives every drawer five boards, four dovetail corners, and two complete slide assemblies', () => {
    const layout = calculateTripleDrawerCabinetLayout()

    for (const prefix of DRAWERS) {
      for (const board of [
        'LeftSide',
        'RightSide',
        'FrontBoard',
        'BackBoard',
        'Bottom',
      ]) {
        expect(part(layout, `${prefix}Box${board}`).category).toBe('drawer')
      }

      const dovetails = layout.parts.filter(
        (candidate) =>
          candidate.id.startsWith(`${prefix}Box`) &&
          candidate.kind === 'dovetail',
      )
      expect(dovetails).toHaveLength(4)

      for (const side of ['Left', 'Right']) {
        for (const stage of ['Outer', 'Middle', 'Inner']) {
          const slide = part(
            layout,
            `${prefix}${side}Slide${stage}Section`,
          )
          expect(slide.category).toBe('hardware')
          expect(slide.metadata.stage).toBe(stage.toLowerCase())
        }
        expect(
          part(layout, `${prefix}${side}SlideSoftCloseHousing`).metadata
            .mechanism,
        ).toBe('soft-close')
        expect(
          part(layout, `${prefix}${side}SlideMountingScrewFront`).kind,
        ).toBe('screw')
        expect(
          part(layout, `${prefix}${side}SlideMountingScrewRear`).kind,
        ).toBe('screw')
      }
    }
  })

  it('preserves exact construction stock at minimum, default, and maximum sizes', () => {
    for (const dimensions of [
      { width: 12, height: 28, depth: 18 },
      TRIPLE_DRAWER_DEFAULT_PARAMETERS,
      { width: 36, height: 42, depth: 30 },
    ]) {
      const layout = calculateTripleDrawerCabinetLayout(dimensions)
      expect(part(layout, 'leftSidePanel').dimensions.x).toBe(0.75)
      expect(part(layout, 'rightSidePanel').dimensions.x).toBe(0.75)
      expect(part(layout, 'bottomPanel').dimensions.y).toBe(0.75)
      expect(part(layout, 'backPanel').dimensions.z).toBe(0.25)
      expect(part(layout, 'toeKickPanel').dimensions.y).toBe(4.5)
      expect(part(layout, 'upperStrengtheningPanel').dimensions).toEqual(
        expect.objectContaining({ y: 0.75, z: 3.9375 }),
      )

      for (const prefix of DRAWERS) {
        expect(part(layout, `${prefix}Front`).dimensions.z).toBe(0.75)
        expect(part(layout, `${prefix}BoxLeftSide`).dimensions.x).toBe(0.5)
        expect(part(layout, `${prefix}BoxRightSide`).dimensions.x).toBe(0.5)
        expect(part(layout, `${prefix}BoxFrontBoard`).dimensions.z).toBe(0.5)
        expect(part(layout, `${prefix}BoxBackBoard`).dimensions.z).toBe(0.5)
        expect(part(layout, `${prefix}BoxBottom`).dimensions.y).toBe(0.25)
      }
    }
  })

  it('updates all horizontal spans and slide positions when width changes', () => {
    const narrow = calculateTripleDrawerCabinetLayout({ width: 12 })
    const wide = calculateTripleDrawerCabinetLayout({ width: 36 })

    expect(part(wide, 'bottomPanel').dimensions.x).toBeGreaterThan(
      part(narrow, 'bottomPanel').dimensions.x,
    )
    expect(part(wide, 'topDrawerFront').dimensions.x).toBeGreaterThan(
      part(narrow, 'topDrawerFront').dimensions.x,
    )
    for (const prefix of DRAWERS) {
      expect(part(wide, `${prefix}BoxFrontBoard`).dimensions.x).toBeGreaterThan(
        part(narrow, `${prefix}BoxFrontBoard`).dimensions.x,
      )
      expect(part(wide, `${prefix}LeftSlideOuterSection`).position.x).toBeLessThan(
        part(narrow, `${prefix}LeftSlideOuterSection`).position.x,
      )
      expect(part(wide, `${prefix}Front`).dimensions.z).toBe(
        part(narrow, `${prefix}Front`).dimensions.z,
      )
    }
  })

  it('recalculates all front and drawer row heights without scaling fixed toe-kick geometry', () => {
    const low = calculateTripleDrawerCabinetLayout({ height: 28 })
    const high = calculateTripleDrawerCabinetLayout({ height: 42 })

    expect(part(high, 'middleDrawerFront').dimensions.y).toBeGreaterThan(
      part(low, 'middleDrawerFront').dimensions.y,
    )
    expect(part(high, 'bottomDrawerFront').dimensions.y).toBeGreaterThan(
      part(low, 'bottomDrawerFront').dimensions.y,
    )
    expect(part(high, 'topDrawerFront').position.y).toBeGreaterThan(
      part(low, 'topDrawerFront').position.y,
    )
    expect(part(high, 'toeKickPanel').dimensions.y).toBe(
      part(low, 'toeKickPanel').dimensions.y,
    )
    expect(part(high, 'bottomPanel').position.y).toBe(
      part(low, 'bottomPanel').position.y,
    )
  })

  it('updates every drawer box and telescoping slide when depth changes', () => {
    const shallow = calculateTripleDrawerCabinetLayout({ depth: 18 })
    const deep = calculateTripleDrawerCabinetLayout({ depth: 30 })

    expect(part(deep, 'leftSidePanel').dimensions.z).toBe(30)
    expect(part(deep, 'bottomPanel').dimensions.z).toBeGreaterThan(
      part(shallow, 'bottomPanel').dimensions.z,
    )
    expect(part(deep, 'backPanel').position.z).toBe(-30 / 2 + 0.25 / 2)

    for (const prefix of DRAWERS) {
      expect(part(deep, `${prefix}BoxLeftSide`).dimensions.z).toBeGreaterThan(
        part(shallow, `${prefix}BoxLeftSide`).dimensions.z,
      )
      for (const side of ['Left', 'Right']) {
        for (const stage of ['Outer', 'Middle', 'Inner']) {
          expect(
            part(deep, `${prefix}${side}Slide${stage}Section`).dimensions.z,
          ).toBeGreaterThan(
            part(shallow, `${prefix}${side}Slide${stage}Section`).dimensions.z,
          )
        }
      }
    }
  })

  it('keeps all three drawer boxes centered with symmetric slides', () => {
    const layout = calculateTripleDrawerCabinetLayout({ width: 30, depth: 27 })

    for (const prefix of DRAWERS) {
      const left = part(layout, `${prefix}BoxLeftSide`)
      const right = part(layout, `${prefix}BoxRightSide`)
      const leftSlide = part(layout, `${prefix}LeftSlideOuterSection`)
      const rightSlide = part(layout, `${prefix}RightSlideOuterSection`)

      expect(left.position.x).toBeCloseTo(-right.position.x, 8)
      expect(leftSlide.position.x).toBeCloseTo(-rightSlide.position.x, 8)
      expect(left.dimensions.z).toBe(right.dimensions.z)
      expect(left.position.y).toBe(right.position.y)
    }
  })

  it('supports every documented catalog width and safe continuous widths', () => {
    for (const width of [...TRIPLE_DRAWER_CATALOG_WIDTHS, 16.25, 27.5]) {
      const layout = calculateTripleDrawerCabinetLayout({ width })
      expect(layout.parameters.width).toBe(width)
      for (const target of layout.parts) {
        expect(target.dimensions.x, target.id).toBeGreaterThan(0)
        expect(target.dimensions.y, target.id).toBeGreaterThan(0)
        expect(target.dimensions.z, target.id).toBeGreaterThan(0)
      }
    }
  })

  it('returns unique finite transforms and useful exploded directions for every part', () => {
    const layout = calculateTripleDrawerCabinetLayout()
    expect(new Set(layout.parts.map((target) => target.id)).size).toBe(
      layout.parts.length,
    )

    for (const target of layout.parts) {
      const values = [
        ...Object.values(target.dimensions),
        ...Object.values(target.position),
        ...Object.values(target.rotation),
        ...Object.values(target.explosion.translation),
        ...Object.values(target.explosion.rotation),
      ]
      expect(values.every(Number.isFinite), target.id).toBe(true)
      expect(
        Math.abs(target.explosion.translation.x) +
          Math.abs(target.explosion.translation.y) +
          Math.abs(target.explosion.translation.z),
        target.id,
      ).toBeGreaterThan(0)
      expect(target.metadata).not.toHaveProperty('scale')
    }
  })

  it('clamps invalid requests to the triple-drawer safe range', () => {
    const layout = calculateTripleDrawerCabinetLayout({
      width: -40,
      height: Number.NaN,
      depth: 1000,
    })

    expect(layout.parameters).toEqual({ width: 12, height: 34.5, depth: 30 })
  })
})
