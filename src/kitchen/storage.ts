import type {
  CabinetParameters,
  CabinetType,
} from '../model/types'
import type { WallCabinetOptions } from '../model/wallCabinetCatalog'
import {
  addCabinet,
  createKitchenProject,
  isCabinetType,
} from './project'
import {
  KITCHEN_PROJECT_VERSION,
  type AddCabinetInput,
  type CabinetPlacement,
  type KitchenProject,
  type RoomDimensions,
} from './types'

export const KITCHEN_STORAGE_KEY = 'cabinet:kitchen-project'
export const MAX_STORED_CABINETS = 250

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const numberValue = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined

const parametersFrom = (
  value: unknown,
): Partial<CabinetParameters> | undefined => {
  if (!isRecord(value)) return undefined
  return {
    width: numberValue(value.width),
    height: numberValue(value.height),
    depth: numberValue(value.depth),
  }
}

const roomFrom = (
  value: unknown,
): Partial<RoomDimensions> | undefined => {
  if (!isRecord(value)) return undefined
  return {
    width: numberValue(value.width),
    depth: numberValue(value.depth),
    height: numberValue(value.height),
  }
}

const placementFrom = (
  value: unknown,
): Partial<CabinetPlacement> | undefined => {
  if (!isRecord(value)) return undefined
  return {
    wall:
      typeof value.wall === 'string'
        ? (value.wall as CabinetPlacement['wall'])
        : undefined,
    offset: numberValue(value.offset),
    elevation: numberValue(value.elevation),
  }
}

const wallOptionsFrom = (
  value: unknown,
): Partial<WallCabinetOptions> | undefined => {
  if (!isRecord(value)) return undefined
  return {
    modelNumber:
      typeof value.modelNumber === 'string'
        ? (value.modelNumber as WallCabinetOptions['modelNumber'])
        : undefined,
    doorCategory:
      typeof value.doorCategory === 'string'
        ? (value.doorCategory as WallCabinetOptions['doorCategory'])
        : undefined,
    doorHand:
      typeof value.doorHand === 'string'
        ? (value.doorHand as WallCabinetOptions['doorHand'])
        : undefined,
    carcassMaterial:
      typeof value.carcassMaterial === 'string'
        ? (value.carcassMaterial as WallCabinetOptions['carcassMaterial'])
        : undefined,
  }
}

const inputFrom = (value: unknown): AddCabinetInput | undefined => {
  if (!isRecord(value) || !isCabinetType(value.cabinetType)) {
    return undefined
  }

  return {
    id: typeof value.id === 'string' ? value.id : undefined,
    cabinetType: value.cabinetType as CabinetType,
    parameters: parametersFrom(value.parameters),
    wallOptions: wallOptionsFrom(value.wallOptions),
    placement: placementFrom(value.placement),
  }
}

/** Normalize an untrusted parsed value into a versioned kitchen project. */
export function normalizeKitchenProject(
  value: unknown,
): KitchenProject {
  if (
    !isRecord(value) ||
    value.version !== KITCHEN_PROJECT_VERSION
  ) {
    return createKitchenProject()
  }

  let project = createKitchenProject(roomFrom(value.room))
  if (!Array.isArray(value.cabinets)) return project

  for (const storedCabinet of value.cabinets.slice(
    0,
    MAX_STORED_CABINETS,
  )) {
    const input = inputFrom(storedCabinet)
    if (input) project = addCabinet(project, input)
  }
  return project
}

/**
 * Generates compact, sanitized JSON suitable for localStorage. The fallback
 * branch also makes this safe for accidentally untrusted/cyclic callers.
 */
export function serializeKitchenProject(
  project: KitchenProject,
): string {
  try {
    return JSON.stringify(normalizeKitchenProject(project))
  } catch {
    return JSON.stringify(createKitchenProject())
  }
}

/**
 * Parses localStorage output without throwing. Null, corrupt JSON, unknown
 * versions, and invalid fields resolve to a new default project.
 */
export function parseKitchenProject(
  serialized: string | null | undefined,
): KitchenProject {
  if (!serialized) return createKitchenProject()
  try {
    return normalizeKitchenProject(JSON.parse(serialized) as unknown)
  } catch {
    return createKitchenProject()
  }
}
