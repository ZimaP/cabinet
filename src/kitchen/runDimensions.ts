import { isWallCabinetType } from '../model/wallCabinetCatalog'
import type {
  KitchenWall,
  PlacedCabinet,
  WallSpan,
} from './types'

export const CABINET_RUN_LEVELS = ['base', 'wall'] as const

export type CabinetRunLevel =
  (typeof CABINET_RUN_LEVELS)[number]

export type CabinetRunGroups = Readonly<
  Record<
    KitchenWall,
    Readonly<Record<CabinetRunLevel, readonly PlacedCabinet[]>>
  >
>

export interface CabinetRunDimensions {
  wall: KitchenWall
  level: CabinetRunLevel
  cabinetCount: number
  /** Sum of cabinet widths, excluding any gaps between cabinets. */
  summedWidth: number
  /** Occupied wall interval, including any gaps between cabinets. */
  span: WallSpan
  maxHeight: number
  maxDepth: number
  bottomElevation: number
  topElevation: number
}

type MutableCabinetRunGroups = Record<
  KitchenWall,
  Record<CabinetRunLevel, PlacedCabinet[]>
>

export function getCabinetRunLevel(
  cabinet: Pick<PlacedCabinet, 'cabinetType'>,
): CabinetRunLevel {
  return isWallCabinetType(cabinet.cabinetType)
    ? 'wall'
    : 'base'
}

/**
 * Groups cabinets by their supporting wall and catalog level while preserving
 * their project order.
 */
export function groupCabinetsByRun(
  cabinets: readonly PlacedCabinet[],
): CabinetRunGroups {
  const groups: MutableCabinetRunGroups = {
    back: { base: [], wall: [] },
    left: { base: [], wall: [] },
    right: { base: [], wall: [] },
  }

  for (const cabinet of cabinets) {
    groups[cabinet.placement.wall][getCabinetRunLevel(cabinet)].push(
      cabinet,
    )
  }

  return groups
}

/**
 * Calculates the cumulative dimensions for one wall/level run. Summed width
 * answers "how much cabinet is present"; span length additionally includes
 * intentional gaps between the first and last cabinet.
 */
export function calculateCabinetRunDimensions(
  cabinets: readonly PlacedCabinet[],
  wall: KitchenWall,
  level: CabinetRunLevel,
): CabinetRunDimensions {
  const run = groupCabinetsByRun(cabinets)[wall][level]

  if (run.length === 0) {
    return {
      wall,
      level,
      cabinetCount: 0,
      summedWidth: 0,
      span: { start: 0, end: 0, length: 0 },
      maxHeight: 0,
      maxDepth: 0,
      bottomElevation: 0,
      topElevation: 0,
    }
  }

  const start = Math.min(
    ...run.map((cabinet) => cabinet.placement.offset),
  )
  const end = Math.max(
    ...run.map(
      (cabinet) =>
        cabinet.placement.offset + cabinet.parameters.width,
    ),
  )

  return {
    wall,
    level,
    cabinetCount: run.length,
    summedWidth: run.reduce(
      (sum, cabinet) => sum + cabinet.parameters.width,
      0,
    ),
    span: { start, end, length: end - start },
    maxHeight: Math.max(
      ...run.map((cabinet) => cabinet.parameters.height),
    ),
    maxDepth: Math.max(
      ...run.map((cabinet) => cabinet.parameters.depth),
    ),
    bottomElevation: Math.min(
      ...run.map((cabinet) => cabinet.placement.elevation),
    ),
    topElevation: Math.max(
      ...run.map(
        (cabinet) =>
          cabinet.placement.elevation + cabinet.parameters.height,
      ),
    ),
  }
}
