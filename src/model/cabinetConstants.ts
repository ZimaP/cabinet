import type { CabinetParameters } from './types'

/** Exact reference dimensions and every assumption not shown in the image. */
export const CABINET_CONFIG = {
  // Exact construction values from the supplied specification.
  panelThickness: 0.75,
  backThickness: 0.25,
  railWidth: 3.9375,
  toeKickHeight: 4.5,

  // Cabinetmaking assumptions for dimensions absent from the illustration.
  frontReveal: 0.125,
  frontStandOff: 0.035,
  toeKickSetback: 3,
  shelfFitClearance: 0.125,
  shelfFrontClearance: 0.125,
  drawerZoneRatio: 0.18,
  drawerZoneMin: 5.5,
  drawerZoneMax: 8,
  drawerStock: 0.5,
  drawerBottomThickness: 0.25,
  drawerSideClearance: 0.375,
  drawerFrontInset: 0.5,
  drawerRearClearance: 1,
  drawerTopClearance: 0.625,
  drawerBottomInset: 0.25,
  slideWidth: 0.46,
  slideHeight: 0.42,
  slideBottomClearance: 0.16,
  slideRearClearance: 0.3,
  hingeCupDiameter: 1.37795, // 35 mm
  hingeCupDepth: 0.48,
  hingeEdgeOffset: 1.75,
  hingeVerticalInsetRatio: 0.235,
  shelfPinDiameter: 0.197, // approximately 5 mm
  shelfPinDepth: 0.08,
  shelfPinFrontInset: 4.25,
  shelfPinRearInset: 4.25,
  shelfPinSpacing: 1.25,
  shelfPinCount: 9,
  screwDiameter: 0.14,
  screwLength: 0.32,
} as const

export const DEFAULT_PARAMETERS: CabinetParameters = {
  width: 24,
  height: 34.5,
  depth: 24,
}

export const PARAMETER_RANGES = {
  width: { min: 18, max: 42, step: 0.25 },
  height: { min: 28, max: 42, step: 0.25 },
  depth: { min: 18, max: 30, step: 0.25 },
} as const

/** Readable UI-facing alias for the same immutable validation ranges. */
export const CABINET_DIMENSION_RANGES = PARAMETER_RANGES
