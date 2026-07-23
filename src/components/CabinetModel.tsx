import { useMemo } from 'react'

import { createDimensionSpecs, type DimensionSpec } from '../dimensions'
import {
  isWallCabinetType,
  type CabinetLayout,
  type PartLayout,
} from '../model'
import { Carcass } from './Carcass'
import { DrawerAssembly } from './DrawerAssembly'
import { Hardware } from './Hardware'

export interface CabinetModelProps {
  layout: CabinetLayout
  exploded: number
  dimensionsMode: boolean
}

const includesAny = (value: string, terms: readonly string[]) =>
  terms.some((term) => value.includes(term))

function partitionParts(parts: readonly PartLayout[]) {
  const carcass: PartLayout[] = []
  const drawer: PartLayout[] = []
  const hardware: PartLayout[] = []

  for (const part of parts) {
    const id = part.id.toLowerCase()
    if (part.category === 'hardware') {
      hardware.push(part)
    } else if (part.category === 'front' || part.category === 'drawer') {
      drawer.push(part)
    } else if (
      part.category === 'detail' &&
      includesAny(id, ['dovetail', 'drawerbox', 'drawer-box'])
    ) {
      drawer.push(part)
    } else if (
      part.category === 'detail' &&
      includesAny(id, ['hinge', 'slide', 'screw', 'fastener'])
    ) {
      hardware.push(part)
    } else {
      carcass.push(part)
    }
  }

  return { carcass, drawer, hardware }
}

/**
 * Complete procedural cabinet. One world unit equals one inch; all dimensions
 * and transforms come from the pure calculation layer in src/model.
 */
export function CabinetModel({
  layout,
  exploded,
  dimensionsMode,
}: CabinetModelProps) {
  const parts = useMemo(() => partitionParts(layout.parts), [layout.parts])
  const dimensionSpecs = useMemo<ReadonlyMap<string, DimensionSpec>>(() => {
    if (!dimensionsMode) return new Map()

    return new Map(
      createDimensionSpecs(layout).map((spec) => [spec.partId, spec]),
    )
  }, [dimensionsMode, layout])

  return (
    <group
      name={
        isWallCabinetType(layout.cabinetType)
          ? 'parametric-kitchen-wall-cabinet'
          : 'parametric-kitchen-base-cabinet'
      }
      userData={{
        dimensionsInches: layout.parameters,
        exploded,
        dimensionsMode,
        construction: isWallCabinetType(layout.cabinetType)
          ? 'frameless-wall-cabinet'
          : 'frameless-base-cabinet',
      }}
    >
      <Carcass
        parts={parts.carcass}
        exploded={exploded}
        dimensionSpecs={dimensionSpecs}
      />
      <DrawerAssembly
        parts={parts.drawer}
        exploded={exploded}
        dimensionSpecs={dimensionSpecs}
      />
      <Hardware parts={parts.hardware} exploded={exploded} />
    </group>
  )
}

export default CabinetModel
