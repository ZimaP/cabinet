import type { CabinetParameters, CabinetType } from './types'

export const CABINET_TYPES = [
  'door-drawer',
  'triple-drawer',
  'double-door-double-drawer',
  'vanity-sink-base',
] as const

export type CabinetDimension = keyof CabinetParameters

export interface CabinetParameterRange {
  min: number
  max: number
  step: number
}

export type CabinetParameterRanges = Readonly<
  Record<CabinetDimension, CabinetParameterRange>
>

export interface CabinetCatalogEntry {
  id: CabinetType
  label: string
  shortLabel: string
  description: string
  defaultParameters: CabinetParameters
  parameterRanges: CabinetParameterRanges
  standardWidths: readonly number[]
}

const sharedRanges = {
  height: { min: 28, max: 42, step: 0.25 },
  depth: { min: 18, max: 30, step: 0.25 },
} as const

/**
 * Added catalog models expose the nominal widths shown in their references;
 * the original keeps its established safe range and typical 3-inch nominal
 * increments. Quarter-inch control remains available between safe endpoints.
 */
export const CABINET_CATALOG = {
  'door-drawer': {
    id: 'door-drawer',
    label: 'Door + Drawer',
    shortLabel: 'Door + Drawer',
    description: 'One upper drawer and one left-hinged lower door',
    defaultParameters: { width: 24, height: 34.5, depth: 24 },
    parameterRanges: {
      width: { min: 18, max: 42, step: 0.25 },
      ...sharedRanges,
    },
    standardWidths: [18, 21, 24, 27, 30, 33, 36, 39, 42],
  },
  'triple-drawer': {
    id: 'triple-drawer',
    label: 'Triple Drawer',
    shortLabel: 'Triple Drawer',
    description: 'Three stacked full-extension dovetail drawers',
    defaultParameters: { width: 24, height: 34.5, depth: 24 },
    parameterRanges: {
      width: { min: 12, max: 36, step: 0.25 },
      ...sharedRanges,
    },
    standardWidths: [12, 15, 18, 21, 24, 30, 36],
  },
  'double-door-double-drawer': {
    id: 'double-door-double-drawer',
    label: 'Double Door + Double Drawer',
    shortLabel: 'Double Door + 2 Drawers',
    description: 'Two upper drawers above paired opposing doors',
    defaultParameters: { width: 36, height: 34.5, depth: 24 },
    parameterRanges: {
      width: { min: 33, max: 42, step: 0.25 },
      ...sharedRanges,
    },
    standardWidths: [33, 36, 39, 42],
  },
  'vanity-sink-base': {
    id: 'vanity-sink-base',
    label: 'Vanity Sink Base',
    shortLabel: 'Vanity Sink Base',
    description: 'VS30 open sink base with two false fronts and paired doors',
    defaultParameters: { width: 30, height: 34.5, depth: 21 },
    parameterRanges: {
      width: { min: 24, max: 42, step: 0.25 },
      ...sharedRanges,
    },
    standardWidths: [30],
  },
} as const satisfies Readonly<Record<CabinetType, CabinetCatalogEntry>>

export const DEFAULT_CABINET_TYPE: CabinetType = 'door-drawer'

export function getCabinetCatalogEntry(type: CabinetType): CabinetCatalogEntry {
  return CABINET_CATALOG[type]
}
