import type { CabinetParameters } from '../model/types'
import {
  KITCHEN_WALLS,
  type CabinetPlacement,
  type CabinetWorldTransform,
  type KitchenWall,
  type PlacedCabinet,
  type RoomDimensions,
  type WallSpan,
} from './types'

export const ROOM_DIMENSION_RANGES = {
  width: { min: 60, max: 600, step: 0.25 },
  depth: { min: 60, max: 600, step: 0.25 },
  height: { min: 72, max: 180, step: 0.25 },
} as const

export const DEFAULT_ROOM_DIMENSIONS: RoomDimensions = {
  width: 144,
  depth: 120,
  height: 96,
}

export const PLACEMENT_SNAP_INCREMENT = 0.25
export const DEFAULT_WALL_CABINET_ELEVATION = 54

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const decimalPlaces = (increment: number): number => {
  const decimal = increment.toString().split('.')[1]
  return decimal?.length ?? 0
}

/** Snap a finite value to a predictable increment without float drift. */
export function snapToIncrement(
  value: number,
  increment = PLACEMENT_SNAP_INCREMENT,
  origin = 0,
): number {
  if (!Number.isFinite(value)) return origin
  if (!Number.isFinite(increment) || increment <= 0) return value

  const snapped =
    origin + Math.round((value - origin) / increment) * increment
  return Number(snapped.toFixed(decimalPlaces(increment) + 2))
}

export function normalizeRoomDimensions(
  requested: Partial<RoomDimensions> = DEFAULT_ROOM_DIMENSIONS,
): RoomDimensions {
  const dimensions = { ...DEFAULT_ROOM_DIMENSIONS }

  for (const dimension of ['width', 'depth', 'height'] as const) {
    const range = ROOM_DIMENSION_RANGES[dimension]
    const candidate = requested[dimension]
    const finite =
      typeof candidate === 'number' && Number.isFinite(candidate)
        ? candidate
        : DEFAULT_ROOM_DIMENSIONS[dimension]
    dimensions[dimension] = clamp(
      snapToIncrement(finite, range.step, range.min),
      range.min,
      range.max,
    )
  }

  return dimensions
}

export function isKitchenWall(value: unknown): value is KitchenWall {
  return (
    typeof value === 'string' &&
    (KITCHEN_WALLS as readonly string[]).includes(value)
  )
}

/** Interior length available along a wall, in inches. */
export function getWallLength(
  room: RoomDimensions,
  wall: KitchenWall,
): number {
  return wall === 'back' ? room.width : room.depth
}

export function calculateCabinetWallSpan(
  cabinet: Pick<PlacedCabinet, 'parameters' | 'placement'>,
): WallSpan {
  const start = cabinet.placement.offset
  const length = cabinet.parameters.width
  return { start, end: start + length, length }
}

/**
 * Grid-snaps a requested placement and clamps it to the selected wall and
 * ceiling. Cabinet dimensions are expected to have already been normalized.
 */
export function normalizeCabinetPlacement(
  room: RoomDimensions,
  parameters: CabinetParameters,
  requested: Partial<CabinetPlacement> = {},
): CabinetPlacement {
  const wall = isKitchenWall(requested.wall) ? requested.wall : 'back'
  const wallLength = getWallLength(room, wall)
  const maximumOffset = Math.max(0, wallLength - parameters.width)
  const maximumElevation = Math.max(0, room.height - parameters.height)

  const requestedOffset =
    typeof requested.offset === 'number' &&
    Number.isFinite(requested.offset)
      ? requested.offset
      : 0
  const requestedElevation =
    typeof requested.elevation === 'number' &&
    Number.isFinite(requested.elevation)
      ? requested.elevation
      : 0

  return {
    wall,
    offset: clamp(
      snapToIncrement(requestedOffset),
      0,
      maximumOffset,
    ),
    elevation: clamp(
      snapToIncrement(requestedElevation),
      0,
      maximumElevation,
    ),
  }
}

/**
 * Converts wall-relative placement into the builder's centered room
 * coordinates. Cabinets use their existing convention: local +Z is front and
 * local +Y is up.
 */
export function calculateCabinetWorldTransform(
  room: RoomDimensions,
  cabinet: Pick<PlacedCabinet, 'parameters' | 'placement'>,
): CabinetWorldTransform {
  const { width, height, depth } = cabinet.parameters
  const { wall, offset, elevation } = normalizeCabinetPlacement(
    room,
    cabinet.parameters,
    cabinet.placement,
  )
  const y = elevation + height / 2

  if (wall === 'left') {
    return {
      position: {
        x: -room.width / 2 + depth / 2,
        y,
        z: -room.depth / 2 + offset + width / 2,
      },
      rotationY: Math.PI / 2,
    }
  }

  if (wall === 'right') {
    return {
      position: {
        x: room.width / 2 - depth / 2,
        y,
        z: -room.depth / 2 + offset + width / 2,
      },
      rotationY: -Math.PI / 2,
    }
  }

  return {
    position: {
      x: -room.width / 2 + offset + width / 2,
      y,
      z: -room.depth / 2 + depth / 2,
    },
    rotationY: 0,
  }
}
