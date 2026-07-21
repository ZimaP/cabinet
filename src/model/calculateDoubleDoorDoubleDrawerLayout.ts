import {
  CABINET_CONFIG as C,
  PARAMETER_RANGES,
} from './cabinetConstants'
import type {
  CabinetDerivedDimensions,
  CabinetLayout,
  CabinetParameters,
  AxisDirection,
  LocalAxis,
  ManufacturingAxisLabel,
  ManufacturingPartDefinition,
  PartCategory,
  PartKind,
  PartLayout,
  PartMaterial,
  PartMetadata,
  Vector3Value,
} from './types'
import { finalizeCabinetLayout } from './semanticManufacturing'

export const DOUBLE_DOOR_DOUBLE_DRAWER_WIDTHS = [33, 36, 39, 42] as const

export const DOUBLE_DOOR_DOUBLE_DRAWER_DEFAULT_PARAMETERS: CabinetParameters = {
  width: 36,
  height: 34.5,
  depth: 24,
}

/** Assumptions specific to the two-bay construction shown in the reference. */
export const DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG = {
  centerDividerThickness: C.panelThickness,
  centerFrontReveal: C.frontReveal,
  dividerFrontClearance: C.drawerFrontInset,
  dividerRearClearance: C.backThickness,
  frontProfile: 'shaker-inset',
  shakerFrameWidth: 2,
  shakerPanelInset: 0.18,
} as const

export interface DoubleDoorDoubleDrawerDerivedDimensions
  extends CabinetDerivedDimensions {
  drawerBayWidth: number
  drawerFrontWidth: number
  doorWidth: number
  centerDividerHeight: number
  drawerCenterOffset: number
  frontCenterOffset: number
}

export interface DoubleDoorDoubleDrawerLayout
  extends Omit<CabinetLayout, 'derived'> {
  derived: DoubleDoorDoubleDrawerDerivedDimensions
}

const ZERO: Vector3Value = { x: 0, y: 0, z: 0 }
const v = (x = 0, y = 0, z = 0): Vector3Value => ({ x, y, z })
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))
const finiteOr = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? (value as number) : fallback
const precise = (value: number) => Math.round(value * 10000) / 10000

