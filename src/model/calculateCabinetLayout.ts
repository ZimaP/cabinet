import {
  CABINET_CONFIG as C,
  DEFAULT_PARAMETERS,
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
import { TOE_KICK_SIDE_METADATA } from './toeKickSideProfile'

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
    width: precise(
      clamp(
        finiteOr(input.width, DEFAULT_PARAMETERS.width),
        PARAMETER_RANGES.width.min,
        PARAMETER_RANGES.width.max,
      ),
    ),
    height: precise(
      clamp(
        finiteOr(input.height, DEFAULT_PARAMETERS.height),
        PARAMETER_RANGES.height.min,
        PARAMETER_RANGES.height.max,
      ),
    ),
    depth: precise(
      clamp(
        finiteOr(input.depth, DEFAULT_PARAMETERS.depth),
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

/**
 * Pure construction layout. One Three.js unit equals one inch. X is cabinet
 * width (right positive), Y is vertical (floor = 0), and Z is depth (front
 * positive). Every resize produces new per-part dimensions; no global scale is
 * represented or returned here.
 */
export function calculateCabinetLayout(
  input: Partial<CabinetParameters> = DEFAULT_PARAMETERS,
): CabinetLayout {
  const parameters = normalizeParameters(input)
  const { width: W, height: H, depth: D } = parameters
  const T = C.panelThickness
  const interiorWidth = W - 2 * T
  const frontZ = D / 2 + C.frontStandOff + T / 2
  const bottomCenterY = C.toeKickHeight + T / 2
  const bottomTopY = C.toeKickHeight + T
  const usableFrontHeight = H - C.toeKickHeight - 2 * C.frontReveal
  const drawerZoneHeight = clamp(
    usableFrontHeight * C.drawerZoneRatio,
    C.drawerZoneMin,
    C.drawerZoneMax,
  )
  const drawerTopY = H - C.frontReveal
  const drawerBottomY = drawerTopY - drawerZoneHeight
  const doorBottomY = C.toeKickHeight + C.frontReveal
  const doorTopY = drawerBottomY - C.frontReveal
  const doorHeight = doorTopY - doorBottomY
  const shelfY = bottomTopY + (doorTopY - bottomTopY) * 0.48

  const drawerBoxOuterWidth = interiorWidth - 2 * C.drawerSideClearance
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

  const derived: CabinetDerivedDimensions = {
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
    }
    parts.push(part)
    return part
  }

  // Carcass boards and reinforcing members.
  add({
    id: 'leftSidePanel',
    name: 'Left plywood side panel',
    category: 'carcass',
    dimensions: v(T, H, D),
    position: v(-W / 2 + T / 2, H / 2, 0),
    explosion: v(-10, 0.8, 0),
    explosionRotation: v(0, 0, 0.04),
    metadata: {
      construction: 'three-quarter-inch-plywood',
      ...TOE_KICK_SIDE_METADATA,
    },
  })
  add({
    id: 'rightSidePanel',
    name: 'Right plywood side panel',
    category: 'carcass',
    dimensions: v(T, H, D),
    position: v(W / 2 - T / 2, H / 2, 0),
    explosion: v(10, 0.8, 0),
    explosionRotation: v(0, 0, -0.04),
    metadata: {
      construction: 'three-quarter-inch-plywood',
      ...TOE_KICK_SIDE_METADATA,
    },
  })
  add({
    id: 'bottomPanel',
    name: 'Plywood bottom panel',
    category: 'carcass',
    dimensions: v(interiorWidth, T, D - C.backThickness),
    position: v(0, bottomCenterY, C.backThickness / 2),
    explosion: v(0, -7, 0),
    metadata: { thickness: T },
  })
  add({
    id: 'backPanel',
    name: 'Quarter-inch reinforced back panel',
    category: 'carcass',
    dimensions: v(interiorWidth, H, C.backThickness),
    position: v(0, H / 2, -D / 2 + C.backThickness / 2),
    explosion: v(0, 0, -11),
    metadata: { thickness: C.backThickness },
  })
  add({
    id: 'upperStrengtheningPanel',
    name: 'Upper plywood strengthening panel',
    category: 'carcass',
    dimensions: v(interiorWidth, T, C.railWidth),
    position: v(0, H - T / 2, D / 2 - C.railWidth / 2),
    explosion: v(0, 9, 3),
    metadata: { fixedSectionA: T, fixedSectionB: C.railWidth },
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
    explosion: v(0, 6, -7),
    metadata: { fixedSectionA: T, fixedSectionB: C.railWidth },
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
    explosion: v(0, -3, -7),
    metadata: { fixedSectionA: T, fixedSectionB: C.railWidth },
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
    explosion: v(0, -7, 6),
    metadata: { fixedHeight: C.toeKickHeight, setback: C.toeKickSetback },
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
    explosion: v(0, 3.5, 9),
    explosionRotation: v(-0.08, 0, 0),
    metadata: { thickness: T, laminated: true },
  })

  // Independent decorative fronts with consistent overlay reveals.
  const frontWidth = W - 2 * C.frontReveal
  add({
    id: 'drawerFront',
    name: 'Separate three-quarter-inch drawer front',
    category: 'front',
    dimensions: v(frontWidth, drawerZoneHeight, T),
    position: v(0, drawerBottomY + drawerZoneHeight / 2, frontZ),
    explosion: v(0, 0.5, 10),
    metadata: { reveal: C.frontReveal, thickness: T },
  })
  add({
    id: 'lowerDoor',
    name: 'Left-hinged lower door',
    category: 'front',
    dimensions: v(frontWidth, doorHeight, T),
    position: v(0, doorBottomY + doorHeight / 2, frontZ),
    explosion: v(-8, 0, 12),
    explosionRotation: v(0, -0.72, 0.025),
    metadata: { reveal: C.frontReveal, hingeSide: 'left', thickness: T },
  })

  // Five independent solid-wood drawer-box boards.
  const DS = C.drawerStock
  const drawerInnerWidth = drawerBoxOuterWidth - 2 * DS
  const drawerBoardCenterOffsetX = drawerBoxOuterWidth / 2 - DS / 2
  const drawerFrontBackOffsetZ = drawerBoxDepth / 2 - DS / 2
  add({
    id: 'drawerBoxLeftSide',
    name: 'Solid-wood drawer-box left side',
    category: 'drawer',
    material: 'natural-wood',
    dimensions: v(DS, drawerBoxHeight, drawerBoxDepth),
    position: v(
      -drawerBoardCenterOffsetX,
      drawerBoxCenterY,
      drawerBoxCenterZ,
    ),
    explosion: v(-4, 1, 18),
    metadata: { stockThickness: DS },
  })
  add({
    id: 'drawerBoxRightSide',
    name: 'Solid-wood drawer-box right side',
    category: 'drawer',
    material: 'natural-wood',
    dimensions: v(DS, drawerBoxHeight, drawerBoxDepth),
    position: v(
      drawerBoardCenterOffsetX,
      drawerBoxCenterY,
      drawerBoxCenterZ,
    ),
    explosion: v(4, 1, 18),
    metadata: { stockThickness: DS },
  })
  add({
    id: 'drawerBoxFrontBoard',
    name: 'Solid-wood drawer-box front board',
    category: 'drawer',
    material: 'natural-wood',
    dimensions: v(drawerInnerWidth, drawerBoxHeight, DS),
    position: v(
      0,
      drawerBoxCenterY,
      drawerBoxCenterZ + drawerFrontBackOffsetZ,
    ),
    explosion: v(0, 1, 22),
    metadata: { stockThickness: DS },
  })
  add({
    id: 'drawerBoxBackBoard',
    name: 'Solid-wood drawer-box back board',
    category: 'drawer',
    material: 'natural-wood',
    dimensions: v(drawerInnerWidth, drawerBoxHeight, DS),
    position: v(
      0,
      drawerBoxCenterY,
      drawerBoxCenterZ - drawerFrontBackOffsetZ,
    ),
    explosion: v(0, 1, 14),
    metadata: { stockThickness: DS },
  })
  add({
    id: 'drawerBoxBottom',
    name: 'Quarter-inch drawer-box bottom',
    category: 'drawer',
    material: 'drawer-bottom',
    dimensions: v(
      drawerInnerWidth,
      C.drawerBottomThickness,
      drawerBoxDepth - 2 * DS,
    ),
    position: v(
      0,
      drawerBoxCenterY - drawerBoxHeight / 2 + C.drawerBottomInset,
      drawerBoxCenterZ,
    ),
    explosion: v(0, -4, 18),
    metadata: { thickness: C.drawerBottomThickness },
  })

  // Contrasting inserts make the dovetail joinery legible at all four corners.
  for (const side of [-1, 1] as const) {
    for (const end of [-1, 1] as const) {
      const sideName = side < 0 ? 'Left' : 'Right'
      const endName = end < 0 ? 'Back' : 'Front'
      add({
        id: `drawerBox${sideName}${endName}Dovetail`,
        name: `${sideName.toLowerCase()} ${endName.toLowerCase()} dovetail joint`,
        category: 'detail',
        kind: 'dovetail',
        material: 'natural-wood',
        dimensions: v(0.34, 0.55, 0.16),
        position: v(
          side * (drawerBoxOuterWidth / 2 + 0.012),
          drawerBoxCenterY + drawerBoxHeight * 0.22,
          drawerBoxCenterZ + end * (drawerBoxDepth / 2 - 0.2),
        ),
        rotation: v(0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0),
        explosion: v(side * 4.15, 1.2, 18 + end * 4),
        metadata: { joint: 'visible-dovetail', side: sideName.toLowerCase() },
      })
    }
  }

  // Full-extension undermount slides: three telescoping metal stages per side.
  const slideY =
    drawerBoxCenterY - drawerBoxHeight / 2 - C.slideBottomClearance
  const slideX = drawerBoxOuterWidth / 2 - C.slideWidth * 0.62
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
        id: `${sideSlug}Slide${stage.label}Section`,
        name: `${sideName} undermount slide ${stage.label.toLowerCase()} section`,
        category: 'hardware',
        material: stage.material,
        dimensions: v(
          C.slideWidth - index * 0.07,
          C.slideHeight - index * 0.055,
          slideLength * stage.factor,
        ),
        position: v(
          side * slideX,
          slideY + index * 0.03,
          drawerBoxCenterZ + stage.z,
        ),
        explosion: v(side * (3 + index * 0.65), -1 + index * 0.9, 14 + index * 4),
        metadata: { side: sideSlug, stage: stage.label.toLowerCase() },
      })
    }
    add({
      id: `${sideSlug}SlideSoftCloseHousing`,
      name: `${sideName} slide soft-close mechanism housing`,
      category: 'hardware',
      material: 'dark-metal',
      dimensions: v(0.72, 0.68, 2.65),
      position: v(
        side * slideX,
        slideY - 0.04,
        drawerBoxCenterZ - slideLength / 2 + 1.5,
      ),
      explosion: v(side * 5.2, -2.4, 12),
      metadata: { side: sideSlug, mechanism: 'soft-close' },
    })
  }

  // Two concealed hinges, each built from an independent cup, arm, plate, and
  // visible fasteners. Positions follow the resizable door and left side panel.
  const doorCenterY = doorBottomY + doorHeight / 2
  const hingeYs = [
    doorCenterY + doorHeight * (0.5 - C.hingeVerticalInsetRatio),
    doorCenterY - doorHeight * (0.5 - C.hingeVerticalInsetRatio),
  ]
  const cupX = -W / 2 + C.hingeEdgeOffset
  const cupZ = frontZ - T / 2 - C.hingeCupDepth / 2 + 0.04
  const plateX = -W / 2 + T + 0.09
  const plateZ = D / 2 - 1.35
  hingeYs.forEach((hingeY, index) => {
    const label = index === 0 ? 'Upper' : 'Lower'
    const explodeY = index === 0 ? 3.2 : -3.2
    add({
      id: `hinge${label}Cup`,
      name: `${label.toLowerCase()} concealed hinge cup`,
      category: 'hardware',
      kind: 'cylinder',
      material: 'metal',
      dimensions: v(C.hingeCupDiameter, C.hingeCupDiameter, C.hingeCupDepth),
      position: v(cupX, hingeY, cupZ),
      rotation: v(0, 0, 0),
      explosion: v(-8.5, explodeY, 15),
      metadata: { radius: C.hingeCupDiameter / 2, hinge: label.toLowerCase() },
    })
    add({
      id: `hinge${label}Arm`,
      name: `${label.toLowerCase()} articulated hinge arm`,
      category: 'hardware',
      material: 'metal',
      dimensions: v(0.66, 0.42, 2.1),
      position: v(-W / 2 + 0.95, hingeY, D / 2 - 0.42),
      rotation: v(0, -0.08, 0),
      explosion: v(-6.5, explodeY, 11.5),
      explosionRotation: v(0.1, -0.25, 0),
      metadata: { adjustment: 'six-way', hinge: label.toLowerCase() },
    })
    add({
      id: `hinge${label}Plate`,
      name: `${label.toLowerCase()} hinge mounting plate`,
      category: 'hardware',
      material: 'metal',
      dimensions: v(1.2, 0.18, 1.65),
      position: v(plateX, hingeY, plateZ),
      rotation: v(0, 0, Math.PI / 2),
      explosion: v(-4.7, explodeY, 8.2),
      metadata: { hinge: label.toLowerCase() },
    })
    for (const screwIndex of [-1, 1] as const) {
      add({
        id: `hinge${label}PlateScrew${screwIndex < 0 ? 'A' : 'B'}`,
        name: `${label.toLowerCase()} hinge mounting screw`,
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
        explosion: v(-4.2, explodeY + screwIndex * 0.7, 9.5),
        metadata: { fastener: true, hinge: label.toLowerCase() },
      })
    }
  })

  // Adjustable shelf-pin holes on both inner side faces, in front/rear rows.
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
          id: `${sideName.toLowerCase()}ShelfPinRow${row + 1}Hole${index + 1}`,
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
          explosion: v(side * 10, 0.8, 0),
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

  return finalizeCabinetLayout('door-drawer', parameters, derived, parts)
}
