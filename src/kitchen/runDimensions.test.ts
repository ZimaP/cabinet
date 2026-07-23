import { describe, expect, it } from 'vitest'

import type { CabinetType } from '../model/types'
import {
  calculateCabinetRunDimensions,
  getCabinetRunLevel,
  groupCabinetsByRun,
  type KitchenWall,
  type PlacedCabinet,
} from './index'

const cabinet = (
  id: string,
  cabinetType: CabinetType,
  wall: KitchenWall,
  offset: number,
  elevation: number,
  width: number,
  height: number,
  depth: number,
): PlacedCabinet => ({
  id,
  cabinetType,
  parameters: { width, height, depth },
  placement: { wall, offset, elevation },
})

const cabinets = [
  cabinet(
    'back-base-a',
    'door-drawer',
    'back',
    12,
    0,
    24,
    34.5,
    24,
  ),
  cabinet(
    'back-wall',
    'wall-single-36',
    'back',
    6,
    54,
    18,
    36,
    12,
  ),
  cabinet(
    'left-wall',
    'wall-double-42',
    'left',
    30,
    48,
    30,
    42,
    12,
  ),
  cabinet(
    'back-base-b',
    'triple-drawer',
    'back',
    42,
    3,
    30,
    40,
    22,
  ),
  cabinet(
    'right-base',
    'vanity-sink-base',
    'right',
    10,
    0,
    24,
    34.5,
    21,
  ),
] as const

describe('cabinet run dimensions', () => {
  it('classifies catalog wall cabinets separately from base cabinets', () => {
    expect(getCabinetRunLevel(cabinets[0])).toBe('base')
    expect(getCabinetRunLevel(cabinets[1])).toBe('wall')
  })

  it('groups cabinets by wall and level while preserving project order', () => {
    const groups = groupCabinetsByRun(cabinets)
    const ids = (run: readonly PlacedCabinet[]) =>
      run.map((item) => item.id)

    expect(ids(groups.back.base)).toEqual([
      'back-base-a',
      'back-base-b',
    ])
    expect(ids(groups.back.wall)).toEqual(['back-wall'])
    expect(ids(groups.left.base)).toEqual([])
    expect(ids(groups.left.wall)).toEqual(['left-wall'])
    expect(ids(groups.right.base)).toEqual(['right-base'])
    expect(ids(groups.right.wall)).toEqual([])
  })

  it('reports both summed width and the laid-out span including gaps', () => {
    expect(
      calculateCabinetRunDimensions(cabinets, 'back', 'base'),
    ).toEqual({
      wall: 'back',
      level: 'base',
      cabinetCount: 2,
      summedWidth: 54,
      span: { start: 12, end: 72, length: 60 },
      maxHeight: 40,
      maxDepth: 24,
      bottomElevation: 0,
      topElevation: 43,
    })
  })

  it('adds adjacent cabinet widths into one overall run', () => {
    const adjacent = [
      cabinet(
        'base-one',
        'door-drawer',
        'back',
        0,
        0,
        24,
        34.5,
        24,
      ),
      cabinet(
        'base-two',
        'triple-drawer',
        'back',
        24,
        0,
        24,
        34.5,
        24,
      ),
    ]

    const run = calculateCabinetRunDimensions(
      adjacent,
      'back',
      'base',
    )

    expect(run.cabinetCount).toBe(2)
    expect(run.summedWidth).toBe(48)
    expect(run.span.length).toBe(48)
  })

  it('returns zero dimensions for an empty run', () => {
    expect(
      calculateCabinetRunDimensions(cabinets, 'right', 'wall'),
    ).toEqual({
      wall: 'right',
      level: 'wall',
      cabinetCount: 0,
      summedWidth: 0,
      span: { start: 0, end: 0, length: 0 },
      maxHeight: 0,
      maxDepth: 0,
      bottomElevation: 0,
      topElevation: 0,
    })
  })
})