function normalizeParameters(
  input: Partial<CabinetParameters>,
): CabinetParameters {
  return {
    // The reference lists four catalog widths. Continuous values between the
    // smallest and largest remain valid so the existing live slider can resize
    // every board parametrically instead of snapping geometry.
    width: precise(
      clamp(
        finiteOr(
          input.width,
          DOUBLE_DOOR_DOUBLE_DRAWER_DEFAULT_PARAMETERS.width,
        ),
        DOUBLE_DOOR_DOUBLE_DRAWER_WIDTHS[0],
        DOUBLE_DOOR_DOUBLE_DRAWER_WIDTHS[
          DOUBLE_DOOR_DOUBLE_DRAWER_WIDTHS.length - 1
        ],
      ),
    ),
    height: precise(
      clamp(
        finiteOr(
          input.height,
          DOUBLE_DOOR_DOUBLE_DRAWER_DEFAULT_PARAMETERS.height,
        ),
        PARAMETER_RANGES.height.min,
        PARAMETER_RANGES.height.max,
      ),
    ),
    depth: precise(
      clamp(
        finiteOr(
          input.depth,
          DOUBLE_DOOR_DOUBLE_DRAWER_DEFAULT_PARAMETERS.depth,
        ),
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
  manufacturing?: ManufacturingPartDefinition
}

const manufacturing = (
  displayName: string,
  first: readonly [LocalAxis, ManufacturingAxisLabel, AxisDirection],
  second: readonly [LocalAxis, ManufacturingAxisLabel, AxisDirection],
  face: readonly [LocalAxis, AxisDirection],
  labelOffset: Vector3Value = ZERO,
): ManufacturingPartDefinition => ({
  displayName,
  measurements: [
    {
      localAxis: first[0],
      axisLabel: first[1],
      edgeSign: first[2],
    },
    {
      localAxis: second[0],
      axisLabel: second[1],
      edgeSign: second[2],
    },
  ],
  annotation: {
    faceAxis: face[0],
    faceSign: face[1],
    labelOffset,
  },
})

/**
 * Pure two-bay cabinet construction layout. One world unit is one inch; X is
 * width, Y is vertical from the floor, and Z is depth with the front positive.
 * The two drawer bays share a fixed 3/4-inch center partition. No part is
 * globally scaled when the overall cabinet dimensions change.
 */
export function calculateDoubleDoorDoubleDrawerLayout(
  input: Partial<CabinetParameters> =
    DOUBLE_DOOR_DOUBLE_DRAWER_DEFAULT_PARAMETERS,
): DoubleDoorDoubleDrawerLayout {
  const parameters = normalizeParameters(input)
  const { width: W, height: H, depth: D } = parameters
  const T = C.panelThickness
  const R = C.frontReveal
  const interiorWidth = W - 2 * T
  const frontZ = D / 2 + C.frontStandOff + T / 2
  const bottomCenterY = C.toeKickHeight + T / 2
  const bottomTopY = C.toeKickHeight + T
  const usableFrontHeight = H - C.toeKickHeight - 2 * R
  const drawerZoneHeight = clamp(
    usableFrontHeight * C.drawerZoneRatio,
    C.drawerZoneMin,
    C.drawerZoneMax,
  )
  const drawerTopY = H - R
  const drawerBottomY = drawerTopY - drawerZoneHeight
  const doorBottomY = C.toeKickHeight + R
  const doorTopY = drawerBottomY - R
  const doorHeight = doorTopY - doorBottomY
  const shelfY = bottomTopY + (doorTopY - bottomTopY) * 0.48

  // The fixed center partition creates two equal drawer bays. Each box keeps
  // the same side clearance used by the original single-drawer cabinet.
  const drawerBayWidth =
    (interiorWidth - DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.centerDividerThickness) /
    2
  const drawerCenterOffset =
    (drawerBayWidth +
      DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.centerDividerThickness) /
    2
  const drawerBoxOuterWidth = drawerBayWidth - 2 * C.drawerSideClearance
  const drawerBoxHeight = clamp(
    drawerZoneHeight - 2 * C.drawerTopClearance,
    3.75,
    6.5,
  )
  const drawerBoxDepth = Math.max(
    12,
    D - C.drawerFrontInset - C.drawerRearClearance - T,
  )
  const drawerBoxCenterY = drawerBottomY + drawerZoneHeight / 2 - 0.12
  const drawerBoxFrontZ = D / 2 - T - C.drawerFrontInset
  const drawerBoxCenterZ = drawerBoxFrontZ - drawerBoxDepth / 2
  const slideLength = drawerBoxDepth - C.slideRearClearance

  // Three equal reveals span the left edge, center joint, and right edge.
  const drawerFrontWidth =
    (W - 2 * R - DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.centerFrontReveal) / 2
  const doorWidth = drawerFrontWidth
  const frontCenterOffset =
    (drawerFrontWidth +
      DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.centerFrontReveal) /
    2
  const centerDividerTopY = H - T
  const centerDividerHeight = centerDividerTopY - drawerBottomY
  const centerDividerDepth =
    D -
    DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.dividerRearClearance -
    DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.dividerFrontClearance
  const centerDividerZ =
    (DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.dividerRearClearance -
      DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.dividerFrontClearance) /
    2

  const derived: DoubleDoorDoubleDrawerDerivedDimensions = {
    interiorWidth,
    usableFrontHeight,
    drawerZoneHeight,
    doorHeight,
    bottomTopY,
    shelfY,
    drawerBoxOuterWidth,
    drawerBoxHeight,
    drawerBoxDepth,
    slideLength,
    frontZ,
    drawerBayWidth,
    drawerFrontWidth,
    doorWidth,
    centerDividerHeight,
    drawerCenterOffset,
    frontCenterOffset,
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
      position: options.position,
      rotation: options.rotation ?? ZERO,
      explosion: {
        translation: options.explosion ?? ZERO,
        rotation: options.explosionRotation ?? ZERO,
      },
      metadata: options.metadata ?? {},
      manufacturing: options.manufacturing,
    }
    parts.push(part)
    return part
  }

  // Carcass boards and the drawer-bay center partition.
  add({
    id: 'leftSidePanel',
    name: 'Left plywood side panel',
    category: 'carcass',
    dimensions: v(T, H, D),
    position: v(-W / 2 + T / 2, H / 2, 0),
    explosion: v(-11, 0.8, 0),
    explosionRotation: v(0, 0, 0.04),
    metadata: { construction: 'three-quarter-inch-plywood' },
    manufacturing: manufacturing(
      'Left Side',
      ['z', 'D', 1],
      ['y', 'H', 1],
      ['x', -1],
      v(0, 0.3, -5),
    ),
  })
  add({
    id: 'rightSidePanel',
    name: 'Right plywood side panel',
    category: 'carcass',
    dimensions: v(T, H, D),
    position: v(W / 2 - T / 2, H / 2, 0),
    explosion: v(11, 0.8, 0),
    explosionRotation: v(0, 0, -0.04),
    metadata: { construction: 'complete-rectangular-panel' },
    manufacturing: manufacturing(
      'Right Side',
      ['z', 'D', 1],
      ['y', 'H', 1],
      ['x', 1],
      v(0, -0.3, 5),
    ),
  })
  add({
    id: 'bottomPanel',
    name: 'Plywood bottom panel',
    category: 'carcass',
    dimensions: v(interiorWidth, T, D - C.backThickness),
    position: v(0, bottomCenterY, C.backThickness / 2),
    explosion: v(0, -7, 0),
    metadata: { thickness: T },
    manufacturing: manufacturing(
      'Bottom Panel',
      ['x', 'W', 1],
      ['z', 'D', 1],
      ['y', -1],
    ),
  })
  add({
    id: 'backPanel',
    name: 'Quarter-inch reinforced back panel',
    category: 'carcass',
    dimensions: v(interiorWidth, H, C.backThickness),
    position: v(0, H / 2, -D / 2 + C.backThickness / 2),
    explosion: v(0, 0, -12),
    metadata: { thickness: C.backThickness },
    manufacturing: manufacturing(
      'Back Panel',
      ['x', 'W', 1],
      ['y', 'H', 1],
      ['z', 1],
    ),
  })
  add({
    id: 'upperStrengtheningPanel',
    name: 'Upper plywood strengthening panel',
    category: 'carcass',
    dimensions: v(interiorWidth, T, C.railWidth),
    position: v(0, H - T / 2, D / 2 - C.railWidth / 2),
    explosion: v(0, 10, 3),
    metadata: { fixedSectionA: T, fixedSectionB: C.railWidth },
    manufacturing: manufacturing(
      'Upper Strengthening Panel',
      ['x', 'L', 1],
      ['z', 'H', 1],
      ['y', 1],
    ),
  })
  add({
    id: 'backUpperReinforcingRail',
    name: 'Back-panel upper reinforcing rail',
    category: 'carcass',
    dimensions: v(interiorWidth, C.railWidth, T),
    position: v(
      0,
      H - C.railWidth / 2,
      -D / 2 + C.backThickness + T / 2,
    ),
    explosion: v(0, 7, -8),
    metadata: { fixedSectionA: T, fixedSectionB: C.railWidth },
    manufacturing: manufacturing(
      'Upper Back Reinforcing Rail',
      ['x', 'L', 1],
      ['y', 'H', 1],
      ['z', 1],
    ),
  })
  add({
    id: 'backLowerReinforcingRail',
    name: 'Back-panel lower reinforcing rail',
    category: 'carcass',
    dimensions: v(interiorWidth, C.railWidth, T),
    position: v(
      0,
      bottomTopY + C.railWidth / 2,
      -D / 2 + C.backThickness + T / 2,
    ),
    explosion: v(0, -3, -8),
    metadata: { fixedSectionA: T, fixedSectionB: C.railWidth },
    manufacturing: manufacturing(
      'Lower Back Reinforcing Rail',
      ['x', 'L', -1],
      ['y', 'H', 1],
      ['z', 1],
    ),
  })
  add({
    id: 'toeKickPanel',
    name: 'Recessed front toe-kick panel',
    category: 'carcass',
    dimensions: v(interiorWidth, C.toeKickHeight, T),
    position: v(
      0,
      C.toeKickHeight / 2,
      D / 2 - C.toeKickSetback - T / 2,
    ),
    explosion: v(0, -7, 7),
    metadata: { fixedHeight: C.toeKickHeight, setback: C.toeKickSetback },
    manufacturing: manufacturing(
      'Toe Kick',
      ['x', 'W', -1],
      ['y', 'H', 1],
      ['z', 1],
    ),
  })
  add({
    id: 'fullDepthShelf',
    name: 'Full-depth melamine plywood shelf',
    category: 'carcass',
    dimensions: v(
      interiorWidth - C.shelfFitClearance,
      T,
      D - C.backThickness - C.shelfFrontClearance,
    ),
    position: v(
      0,
      shelfY,
      (C.backThickness - C.shelfFrontClearance) / 2,
    ),
    explosion: v(0, 3.5, 10),
    explosionRotation: v(-0.08, 0, 0),
    metadata: { thickness: T, laminated: true },
    manufacturing: manufacturing(
      'Shelf',
      ['x', 'W', 1],
      ['z', 'D', 1],
      ['y', 1],
    ),
  })
  add({
    id: 'centerVerticalDivider',
    name: 'Center vertical drawer-bay divider',
    category: 'carcass',
    dimensions: v(T, centerDividerHeight, centerDividerDepth),
    position: v(
      0,
      drawerBottomY + centerDividerHeight / 2,
      centerDividerZ,
    ),
    explosion: v(0, 7, 7),
    metadata: {
      thickness: T,
      construction: 'drawer-bay-partition',
    },
    manufacturing: manufacturing(
      'Center Vertical Divider',
      ['z', 'D', 1],
      ['y', 'H', 1],
      ['x', 1],
    ),
  })

  // Two independent overlay drawer fronts and two opposing lower doors.
  for (const side of [-1, 1] as const) {
    const sideName = side < 0 ? 'Left' : 'Right'
    const sideSlug = sideName.toLowerCase()
    const centerX = side * frontCenterOffset
    add({
      id: `${sideSlug}DrawerFront`,
      name: `${sideName} separate three-quarter-inch drawer front`,
      category: 'front',
      dimensions: v(drawerFrontWidth, drawerZoneHeight, T),
      position: v(centerX, drawerBottomY + drawerZoneHeight / 2, frontZ),
      explosion: v(side * 6, 0.5, 11),
      metadata: {
        reveal: R,
        thickness: T,
        bay: sideSlug,
        frontProfile: DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.frontProfile,
        frameWidth: DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.shakerFrameWidth,
        panelInset: DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.shakerPanelInset,
      },
      manufacturing: manufacturing(
        `${sideName} Drawer Front`,
        ['x', 'W', side],
        ['y', 'H', 1],
        ['z', 1],
        v(side * 1.25, 0.35, 0),
      ),
    })
    add({
      id: `${sideSlug}Door`,
      name: `${sideName} lower door`,
      category: 'front',
      dimensions: v(doorWidth, doorHeight, T),
      position: v(centerX, doorBottomY + doorHeight / 2, frontZ),
      explosion: v(side * 11, 0, 13),
      explosionRotation: v(0, side * 0.72, side * -0.025),
      metadata: {
        reveal: R,
        hingeSide: sideSlug,
        thickness: T,
        frontProfile: DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.frontProfile,
        frameWidth: DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.shakerFrameWidth,
        panelInset: DOUBLE_DOOR_DOUBLE_DRAWER_CONFIG.shakerPanelInset,
      },
      manufacturing: manufacturing(
        `${sideName} Door`,
        ['x', 'W', side],
        ['y', 'H', 1],
        ['z', 1],
        v(side * 1.5, -0.25, 0),
      ),
    })
  }

  // Each drawer is a separate five-board solid-wood dovetail box.
  const DS = C.drawerStock
  const drawerInnerWidth = drawerBoxOuterWidth - 2 * DS
  const drawerBoardCenterOffsetX = drawerBoxOuterWidth / 2 - DS / 2
  const drawerFrontBackOffsetZ = drawerBoxDepth / 2 - DS / 2
  const slideY =
    drawerBoxCenterY - drawerBoxHeight / 2 - C.slideBottomClearance
  const slideLocalX = drawerBoxOuterWidth / 2 - C.slideWidth * 0.62

  for (const drawerSide of [-1, 1] as const) {
    const drawerName = drawerSide < 0 ? 'Left' : 'Right'
    const drawerSlug = drawerName.toLowerCase()
    const drawerPrefix = `${drawerSlug}Drawer`
    const drawerCenterX = drawerSide * drawerCenterOffset
    const drawerExplodeX = drawerSide * 6

    for (const boardSide of [-1, 1] as const) {
      const boardSideName = boardSide < 0 ? 'Left' : 'Right'
      add({
        id: `${drawerPrefix}Box${boardSideName}Side`,
        name: `${drawerName} drawer-box ${boardSideName.toLowerCase()} side`,
        category: 'drawer',
        material: 'natural-wood',
        dimensions: v(DS, drawerBoxHeight, drawerBoxDepth),
        position: v(
          drawerCenterX + boardSide * drawerBoardCenterOffsetX,
          drawerBoxCenterY,
          drawerBoxCenterZ,
        ),
        explosion: v(drawerExplodeX + boardSide * 3.2, 1, 19),
        metadata: {
          stockThickness: DS,
          drawer: drawerSlug,
          side: boardSideName.toLowerCase(),
        },
        manufacturing: manufacturing(
          `${drawerName} Drawer Box ${boardSideName} Side`,
          ['z', 'L', boardSide],
          ['y', 'H', 1],
          ['x', boardSide],
          v(0, 0.5, drawerSide * 2),
        ),
      })
    }
    for (const end of [-1, 1] as const) {
      const endName = end < 0 ? 'Back' : 'Front'
      add({
        id: `${drawerPrefix}Box${endName}Board`,
        name: `${drawerName} drawer-box ${endName.toLowerCase()} board`,
        category: 'drawer',
        material: 'natural-wood',
        dimensions: v(drawerInnerWidth, drawerBoxHeight, DS),
        position: v(
          drawerCenterX,
          drawerBoxCenterY,
          drawerBoxCenterZ + end * drawerFrontBackOffsetZ,
        ),
        explosion: v(
          drawerExplodeX,
          1,
          end > 0 ? 23 : 15,
        ),
        metadata: {
          stockThickness: DS,
          drawer: drawerSlug,
          end: endName.toLowerCase(),
        },
        manufacturing: manufacturing(
          `${drawerName} Drawer Box ${endName} Board`,
          ['x', 'W', end],
          ['y', 'H', 1],
          ['z', end],
          v(drawerSide * 1.5, 0.4, 0),
        ),
      })
    }
    add({
      id: `${drawerPrefix}BoxBottom`,
      name: `${drawerName} quarter-inch drawer-box bottom`,
      category: 'drawer',
      material: 'drawer-bottom',
      dimensions: v(
        drawerInnerWidth,
        C.drawerBottomThickness,
        drawerBoxDepth - 2 * DS,
      ),
      position: v(
        drawerCenterX,
        drawerBoxCenterY - drawerBoxHeight / 2 + C.drawerBottomInset,
        drawerBoxCenterZ,
      ),
      explosion: v(drawerExplodeX, -4, 19),
      metadata: {
        thickness: C.drawerBottomThickness,
        drawer: drawerSlug,
      },
      manufacturing: manufacturing(
        `${drawerName} Drawer Box Bottom`,
        ['x', 'W', drawerSide],
        ['z', 'D', 1],
        ['y', 1],
        v(drawerSide * 1.5, 0, 0),
      ),
    })

    // Four visible dovetail inserts are semantic details of each box, not
    // separate manufacturing boards.
    for (const boardSide of [-1, 1] as const) {
      for (const end of [-1, 1] as const) {
        const boardSideName = boardSide < 0 ? 'Left' : 'Right'
        const endName = end < 0 ? 'Back' : 'Front'
        add({
          id: `${drawerPrefix}Box${boardSideName}${endName}Dovetail`,
          name: `${drawerName.toLowerCase()} drawer ${boardSideName.toLowerCase()} ${endName.toLowerCase()} dovetail joint`,
          category: 'detail',
          kind: 'dovetail',
          material: 'natural-wood',
          dimensions: v(0.34, 0.55, 0.16),
          position: v(
            drawerCenterX +
              boardSide * (drawerBoxOuterWidth / 2 + 0.012),
            drawerBoxCenterY + drawerBoxHeight * 0.22,
            drawerBoxCenterZ + end * (drawerBoxDepth / 2 - 0.2),
          ),
          rotation: v(
            0,
            boardSide < 0 ? Math.PI / 2 : -Math.PI / 2,
            0,
          ),
          explosion: v(
            drawerExplodeX + boardSide * 3.35,
            1.2,
            19 + end * 4,
          ),
          metadata: {
            joint: 'visible-dovetail',
            drawer: drawerSlug,
            side: boardSideName.toLowerCase(),
          },
        })
      }
    }

    // Two undermount slides per drawer, each with three telescoping stages and
    // a soft-close damper housing.
    for (const slideSide of [-1, 1] as const) {
      const slideSideName = slideSide < 0 ? 'Left' : 'Right'
      const slideSideSlug = slideSideName.toLowerCase()
      const slideX = drawerCenterX + slideSide * slideLocalX
      const stages = [
        { label: 'Outer', factor: 1, material: 'dark-metal' as const, z: 0 },
        { label: 'Middle', factor: 0.8, material: 'metal' as const, z: 0.25 },
        { label: 'Inner', factor: 0.62, material: 'metal' as const, z: 0.55 },
      ]

      for (const [index, stage] of stages.entries()) {
        add({
          id: `${drawerPrefix}${slideSideName}Slide${stage.label}Section`,
          name: `${drawerName} drawer ${slideSideName.toLowerCase()} undermount slide ${stage.label.toLowerCase()} section`,
          category: 'hardware',
          material: stage.material,
          dimensions: v(
            C.slideWidth - index * 0.07,
            C.slideHeight - index * 0.055,
            slideLength * stage.factor,
          ),
          position: v(
            slideX,
            slideY + index * 0.03,
            drawerBoxCenterZ + stage.z,
          ),
          explosion: v(
            drawerExplodeX + slideSide * (2.3 + index * 0.55),
            -1 + index * 0.9,
            15 + index * 4,
          ),
          metadata: {
            drawer: drawerSlug,
            side: slideSideSlug,
            stage: stage.label.toLowerCase(),
          },
        })
      }
      add({
        id: `${drawerPrefix}${slideSideName}SlideSoftCloseHousing`,
        name: `${drawerName} drawer ${slideSideName.toLowerCase()} slide soft-close mechanism housing`,
        category: 'hardware',
        material: 'dark-metal',
        dimensions: v(0.72, 0.68, 2.65),
        position: v(
          slideX,
          slideY - 0.04,
          drawerBoxCenterZ - slideLength / 2 + 1.5,
        ),
        explosion: v(drawerExplodeX + slideSide * 4.1, -2.4, 13),
        metadata: {
          drawer: drawerSlug,
          side: slideSideSlug,
          mechanism: 'soft-close',
        },
      })
    }
  }

  // Two six-way concealed hinges per door. Outer-side mounting creates the
  // opposing left/right swing shown in the product drawing.
  const doorCenterY = doorBottomY + doorHeight / 2
  const hingeYs = [
    doorCenterY + doorHeight * (0.5 - C.hingeVerticalInsetRatio),
    doorCenterY - doorHeight * (0.5 - C.hingeVerticalInsetRatio),
  ]
  const cupZ = frontZ - T / 2 - C.hingeCupDepth / 2 + 0.04
  const plateZ = D / 2 - 1.35

  for (const doorSide of [-1, 1] as const) {
    const doorName = doorSide < 0 ? 'Left' : 'Right'
    const doorSlug = doorName.toLowerCase()
    const doorPrefix = `${doorSlug}Door`
    const cupX =
      doorSide < 0
        ? -W / 2 + C.hingeEdgeOffset
        : W / 2 - C.hingeEdgeOffset
    const armX = doorSide < 0 ? -W / 2 + 0.95 : W / 2 - 0.95
    const plateX =
      doorSide < 0 ? -W / 2 + T + 0.09 : W / 2 - T - 0.09

    hingeYs.forEach((hingeY, index) => {
      const label = index === 0 ? 'Upper' : 'Lower'
      const explodeY = index === 0 ? 3.2 : -3.2
      add({
        id: `${doorPrefix}Hinge${label}Cup`,
        name: `${doorName} door ${label.toLowerCase()} concealed hinge cup`,
        category: 'hardware',
        kind: 'cylinder',
        material: 'metal',
        dimensions: v(
          C.hingeCupDiameter,
          C.hingeCupDiameter,
          C.hingeCupDepth,
        ),
        position: v(cupX, hingeY, cupZ),
        explosion: v(doorSide * 11.5, explodeY, 16),
        metadata: {
          radius: C.hingeCupDiameter / 2,
          door: doorSlug,
          hinge: label.toLowerCase(),
          hingeSide: doorSlug,
        },
      })
      add({
        id: `${doorPrefix}Hinge${label}Arm`,
        name: `${doorName} door ${label.toLowerCase()} articulated hinge arm`,
        category: 'hardware',
        material: 'metal',
        dimensions: v(0.66, 0.42, 2.1),
        position: v(armX, hingeY, D / 2 - 0.42),
        rotation: v(0, doorSide * 0.08, 0),
        explosion: v(doorSide * 9.5, explodeY, 12.5),
        explosionRotation: v(0.1, doorSide * 0.25, 0),
        metadata: {
          adjustment: 'six-way',
          door: doorSlug,
          hinge: label.toLowerCase(),
          hingeSide: doorSlug,
        },
      })
      add({
        id: `${doorPrefix}Hinge${label}Plate`,
        name: `${doorName} door ${label.toLowerCase()} hinge mounting plate`,
        category: 'hardware',
        material: 'metal',
        dimensions: v(1.2, 0.18, 1.65),
        position: v(plateX, hingeY, plateZ),
        rotation: v(0, 0, doorSide < 0 ? Math.PI / 2 : -Math.PI / 2),
        explosion: v(doorSide * 7.7, explodeY, 9.2),
        metadata: {
          door: doorSlug,
          hinge: label.toLowerCase(),
          hingeSide: doorSlug,
        },
      })
      for (const screwIndex of [-1, 1] as const) {
        add({
          id: `${doorPrefix}Hinge${label}PlateScrew${
            screwIndex < 0 ? 'A' : 'B'
          }`,
          name: `${doorName} door ${label.toLowerCase()} hinge mounting screw`,
          category: 'hardware',
          kind: 'screw',
          material: 'metal',
          dimensions: v(C.screwDiameter, C.screwLength, C.screwDiameter),
          position: v(
            plateX,
            hingeY + screwIndex * 0.36,
            plateZ + 0.13,
          ),
          rotation: v(Math.PI / 2, 0, 0),
          explosion: v(
            doorSide * 7.2,
            explodeY + screwIndex * 0.7,
            10.5,
          ),
          metadata: {
            fastener: true,
            door: doorSlug,
            hinge: label.toLowerCase(),
            hingeSide: doorSlug,
          },
        })
      }
    })
  }

  // Adjustable shelf-pin rows remain on the two carcass side panels.
  const pinStartY = bottomTopY + 1.6
  const pinAvailable = Math.max(1, doorTopY - pinStartY - 1)
  const pinSpacing = Math.min(
    C.shelfPinSpacing,
    pinAvailable / (C.shelfPinCount - 1),
  )
  const pinZs = [
    -D / 2 + C.shelfPinRearInset,
    D / 2 - C.shelfPinFrontInset,
  ]
  for (const side of [-1, 1] as const) {
    const sideName = side < 0 ? 'Left' : 'Right'
    for (const [row, pinZ] of pinZs.entries()) {
      for (let index = 0; index < C.shelfPinCount; index += 1) {
        add({
          id: `${sideName.toLowerCase()}ShelfPinRow${row + 1}Hole${
            index + 1
          }`,
          name: `${sideName} adjustable shelf-pin hole`,
          category: 'detail',
          kind: 'cylinder',
          material: 'dark-metal',
          dimensions: v(
            C.shelfPinDiameter,
            C.shelfPinDepth,
            C.shelfPinDiameter,
          ),
          position: v(
            side * (interiorWidth / 2 + 0.012),
            pinStartY + index * pinSpacing,
            pinZ,
          ),
          rotation: v(0, 0, Math.PI / 2),
          explosion: v(side * 11, 0.8, 0),
          metadata: {
            radius: C.shelfPinDiameter / 2,
            segments: 14,
            side: sideName.toLowerCase(),
            row: row + 1,
          },
        })
      }
    }
  }

  return finalizeCabinetLayout(
    'double-door-double-drawer',
    parameters,
    derived,
    parts,
  )
}
