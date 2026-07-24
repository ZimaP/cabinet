import type {
  CabinetRoomBounds,
  KitchenWall,
  RoomDimensions,
} from './types'

export type KitchenCameraPreset = 'perspective' | 'front' | 'top'

export interface CameraPoint {
  x: number
  y: number
  z: number
}

export interface KitchenCameraPose {
  position: CameraPoint
  target: CameraPoint
  up: CameraPoint
}

interface KitchenCameraPoseOptions {
  room: RoomDimensions
  preset: KitchenCameraPreset
  activeWall: KitchenWall
  viewportWidth: number
  viewportHeight: number
  verticalFov?: number
}

interface CabinetFocusPoseOptions {
  bounds: CabinetRoomBounds
  currentPosition: CameraPoint
  currentTarget: CameraPoint
  currentUp?: CameraPoint
  wall?: KitchenWall
  viewportWidth: number
  viewportHeight: number
  verticalFov?: number
}

const DEFAULT_UP: CameraPoint = { x: 0, y: 1, z: 0 }
const TOP_UP: CameraPoint = { x: 0, y: 0, z: -1 }
const DEFAULT_VERTICAL_FOV = 40
const FALLBACK_VIEW_DIRECTION: CameraPoint = {
  x: 0.64,
  y: 0.5,
  z: 0.58,
}

const subtract = (
  first: CameraPoint,
  second: CameraPoint,
): CameraPoint => ({
  x: first.x - second.x,
  y: first.y - second.y,
  z: first.z - second.z,
})

const dot = (first: CameraPoint, second: CameraPoint): number =>
  first.x * second.x + first.y * second.y + first.z * second.z

const cross = (
  first: CameraPoint,
  second: CameraPoint,
): CameraPoint => ({
  x: first.y * second.z - first.z * second.y,
  y: first.z * second.x - first.x * second.z,
  z: first.x * second.y - first.y * second.x,
})

const length = (point: CameraPoint): number =>
  Math.hypot(point.x, point.y, point.z)

const normalize = (
  point: CameraPoint,
  fallback: CameraPoint,
): CameraPoint => {
  const magnitude = length(point)
  if (!Number.isFinite(magnitude) || magnitude < 0.0001) {
    return normalize(fallback, DEFAULT_UP)
  }

  return {
    x: point.x / magnitude,
    y: point.y / magnitude,
    z: point.z / magnitude,
  }
}

const wallViewDirection = (wall: KitchenWall): CameraPoint => {
  if (wall === 'left') return { x: 1, y: 0, z: 0 }
  if (wall === 'right') return { x: -1, y: 0, z: 0 }
  return { x: 0, y: 0, z: 1 }
}

const frontWallTarget = (
  room: RoomDimensions,
  wall: KitchenWall,
): CameraPoint => {
  const y = room.height / 2

  if (wall === 'left') {
    return { x: -room.width / 2, y, z: 0 }
  }

  if (wall === 'right') {
    return { x: room.width / 2, y, z: 0 }
  }

  return { x: 0, y, z: -room.depth / 2 }
}

const roomBounds = (room: RoomDimensions): CabinetRoomBounds => ({
  minX: -room.width / 2,
  maxX: room.width / 2,
  minY: 0,
  maxY: room.height,
  minZ: -room.depth / 2,
  maxZ: room.depth / 2,
})

const wallBounds = (
  room: RoomDimensions,
  wall: KitchenWall,
): CabinetRoomBounds => {
  if (wall === 'left' || wall === 'right') {
    const x = wall === 'left' ? -room.width / 2 : room.width / 2
    return {
      minX: x,
      maxX: x,
      minY: 0,
      maxY: room.height,
      minZ: -room.depth / 2,
      maxZ: room.depth / 2,
    }
  }

  const z = -room.depth / 2
  return {
    minX: -room.width / 2,
    maxX: room.width / 2,
    minY: 0,
    maxY: room.height,
    minZ: z,
    maxZ: z,
  }
}

/**
 * Finds the shortest distance that keeps every corner of an axis-aligned
 * bounds inside both the horizontal and vertical perspective frustum.
 */
