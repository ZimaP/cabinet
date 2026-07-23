import {
  CABINET_TYPES,
  getCabinetCatalogEntry,
} from '../model/cabinetCatalog'
import type {
  CabinetParameters,
  CabinetType,
} from '../model/types'
import {
  createDefaultWallCabinetOptions,
  getWallCabinetFamily,
  getWallCabinetModelByWidth,
  isWallCabinetType,
  wallModelToParameters,
  type WallCabinetOptions,
  type WallCabinetType,
} from '../model/wallCabinetCatalog'
import {
  DEFAULT_ROOM_DIMENSIONS,
  DEFAULT_WALL_CABINET_ELEVATION,
  normalizeCabinetPlacement,
  normalizeRoomDimensions,
  snapToIncrement,
} from './room'
import { findFirstAvailableOffset } from './placement'
import {
  KITCHEN_PROJECT_VERSION,
  type AddCabinetInput,
  type CabinetPlacement,
  type KitchenProject,
  type PlacedCabinet,
  type RoomDimensions,
} from './types'

const WALL_DOOR_CATEGORIES = ['A', 'B', 'C'] as const
const WALL_DOOR_HANDS = ['left', 'right'] as const
const WALL_CARCASS_MATERIALS = [
  'standard-melamine',
  'maple-veneer',
] as const

const isMember = <Value extends string>(
  value: unknown,
  options: readonly Value[],
): value is Value =>
  typeof value === 'string' &&
  (options as readonly string[]).includes(value)

export function isCabinetType(value: unknown): value is CabinetType {
  return isMember(value, CABINET_TYPES)
}

const normalizeRangedParameters = (
  cabinetType: CabinetType,
  requested: Partial<CabinetParameters> | undefined,
): CabinetParameters => {
  const entry = getCabinetCatalogEntry(cabinetType)
  const parameters = { ...entry.defaultParameters }

  for (const dimension of ['width', 'height', 'depth'] as const) {
    const range = entry.parameterRanges[dimension]
    const candidate = requested?.[dimension]
    const finite =
      typeof candidate === 'number' && Number.isFinite(candidate)
        ? candidate
        : entry.defaultParameters[dimension]
    parameters[dimension] = Math.min(
      range.max,
      Math.max(
        range.min,
        snapToIncrement(finite, range.step, range.min),
      ),
    )
  }

  return parameters
}

const normalizeWallDefinition = (
  cabinetType: WallCabinetType,
  requestedParameters: Partial<CabinetParameters> | undefined,
  requestedOptions: Partial<WallCabinetOptions> | undefined,
): Readonly<{
  parameters: CabinetParameters
  wallOptions: WallCabinetOptions
}> => {
  const defaults = createDefaultWallCabinetOptions(cabinetType)
  const family = getWallCabinetFamily(cabinetType)
  const requestedModel = family.models.find(
    (candidate) =>
      candidate.modelNumber === requestedOptions?.modelNumber,
  )
  const selectedModel =
    requestedModel ??
    getWallCabinetModelByWidth(
      cabinetType,
      requestedParameters?.width ??
        family.models[0].width,
    )

  return {
    parameters: wallModelToParameters(selectedModel),
    wallOptions: {
      modelNumber: selectedModel.modelNumber,
      doorCategory: isMember(
        requestedOptions?.doorCategory,
        WALL_DOOR_CATEGORIES,
      )
        ? requestedOptions.doorCategory
        : defaults.doorCategory,
      doorHand: isMember(
        requestedOptions?.doorHand,
        WALL_DOOR_HANDS,
      )
        ? requestedOptions.doorHand
        : defaults.doorHand,
      carcassMaterial: isMember(
        requestedOptions?.carcassMaterial,
        WALL_CARCASS_MATERIALS,
      )
        ? requestedOptions.carcassMaterial
        : defaults.carcassMaterial,
    },
  }
}

const nextCabinetId = (
  cabinets: readonly Pick<PlacedCabinet, 'id'>[],
): string => {
  const ids = new Set(cabinets.map((cabinet) => cabinet.id))
  let sequence = cabinets.length + 1
  while (ids.has(`cabinet-${sequence}`)) sequence += 1
  return `cabinet-${sequence}`
}

