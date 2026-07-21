import {
  CABINET_CONFIG as BASE,
  PARAMETER_RANGES,
} from './cabinetConstants'
import type {
  CabinetDerivedDimensions,
  CabinetLayout,
  CabinetParameters,
  PartCategory,
  PartKind,
  PartLayout,
  PartMaterial,
  PartMetadata,
  Vector3Value,
} from './types'
import { finalizeCabinetLayout } from './semanticManufacturing'

/** Catalog sizes shown in the supplied triple-drawer reference. */
export const TRIPLE_DRAWER_CATALOG_WIDTHS = [
  12, 15, 18, 21, 24, 30, 36,
] as const

export const TRIPLE_DRAWER_DEFAULT_PARAMETERS: CabinetParameters = {
  width: 24,
  height: 34.5,
  depth: 24,
}

/**
 * Assumptions specific to the triple-drawer cabinet. Exact sheet-good and
 * drawer-box stock values continue to come from the original construction
 * specification through CABINET_CONFIG.
 */
export const TRIPLE_DRAWER_CONFIG = {
  widthRange: { min: 12, max: 36 },
  frontGap: BASE.frontReveal,
  shallowFrontRatio: 0.22,
  shallowFrontMin: 5.5,
  shallowFrontMax: 7.5,
  middleShareOfDeepFronts: 0.47,
  boxFrontClearance: 1.25,
  topBoxHeightMin: 3.75,
  topBoxHeightMax: 5.5,
  middleBoxHeightMin: 6,
  middleBoxHeightMax: 9.5,
  bottomBoxHeightMin: 7,
  bottomBoxHeightMax: 11,
  frontProfile: 'shaker-inset',
  shakerFrameWidth: 2,
  shakerPanelInset: 0.18,
  slideMountingScrewCount: 2,
} as const

export type TripleDrawerPrefix =
  | 'topDrawer'
  | 'middleDrawer'
  | 'bottomDrawer'

export interface TripleDrawerRowDimensions {
  prefix: TripleDrawerPrefix
  label: 'Top' | 'Middle' | 'Bottom'
  frontHeight: number
  frontCenterY: number
  boxHeight: number
  boxCenterY: number
  boxOuterWidth: number
  boxInnerWidth: number
  boxDepth: number
  boxCenterZ: number
  slideY: number
}

export interface TripleDrawerDerivedDimensions
  extends CabinetDerivedDimensions {
  frontWidth: number
  totalDrawerFrontHeight: number
  drawerRows: readonly TripleDrawerRowDimensions[]
}

export interface TripleDrawerCabinetLayout extends CabinetLayout {
  derived: TripleDrawerDerivedDimensions
}

const ZERO: Vector3Value = { x: 0, y: 0, z: 0 }
const v = (x = 0, y = 0, z = 0): Vector3Value => ({ x, y, z })
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))
const finiteOr = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? (value as number) : fallback
const precise = (value: number) => Math.round(value * 10000) / 10000

function normalizeTripleDrawerParameters(
  input: Partial<CabinetParameters>,
): CabinetParameters {
  return {
    width: precise(
      clamp(
        finiteOr(input.width, TRIPLE_DRAWER_DEFAULT_PARAMETERS.width),
        TRIPLE_DRAWER_CONFIG.widthRange.min,
        TRIPLE_DRAWER_CONFIG.widthRange.max,
      ),
    ),
    height: precise(
      clamp(
        finiteOr(input.height, TRIPLE_DRAWER_DEFAULT_PARAMETERS.height),
        PARAMETER_RANGES.height.min,
        PARAMETER_RANGES.height.max,
      ),
    ),
    depth: precise(
      clamp(
        finiteOr(input.depth, TRIPLE_DRAWER_DEFAULT_PARAMETERS.depth),
        PARAMETER_RANGES.depth.min,
        PARAMETER_RANGES.depth.max,
      ),
    ),
  }
}

