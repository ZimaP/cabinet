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
    expect(layout.parts).toHaveLength(37)
    expect(new Set(layout.parts.map((target) => target.id)).size).toBe(37)
    expect(part(layout, 'leftFalseFront').metadata.function).toBe(
      'fixed-false-front',
    )
    expect(part(layout, 'rightFalseFront').metadata.function).toBe(
      'fixed-false-front',
    )
    expect(part(layout, 'leftDoor').metadata.hingeSide).toBe('left')
    expect(part(layout, 'rightDoor').metadata.hingeSide).toBe('right')
    expect(part(layout, 'rearUpperStretcher').position.z).toBeLessThan(0)
  })

  it('keeps an unobstructed plumbing bay and open sink top', () => {
    const layout = calculateVanitySinkBaseLayout()

    expect(layout.parts.filter((target) => target.category === 'drawer')).toHaveLength(0)
    expect(layout.parts.some((target) => target.id.includes('Slide'))).toBe(false)
    expect(layout.parts.some((target) => target.id.includes('Shelf'))).toBe(false)
    expect(layout.parts.some((target) => target.id.includes('Pin'))).toBe(false)
    expect(layout.partMap.centerVerticalDivider).toBeUndefined()
    expect(layout.partMap.topPanel).toBeUndefined()
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
    expect(low.derived.falseFrontHeight).toBeGreaterThanOrEqual(5.5)

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

  it('dimensions only semantic wooden boards, never vanity hardware', () => {
    const layout = calculateVanitySinkBaseLayout()
    const woodenIds = [
      'leftSidePanel',
      'rightSidePanel',
      'bottomPanel',
      'backPanel',
      'upperStrengtheningPanel',
      'rearUpperStretcher',
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
