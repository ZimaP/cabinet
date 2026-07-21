import { calculateCabinetLayout } from './calculateCabinetLayout'
import { calculateDoubleDoorDoubleDrawerLayout } from './calculateDoubleDoorDoubleDrawerLayout'
import { calculateTripleDrawerCabinetLayout } from './calculateTripleDrawerCabinetLayout'
import type { CabinetLayout, CabinetParameters, CabinetType } from './types'

/**
 * Selects one of the three independent parametric assemblies. Each calculator
 * continues to create nominal board geometry in inches; this is dispatch only,
 * never a model clone or global scale.
 */
export function calculateCatalogCabinetLayout(
  cabinetType: CabinetType,
  parameters?: Partial<CabinetParameters>,
): CabinetLayout {
  switch (cabinetType) {
    case 'triple-drawer':
      return calculateTripleDrawerCabinetLayout(parameters)
    case 'double-door-double-drawer':
      return calculateDoubleDoorDoubleDrawerLayout(parameters)
    case 'door-drawer':
      return calculateCabinetLayout(parameters)
  }
}
