import { describe, expect, it } from 'vitest'

import { CABINET_CONFIG, DEFAULT_PARAMETERS } from './cabinetConstants'
import { calculateCabinetLayout } from './calculateCabinetLayout'

const part = (
  layout: ReturnType<typeof calculateCabinetLayout>,
  id: string,
) => {
  const result = layout.partMap[id]
  if (!result) throw new Error(`Missing part: ${id}`)
  return result
}

describe('calculateCabinetLayout', () => {
  it('builds the 24 × 34.5 × 24 default cabinet from separate parts', () => {
    const layout = calculateCabinetLayout()
    expect(layout.parameters).toEqual(DEFAULT_PARAMETERS)
    expect(layout.parts.length).toBeGreaterThan(65)
    expect(part(layout, 'leftSidePanel')).not.toBe(part(layout, 'rightSidePanel'))
    expect(part(layout, 'drawerFront')).not.toBe(part(layout, 'drawerBoxFrontBoard'))
    expect(part(layout, 'rightSidePanel').dimensions).toEqual({
      x: 0.75,
      y: 34.5,
      z: 24,
    })
  })

  it('preserves every exact fixed construction value after extreme resizing', () => {
    for (const dimensions of [
      { width: 18, height: 28, depth: 18 },
      { width: 42, height: 42, depth: 30 },
      { width: 31.25, height: 37.75, depth: 26.5 },
    ]) {
      const layout = calculateCabinetLayout(dimensions)
      expect(part(layout, 'leftSidePanel').dimensions.x).toBe(0.75)
      expect(part(layout, 'rightSidePanel').dimensions.x).toBe(0.75)
      expect(part(layout, 'bottomPanel').dimensions.y).toBe(0.75)
      expect(part(layout, 'fullDepthShelf').dimensions.y).toBe(0.75)
      expect(part(layout, 'lowerDoor').dimensions.z).toBe(0.75)
      expect(part(layout, 'drawerFront').dimensions.z).toBe(0.75)
      expect(part(layout, 'backPanel').dimensions.z).toBe(0.25)
      expect(part(layout, 'toeKickPanel').dimensions.y).toBe(4.5)
      expect(part(layout, 'upperStrengtheningPanel').dimensions.y).toBe(0.75)
      expect(part(layout, 'upperStrengtheningPanel').dimensions.z).toBe(3.9375)
      expect(part(layout, 'drawerBoxLeftSide').dimensions.x).toBe(0.5)
      expect(part(layout, 'drawerBoxBottom').dimensions.y).toBe(0.25)
    }
  })

  it('changes horizontal spans and positions without globally scaling stock', () => {
    const narrow = calculateCabinetLayout({ width: 18 })
    const wide = calculateCabinetLayout({ width: 42 })

    expect(part(wide, 'bottomPanel').dimensions.x).toBeGreaterThan(
      part(narrow, 'bottomPanel').dimensions.x,
    )
    expect(part(wide, 'drawerBoxFrontBoard').dimensions.x).toBeGreaterThan(
      part(narrow, 'drawerBoxFrontBoard').dimensions.x,
    )
    expect(part(wide, 'leftSidePanel').position.x).toBeLessThan(
      part(narrow, 'leftSidePanel').position.x,
    )
    expect(part(wide, 'leftSlideOuterSection').position.x).toBeLessThan(
      part(narrow, 'leftSlideOuterSection').position.x,
    )
    expect(part(wide, 'leftSidePanel').dimensions.x).toBe(
      part(narrow, 'leftSidePanel').dimensions.x,
    )
  })

  it('absorbs height changes in the door while clamping a realistic drawer zone', () => {
    const low = calculateCabinetLayout({ height: 28 })
    const high = calculateCabinetLayout({ height: 42 })

    expect(low.derived.drawerZoneHeight).toBeGreaterThanOrEqual(5.5)
    expect(high.derived.drawerZoneHeight).toBeLessThanOrEqual(8)
    expect(part(high, 'lowerDoor').dimensions.y).toBeGreaterThan(
      part(low, 'lowerDoor').dimensions.y,
    )
    expect(part(high, 'toeKickPanel').dimensions.y).toBe(
      part(low, 'toeKickPanel').dimensions.y,
    )
    expect(high.derived.shelfY).toBeGreaterThan(low.derived.shelfY)
  })

  it('updates depth-dependent panels, drawer box, and every slide stage', () => {
    const shallow = calculateCabinetLayout({ depth: 18 })
    const deep = calculateCabinetLayout({ depth: 30 })

    expect(part(deep, 'leftSidePanel').dimensions.z).toBe(30)
    expect(part(deep, 'fullDepthShelf').dimensions.z).toBeGreaterThan(
      part(shallow, 'fullDepthShelf').dimensions.z,
    )
    expect(part(deep, 'drawerBoxLeftSide').dimensions.z).toBeGreaterThan(
      part(shallow, 'drawerBoxLeftSide').dimensions.z,
    )
    expect(part(deep, 'leftSlideOuterSection').dimensions.z).toBeGreaterThan(
      part(shallow, 'leftSlideOuterSection').dimensions.z,
    )
    expect(part(deep, 'backPanel').position.z).toBe(-30 / 2 + 0.25 / 2)
  })

  it('keeps the drawer centered with symmetric slide clearances', () => {
    const layout = calculateCabinetLayout({ width: 33, depth: 27 })
    const left = part(layout, 'drawerBoxLeftSide')
    const right = part(layout, 'drawerBoxRightSide')
    const leftSlide = part(layout, 'leftSlideOuterSection')
    const rightSlide = part(layout, 'rightSlideOuterSection')

    expect(left.position.x).toBeCloseTo(-right.position.x, 8)
    expect(leftSlide.position.x).toBeCloseTo(-rightSlide.position.x, 8)
    expect(left.dimensions.z).toBe(right.dimensions.z)
    expect(layout.derived.drawerBoxOuterWidth).toBe(
      layout.derived.interiorWidth - 2 * CABINET_CONFIG.drawerSideClearance,
    )
  })

  it('provides non-scaling assembled and exploded transforms for principal parts', () => {
    const layout = calculateCabinetLayout({ width: 42, height: 42, depth: 30 })
    for (const id of [
      'leftSidePanel',
      'rightSidePanel',
      'backPanel',
      'bottomPanel',
      'fullDepthShelf',
      'toeKickPanel',
      'drawerFront',
      'drawerBoxLeftSide',
      'lowerDoor',
      'leftSlideOuterSection',
      'hingeUpperCup',
    ]) {
      const target = part(layout, id)
      expect(target.position).toEqual(
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) }),
      )
      expect(
        Math.abs(target.explosion.translation.x) +
          Math.abs(target.explosion.translation.y) +
          Math.abs(target.explosion.translation.z),
      ).toBeGreaterThan(0)
      expect(target.metadata).not.toHaveProperty('scale')
    }
  })

  it('returns finite dimensions and transforms for all 74 named scene parts', () => {
    const layout = calculateCabinetLayout()
    expect(layout.parts).toHaveLength(74)
    expect(new Set(layout.parts.map((target) => target.id)).size).toBe(74)

    for (const target of layout.parts) {
      const values = [
        ...Object.values(target.dimensions),
        ...Object.values(target.position),
        ...Object.values(target.rotation),
        ...Object.values(target.explosion.translation),
        ...Object.values(target.explosion.rotation),
      ]
      expect(values.every(Number.isFinite), target.id).toBe(true)
    }
  })

  it('keeps front reveals and left-hinge offsets constant across widths', () => {
    for (const width of [18, 24, 42]) {
      const layout = calculateCabinetLayout({ width })
      const drawerFront = part(layout, 'drawerFront')
      const door = part(layout, 'lowerDoor')
      const hingeCup = part(layout, 'hingeUpperCup')
      const drawerBottom = drawerFront.position.y - drawerFront.dimensions.y / 2
      const doorTop = door.position.y + door.dimensions.y / 2

      expect(drawerBottom - doorTop).toBeCloseTo(
        CABINET_CONFIG.frontReveal,
        8,
      )
      expect(drawerFront.dimensions.x).toBe(door.dimensions.x)
      expect(hingeCup.position.x - -width / 2).toBeCloseTo(
        CABINET_CONFIG.hingeEdgeOffset,
        8,
      )
    }
  })

  it('clamps invalid or impossible dimension requests to safe ranges', () => {
    const layout = calculateCabinetLayout({
      width: -50,
      height: Number.NaN,
      depth: 1000,
    })
    expect(layout.parameters).toEqual({ width: 18, height: 34.5, depth: 30 })
    for (const target of layout.parts) {
      expect(target.dimensions.x).toBeGreaterThan(0)
      expect(target.dimensions.y).toBeGreaterThan(0)
      expect(target.dimensions.z).toBeGreaterThan(0)
    }
  })
})
