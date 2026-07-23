import type {
  CabinetParameters,
  CabinetType,
} from '../model/types'
import type { WallCabinetOptions } from '../model/wallCabinetCatalog'

export const KITCHEN_WALLS = ['back', 'left', 'right'] as const

export type KitchenWall = (typeof KITCHEN_WALLS)[number]

/** Interior room dimensions, expressed in inches. */
export interface RoomDimensions {
  width: number
  depth: number
  height: number
}

/**
 * Offset is measured from the wall's starting interior corner. Back-wall
 * offsets run left-to-right; side-wall offsets run back-to-front.
 */
export interface CabinetPlacement {
  wall: KitchenWall
  offset: number
  elevation: number
}

export interface PlacedCabinet {
  id: string
  cabinetType: CabinetType
  parameters: CabinetParameters
  wallOptions?: WallCabinetOptions
  placement: CabinetPlacement
}

export interface WallSpan {
  start: number
  end: number
  length: number
}

export interface CabinetPlacementIssues {
  outOfBoundsIds: readonly string[]
  overlapIds: readonly string[]
  overlapPairs: readonly (readonly [string, string])[]
}

export interface CabinetRoomBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export interface CabinetWorldTransform {
  position: Readonly<{ x: number; y: number; z: number }>
  rotationY: number
}

export const KITCHEN_PROJECT_VERSION = 1 as const

export interface KitchenProject {
  version: typeof KITCHEN_PROJECT_VERSION
  room: RoomDimensions
  cabinets: readonly PlacedCabinet[]
}

export interface AddCabinetInput {
  id?: string
  cabinetType: CabinetType
  parameters?: Partial<CabinetParameters>
  wallOptions?: Partial<WallCabinetOptions>
  placement?: Partial<CabinetPlacement>
}
