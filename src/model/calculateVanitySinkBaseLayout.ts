import {
  CABINET_CONFIG as C,
  PARAMETER_RANGES,
} from './cabinetConstants'
import { finalizeCabinetLayout } from './semanticManufacturing'
import { TOE_KICK_SIDE_METADATA } from './toeKickSideProfile'
import type {
  AxisDirection,
  CabinetDerivedDimensions,
  CabinetLayout,
  CabinetParameters,
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

/** VS30 is the only nominal width explicitly identified in the references. */
export const VANITY_SINK_BASE_WIDTHS = [30] as const

export const VANITY_SINK_BASE_DEFAULT_PARAMETERS: CabinetParameters = {
  width: 30,
  height: 34.5,
  depth: 21,
}

/** Assumptions not dimensioned in the supplied VS30 reference views. */
export const VANITY_SINK_BASE_CONFIG = {
  widthMin: 24,
  widthMax: 42,
  falseFrontZoneRatio: 0.2,
  falseFrontZoneMin: 6,
  falseFrontZoneMax: 8,
  pullLength: 4.5,
  pullDiameter: 0.36,
  pullProjection: 0.72,
  pullMountDiameter: 0.24,
  pullOffsetFromCenterSeam: 1.45,
} as const

export interface VanitySinkBaseDerivedDimensions
  extends CabinetDerivedDimensions {
  falseFrontHeight: number
  pairedFrontWidth: number
  frontCenterOffset: number
  doorBottomY: number
  doorTopY: number
  pullCenterY: number
}

export interface VanitySinkBaseLayout extends Omit<CabinetLayout, 'derived'> {
  derived: VanitySinkBaseDerivedDimensions
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
    width: precise(
      clamp(
        finiteOr(input.width, VANITY_SINK_BASE_DEFAULT_PARAMETERS.width),
        VANITY_SINK_BASE_CONFIG.widthMin,
        VANITY_SINK_BASE_CONFIG.widthMax,
      ),
    ),
    height: precise(
      clamp(
        finiteOr(input.height, VANITY_SINK_BASE_DEFAULT_PARAMETERS.height),
        PARAMETER_RANGES.height.min,
        PARAMETER_RANGES.height.max,
      ),
    ),
    depth: precise(
      clamp(
        finiteOr(input.depth, VANITY_SINK_BASE_DEFAULT_PARAMETERS.depth),
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
    { localAxis: first[0], axisLabel: first[1], edgeSign: first[2] },
    { localAxis: second[0], axisLabel: second[1], edgeSign: second[2] },
  ],
  annotation: {
    faceAxis: face[0],
    faceSign: face[1],
    labelOffset,
  },
})

/**
 * Pure frameless VS30 sink-base layout. One world unit is one inch; X is
 * cabinet width, Y rises from the floor, and positive Z points through the
 * front. The sink bay is deliberately open: there is no shelf, drawer box,
 * slide, center divider, or shelf-pin row.
 */
export function calculateVanitySinkBaseLayout(
  input: Partial<CabinetParameters> = VANITY_SINK_BASE_DEFAULT_PARAMETERS,
): VanitySinkBaseLayout {
  const parameters = normalizeParameters(input)
  const { width: W, height: H, depth: D } = parameters
  const T = C.panelThickness
  const R = C.frontReveal
  const interiorWidth = W - 2 * T
  const frontZ = D / 2 + C.frontStandOff + T / 2
  const bottomTopY = C.toeKickHeight + T
  const usableFrontHeight = H - C.toeKickHeight - 2 * R
  const falseFrontHeight = clamp(
    usableFrontHeight * VANITY_SINK_BASE_CONFIG.falseFrontZoneRatio,
    VANITY_SINK_BASE_CONFIG.falseFrontZoneMin,
    VANITY_SINK_BASE_CONFIG.falseFrontZoneMax,
  )
  const falseFrontTopY = H - R
  const falseFrontBottomY = falseFrontTopY - falseFrontHeight
  const frontStretcherBottomY = H - T
  const falseFrontSupportTopY = falseFrontBottomY
  const falseFrontCenterSupportHeight =
    frontStretcherBottomY - falseFrontSupportTopY
  const doorBottomY = C.toeKickHeight + R
  const doorTopY = falseFrontBottomY - R
  const doorHeight = doorTopY - doorBottomY
  const pairedFrontWidth = (W - 3 * R) / 2
  const frontCenterOffset = (pairedFrontWidth + R) / 2
  const pullCenterY = doorTopY - Math.min(4.5, doorHeight * 0.25)

  const derived: VanitySinkBaseDerivedDimensions = {
    interiorWidth,
    usableFrontHeight,
    drawerZoneHeight: falseFrontHeight,
    doorHeight,
    bottomTopY,
    shelfY: bottomTopY + (doorTopY - bottomTopY) / 2,
    drawerBoxOuterWidth: 0,
    drawerBoxHeight: 0,
    drawerBoxDepth: 0,
    slideLength: 0,
    frontZ,
    falseFrontHeight,
    pairedFrontWidth,
    frontCenterOffset,
    doorBottomY,
    doorTopY,
    pullCenterY,
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

  // Each side remains one nominal D x H board. Rendering uses the metadata to
  // cut the fixed 3 x 4.5-inch L-shaped toe-space from its lower front corner.
  for (const side of [-1, 1] as const) {
    const sideName = side < 0 ? 'Left' : 'Right'
    add({
      id: `${sideName.toLowerCase()}SidePanel`,
      name: `${sideName} notched plywood side panel`,
      category: 'carcass',
      dimensions: v(T, H, D),
      position: v(side * (W / 2 - T / 2), H / 2, 0),
      explosion: v(side * 11, 0.8, 0),
      explosionRotation: v(0, 0, side * -0.04),
      metadata: {
        construction: 'three-quarter-inch-plywood',
        ...TOE_KICK_SIDE_METADATA,
      },
      manufacturing: manufacturing(
        `${sideName} Side`,
        ['z', 'D', side],
        ['y', 'H', 1],
        ['x', side],
        v(0, side * -0.3, side * 5),
      ),
    })
  }

  add({
    id: 'bottomPanel',
    name: 'Raised plywood bottom panel',
    category: 'carcass',
    dimensions: v(interiorWidth, T, D - C.backThickness),
    position: v(0, C.toeKickHeight + T / 2, C.backThickness / 2),
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
    name: 'Quarter-inch finished vanity back panel',
    category: 'carcass',
    dimensions: v(interiorWidth, H, C.backThickness),
    position: v(0, H / 2, -D / 2 + C.backThickness / 2),
    explosion: v(0, 0, -12),
    metadata: { thickness: C.backThickness, plumbingField: 'unobstructed' },
    manufacturing: manufacturing(
      'Back Panel',
      ['x', 'W', 1],
      ['y', 'H', 1],
      ['z', 1],
    ),
  })

  // The reference shows an open top bridged by independent front and rear
  // horizontal stretchers; neither board closes the sink cutout area.
  add({
    id: 'upperStrengtheningPanel',
    name: 'Front upper sink-base stretcher',
    category: 'carcass',
    dimensions: v(interiorWidth, T, C.railWidth),
    position: v(0, H - T / 2, D / 2 - C.railWidth / 2),
    explosion: v(0, 10, 4),
    metadata: {
      fixedSectionA: T,
      fixedSectionB: C.railWidth,
      location: 'front',
    },
    manufacturing: manufacturing(
      'Front Upper Stretcher',
      ['x', 'L', 1],
      ['z', 'H', 1],
      ['y', 1],
    ),
  })
  add({
    id: 'rearUpperStretcher',
    name: 'Rear upper sink-base stretcher',
    category: 'carcass',
    dimensions: v(interiorWidth, T, C.railWidth),
    position: v(
      0,
      H - T / 2,
      -D / 2 + C.backThickness + C.railWidth / 2,
    ),
    explosion: v(0, 10, -6),
    metadata: {
      fixedSectionA: T,
      fixedSectionB: C.railWidth,
      location: 'rear',
    },
    manufacturing: manufacturing(
      'Rear Upper Stretcher',
      ['x', 'L', -1],
      ['z', 'H', 1],
      ['y', 1],
    ),
  })
  add({
    id: 'falseFrontLowerSupportRail',
    name: 'False-front lower support rail',
    category: 'carcass',
    dimensions: v(interiorWidth, T, C.railWidth),
    position: v(
      0,
      falseFrontSupportTopY - T / 2,
      D / 2 - C.railWidth / 2,
    ),
    explosion: v(0, 2.5, 8),
    metadata: {
      fixedSectionA: T,
      fixedSectionB: C.railWidth,
      location: 'behind-false-front-lower-seam',
    },
    manufacturing: manufacturing(
      'False Front Lower Support Rail',
      ['x', 'L', 1],
      ['z', 'D', 1],
      ['y', 1],
    ),
  })
  add({
    id: 'falseFrontCenterSupport',
    name: 'False-front center support',
    category: 'carcass',
    dimensions: v(T, falseFrontCenterSupportHeight, C.railWidth),
    position: v(
      0,
      falseFrontSupportTopY + falseFrontCenterSupportHeight / 2,
      D / 2 - C.railWidth / 2,
    ),
    explosion: v(0, 4.5, 9),
    metadata: {
      fixedSectionA: T,
      fixedSectionB: C.railWidth,
      function: 'false-front-center-support',
    },
    manufacturing: manufacturing(
      'False Front Center Support',
      ['z', 'D', 1],
      ['y', 'H', 1],
      ['x', 1],
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

  // Two equal fixed false fronts align directly over two opposing slab doors.
  for (const side of [-1, 1] as const) {
    const sideName = side < 0 ? 'Left' : 'Right'
    const sideSlug = sideName.toLowerCase()
    const centerX = side * frontCenterOffset
    add({
      id: `${sideSlug}FalseFront`,
      name: `${sideName} fixed sink false front`,
      category: 'front',
      dimensions: v(pairedFrontWidth, falseFrontHeight, T),
      position: v(
        centerX,
        falseFrontBottomY + falseFrontHeight / 2,
        frontZ,
      ),
      explosion: v(side * 6, 1, 11),
      metadata: {
        reveal: R,
        thickness: T,
        function: 'fixed-false-front',
        frontProfile: 'slab',
        edgeTreatment: 'white-edge-band',
      },
      manufacturing: manufacturing(
        `${sideName} False Front`,
        ['x', 'W', side],
        ['y', 'H', 1],
        ['z', 1],
        v(side * 1.25, 0.35, 0),
      ),
    })
    add({
      id: `${sideSlug}Door`,
      name: `${sideName} lower vanity door`,
      category: 'front',
      dimensions: v(pairedFrontWidth, doorHeight, T),
      position: v(centerX, doorBottomY + doorHeight / 2, frontZ),
      explosion: v(side * 11, 0, 13),
      explosionRotation: v(0, side * 0.72, side * -0.025),
      metadata: {
        reveal: R,
        hingeSide: sideSlug,
        thickness: T,
        frontProfile: 'slab',
        edgeTreatment: 'white-edge-band',
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

  // Four complete six-way concealed hinge sets: cup, arm, plate, and two
  // visible plate screws for each upper/lower hinge location.
  const doorCenterY = doorBottomY + doorHeight / 2
  const hingeYs = [
    doorCenterY + doorHeight * (0.5 - C.hingeVerticalInsetRatio),
    doorCenterY - doorHeight * (0.5 - C.hingeVerticalInsetRatio),
  ]
  // European cups are bored from the back face into the door slab. Leave a
  // hair of the rim visible behind the panel while keeping the cup body inside.
  const cupZ = frontZ - T / 2 + C.hingeCupDepth / 2 - 0.04
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

  // Each U-shaped pull is built from a vertical grip and two projecting posts,
  // keeping the hardware recognizable without an external model asset.
  const pullOffset = Math.min(
    VANITY_SINK_BASE_CONFIG.pullOffsetFromCenterSeam,
    pairedFrontWidth * 0.24,
  )
  for (const side of [-1, 1] as const) {
    const sideName = side < 0 ? 'Left' : 'Right'
    const prefix = `${sideName.toLowerCase()}DoorPull`
    const pullX = side * (R / 2 + pullOffset)
    const gripZ = frontZ + VANITY_SINK_BASE_CONFIG.pullProjection
    const pullExplosion = v(side * 11, 0, 16)
    add({
      id: `${prefix}Grip`,
      name: `${sideName} door vertical pull grip`,
      category: 'hardware',
      kind: 'cylinder',
      material: 'metal',
      dimensions: v(
        VANITY_SINK_BASE_CONFIG.pullDiameter,
        VANITY_SINK_BASE_CONFIG.pullLength,
        VANITY_SINK_BASE_CONFIG.pullDiameter,
      ),
      position: v(pullX, pullCenterY, gripZ),
      explosion: pullExplosion,
      metadata: {
        radius: VANITY_SINK_BASE_CONFIG.pullDiameter / 2,
        hardwareType: 'cabinet-pull',
        pull: sideName.toLowerCase(),
        component: 'grip',
      },
    })
    for (const end of [-1, 1] as const) {
      add({
        id: `${prefix}${end < 0 ? 'Lower' : 'Upper'}Post`,
        name: `${sideName} door pull ${end < 0 ? 'lower' : 'upper'} post`,
        category: 'hardware',
        kind: 'cylinder',
        material: 'metal',
        dimensions: v(
          VANITY_SINK_BASE_CONFIG.pullMountDiameter,
          VANITY_SINK_BASE_CONFIG.pullProjection,
          VANITY_SINK_BASE_CONFIG.pullMountDiameter,
        ),
        position: v(
          pullX,
          pullCenterY +
            end * (VANITY_SINK_BASE_CONFIG.pullLength / 2 - 0.3),
          frontZ + VANITY_SINK_BASE_CONFIG.pullProjection / 2,
        ),
        rotation: v(Math.PI / 2, 0, 0),
        explosion: pullExplosion,
        metadata: {
          radius: VANITY_SINK_BASE_CONFIG.pullMountDiameter / 2,
          hardwareType: 'cabinet-pull',
          pull: sideName.toLowerCase(),
          component: 'mounting-post',
        },
      })
    }
  }

  return finalizeCabinetLayout(
    'vanity-sink-base',
    parameters,
    derived,
    parts,
  )
}
