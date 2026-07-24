import { describe, expect, it } from 'vitest'

import {
  calculateCabinetFocusPose,
  calculateKitchenCameraPose,
} from './camera'
import type { CameraPoint } from './camera'
import type { RoomDimensions } from './types'

const room: RoomDimensions = {
  width: 180,
  depth: 120,
  height: 96,
}

const direction = (
  position: CameraPoint,
  target: CameraPoint,
): CameraPoint => {
  const x = position.x - target.x
  const y = position.y - target.y
  const z = position.z - target.z
  const magnitude = Math.hypot(x, y, z)
  return {
    x: x / magnitude,
    y: y / magnitude,
    z: z / magnitude,
  }
}

describe('calculateKitchenCameraPose', () => {
  it.each([
    ['back', 'z', 1, -room.depth / 2],
    ['left', 'x', 1, -room.width / 2],
    ['right', 'x', -1, room.width / 2],
  ] as const)(
    'faces the active %s wall in Front',
    (activeWall, axis, positionSign, expectedTarget) => {
      const pose = calculateKitchenCameraPose({
        room,
        preset: 'front',
        activeWall,
        viewportWidth: 1200,
        viewportHeight: 800,
      })

      expect(pose.target[axis]).toBe(expectedTarget)
      expect(Math.sign(pose.position[axis] - pose.target[axis])).toBe(
        positionSign,
      )
      expect(pose.up).toEqual({ x: 0, y: 1, z: 0 })
    },
  )

  it('uses a stable screen-up direction for Top', () => {
    const pose = calculateKitchenCameraPose({
      room,
      preset: 'top',
      activeWall: 'left',
      viewportWidth: 1200,
      viewportHeight: 800,
    })

    expect(pose.position.x).toBe(pose.target.x)
    expect(pose.position.z).toBe(pose.target.z)
    expect(pose.position.y).toBeGreaterThan(room.height)
    expect(pose.up).toEqual({ x: 0, y: 0, z: -1 })
  })

  it('backs the perspective camera up on compact viewports', () => {
    const desktop = calculateKitchenCameraPose({
      room,
      preset: 'perspective',
      activeWall: 'back',
      viewportWidth: 1200,
      viewportHeight: 800,
    })
    const compact = calculateKitchenCameraPose({
      room,
      preset: 'perspective',
      activeWall: 'back',
      viewportWidth: 390,
      viewportHeight: 844,
    })

    expect(compact.position.x).toBeGreaterThan(desktop.position.x)
    expect(compact.position.y).toBeGreaterThan(desktop.position.y)
    expect(compact.position.z).toBeGreaterThan(desktop.position.z)
    expect(compact.target).toEqual(desktop.target)
  })

  it('backs Front up far enough for a portrait viewport', () => {
    const landscape = calculateKitchenCameraPose({
      room: { ...room, width: 600 },
      preset: 'front',
      activeWall: 'back',
      viewportWidth: 1200,
      viewportHeight: 800,
    })
    const portrait = calculateKitchenCameraPose({
      room: { ...room, width: 600 },
      preset: 'front',
      activeWall: 'back',
      viewportWidth: 390,
      viewportHeight: 844,
    })

    expect(portrait.position.z - portrait.target.z).toBeGreaterThan(
      landscape.position.z - landscape.target.z,
    )
  })
})

describe('calculateCabinetFocusPose', () => {
  it('centers the target and preserves the current viewing direction', () => {
    const currentPosition = { x: 120, y: 90, z: 140 }
    const currentTarget = { x: 0, y: 40, z: -30 }
    const pose = calculateCabinetFocusPose({
      bounds: {
        minX: -60,
        maxX: -36,
        minY: 54,
        maxY: 90,
        minZ: -60,
        maxZ: -48,
      },
      currentPosition,
      currentTarget,
      viewportWidth: 1200,
      viewportHeight: 800,
    })

    expect(pose.target).toEqual({ x: -48, y: 72, z: -54 })

    const before = direction(currentPosition, currentTarget)
    const after = direction(pose.position, pose.target)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
    expect(after.z).toBeCloseTo(before.z)
    expect(Math.hypot(
      pose.position.x - pose.target.x,
      pose.position.y - pose.target.y,
      pose.position.z - pose.target.z,
    )).toBeGreaterThan(28)
  })

  it('keeps a straight-down focus pose from rolling', () => {
    const pose = calculateCabinetFocusPose({
      bounds: {
        minX: 0,
        maxX: 24,
        minY: 0,
        maxY: 36,
        minZ: 0,
        maxZ: 12,
      },
      currentPosition: { x: 0, y: 200, z: 0 },
      currentTarget: { x: 0, y: 0, z: 0 },
      viewportWidth: 390,
      viewportHeight: 844,
    })

    expect(pose.up).toEqual({ x: 0, y: 0, z: -1 })
    expect(pose.position.y).toBeGreaterThan(pose.target.y)
  })

  it('uses the narrower portrait frustum when focusing a cabinet', () => {
    const bounds = {
      minX: 0,
      maxX: 48,
      minY: 0,
      maxY: 36,
      minZ: 0,
      maxZ: 24,
    }
    const landscape = calculateCabinetFocusPose({
      bounds,
      currentPosition: { x: 120, y: 90, z: 140 },
      currentTarget: { x: 0, y: 40, z: -30 },
      viewportWidth: 1200,
      viewportHeight: 800,
    })
    const portrait = calculateCabinetFocusPose({
      bounds,
      currentPosition: { x: 120, y: 90, z: 140 },
      currentTarget: { x: 0, y: 40, z: -30 },
      viewportWidth: 390,
      viewportHeight: 844,
    })
    const distance = (pose: typeof portrait) =>
      Math.hypot(
        pose.position.x - pose.target.x,
        pose.position.y - pose.target.y,
        pose.position.z - pose.target.z,
      )

    expect(distance(portrait)).toBeGreaterThan(distance(landscape))
  })

  it('moves a behind-wall focus view to the cabinet front side', () => {
    const pose = calculateCabinetFocusPose({
      bounds: {
        minX: 60,
        maxX: 84,
        minY: 0,
        maxY: 36,
        minZ: -12,
        maxZ: 12,
      },
      currentPosition: { x: 180, y: 80, z: 100 },
      currentTarget: { x: 0, y: 40, z: 0 },
      wall: 'right',
      viewportWidth: 1200,
      viewportHeight: 800,
    })

    expect(pose.position.x).toBeLessThan(pose.target.x)
  })
})
