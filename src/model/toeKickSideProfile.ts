import { CABINET_CONFIG } from './cabinetConstants'

/** Metadata marker shared by the parametric layout and side-panel renderer. */
export const TOE_KICK_SIDE_PROFILE = 'toe-kick-side' as const

/**
 * The side remains one D x H manufacturing blank. These values describe the
 * orthogonal lower-front notch cut from that blank for the recessed toe kick.
 */
export const TOE_KICK_SIDE_METADATA = {
  profile: TOE_KICK_SIDE_PROFILE,
  toeKickHeight: CABINET_CONFIG.toeKickHeight,
  toeKickSetback: CABINET_CONFIG.toeKickSetback,
} as const

export interface ToeKickSideProfilePoint {
  /** Local cabinet depth coordinate; positive Z is toward the cabinet front. */
  z: number
  /** Local vertical coordinate; zero is the side-panel center. */
  y: number
}

export interface ToeKickSideProfileInput {
  height: number
  depth: number
  toeKickHeight: number
  toeKickSetback: number
}

/**
 * Returns the six perimeter corners of the real L-shaped side panel. The
 * notch is at the lower front (+Z) and never changes the nominal blank size.
 */
export function calculateToeKickSideProfile({
  height,
  depth,
  toeKickHeight,
  toeKickSetback,
}: ToeKickSideProfileInput): readonly ToeKickSideProfilePoint[] {
  const halfHeight = height / 2
  const halfDepth = depth / 2
  const notchHeight = Math.min(Math.max(0, toeKickHeight), height)
  const notchSetback = Math.min(Math.max(0, toeKickSetback), depth)
  const notchRearZ = halfDepth - notchSetback
  const notchTopY = -halfHeight + notchHeight

  return [
    { z: -halfDepth, y: -halfHeight },
    { z: notchRearZ, y: -halfHeight },
    { z: notchRearZ, y: notchTopY },
    { z: halfDepth, y: notchTopY },
    { z: halfDepth, y: halfHeight },
    { z: -halfDepth, y: halfHeight },
  ]
}
