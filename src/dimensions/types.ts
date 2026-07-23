import type { CabinetType, PartLayout, Vector3Value } from '../model'

export const DIMENSIONABLE_PART_IDS = [
  'leftSidePanel',
  'rightSidePanel',
  'bottomPanel',
  'backPanel',
  'fullDepthShelf',
  'upperStrengtheningPanel',
  'backUpperReinforcingRail',
  'backLowerReinforcingRail',
  'toeKickPanel',
  'drawerFront',
  'lowerDoor',
  'drawerBoxLeftSide',
  'drawerBoxRightSide',
  'drawerBoxFrontBoard',
  'drawerBoxBackBoard',
  'drawerBoxBottom',
] as const

/**
 * Semantic IDs come from the selected catalog layout. The exported legacy
 * tuple above remains useful to consumers that refer to the original model's
 * sixteen boards, while additional cabinet models can supply their own IDs.
 */
export type DimensionablePartId = string

export type DimensionLocalAxis = 'x' | 'y' | 'z'
export type DimensionAxisLabel = 'W' | 'H' | 'D' | 'L'
export type DimensionDirection = -1 | 1

/** One of the two face/cut measurements shown for a manufactured board. */
export interface DimensionMeasurement {
  /** Axis in the part's own unrotated nominal geometry. */
  localAxis: DimensionLocalAxis
  axisLabel: DimensionAxisLabel
  /** Read directly from the live PartLayout dimensions. */
  value: number
  /** Which edge of the companion measured axis receives this line. */
  edgeSign: DimensionDirection
  /** Distance in inches from that edge to the dimension line. */
  lineOffset: number
}

/** Local placement metadata shared by the reusable 3D annotation renderer. */
export interface DimensionAnnotationPlacement {
  /** Local face on which the two face dimensions are drawn. */
  faceAxis: DimensionLocalAxis
  faceSign: DimensionDirection
  /** Clearance in inches beyond the physical face to avoid z-fighting. */
  surfaceOffset: number
  /** Fine-grained local label adjustment for crowded exploded assemblies. */
  labelOffset: Vector3Value
  /** Small screen-space fan-out for labels whose projected parts converge. */
  labelScreenOffset?: Readonly<{ x: number; y: number }>
  /** Optional phone-specific fan-out without moving the established desktop label. */
  mobileLabelScreenOffset?: Readonly<{ x: number; y: number }>
  /** Optional phone fan-out reached only near a fully exploded assembly. */
  mobileExplodedLabelScreenOffset?: Readonly<{ x: number; y: number }>
}

export interface DimensionSpec {
  cabinetType: CabinetType
  partId: DimensionablePartId
  displayName: string
  /** The exact live layout object used to render this physical part. */
  part: PartLayout
  measurements: readonly [DimensionMeasurement, DimensionMeasurement]
  annotation: DimensionAnnotationPlacement
  /** Preformatted compact label for HTML or sprite renderers. */
  label: string
}
