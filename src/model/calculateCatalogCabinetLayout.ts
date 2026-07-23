import { calculateCabinetLayout } from './calculateCabinetLayout'
import { calculateDoubleDoorDoubleDrawerLayout } from './calculateDoubleDoorDoubleDrawerLayout'
import { calculateTripleDrawerCabinetLayout } from './calculateTripleDrawerCabinetLayout'
import { calculateVanitySinkBaseLayout } from './calculateVanitySinkBaseLayout'
import { calculateWallCabinetLayout } from './calculateWallCabinetLayout'
import type { CabinetLayout, CabinetParameters, CabinetType } from './types'
import type { WallCabinetOptions } from './wallCabinetCatalog'

/**
 * Selects one of the independent parametric assemblies. Each calculator
 * continues to create nominal board geometry in inches; this is dispatch only,
 * never a model clone or global scale.
 */
export function calculateCatalogCabinetLayout(
  cabinetType: CabinetType,
  parameters?: Partial<CabinetParameters>,
  wallOptions?: Partial<WallCabinetOptions>,
): CabinetLayout {
  switch (cabinetType) {
    case 'triple-drawer':
      return calculateTripleDrawerCabinetLayout(parameters)
    case 'double-door-double-drawer':
      return calculateDoubleDoorDoubleDrawerLayout(parameters)
    case 'vanity-sink-base':
      return calculateVanitySinkBaseLayout(parameters)
    case 'door-drawer':
      return calculateCabinetLayout(parameters)
    case 'wall-single-42':
    case 'wall-double-42':
    case 'wall-single-36':
    case 'wall-double-36':
      return calculateWallCabinetLayout(
        cabinetType,
        parameters,
        wallOptions,
      )
  }
}
