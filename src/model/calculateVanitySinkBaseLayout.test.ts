import { describe, expect, it } from 'vitest'

import { CABINET_CONFIG } from './cabinetConstants'
import {
  calculateVanitySinkBaseLayout,
  VANITY_SINK_BASE_CONFIG,
  VANITY_SINK_BASE_DEFAULT_PARAMETERS,
} from './calculateVanitySinkBaseLayout'

const part = (
  layout: ReturnType<typeof calculateVanitySinkBaseLayout>,
  id: string,
) => {
  const result = layout.partMap[id]
  if (!result) throw new Error(`Missing part: ${id}`)
  return result
}

describe('calculateVanitySinkBaseLayout', () => {
  it('builds the detailed 30 × 34.5 × 21 VS30 default as separate parts', () => {
    const layout = calculateVanitySinkBaseLayout()

    expect(layout.cabinetType).toBe('vanity-sink-base')
    expect(layout.parameters).toEqual(VANITY_SINK_BASE_DEFAULT_PARAMETERS)
    expect(layout.parts).toHaveLength(53)
    expect(new Set(layout.parts.map((target) => target.id)).size).toBe(53)
    expect(part(layout, 'leftFalseFront').metadata.function).toBe(
      'fixed-false-front',
    )
    expect(part(layout, 'rightFalseFront').metadata.function).toBe(
      'fixed-false-front',
    )
    expect(part(layout, 'leftDoor').metadata.hingeSide).toBe('left')
    expect(part(layout, 'rightDoor').metadata.hingeSide).toBe('right')
    expect(part(layout, 'rearUpperStretcher').position.z).toBeLessThan(0)
    expect(
      part(layout, 'rearUpperStretcher').position.z -
        part(layout, 'rearUpperStretcher').dimensions.z / 2,
    ).toBeCloseTo(
      part(layout, 'backUpperReinforcingRail').position.z +
        part(layout, 'backUpperReinforcingRail').dimensions.z / 2,
      8,
    )
    expect(part(layout, 'leftFalseFront').metadata.edgeTreatment).toBe(
      'white-edge-band',
    )
    expect(part(layout, 'rightDoor').metadata.edgeTreatment).toBe(
      'white-edge-band',
    )
  })

  it('contains the complete semantic wood assembly shown in the open reference views', () => {
    const layout = calculateVanitySinkBaseLayout()
    const woodenIds = layout.parts
      .filter(
        ({ category }) =>
          category === 'carcass' ||
          category === 'front' ||
          category === 'drawer',
      )
      .map(({ id }) => id)
      .sort()

    expect(woodenIds).toEqual(
      [
        'leftSidePanel',
        'rightSidePanel',
        'bottomPanel',
        'backPanel',
        'upperStrengtheningPanel',
        'rearUpperStretcher',
        'falseFrontLowerSupportRail',
        'falseFrontCenterSupport',
        'backUpperReinforcingRail',
        'backLowerReinforcingRail',
        'toeKickPanel',
        'leftFalseFront',
        'rightFalseFront',
        'leftDoor',
        'rightDoor',
      ].sort(),
    )
  })

  it('keeps an unobstructed plumbing bay and open sink top', () => {
    const layout = calculateVanitySinkBaseLayout()

    expect(layout.parts.filter((target) => target.category === 'drawer')).toHaveLength(0)
    expect(layout.parts.some((target) => target.id.includes('Slide'))).toBe(false)
    expect(layout.parts.some((target) => target.id.includes('Shelf'))).toBe(false)
    expect(layout.parts.some((target) => target.id.includes('Pin'))).toBe(false)
    expect(layout.partMap.centerVerticalDivider).toBeUndefined()
    expect(layout.partMap.topPanel).toBeUndefined()
    expect(part(layout, 'falseFrontCenterSupport').dimensions.y).toBeLessThan(
      layout.derived.falseFrontHeight,
    )
    expect(part(layout, 'falseFrontLowerSupportRail').dimensions.z).toBe(
      CABINET_CONFIG.railWidth,
    )
    expect(part(layout, 'backPanel').metadata.plumbingField).toBe(
      'unobstructed',
    )
  })

  it('marks both nominal side boards with the fixed toe-space notch profile', () => {
    for (const dimensions of [
      { width: 24, height: 28, depth: 18 },
      { width: 42, height: 42, depth: 30 },
    ]) {
      const layout = calculateVanitySinkBaseLayout(dimensions)
      for (const id of ['leftSidePanel', 'rightSidePanel']) {
        const side = part(layout, id)
        expect(side.dimensions).toEqual({
          x: CABINET_CONFIG.panelThickness,
          y: dimensions.height,
          z: dimensions.depth,
        })
        expect(side.metadata.profile).toBe('toe-kick-side')
        expect(side.metadata.toeKickHeight).toBe(
          CABINET_CONFIG.toeKickHeight,
        )
        expect(side.metadata.toeKickSetback).toBe(
          CABINET_CONFIG.toeKickSetback,
        )
      }
    }
  })

  it('preserves fixed construction stock throughout the safe parameter range', () => {
    for (const parameters of [
      { width: 24, height: 28, depth: 18 },
      { width: 42, height: 42, depth: 30 },
    ]) {
      const layout = calculateVanitySinkBaseLayout(parameters)
      expect(part(layout, 'leftSidePanel').dimensions.x).toBe(0.75)
      expect(part(layout, 'rightSidePanel').dimensions.x).toBe(0.75)
      expect(part(layout, 'bottomPanel').dimensions.y).toBe(0.75)
      expect(part(layout, 'backPanel').dimensions.z).toBe(0.25)
      expect(part(layout, 'toeKickPanel').dimensions.y).toBe(4.5)
      expect(part(layout, 'upperStrengtheningPanel').dimensions).toEqual(
        expect.objectContaining({ y: 0.75, z: 3.9375 }),
      )
      expect(part(layout, 'rearUpperStretcher').dimensions).toEqual(
        expect.objectContaining({ y: 0.75, z: 3.9375 }),
      )
      expect(part(layout, 'falseFrontLowerSupportRail').dimensions).toEqual(
        expect.objectContaining({ y: 0.75, z: 3.9375 }),
      )
      expect(part(layout, 'falseFrontCenterSupport').dimensions).toEqual(
        expect.objectContaining({ x: 0.75, z: 3.9375 }),
      )
      for (const id of [
        'backUpperReinforcingRail',
        'backLowerReinforcingRail',
      ]) {
        expect(part(layout, id).dimensions).toEqual(
          expect.objectContaining({ y: 3.9375, z: 0.75 }),
        )
      }
      for (const front of layout.parts.filter(
        (target) => target.category === 'front',
      )) {
        expect(front.dimensions.z, front.id).toBe(0.75)
      }
    }
  })

  it('keeps three equal reveals across each paired front row', () => {
    for (const width of [24, 30, 42]) {
      const layout = calculateVanitySinkBaseLayout({ width })
      for (const row of [
        ['leftFalseFront', 'rightFalseFront'],
        ['leftDoor', 'rightDoor'],
      ] as const) {
        const left = part(layout, row[0])
        const right = part(layout, row[1])
        const leftReveal =
          left.position.x - left.dimensions.x / 2 + width / 2
        const centerReveal =
          right.position.x -
          right.dimensions.x / 2 -
          (left.position.x + left.dimensions.x / 2)
        const rightReveal =
          width / 2 - (right.position.x + right.dimensions.x / 2)

        expect(leftReveal).toBeCloseTo(CABINET_CONFIG.frontReveal, 8)
        expect(centerReveal).toBeCloseTo(CABINET_CONFIG.frontReveal, 8)
        expect(rightReveal).toBeCloseTo(CABINET_CONFIG.frontReveal, 8)
      }
    }
  })

  it('updates width, height, and depth dependent cut sizes independently', () => {
    const narrow = calculateVanitySinkBaseLayout({ width: 24 })
    const wide = calculateVanitySinkBaseLayout({ width: 42 })
    for (const id of [
      'bottomPanel',
      'backPanel',
      'upperStrengtheningPanel',
      'rearUpperStretcher',
      'falseFrontLowerSupportRail',
      'backUpperReinforcingRail',
      'backLowerReinforcingRail',
      'toeKickPanel',
      'leftFalseFront',
      'leftDoor',
    ]) {
      expect(part(wide, id).dimensions.x, id).toBeGreaterThan(
        part(narrow, id).dimensions.x,
      )
    }

    const low = calculateVanitySinkBaseLayout({ height: 28 })
    const high = calculateVanitySinkBaseLayout({ height: 42 })
    expect(part(high, 'leftSidePanel').dimensions.y).toBeGreaterThan(
      part(low, 'leftSidePanel').dimensions.y,
    )
    expect(part(high, 'backPanel').dimensions.y).toBeGreaterThan(
      part(low, 'backPanel').dimensions.y,
    )
    expect(part(high, 'leftDoor').dimensions.y).toBeGreaterThan(
      part(low, 'leftDoor').dimensions.y,
    )
    expect(high.derived.falseFrontHeight).toBeLessThanOrEqual(8)
    expect(low.derived.falseFrontHeight).toBeGreaterThanOrEqual(6)
    expect(part(high, 'falseFrontCenterSupport').dimensions.y).toBeGreaterThan(
      part(low, 'falseFrontCenterSupport').dimensions.y,
    )

    const shallow = calculateVanitySinkBaseLayout({ depth: 18 })
    const deep = calculateVanitySinkBaseLayout({ depth: 30 })
    expect(part(deep, 'leftSidePanel').dimensions.z).toBeGreaterThan(
      part(shallow, 'leftSidePanel').dimensions.z,
    )
    expect(part(deep, 'bottomPanel').dimensions.z).toBeGreaterThan(
      part(shallow, 'bottomPanel').dimensions.z,
    )
    expect(part(deep, 'upperStrengtheningPanel').dimensions.z).toBe(
      part(shallow, 'upperStrengtheningPanel').dimensions.z,
    )
  })

  it('builds four complete opposing hinges and two three-piece pulls', () => {
    const layout = calculateVanitySinkBaseLayout()

    for (const prefix of ['leftDoor', 'rightDoor']) {
      const hinges = layout.parts.filter(
        (target) => target.id.startsWith(`${prefix}Hinge`),
      )
      expect(hinges).toHaveLength(10)
      expect(hinges.filter((target) => target.id.includes('Cup'))).toHaveLength(2)
      expect(hinges.filter((target) => target.id.includes('Arm'))).toHaveLength(2)
      expect(
        hinges.filter(
          (target) =>
            target.id.includes('Plate') && !target.id.includes('Screw'),
        ),
      ).toHaveLength(2)
      expect(hinges.filter((target) => target.id.includes('Screw'))).toHaveLength(4)

      for (const cup of hinges.filter((target) => target.id.includes('Cup'))) {
        const door = part(layout, prefix)
        const doorBackFace = door.position.z - door.dimensions.z / 2
        const cupBackFace = cup.position.z - cup.dimensions.z / 2
        const cupFrontFace = cup.position.z + cup.dimensions.z / 2
        expect(cupBackFace).toBeLessThan(doorBackFace)
        expect(cupFrontFace).toBeLessThanOrEqual(
          door.position.z + door.dimensions.z / 2,
        )
        expect(cupFrontFace).toBeGreaterThan(doorBackFace)
      }
    }

    for (const prefix of ['leftDoorPull', 'rightDoorPull']) {
      const pull = layout.parts.filter((target) => target.id.startsWith(prefix))
      expect(pull).toHaveLength(3)
      expect(pull.every((target) => target.metadata.hardwareType === 'cabinet-pull')).toBe(true)
      expect(part(layout, `${prefix}Grip`).dimensions.y).toBe(
        VANITY_SINK_BASE_CONFIG.pullLength,
      )
    }
  })

  it('builds four independent top corner braces with two fasteners each', () => {
    const layout = calculateVanitySinkBaseLayout()
    const braceBodies = layout.parts.filter(
      ({ metadata }) =>
        metadata.hardwareType === 'top-corner-brace' &&
        metadata.component === 'body',
    )
    const braceScrews = layout.parts.filter(
      ({ metadata }) =>
        metadata.hardwareType === 'top-corner-brace' &&
        metadata.component === 'mounting-screw',
    )

    expect(braceBodies).toHaveLength(4)
    expect(braceScrews).toHaveLength(8)
    expect(new Set(braceBodies.map(({ metadata }) => metadata.location))).toEqual(
      new Set(['RearLeft', 'FrontLeft', 'FrontRight', 'RearRight']),
    )
    for (const brace of braceBodies) {
      expect(brace.dimensions).toEqual({
        x: VANITY_SINK_BASE_CONFIG.topCornerBraceSpan,
        y: VANITY_SINK_BASE_CONFIG.topCornerBraceHeight,
        z: VANITY_SINK_BASE_CONFIG.topCornerBraceSpan,
      })
      expect(brace.category).toBe('hardware')
      expect(brace.manufacturing).toBeUndefined()
    }
    for (const screw of braceScrews) {
      expect(screw.kind).toBe('screw')
      expect(screw.category).toBe('hardware')
      expect(screw.rotation.x).toBe(Math.PI)
      expect(screw.manufacturing).toBeUndefined()
      const body = braceBodies.find(
        ({ metadata }) => metadata.location === screw.metadata.location,
      )
      expect(body).toBeDefined()
      expect(screw.explosion.translation).not.toEqual(
        body?.explosion.translation,
      )
      expect(screw.explosion.translation.y).toBeGreaterThan(
        body?.explosion.translation.y ?? Number.POSITIVE_INFINITY,
      )
    }
  })

  it('dimensions only semantic wooden boards, never vanity hardware', () => {
    const layout = calculateVanitySinkBaseLayout()
    const woodenIds = [
      'leftSidePanel',
      'rightSidePanel',
      'bottomPanel',
      'backPanel',
      'upperStrengtheningPanel',
      'rearUpperStretcher',
      'falseFrontLowerSupportRail',
      'falseFrontCenterSupport',
      'backUpperReinforcingRail',
      'backLowerReinforcingRail',
      'toeKickPanel',
      'leftFalseFront',
      'rightFalseFront',
      'leftDoor',
      'rightDoor',
    ]

    expect(layout.parts.filter((target) => target.manufacturing)).toHaveLength(
      woodenIds.length,
    )
    for (const id of woodenIds) {
      expect(part(layout, id).manufacturing, id).toBeDefined()
      expect(part(layout, id).manufacturing?.measurements).toHaveLength(2)
    }
    for (const hardware of layout.parts.filter(
      (target) => target.category === 'hardware',
    )) {
      expect(hardware.manufacturing, hardware.id).toBeUndefined()
    }
  })

  it('clamps unsafe inputs and returns finite positive part geometry', () => {
    const layout = calculateVanitySinkBaseLayout({
      width: -100,
      height: Number.NaN,
      depth: 1000,
    })

    expect(layout.parameters).toEqual({ width: 24, height: 34.5, depth: 30 })
    for (const target of layout.parts) {
      expect(target.dimensions.x, target.id).toBeGreaterThan(0)
      expect(target.dimensions.y, target.id).toBeGreaterThan(0)
      expect(target.dimensions.z, target.id).toBeGreaterThan(0)
      expect(
        [
          ...Object.values(target.dimensions),
          ...Object.values(target.position),
          ...Object.values(target.rotation),
          ...Object.values(target.explosion.translation),
          ...Object.values(target.explosion.rotation),
        ].every(Number.isFinite),
        target.id,
      ).toBe(true)
      expect(target.metadata).not.toHaveProperty('scale')
    }
  })
})
