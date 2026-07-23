import { describe, expect, it } from 'vitest'

import { CABINET_CONFIG } from './cabinetConstants'
import { calculateCabinetLayout } from './calculateCabinetLayout'
import { calculateDoubleDoorDoubleDrawerLayout } from './calculateDoubleDoorDoubleDrawerLayout'
import { calculateTripleDrawerCabinetLayout } from './calculateTripleDrawerCabinetLayout'
import type { CabinetLayout, CabinetParameters, PartLayout } from './types'
import {
  calculateToeKickSideProfile,
  TOE_KICK_SIDE_METADATA,
} from './toeKickSideProfile'

function requiredMetadataNumber(part: PartLayout, key: string): number {
  const value = part.metadata[key]
  if (typeof value !== 'number') {
    throw new Error(`${part.id} is missing numeric ${key} metadata`)
  }
  return value
}

const existingCalculators: readonly {
  name: string
  calculate: (parameters: CabinetParameters) => CabinetLayout
  sizes: readonly CabinetParameters[]
}[] = [
  {
    name: 'door and drawer',
    calculate: calculateCabinetLayout,
    sizes: [
      { width: 18, height: 28, depth: 18 },
      { width: 42, height: 42, depth: 30 },
    ],
  },
  {
    name: 'triple drawer',
    calculate: calculateTripleDrawerCabinetLayout,
    sizes: [
      { width: 12, height: 28, depth: 18 },
      { width: 36, height: 42, depth: 30 },
    ],
  },
  {
    name: 'double door and double drawer',
    calculate: calculateDoubleDoorDoubleDrawerLayout,
    sizes: [
      { width: 33, height: 28, depth: 18 },
      { width: 42, height: 42, depth: 30 },
    ],
  },
]

describe('toe-kick side-panel profile', () => {
  it('returns the six exact corners of a lower-front L-shaped notch', () => {
    expect(
      calculateToeKickSideProfile({
        height: 34.5,
        depth: 24,
        toeKickHeight: 4.5,
        toeKickSetback: 3,
      }),
    ).toEqual([
      { z: -12, y: -17.25 },
      { z: 9, y: -17.25 },
      { z: 9, y: -12.75 },
      { z: 12, y: -12.75 },
      { z: 12, y: 17.25 },
      { z: -12, y: 17.25 },
    ])
  })

  it.each(existingCalculators)(
    'keeps the fixed 4.5-inch rise and 3-inch setback on both $name sides at every supported extreme',
    ({ calculate, sizes }) => {
      sizes.forEach((requested) => {
        const layout = calculate(requested)

        ;(['leftSidePanel', 'rightSidePanel'] as const).forEach((partId) => {
          const side = layout.partMap[partId]
          const toeKickHeight = requiredMetadataNumber(side, 'toeKickHeight')
          const toeKickSetback = requiredMetadataNumber(
            side,
            'toeKickSetback',
          )

          expect(side.metadata).toMatchObject(TOE_KICK_SIDE_METADATA)
          expect(side.dimensions.x).toBe(CABINET_CONFIG.panelThickness)
          expect(side.dimensions.y).toBe(layout.parameters.height)
          expect(side.dimensions.z).toBe(layout.parameters.depth)
          expect(toeKickHeight).toBe(CABINET_CONFIG.toeKickHeight)
          expect(toeKickSetback).toBe(CABINET_CONFIG.toeKickSetback)

          const profile = calculateToeKickSideProfile({
            height: side.dimensions.y,
            depth: side.dimensions.z,
            toeKickHeight,
            toeKickSetback,
          })
          const notchBottom = profile[1]
          const notchRearTop = profile[2]
          const notchFrontTop = profile[3]

          expect(notchRearTop.y - notchBottom.y).toBe(
            CABINET_CONFIG.toeKickHeight,
          )
          expect(notchFrontTop.z - notchRearTop.z).toBe(
            CABINET_CONFIG.toeKickSetback,
          )
        })
      })
    },
  )
})