interface AddPartOptions {
  id: string
  name: string
  category: PartCategory
  kind?: PartKind
  material?: PartMaterial
  dimensions: Vector3Value
  position: Vector3Value
  rotation?: Vector3Value
  explosion?: Vector3Value
  explosionRotation?: Vector3Value
  metadata?: PartMetadata
}

interface DrawerRowDefinition {
  prefix: TripleDrawerPrefix
  label: TripleDrawerRowDimensions['label']
  frontHeight: number
  frontCenterY: number
  boxHeight: number
  explodeY: number
  explodeZ: number
}

/**
 * Pure layout for the three-drawer base cabinet. One world unit is one inch;
 * X is width, Y is height from the floor, and positive Z points forward. All
 * boards receive nominal manufacturing dimensions rather than a group scale.
 */
export function calculateTripleDrawerCabinetLayout(
  input: Partial<CabinetParameters> = TRIPLE_DRAWER_DEFAULT_PARAMETERS,
): TripleDrawerCabinetLayout {
  const parameters = normalizeTripleDrawerParameters(input)
  const { width: W, height: H, depth: D } = parameters
  const T = BASE.panelThickness
  const interiorWidth = W - 2 * T
  const bottomCenterY = BASE.toeKickHeight + T / 2
  const bottomTopY = BASE.toeKickHeight + T
  const frontZ = D / 2 + BASE.frontStandOff + T / 2

  // The top and bottom reveals plus two equal inter-drawer gaps remain fixed.
  const frontTopY = H - BASE.frontReveal
  const frontBottomY = BASE.toeKickHeight + BASE.frontReveal
  const usableFrontHeight = frontTopY - frontBottomY
  const totalDrawerFrontHeight =
    usableFrontHeight - 2 * TRIPLE_DRAWER_CONFIG.frontGap
  const topFrontHeight = clamp(
    totalDrawerFrontHeight * TRIPLE_DRAWER_CONFIG.shallowFrontRatio,
    TRIPLE_DRAWER_CONFIG.shallowFrontMin,
    TRIPLE_DRAWER_CONFIG.shallowFrontMax,
  )
  const deepFrontHeight = totalDrawerFrontHeight - topFrontHeight
  const middleFrontHeight =
    deepFrontHeight * TRIPLE_DRAWER_CONFIG.middleShareOfDeepFronts
  const bottomFrontHeight = deepFrontHeight - middleFrontHeight

  const topFrontCenterY = frontTopY - topFrontHeight / 2
  const middleFrontTopY =
    frontTopY - topFrontHeight - TRIPLE_DRAWER_CONFIG.frontGap
  const middleFrontCenterY = middleFrontTopY - middleFrontHeight / 2
  const bottomFrontTopY =
    middleFrontTopY - middleFrontHeight - TRIPLE_DRAWER_CONFIG.frontGap
  const bottomFrontCenterY = bottomFrontTopY - bottomFrontHeight / 2

  const topBoxHeight = clamp(
    topFrontHeight - TRIPLE_DRAWER_CONFIG.boxFrontClearance,
    TRIPLE_DRAWER_CONFIG.topBoxHeightMin,
    TRIPLE_DRAWER_CONFIG.topBoxHeightMax,
  )
  const middleBoxHeight = clamp(
    middleFrontHeight - TRIPLE_DRAWER_CONFIG.boxFrontClearance,
    TRIPLE_DRAWER_CONFIG.middleBoxHeightMin,
    TRIPLE_DRAWER_CONFIG.middleBoxHeightMax,
  )
  const bottomBoxHeight = clamp(
    bottomFrontHeight - TRIPLE_DRAWER_CONFIG.boxFrontClearance,
    TRIPLE_DRAWER_CONFIG.bottomBoxHeightMin,
    TRIPLE_DRAWER_CONFIG.bottomBoxHeightMax,
  )

  const drawerBoxOuterWidth = interiorWidth - 2 * BASE.drawerSideClearance
  const drawerBoxDepth = Math.max(
    12,
    D - BASE.drawerFrontInset - BASE.drawerRearClearance - T,
  )
  const drawerBoxFrontZ = D / 2 - T - BASE.drawerFrontInset
  const drawerBoxCenterZ = drawerBoxFrontZ - drawerBoxDepth / 2
  const slideLength = drawerBoxDepth - BASE.slideRearClearance
  const frontWidth = W - 2 * BASE.frontReveal
  const DS = BASE.drawerStock
  const drawerInnerWidth = drawerBoxOuterWidth - 2 * DS

  const rows: readonly DrawerRowDefinition[] = [
    {
      prefix: 'topDrawer',
      label: 'Top',
      frontHeight: topFrontHeight,
      frontCenterY: topFrontCenterY,
      boxHeight: topBoxHeight,
      explodeY: 6,
      explodeZ: 25,
    },
    {
      prefix: 'middleDrawer',
      label: 'Middle',
      frontHeight: middleFrontHeight,
      frontCenterY: middleFrontCenterY,
      boxHeight: middleBoxHeight,
      explodeY: 0,
      explodeZ: 21,
    },
    {
      prefix: 'bottomDrawer',
      label: 'Bottom',
      frontHeight: bottomFrontHeight,
      frontCenterY: bottomFrontCenterY,
      boxHeight: bottomBoxHeight,
      explodeY: -6,
      explodeZ: 17,
    },
  ]

  const drawerRows: readonly TripleDrawerRowDimensions[] = rows.map((row) => {
    const boxCenterY = row.frontCenterY - 0.12
    return {
      prefix: row.prefix,
      label: row.label,
      frontHeight: precise(row.frontHeight),
      frontCenterY: precise(row.frontCenterY),
      boxHeight: precise(row.boxHeight),
      boxCenterY: precise(boxCenterY),
      boxOuterWidth: precise(drawerBoxOuterWidth),
      boxInnerWidth: precise(drawerInnerWidth),
      boxDepth: precise(drawerBoxDepth),
      boxCenterZ: precise(drawerBoxCenterZ),
      slideY: precise(
        boxCenterY - row.boxHeight / 2 - BASE.slideBottomClearance,
      ),
    }
  })

  const derived: TripleDrawerDerivedDimensions = {
    interiorWidth: precise(interiorWidth),
    usableFrontHeight: precise(usableFrontHeight),
    // Legacy summary fields describe the shallow/top drawer for consumers that
    // only need a representative drawer; drawerRows is the full source.
    drawerZoneHeight: precise(topFrontHeight),
    doorHeight: 0,
    bottomTopY: precise(bottomTopY),
    shelfY: precise(bottomTopY + (frontTopY - bottomTopY) / 2),
    drawerBoxOuterWidth: precise(drawerBoxOuterWidth),
    drawerBoxHeight: precise(topBoxHeight),
    drawerBoxDepth: precise(drawerBoxDepth),
    slideLength: precise(slideLength),
    frontZ: precise(frontZ),
    frontWidth: precise(frontWidth),
    totalDrawerFrontHeight: precise(totalDrawerFrontHeight),
    drawerRows,
  }

  const parts: PartLayout[] = []
  const add = (options: AddPartOptions) => {
    const part: PartLayout = {
      id: options.id,
      name: options.name,
      category: options.category,
      kind: options.kind ?? 'box',
      material: options.material ?? 'white-melamine',
      dimensions: {
        x: precise(options.dimensions.x),
        y: precise(options.dimensions.y),
        z: precise(options.dimensions.z),
      },
      position: {
        x: precise(options.position.x),
        y: precise(options.position.y),
        z: precise(options.position.z),
      },
      rotation: options.rotation ?? ZERO,
      explosion: {
        translation: options.explosion ?? ZERO,
        rotation: options.explosionRotation ?? ZERO,
      },
      metadata: options.metadata ?? {},
    }
    parts.push(part)
    return part
  }

  // Carcass IDs intentionally match the existing cabinet wherever applicable.
  add({
    id: 'leftSidePanel',
    name: 'Left plywood side panel',
    category: 'carcass',
    dimensions: v(T, H, D),
    position: v(-W / 2 + T / 2, H / 2, 0),
    explosion: v(-10, 0.8, 0),
    explosionRotation: v(0, 0, 0.04),
    metadata: { construction: 'three-quarter-inch-plywood' },
  })
  add({
    id: 'rightSidePanel',
    name: 'Right plywood side panel',
    category: 'carcass',
    dimensions: v(T, H, D),
    position: v(W / 2 - T / 2, H / 2, 0),
    explosion: v(10, 0.8, 0),
    explosionRotation: v(0, 0, -0.04),
    metadata: { construction: 'complete-rectangular-panel' },
  })
  add({
    id: 'bottomPanel',
    name: 'Plywood bottom panel',
    category: 'carcass',
    dimensions: v(interiorWidth, T, D - BASE.backThickness),
    position: v(0, bottomCenterY, BASE.backThickness / 2),
    explosion: v(0, -7, 0),
    metadata: { thickness: T },
  })
  add({
    id: 'backPanel',
    name: 'Quarter-inch reinforced back panel',
    category: 'carcass',
    dimensions: v(interiorWidth, H, BASE.backThickness),
    position: v(0, H / 2, -D / 2 + BASE.backThickness / 2),
    explosion: v(0, 0, -11),
    metadata: { thickness: BASE.backThickness },
  })
  add({
    id: 'upperStrengtheningPanel',
    name: 'Upper plywood strengthening panel',
    category: 'carcass',
    dimensions: v(interiorWidth, T, BASE.railWidth),
    position: v(0, H - T / 2, D / 2 - BASE.railWidth / 2),
    explosion: v(0, 9, 3),
    metadata: { fixedSectionA: T, fixedSectionB: BASE.railWidth },
  })
  add({
    id: 'backUpperReinforcingRail',
    name: 'Back-panel upper reinforcing rail',
    category: 'carcass',
    dimensions: v(interiorWidth, BASE.railWidth, T),
    position: v(
      0,
      H - BASE.railWidth / 2,
      -D / 2 + BASE.backThickness + T / 2,
    ),
    explosion: v(0, 6, -7),
    metadata: { fixedSectionA: T, fixedSectionB: BASE.railWidth },
  })
  add({
    id: 'backLowerReinforcingRail',
    name: 'Back-panel lower reinforcing rail',
    category: 'carcass',
    dimensions: v(interiorWidth, BASE.railWidth, T),
    position: v(
      0,
      bottomTopY + BASE.railWidth / 2,
      -D / 2 + BASE.backThickness + T / 2,
    ),
    explosion: v(0, -3, -7),
    metadata: { fixedSectionA: T, fixedSectionB: BASE.railWidth },
  })
  add({
    id: 'toeKickPanel',
    name: 'Recessed front toe-kick panel',
    category: 'carcass',
    dimensions: v(interiorWidth, BASE.toeKickHeight, T),
    position: v(
      0,
      BASE.toeKickHeight / 2,
      D / 2 - BASE.toeKickSetback - T / 2,
    ),
    explosion: v(0, -7, 6),
    metadata: {
      fixedHeight: BASE.toeKickHeight,
      setback: BASE.toeKickSetback,
    },
  })

  const drawerBoardCenterOffsetX = drawerBoxOuterWidth / 2 - DS / 2
  const drawerFrontBackOffsetZ = drawerBoxDepth / 2 - DS / 2
  const slideX = drawerBoxOuterWidth / 2 - BASE.slideWidth * 0.62

  rows.forEach((row) => {
    const rowDimensions = drawerRows.find(
      (candidate) => candidate.prefix === row.prefix,
    )
    if (!rowDimensions) {
      throw new Error(`Missing derived row for ${row.prefix}`)
    }

    add({
      id: `${row.prefix}Front`,
      name: `${row.label} separate three-quarter-inch drawer front`,
      category: 'front',
      dimensions: v(frontWidth, row.frontHeight, T),
      position: v(0, row.frontCenterY, frontZ),
      explosion: v(0, row.explodeY, 10 + (25 - row.explodeZ) * 0.45),
      metadata: {
        reveal: BASE.frontReveal,
        thickness: T,
        drawer: row.prefix,
        frontProfile: TRIPLE_DRAWER_CONFIG.frontProfile,
        frameWidth: TRIPLE_DRAWER_CONFIG.shakerFrameWidth,
        panelInset: TRIPLE_DRAWER_CONFIG.shakerPanelInset,
      },
    })

    const boardExplosionZ = row.explodeZ
    add({
      id: `${row.prefix}BoxLeftSide`,
      name: `${row.label} solid-wood drawer-box left side`,
      category: 'drawer',
      material: 'natural-wood',
      dimensions: v(DS, row.boxHeight, drawerBoxDepth),
      position: v(
        -drawerBoardCenterOffsetX,
        rowDimensions.boxCenterY,
        drawerBoxCenterZ,
      ),
      explosion: v(-4, row.explodeY, boardExplosionZ),
      metadata: { stockThickness: DS, drawer: row.prefix },
    })
    add({
      id: `${row.prefix}BoxRightSide`,
      name: `${row.label} solid-wood drawer-box right side`,
      category: 'drawer',
      material: 'natural-wood',
      dimensions: v(DS, row.boxHeight, drawerBoxDepth),
      position: v(
        drawerBoardCenterOffsetX,
        rowDimensions.boxCenterY,
        drawerBoxCenterZ,
      ),
      explosion: v(4, row.explodeY, boardExplosionZ),
      metadata: { stockThickness: DS, drawer: row.prefix },
    })
    add({
      id: `${row.prefix}BoxFrontBoard`,
      name: `${row.label} solid-wood drawer-box front board`,
      category: 'drawer',
      material: 'natural-wood',
      dimensions: v(drawerInnerWidth, row.boxHeight, DS),
      position: v(
        0,
        rowDimensions.boxCenterY,
        drawerBoxCenterZ + drawerFrontBackOffsetZ,
      ),
      explosion: v(0, row.explodeY, boardExplosionZ + 4),
      metadata: { stockThickness: DS, drawer: row.prefix },
    })
    add({
      id: `${row.prefix}BoxBackBoard`,
      name: `${row.label} solid-wood drawer-box back board`,
      category: 'drawer',
      material: 'natural-wood',
      dimensions: v(drawerInnerWidth, row.boxHeight, DS),
      position: v(
        0,
        rowDimensions.boxCenterY,
        drawerBoxCenterZ - drawerFrontBackOffsetZ,
      ),
      explosion: v(0, row.explodeY, boardExplosionZ - 4),
      metadata: { stockThickness: DS, drawer: row.prefix },
    })
    add({
      id: `${row.prefix}BoxBottom`,
      name: `${row.label} quarter-inch drawer-box bottom`,
      category: 'drawer',
      material: 'drawer-bottom',
      dimensions: v(
        drawerInnerWidth,
        BASE.drawerBottomThickness,
        drawerBoxDepth - 2 * DS,
      ),
      position: v(
        0,
        rowDimensions.boxCenterY - row.boxHeight / 2 + BASE.drawerBottomInset,
        drawerBoxCenterZ,
      ),
      explosion: v(0, row.explodeY - 4, boardExplosionZ),
      metadata: { thickness: BASE.drawerBottomThickness, drawer: row.prefix },
    })

    // One semantic joinery detail per corner; the renderer expands each into
    // four visible dovetail teeth, matching the existing model's detail level.
    for (const side of [-1, 1] as const) {
      for (const end of [-1, 1] as const) {
        const sideName = side < 0 ? 'Left' : 'Right'
        const endName = end < 0 ? 'Back' : 'Front'
        add({
          id: `${row.prefix}Box${sideName}${endName}Dovetail`,
          name: `${row.label.toLowerCase()} drawer ${sideName.toLowerCase()} ${endName.toLowerCase()} dovetail joint`,
          category: 'detail',
          kind: 'dovetail',
          material: 'natural-wood',
          dimensions: v(0.34, 0.55, 0.16),
          position: v(
            side * (drawerBoxOuterWidth / 2 + 0.012),
            rowDimensions.boxCenterY + row.boxHeight * 0.22,
            drawerBoxCenterZ + end * (drawerBoxDepth / 2 - 0.2),
          ),
          rotation: v(0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0),
          explosion: v(
            side * 4.15,
            row.explodeY + 0.2,
            boardExplosionZ + end * 4,
          ),
          metadata: {
            joint: 'visible-dovetail',
            side: sideName.toLowerCase(),
            drawer: row.prefix,
          },
        })
      }
    }

    // Each drawer receives independent left/right, three-stage full-extension
    // slides, a soft-close damper, and two visible outer-rail fasteners.
    for (const side of [-1, 1] as const) {
      const sideName = side < 0 ? 'Left' : 'Right'
      const sideSlug = sideName.toLowerCase()
      const stages = [
        { label: 'Outer', factor: 1, material: 'dark-metal' as const, z: 0 },
        { label: 'Middle', factor: 0.8, material: 'metal' as const, z: 0.25 },
        { label: 'Inner', factor: 0.62, material: 'metal' as const, z: 0.55 },
      ]

      for (const [index, stage] of stages.entries()) {
        add({
          id: `${row.prefix}${sideName}Slide${stage.label}Section`,
          name: `${row.label} ${sideName.toLowerCase()} undermount slide ${stage.label.toLowerCase()} section`,
          category: 'hardware',
          material: stage.material,
          dimensions: v(
            BASE.slideWidth - index * 0.07,
            BASE.slideHeight - index * 0.055,
            slideLength * stage.factor,
          ),
          position: v(
            side * slideX,
            rowDimensions.slideY + index * 0.03,
            drawerBoxCenterZ + stage.z,
          ),
          explosion: v(
            side * (3 + index * 0.65),
            row.explodeY - 1 + index * 0.9,
            boardExplosionZ - 4 + index * 4,
          ),
          metadata: {
            side: sideSlug,
            stage: stage.label.toLowerCase(),
            drawer: row.prefix,
          },
        })
      }

      add({
        id: `${row.prefix}${sideName}SlideSoftCloseHousing`,
        name: `${row.label} ${sideName.toLowerCase()} slide soft-close mechanism housing`,
        category: 'hardware',
        material: 'dark-metal',
        dimensions: v(0.72, 0.68, 2.65),
        position: v(
          side * slideX,
          rowDimensions.slideY - 0.04,
          drawerBoxCenterZ - slideLength / 2 + 1.5,
        ),
        explosion: v(side * 5.2, row.explodeY - 2.4, boardExplosionZ - 6),
        metadata: {
          side: sideSlug,
          mechanism: 'soft-close',
          drawer: row.prefix,
        },
      })

      for (
        let screwIndex = 0;
        screwIndex < TRIPLE_DRAWER_CONFIG.slideMountingScrewCount;
        screwIndex += 1
      ) {
        const screwPosition = screwIndex === 0 ? 'Front' : 'Rear'
        const zFraction = screwIndex === 0 ? 0.3 : -0.32
        add({
          id: `${row.prefix}${sideName}SlideMountingScrew${screwPosition}`,
          name: `${row.label} ${sideName.toLowerCase()} slide ${screwPosition.toLowerCase()} mounting screw`,
          category: 'hardware',
          kind: 'screw',
          material: 'metal',
          dimensions: v(
            BASE.screwDiameter,
            BASE.screwLength,
            BASE.screwDiameter,
          ),
          position: v(
            side * slideX,
            rowDimensions.slideY + BASE.slideHeight / 2,
            drawerBoxCenterZ + slideLength * zFraction,
          ),
          explosion: v(
            side * 5.8,
            row.explodeY - 1.2 + screwIndex * 0.7,
            boardExplosionZ - 2 + screwIndex * 2,
          ),
          metadata: {
            fastener: true,
            side: sideSlug,
            drawer: row.prefix,
          },
        })
      }
    }
  })

  return finalizeCabinetLayout(
    'triple-drawer',
    parameters,
    derived,
    parts,
  )
}