const resolveCabinetId = (
  requested: string | undefined,
  cabinets: readonly Pick<PlacedCabinet, 'id'>[],
): string => {
  const trimmed = requested?.trim()
  if (
    trimmed &&
    !cabinets.some((cabinet) => cabinet.id === trimmed)
  ) {
    return trimmed
  }
  return nextCabinetId(cabinets)
}

export function createKitchenProject(
  room: Partial<RoomDimensions> = DEFAULT_ROOM_DIMENSIONS,
): KitchenProject {
  return {
    version: KITCHEN_PROJECT_VERSION,
    room: normalizeRoomDimensions(room),
    cabinets: [],
  }
}

export function createPlacedCabinet(
  room: RoomDimensions,
  input: AddCabinetInput,
  existingCabinets: readonly PlacedCabinet[] = [],
): PlacedCabinet {
  const wallDefinition = isWallCabinetType(input.cabinetType)
    ? normalizeWallDefinition(
        input.cabinetType,
        input.parameters,
        input.wallOptions,
      )
    : undefined
  const parameters =
    wallDefinition?.parameters ??
    normalizeRangedParameters(input.cabinetType, input.parameters)
  const requestedElevation =
    input.placement?.elevation ??
    (isWallCabinetType(input.cabinetType)
      ? DEFAULT_WALL_CABINET_ELEVATION
      : 0)

  return {
    id: resolveCabinetId(input.id, existingCabinets),
    cabinetType: input.cabinetType,
    parameters,
    ...(wallDefinition
      ? { wallOptions: wallDefinition.wallOptions }
      : {}),
    placement: normalizeCabinetPlacement(room, parameters, {
      ...input.placement,
      elevation: requestedElevation,
    }),
  }
}

export function addCabinet(
  project: KitchenProject,
  input: AddCabinetInput,
): KitchenProject {
  let cabinet = createPlacedCabinet(
    project.room,
    input,
    project.cabinets,
  )
  const hasRequestedOffset =
    typeof input.placement?.offset === 'number' &&
    Number.isFinite(input.placement.offset)

  if (!hasRequestedOffset) {
    const offset = findFirstAvailableOffset(
      project,
      cabinet.parameters,
      cabinet.placement.wall,
      cabinet.placement.elevation,
    )
    if (offset === null) return project
    cabinet = {
      ...cabinet,
      placement: { ...cabinet.placement, offset },
    }
  }

  return {
    ...project,
    cabinets: [...project.cabinets, cabinet],
  }
}

export function duplicateCabinet(
  project: KitchenProject,
  cabinetId: string,
): KitchenProject {
  const source = project.cabinets.find(
    (cabinet) => cabinet.id === cabinetId,
  )
  if (!source) return project

  const offset = findFirstAvailableOffset(
    project,
    source.parameters,
    source.placement.wall,
    source.placement.elevation,
  )
  if (offset === null) return project

  return addCabinet(project, {
    cabinetType: source.cabinetType,
    parameters: source.parameters,
    wallOptions: source.wallOptions,
    placement: {
      ...source.placement,
      offset,
    },
  })
}

export function removeCabinet(
  project: KitchenProject,
  cabinetId: string,
): KitchenProject {
  if (!project.cabinets.some((cabinet) => cabinet.id === cabinetId)) {
    return project
  }

  return {
    ...project,
    cabinets: project.cabinets.filter(
      (cabinet) => cabinet.id !== cabinetId,
    ),
  }
}

export function updateCabinetPlacement(
  project: KitchenProject,
  cabinetId: string,
  changes: Partial<CabinetPlacement>,
): KitchenProject {
  let updated = false
  const cabinets = project.cabinets.map((cabinet) => {
    if (cabinet.id !== cabinetId) return cabinet
    updated = true
    return {
      ...cabinet,
      placement: normalizeCabinetPlacement(
        project.room,
        cabinet.parameters,
        { ...cabinet.placement, ...changes },
      ),
    }
  })

  return updated ? { ...project, cabinets } : project
}

export function updateRoomDimensions(
  project: KitchenProject,
  changes: Partial<RoomDimensions>,
): KitchenProject {
  const room = normalizeRoomDimensions({
    ...project.room,
    ...changes,
  })
  return {
    ...project,
    room,
    cabinets: project.cabinets.map((cabinet) => ({
      ...cabinet,
      placement: normalizeCabinetPlacement(
        room,
        cabinet.parameters,
        cabinet.placement,
      ),
    })),
  }
}
