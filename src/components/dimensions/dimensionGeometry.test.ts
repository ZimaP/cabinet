import { describe, expect, it } from 'vitest'

import { createDimensionSpecs } from '../../dimensions'
import { calculateCabinetLayout } from '../../model'
import {
  createDimensionLabelPosition,
  createDimensionLineGeometry,
} from './dimensionGeometry'

describe('dimension annotation geometry', () => {
  it('draws a side-panel depth line on its selected local face', () => {
    const target = createDimensionSpecs(calculateCabinetLayout()).find(
      ({ partId }) => partId === 'leftSidePanel',
    )
    if (!target) throw new Error('Missing left side dimension spec')

    const geometry = createDimensionLineGeometry(
      target,
      target.measurements[0],
    )
    const expectedFaceX =
      -(target.part.dimensions.x / 2 + target.annotation.surfaceOffset)

    expect(geometry.measuredAxis).toBe('z')
    expect(geometry.offsetAxis).toBe('y')
    expect(geometry.segments.every(([x]) => x === expectedFaceX)).toBe(true)
    expect(geometry.segments[0][2]).toBe(-target.measurements[0].value / 2)
    expect(geometry.segments[1][2]).toBe(target.measurements[0].value / 2)
  })

  it('places the label beyond the primary line and applies local nudges', () => {
    const target = createDimensionSpecs(calculateCabinetLayout()).find(
      ({ partId }) => partId === 'drawerFront',
    )
    if (!target) throw new Error('Missing drawer-front dimension spec')

    const [x, y, z] = createDimensionLabelPosition(target)

    expect(x).toBe(target.annotation.labelOffset.x)
    expect(y).toBeGreaterThan(target.part.dimensions.y / 2)
    expect(z).toBe(
      target.part.dimensions.z / 2 + target.annotation.surfaceOffset,
    )
  })
})