const cameraDistanceToFitBounds = ({
  bounds,
  target,
  direction,
  up,
  viewportWidth,
  viewportHeight,
  verticalFov,
  margin,
}: {
  bounds: CabinetRoomBounds
  target: CameraPoint
  direction: CameraPoint
  up: CameraPoint
  viewportWidth: number
  viewportHeight: number
  verticalFov: number
  margin: number
}): number => {
  const viewDirection = normalize(direction, FALLBACK_VIEW_DIRECTION)
  const screenRight = normalize(
    cross(up, viewDirection),
    { x: 1, y: 0, z: 0 },
  )
  const screenUp = normalize(
    cross(viewDirection, screenRight),
    DEFAULT_UP,
  )
  const aspect = Math.max(0.1, viewportWidth / Math.max(1, viewportHeight))
  const verticalTangent = Math.tan(
    (Math.max(1, verticalFov) * Math.PI) / 360,
  )
  const horizontalTangent = verticalTangent * aspect
  let requiredDistance = 24

  for (const x of [bounds.minX, bounds.maxX]) {
    for (const y of [bounds.minY, bounds.maxY]) {
      for (const z of [bounds.minZ, bounds.maxZ]) {
        const offset = subtract({ x, y, z }, target)
        const depth = dot(offset, viewDirection)
        const horizontal =
          Math.abs(dot(offset, screenRight)) /
          Math.max(0.001, horizontalTangent)
        const vertical =
          Math.abs(dot(offset, screenUp)) /
          Math.max(0.001, verticalTangent)
        requiredDistance = Math.max(
          requiredDistance,
          depth + horizontal * margin,
          depth + vertical * margin,
        )
      }
    }
  }

  return requiredDistance
}

/**
 * Produces deterministic, aspect-aware camera presets without depending on
 * Three.js. Front faces the active wall; Top uses a fixed non-collinear up
 * vector so its orientation cannot roll between renders.
 */
export function calculateKitchenCameraPose({
  room,
  preset,
  activeWall,
  viewportWidth,
  viewportHeight,
  verticalFov = DEFAULT_VERTICAL_FOV,
}: KitchenCameraPoseOptions): KitchenCameraPose {
  if (preset === 'top') {
    const target = { x: 0, y: 0, z: 0 }
    const direction = { x: 0, y: 1, z: 0 }
    const distance = cameraDistanceToFitBounds({
      bounds: roomBounds(room),
      target,
      direction,
      up: TOP_UP,
      viewportWidth,
      viewportHeight,
      verticalFov,
      margin: 1.14,
    })

    return {
      position: {
        x: target.x,
        y: target.y + distance,
        z: target.z,
      },
      target,
      up: TOP_UP,
    }
  }

  if (preset === 'front') {
    const target = frontWallTarget(room, activeWall)
    const direction = wallViewDirection(activeWall)
    const distance = cameraDistanceToFitBounds({
      bounds: wallBounds(room, activeWall),
      target,
      direction,
      up: DEFAULT_UP,
      viewportWidth,
      viewportHeight,
      verticalFov,
      margin: 1.14,
    })

    return {
      position: {
        x: target.x + direction.x * distance,
        y: target.y + direction.y * distance,
        z: target.z + direction.z * distance,
      },
      target,
      up: DEFAULT_UP,
    }
  }

  const target = {
    x: 0,
    y: room.height * 0.46,
    z: -room.depth * 0.08,
  }
  const direction = normalize(
    {
      x: room.width * 0.86,
      y: room.height * 0.6,
      z: room.depth * 1.06,
    },
    FALLBACK_VIEW_DIRECTION,
  )
  const distance = cameraDistanceToFitBounds({
    bounds: roomBounds(room),
    target,
    direction,
    up: DEFAULT_UP,
    viewportWidth,
    viewportHeight,
    verticalFov,
    margin: 1.18,
  })

  return {
    position: {
      x: target.x + direction.x * distance,
      y: target.y + direction.y * distance,
      z: target.z + direction.z * distance,
    },
    target,
    up: DEFAULT_UP,
  }
}

/**
 * Frames one cabinet while preserving the user's viewing direction when that
 * direction is in front of the cabinet. A behind-wall view is moved to the
 * cabinet's usable front side.
 */
export function calculateCabinetFocusPose({
  bounds,
  currentPosition,
  currentTarget,
  currentUp = DEFAULT_UP,
  wall,
  viewportWidth,
  viewportHeight,
  verticalFov = DEFAULT_VERTICAL_FOV,
}: CabinetFocusPoseOptions): KitchenCameraPose {
  const target = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  }
  let viewDirection = normalize(
    subtract(currentPosition, currentTarget),
    FALLBACK_VIEW_DIRECTION,
  )
  const nearlyVertical = Math.abs(viewDirection.y) > 0.94

  if (
    wall &&
    !nearlyVertical &&
    dot(viewDirection, wallViewDirection(wall)) < 0.12
  ) {
    const frontDirection = wallViewDirection(wall)
    viewDirection = normalize(
      {
        x: frontDirection.x,
        y: Math.max(0.32, viewDirection.y),
        z: frontDirection.z,
      },
      FALLBACK_VIEW_DIRECTION,
    )
  }

  const up = nearlyVertical
    ? TOP_UP
    : normalize(currentUp, DEFAULT_UP)
  const distance = cameraDistanceToFitBounds({
    bounds,
    target,
    direction: viewDirection,
    up,
    viewportWidth,
    viewportHeight,
    verticalFov,
    margin: 1.18,
  })

  return {
    position: {
      x: target.x + viewDirection.x * distance,
      y: target.y + viewDirection.y * distance,
      z: target.z + viewDirection.z * distance,
    },
    target,
    up,
  }
}
