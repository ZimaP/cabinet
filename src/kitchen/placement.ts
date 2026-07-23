import {
  PLACEMENT_SNAP_INCREMENT,
  getWallLength,
  isKitchenWall,
} from './room'
import type {
  CabinetPlacementIssues,
  CabinetRoomBounds,
  KitchenProject,
  KitchenWall,
  PlacedCabinet,
  RoomDimensions,
} from './types'
import type { CabinetParameters } from '../model/types'

const intervalsOverlap = (
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
): boolean =>
  firstStart < secondEnd && secondStart < firstEnd

export function cabinetPlacementsOverlap(
  first: Pick<PlacedCabinet, 'parameters' | 'placement'>,
  second: Pick<PlacedCabinet, 'parameters' | 'placement'>,
): boolean {
  if (first.placement.wall !== second.placement.wall) return false

  const horizontalOverlap = intervalsOverlap(
    first.placement.offset,
    first.placement.offset + first.parameters.width,
    second.placement.offset,
    second.placement.offset + second.parameters.width,
  )
  const verticalOverlap = intervalsOverlap(
    first.placement.elevation,
    first.placement.elevation + first.parameters.height,
    second.placement.elevation,
    second.placement.elevation + second.parameters.height,
  )
  return horizontalOverlap && verticalOverlap
}

/**
 * Exact room-world AABB for a cabinet's closed carcass volume. The room is
 * centered on X/Z, its back is negative Z, and all elevations start at Y=0.
 */
export function calculateCabinetRoomBounds(
  room: RoomDimensions,
  cabinet: Pick<PlacedCabinet, 'parameters' | 'placement'>,
): CabinetRoomBounds {
  const { width, height, depth } = cabinet.parameters
  const { wall, offset, elevation } = cabinet.placement
  const minY = elevation
  const maxY = elevation + height

  if (wall === 'left') {
    return {
      minX: -room.width / 2,
      maxX: -room.width / 2 + depth,
      minY,
      maxY,
      minZ: -room.depth / 2 + offset,
      maxZ: -room.depth / 2 + offset + width,
    }
  }

  if (wall === 'right') {
    return {
      minX: room.width / 2 - depth,
      maxX: room.width / 2,
      minY,
      maxY,
      minZ: -room.depth / 2 + offset,
      maxZ: -room.depth / 2 + offset + width,
    }
  }

  return {
    minX: -room.width / 2 + offset,
    maxX: -room.width / 2 + offset + width,
    minY,
    maxY,
    minZ: -room.depth / 2,
    maxZ: -room.depth / 2 + depth,
  }
}

const roomBoundsOverlap = (
  first: CabinetRoomBounds,
  second: CabinetRoomBounds,
): boolean =>
  intervalsOverlap(first.minX, first.maxX, second.minX, second.maxX) &&
  intervalsOverlap(first.minY, first.maxY, second.minY, second.maxY) &&
  intervalsOverlap(first.minZ, first.maxZ, second.minZ, second.maxZ)

const isCabinetOutOfBounds = (
  project: KitchenProject,
  cabinet: PlacedCabinet,
): boolean => {
  const { placement, parameters } = cabinet
  if (!isKitchenWall(placement.wall)) return true

  const values = [
    placement.offset,
    placement.elevation,
    parameters.width,
    parameters.height,
    parameters.depth,
  ]
  if (
    values.some((value) => !Number.isFinite(value)) ||
    parameters.width <= 0 ||
    parameters.height <= 0 ||
    parameters.depth <= 0
  ) {
    return true
  }

  const wallLength = getWallLength(project.room, placement.wall)
  const perpendicularRoomLength =
    placement.wall === 'back'
      ? project.room.depth
      : project.room.width

  return (
    placement.offset < 0 ||
    placement.offset + parameters.width > wallLength ||
    placement.elevation < 0 ||
    placement.elevation + parameters.height > project.room.height ||
    parameters.depth > perpendicularRoomLength
  )
}

