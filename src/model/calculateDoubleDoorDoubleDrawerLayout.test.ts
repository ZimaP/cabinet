import { describe, expect, it } from 'vitest'

import { CABINET_CONFIG } from './cabinetConstants'
import {
  calculateDoubleDoorDoubleDrawerLayout,
  DOUBLE_DOOR_DOUBLE_DRAWER_DEFAULT_PARAMETERS,
  DOUBLE_DOOR_DOUBLE_DRAWER_WIDTHS,
} from './calculateDoubleDoorDoubleDrawerLayout'

const part = (
  layout: ReturnType<typeof calculateDoubleDoorDoubleDrawerLayout>,
  id: string,
) => {
  const result = layout.partMap[id]
  if (!result) throw new Error(`Missing part: ${id}`)
  return result
}

describe('calculateDoubleDoorDoubleDrawerLayout', () => {
  it('builds the detailed 36 × 34.5 × 24 default as 104 semantic parts', () => {
    const layout = calculateDoubleDoorDoubleDrawerLayout()

    expect(layout.parameters).toEqual(
      DOUBLE_DOOR_DOUBLE_DRAWER_DEFAULT_PARAMETERS,
    )
    expect(layout.cabinetType).toBe('double-door-double-drawer')
    expect(layout.parts).toHaveLength(104)
    expect(new Set(layout.parts.map((target) => target.id)).size).toBe(104)
    expect(part(layout, 'rightSidePanel').dimensions).toEqual({
      x: 0.75,
      y: 34.5,
      z: 24,
    })
    expect(part(layout, 'centerVerticalDivider').dimensions.x).toBe(0.75)
    expect(part(layout, 'leftDrawerFront')).not.toBe(
      part(layout, 'leftDrawerBoxFrontBoard'),
    )
    expect(part(layout, 'rightDrawerFront')).not.toBe(
      part(layout, 'rightDrawerBoxFrontBoard'),
    )
    expect(part(layout, 'leftDoor').metadata.hingeSide).toBe('left')
    expect(part(layout, 'rightDoor').metadata.hingeSide).toBe('right')
    expect(part(layout, 'leftDrawerFront').metadata.frontProfile).toBe(
      'shaker-inset',
    )
    expect(part(layout, 'rightDoor').metadata.frontProfile).toBe(
      'shaker-inset',
    )
  })

  it('accepts the four reference catalog widths and preserves fixed stock', () => {
    for (const width of DOUBLE_DOOR_DOUBLE_DRAWER_WIDTHS) {
      const layout = calculateDoubleDoorDoubleDrawerLayout({
        width,
        height: width === 33 ? 28 : 42,
        depth: width === 42 ? 30 : 18,
      })

      expect(layout.parameters.width).toBe(width)
      expect(part(layout, 'leftSidePanel').dimensions.x).toBe(0.75)
      expect(part(layout, 'rightSidePanel').dimensions.x).toBe(0.75)
      expect(part(layout, 'bottomPanel').dimensions.y).toBe(0.75)
      expect(part(layout, 'fullDepthShelf').dimensions.y).toBe(0.75)
      expect(part(layout, 'centerVerticalDivider').dimensions.x).toBe(0.75)
      expect(part(layout, 'backPanel').dimensions.z).toBe(0.25)
      expect(part(layout, 'toeKickPanel').dimensions.y).toBe(4.5)
      expect(part(layout, 'upperStrengtheningPanel').dimensions).toEqual(
        expect.objectContaining({ y: 0.75, z: 3.9375 }),
      )
      expect(part(layout, 'leftDrawerFront').dimensions.z).toBe(0.75)
      expect(part(layout, 'rightDrawerFront').dimensions.z).toBe(0.75)
      expect(part(layout, 'leftDoor').dimensions.z).toBe(0.75)
      expect(part(layout, 'rightDoor').dimensions.z).toBe(0.75)
      expect(part(layout, 'leftDrawerBoxLeftSide').dimensions.x).toBe(0.5)
      expect(part(layout, 'rightDrawerBoxRightSide').dimensions.x).toBe(0.5)
      expect(part(layout, 'leftDrawerBoxBottom').dimensions.y).toBe(0.25)
      expect(part(layout, 'rightDrawerBoxBottom').dimensions.y).toBe(0.25)
    }
  })

  it('keeps three equal front reveals while resizing each front independently', () => {
    for (const width of DOUBLE_DOOR_DOUBLE_DRAWER_WIDTHS) {
      const layout = calculateDoubleDoorDoubleDrawerLayout({ width })
      const leftDrawer = part(layout, 'leftDrawerFront')
      const rightDrawer = part(layout, 'rightDrawerFront')
      const leftDoor = part(layout, 'leftDoor')
      const rightDoor = part(layout, 'rightDoor')
      const leftOuterReveal =
        leftDrawer.position.x - leftDrawer.dimensions.x / 2 + width / 2
      const centerReveal =
        rightDrawer.position.x -
        rightDrawer.dimensions.x / 2 -
        (leftDrawer.position.x + leftDrawer.dimensions.x / 2)
      const rightOuterReveal =
        width / 2 - (rightDrawer.position.x + rightDrawer.dimensions.x / 2)

      expect(leftOuterReveal).toBeCloseTo(CABINET_CONFIG.frontReveal, 8)
      expect(centerReveal).toBeCloseTo(CABINET_CONFIG.frontReveal, 8)
      expect(rightOuterReveal).toBeCloseTo(CABINET_CONFIG.frontReveal, 8)
      expect(leftDrawer.dimensions.x).toBe(rightDrawer.dimensions.x)
      expect(leftDoor.dimensions.x).toBe(rightDoor.dimensions.x)
      expect(leftDoor.position.x).toBe(leftDrawer.position.x)
      expect(rightDoor.position.x).toBe(rightDrawer.position.x)
    }
  })

  it('constructs two centered five-board dovetail boxes with paired slides', () => {
    const layout = calculateDoubleDoorDoubleDrawerLayout({
      width: 39,
      depth: 27,
    })

    for (const prefix of ['leftDrawer', 'rightDrawer']) {
      const boards = layout.parts.filter(
        (target) =>
          target.category === 'drawer' && target.id.startsWith(`${prefix}Box`),
      )
      const dovetails = layout.parts.filter(
        (target) =>
          target.kind === 'dovetail' && target.id.startsWith(`${prefix}Box`),
      )
      const slides = layout.parts.filter(
        (target) =>
          target.category === 'hardware' &&
          target.id.startsWith(prefix) &&
          target.id.includes('Slide'),
      )

      expect(boards).toHaveLength(5)
      expect(dovetails).toHaveLength(4)
      expect(slides).toHaveLength(8)
      expect(slides.filter((target) => target.id.includes('Outer'))).toHaveLength(
        2,
      )
      expect(
        slides.filter((target) => target.id.includes('SoftClose')),
      ).toHaveLength(2)
    }

    const leftBoxLeft = part(layout, 'leftDrawerBoxLeftSide')
    const rightBoxRight = part(layout, 'rightDrawerBoxRightSide')
    const leftSlide = part(layout, 'leftDrawerLeftSlideOuterSection')
    const rightSlide = part(layout, 'rightDrawerRightSlideOuterSection')
    expect(leftBoxLeft.position.x).toBeCloseTo(-rightBoxRight.position.x, 8)
    expect(leftSlide.position.x).toBeCloseTo(-rightSlide.position.x, 8)
    expect(layout.derived.drawerBoxOuterWidth).toBe(
      layout.derived.drawerBayWidth - 2 * CABINET_CONFIG.drawerSideClearance,
    )
  })

  it('builds four opposing concealed hinges with arms, plates, and screws', () => {
    const layout = calculateDoubleDoorDoubleDrawerLayout()

    for (const prefix of ['leftDoor', 'rightDoor']) {
      const hingeParts = layout.parts.filter(
        (target) =>
          target.category === 'hardware' &&
          target.id.startsWith(`${prefix}Hinge`),
      )
      expect(hingeParts).toHaveLength(10)
      expect(
        hingeParts.filter((target) => target.id.includes('Cup')),
      ).toHaveLength(2)
      expect(
        hingeParts.filter((target) => target.id.includes('Arm')),
      ).toHaveLength(2)
      expect(
        hingeParts.filter(
          (target) =>
            target.id.includes('Plate') && !target.id.includes('Screw'),
        ),
      ).toHaveLength(2)
      expect(
        hingeParts.filter((target) => target.id.includes('Screw')),
      ).toHaveLength(4)
    }

    expect(part(layout, 'leftDoorHingeUpperCup').position.x).toBeCloseTo(
      -part(layout, 'rightDoorHingeUpperCup').position.x,
      8,
    )
    expect(part(layout, 'leftDoorHingeUpperPlate').position.x).toBeCloseTo(
      -part(layout, 'rightDoorHingeUpperPlate').position.x,
      8,
    )
    expect(part(layout, 'leftDoorHingeUpperCup').metadata.hingeSide).toBe(
      'left',
    )
    expect(part(layout, 'rightDoorHingeUpperCup').metadata.hingeSide).toBe(
      'right',
    )
  })

  it('marks only semantic wooden boards with manufacturing dimensions', () => {
    const layout = calculateDoubleDoorDoubleDrawerLayout()
    const woodenIds = [
      'leftSidePanel',
      'rightSidePanel',
      'bottomPanel',
      'backPanel',
      'upperStrengtheningPanel',
      'backUpperReinforcingRail',
      'backLowerReinforcingRail',
      'toeKickPanel',
      'fullDepthShelf',
      'centerVerticalDivider',
      'leftDrawerFront',
      'rightDrawerFront',
      'leftDoor',
      'rightDoor',
      'leftDrawerBoxLeftSide',
      'leftDrawerBoxRightSide',
      'leftDrawerBoxFrontBoard',
      'leftDrawerBoxBackBoard',
      'leftDrawerBoxBottom',
      'rightDrawerBoxLeftSide',
      'rightDrawerBoxRightSide',
      'rightDrawerBoxFrontBoard',
      'rightDrawerBoxBackBoard',
      'rightDrawerBoxBottom',
    ]

    expect(layout.parts.filter((target) => target.manufacturing)).toHaveLength(
      woodenIds.length,
    )
    for (const id of woodenIds) {
      const target = part(layout, id)
      expect(target.manufacturing, id).toBeDefined()
      expect(target.manufacturing?.measurements).toHaveLength(2)
    }
    for (const target of layout.parts.filter(
      (candidate) =>
        candidate.category === 'hardware' || candidate.category === 'detail',
    )) {
      expect(target.manufacturing, target.id).toBeUndefined()
    }
  })

  it('updates width-dependent bays, fronts, boxes, slides, and divider spans', () => {
    const narrow = calculateDoubleDoorDoubleDrawerLayout({ width: 33 })
    const wide = calculateDoubleDoorDoubleDrawerLayout({ width: 42 })

    for (const id of [
      'bottomPanel',
      'backPanel',
      'fullDepthShelf',
      'upperStrengtheningPanel',
      'toeKickPanel',
      'leftDrawerFront',
      'leftDoor',
      'leftDrawerBoxFrontBoard',
    ]) {
      expect(part(wide, id).dimensions.x).toBeGreaterThan(
        part(narrow, id).dimensions.x,
      )
    }
    expect(wide.derived.drawerBayWidth).toBeGreaterThan(
      narrow.derived.drawerBayWidth,
    )
    expect(part(wide, 'leftDrawerLeftSlideOuterSection').position.x).toBeLessThan(
      part(narrow, 'leftDrawerLeftSlideOuterSection').position.x,
    )
    expect(part(wide, 'centerVerticalDivider').dimensions.x).toBe(
      part(narrow, 'centerVerticalDivider').dimensions.x,
    )
  })

  it('absorbs height changes in both doors while preserving the toe kick', () => {
    const low = calculateDoubleDoorDoubleDrawerLayout({ height: 28 })
    const high = calculateDoubleDoorDoubleDrawerLayout({ height: 42 })

    expect(high.derived.drawerZoneHeight).toBeLessThanOrEqual(8)
    expect(low.derived.drawerZoneHeight).toBeGreaterThanOrEqual(5.5)
    expect(part(high, 'leftDoor').dimensions.y).toBeGreaterThan(
      part(low, 'leftDoor').dimensions.y,
    )
    expect(part(high, 'rightDoor').dimensions.y).toBeGreaterThan(
      part(low, 'rightDoor').dimensions.y,
    )
    expect(part(high, 'toeKickPanel').dimensions.y).toBe(4.5)
    expect(part(low, 'toeKickPanel').dimensions.y).toBe(4.5)
    expect(high.derived.shelfY).toBeGreaterThan(low.derived.shelfY)
    expect(part(high, 'centerVerticalDivider').dimensions.y).toBeGreaterThan(
      part(low, 'centerVerticalDivider').dimensions.y,
    )
  })

  it('updates every depth-dependent panel, drawer, slide, and divider', () => {
    const shallow = calculateDoubleDoorDoubleDrawerLayout({ depth: 18 })
    const deep = calculateDoubleDoorDoubleDrawerLayout({ depth: 30 })

    for (const id of [
      'leftSidePanel',
      'bottomPanel',
      'fullDepthShelf',
      'centerVerticalDivider',
      'leftDrawerBoxLeftSide',
      'rightDrawerBoxRightSide',
      'leftDrawerLeftSlideOuterSection',
      'rightDrawerRightSlideOuterSection',
    ]) {
      expect(part(deep, id).dimensions.z).toBeGreaterThan(
        part(shallow, id).dimensions.z,
      )
    }
    expect(part(deep, 'backPanel').position.z).toBe(-30 / 2 + 0.25 / 2)
    expect(part(deep, 'leftDrawerFront').dimensions.z).toBe(0.75)
    expect(part(deep, 'rightDoor').dimensions.z).toBe(0.75)
  })

  it('clamps impossible inputs and returns finite non-scaling transforms', () => {
    const layout = calculateDoubleDoorDoubleDrawerLayout({
      width: -100,
      height: Number.NaN,
      depth: 1000,
    })

    expect(layout.parameters).toEqual({ width: 33, height: 34.5, depth: 30 })
    for (const target of layout.parts) {
      const values = [
        ...Object.values(target.dimensions),
        ...Object.values(target.position),
        ...Object.values(target.rotation),
        ...Object.values(target.explosion.translation),
        ...Object.values(target.explosion.rotation),
      ]
      expect(values.every(Number.isFinite), target.id).toBe(true)
      expect(target.dimensions.x, target.id).toBeGreaterThan(0)
      expect(target.dimensions.y, target.id).toBeGreaterThan(0)
      expect(target.dimensions.z, target.id).toBeGreaterThan(0)
      expect(target.metadata).not.toHaveProperty('scale')
    }
  })
})