export function getCabinetPlacementIssues(
  project: KitchenProject,
): CabinetPlacementIssues {
  const outOfBoundsIds = project.cabinets
    .filter((cabinet) => isCabinetOutOfBounds(project, cabinet))
    .map((cabinet) => cabinet.id)
  const overlapIds = new Set<string>()
  const overlapPairs: (readonly [string, string])[] = []

  for (
    let firstIndex = 0;
    firstIndex < project.cabinets.length;
    firstIndex += 1
  ) {
    const first = project.cabinets[firstIndex]
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < project.cabinets.length;
      secondIndex += 1
    ) {
      const second = project.cabinets[secondIndex]
      if (
        isKitchenWall(first.placement.wall) &&
        isKitchenWall(second.placement.wall) &&
        roomBoundsOverlap(
          calculateCabinetRoomBounds(project.room, first),
          calculateCabinetRoomBounds(project.room, second),
        )
      ) {
        overlapIds.add(first.id)
        overlapIds.add(second.id)
        overlapPairs.push([first.id, second.id])
      }
    }
  }

  return {
    outOfBoundsIds,
    overlapIds: [...overlapIds],
    overlapPairs,
  }
}

/**
 * Finds the earliest free offset on a wall for the requested vertical band.
 * Exact touching edges are valid at the default zero clearance; pass `1` to
 * leave a one-inch horizontal gap.
 */
export function findFirstAvailableOffset(
  project: KitchenProject,
  parameters: CabinetParameters,
  wall: KitchenWall,
  elevation: number,
  clearance = 0,
): number | null {
  const wallLength = getWallLength(project.room, wall)
  const maximumOffset = wallLength - parameters.width
  if (
    !Number.isFinite(maximumOffset) ||
    maximumOffset < 0 ||
    !Number.isFinite(elevation)
  ) {
    return null
  }

  const safeClearance =
    Number.isFinite(clearance) && clearance > 0 ? clearance : 0
  let candidate = 0
  const movementAxis = wall === 'back' ? 'X' : 'Z'
  const wallAxisStart =
    movementAxis === 'X' ? -project.room.width / 2 : -project.room.depth / 2

  while (candidate <= maximumOffset) {
    const candidateBounds = calculateCabinetRoomBounds(project.room, {
      parameters,
      placement: { wall, offset: candidate, elevation },
    })
    const conflicts = project.cabinets.filter((cabinet) => {
      if (!isKitchenWall(cabinet.placement.wall)) return false
      const bounds = calculateCabinetRoomBounds(project.room, cabinet)
      const verticalOverlap = intervalsOverlap(
        candidateBounds.minY,
        candidateBounds.maxY,
        bounds.minY,
        bounds.maxY,
      )
      const perpendicularOverlap =
        movementAxis === 'X'
          ? intervalsOverlap(
              candidateBounds.minZ,
              candidateBounds.maxZ,
              bounds.minZ,
              bounds.maxZ,
            )
          : intervalsOverlap(
              candidateBounds.minX,
              candidateBounds.maxX,
              bounds.minX,
              bounds.maxX,
            )
      const movementOverlap =
        movementAxis === 'X'
          ? intervalsOverlap(
              candidateBounds.minX,
              candidateBounds.maxX,
              bounds.minX - safeClearance,
              bounds.maxX + safeClearance,
            )
          : intervalsOverlap(
              candidateBounds.minZ,
              candidateBounds.maxZ,
              bounds.minZ - safeClearance,
              bounds.maxZ + safeClearance,
            )
      return verticalOverlap && perpendicularOverlap && movementOverlap
    })

    if (conflicts.length === 0) return candidate

    const nextCandidate = Math.max(
      ...conflicts.map((cabinet) => {
        const bounds = calculateCabinetRoomBounds(project.room, cabinet)
        const blockingEnd =
          movementAxis === 'X' ? bounds.maxX : bounds.maxZ
        return blockingEnd - wallAxisStart + safeClearance
      }),
    )
    candidate =
      nextCandidate > candidate
        ? nextCandidate
        : candidate + PLACEMENT_SNAP_INCREMENT
  }

  return null
}
