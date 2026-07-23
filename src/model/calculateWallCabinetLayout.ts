import { finalizeCabinetLayout } from './semanticManufacturing'
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
import {
  createDefaultWallCabinetOptions,
  getWallCabinetFamily,
  getWallCabinetModel,
  getWallCabinetModelByWidth,
  wallModelToParameters,
  WALL_DOOR_CATEGORY_DETAILS,
  type WallCabinetModel,
  type WallCabinetOptions,
  type WallCabinetType,
  type WallCarcassMaterial,
  type WallDoorCategory,
  type WallDoorHand,
} from './wallCabinetCatalog'

const MILLIMETERS_PER_INCH = 25.4
const ZERO: Vector3Value = { x: 0, y: 0, z: 0 }
const v = (x = 0, y = 0, z = 0): Vector3Value => ({ x, y, z })
const precise = (value: number) => Math.round(value * 10000) / 10000

/**
 * The catalog page supplies width and height but does not state wall-cabinet
 * depth. This project deliberately uses the conventional 12-inch assumption.
 */
export const WALL_CABINET_CONFIG = {
  depth: 12,
  panelThickness: 0.75,
  backThickness: 0.5,
  doorThickness: 0.75,
  doorReveal: 0.125,
  pairedDoorGap: 0.125,
  doorStandOff: 0.0625,
  shelfWidthClearance: 0.125,
  shelfFrontInset: 0.5,
  pinSystemPitchMm: 32,
  pinHoleDiameterMm: 5,
  pinHoleDepth: 0.32,
  pinRowEndClearance: 1.5,
  pinColumnEdgeInsetMm: 37,
  shelfHolderDiameter: 0.24,
  shelfHolderProjection: 0.34,
  dowelDiameterMm: 8,
  dowelLength: 1.25,
  hingeCupDiameter: 1.38,
  hingeCupDepth: 0.48,
  hingeEdgeOffset: 1.38,
  hingeEndInset: 4,
  screwDiameter: 0.13,
  screwLength: 0.62,
} as const

export interface WallCabinetDerivedDimensions
  extends CabinetDerivedDimensions {
  interiorHeight: number
  interiorDepth: number
  panelThickness: number
  backThickness: number
  shelfCount: 2 | 3
  doorCount: 1 | 2
  shelfPositions: readonly number[]
  pinRowPositions: readonly number[]
  pinSystemPitch: number
  selectedModel: WallCabinetModel
  selectedOptions: WallCabinetOptions
  listPrice: number
}

export interface WallCabinetLayout
  extends Omit<CabinetLayout, 'cabinetType' | 'derived'> {
  cabinetType: WallCabinetType
  derived: WallCabinetDerivedDimensions
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

interface DoorSpec {
  id: 'singleDoor' | 'leftDoor' | 'rightDoor'
  label: string
  slug: 'single' | 'left' | 'right'
  centerX: number
  width: number
  hingeSide: -1 | 1
}

const WALL_DOOR_CATEGORIES: readonly WallDoorCategory[] = ['A', 'B', 'C']
const WALL_DOOR_HANDS: readonly WallDoorHand[] = ['left', 'right']
const WALL_CARCASS_MATERIALS: readonly WallCarcassMaterial[] = [
  'standard-melamine',
  'maple-veneer',
]

const isDoorCategory = (value: unknown): value is WallDoorCategory =>
  WALL_DOOR_CATEGORIES.includes(value as WallDoorCategory)
const isDoorHand = (value: unknown): value is WallDoorHand =>
  WALL_DOOR_HANDS.includes(value as WallDoorHand)
const isCarcassMaterial = (
  value: unknown,
): value is WallCarcassMaterial =>
  WALL_CARCASS_MATERIALS.includes(value as WallCarcassMaterial)

function normalizeSelection(
  cabinetType: WallCabinetType,
  input: Partial<CabinetParameters>,
  options: Partial<WallCabinetOptions>,
): {
  selectedModel: WallCabinetModel
  selectedOptions: WallCabinetOptions
} {
  const defaults = createDefaultWallCabinetOptions(cabinetType)
  const requestedWidth = Number.isFinite(input.width)
    ? (input.width as number)
    : getWallCabinetFamily(cabinetType).models[0].width
  const selectedModel =
    options.modelNumber === undefined
      ? getWallCabinetModelByWidth(cabinetType, requestedWidth)
      : getWallCabinetModel(cabinetType, options.modelNumber)

  return {
    selectedModel,
    selectedOptions: {
      modelNumber: selectedModel.modelNumber,
      doorCategory: isDoorCategory(options.doorCategory)
        ? options.doorCategory
        : defaults.doorCategory,
      doorHand: isDoorHand(options.doorHand)
        ? options.doorHand
        : defaults.doorHand,
      carcassMaterial: isCarcassMaterial(options.carcassMaterial)
        ? options.carcassMaterial
        : defaults.carcassMaterial,
    },
  }
}

function addConcealedHinges(
  add: (options: AddPartOptions) => PartLayout,
  door: DoorSpec,
  cabinetWidth: number,
  cabinetHeight: number,
  cabinetDepth: number,
  frontZ: number,
) {
  const C = WALL_CABINET_CONFIG
  const sideLabel = door.hingeSide < 0 ? 'left' : 'right'
  const hingeYs =
    cabinetHeight >= 42
      ? [
          cabinetHeight - C.hingeEndInset,
          cabinetHeight / 2,
          C.hingeEndInset,
        ]
      : [cabinetHeight - C.hingeEndInset, C.hingeEndInset]
  const hingeLabels =
    cabinetHeight >= 42
      ? ['Upper', 'Middle', 'Lower']
      : ['Upper', 'Lower']
  const cupX =
    door.centerX +
    door.hingeSide * (door.width / 2 - C.hingeEdgeOffset)
  const plateX =
    door.hingeSide < 0
      ? -cabinetWidth / 2 + C.panelThickness + 0.09
      : cabinetWidth / 2 - C.panelThickness - 0.09
  const armX = (cupX + plateX) / 2
  const cupZ =
    frontZ -
    C.doorThickness / 2 +
    C.hingeCupDepth / 2 -
    0.04
  const plateZ = cabinetDepth / 2 - 1.35

  hingeYs.forEach((hingeY, index) => {
    const label = hingeLabels[index]
    const idPrefix = `${door.id}Hinge${label}`
    const explodeY = index === 0 ? 3.2 : index === 1 ? 0 : -3.2
    const commonMetadata = {
      hardwareType: 'self-closing-concealed-hinge',
      materialSpecification: 'high-quality-steel',
      concealed: true,
      selfClosing: true,
      door: door.slug,
      hinge: label.toLowerCase(),
      hingeSide: sideLabel,
    }

    add({
      id: `${idPrefix}Cup`,
      name: `${door.label} ${label.toLowerCase()} concealed hinge cup`,
      category: 'hardware',
      kind: 'cylinder',
      material: 'metal',
      dimensions: v(
        C.hingeCupDiameter,
        C.hingeCupDiameter,
        C.hingeCupDepth,
      ),
      position: v(cupX, hingeY, cupZ),
      explosion: v(door.hingeSide * 10.5, explodeY, 16),
      metadata: {
        ...commonMetadata,
        component: 'cup',
        radius: C.hingeCupDiameter / 2,
        segments: 24,
      },
    })
    add({
      id: `${idPrefix}Arm`,
      name: `${door.label} ${label.toLowerCase()} articulated hinge arm`,
      category: 'hardware',
      material: 'metal',
      dimensions: v(0.66, 0.42, 2.1),
      position: v(armX, hingeY, cabinetDepth / 2 - 0.42),
      rotation: v(0, door.hingeSide * 0.08, 0),
      explosion: v(door.hingeSide * 8.5, explodeY, 12.5),
      explosionRotation: v(0.1, door.hingeSide * 0.25, 0),
      metadata: { ...commonMetadata, component: 'arm' },
    })
    add({
      id: `${idPrefix}Plate`,
      name: `${door.label} ${label.toLowerCase()} hinge mounting plate`,
      category: 'hardware',
      material: 'metal',
      dimensions: v(1.2, 0.18, 1.65),
      position: v(plateX, hingeY, plateZ),
      rotation: v(
        0,
        0,
        door.hingeSide < 0 ? Math.PI / 2 : -Math.PI / 2,
      ),
      explosion: v(door.hingeSide * 6.7, explodeY, 9.2),
      metadata: { ...commonMetadata, component: 'mounting-plate' },
    })
    for (const screwIndex of [-1, 1] as const) {
      add({
        id: `${idPrefix}PlateScrew${screwIndex < 0 ? 'A' : 'B'}`,
        name: `${door.label} ${label.toLowerCase()} hinge mounting screw`,
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
          door.hingeSide * 6.2,
          explodeY + screwIndex * 0.7,
          10.5,
        ),
        metadata: {
          ...commonMetadata,
          component: 'mounting-screw',
          fastener: true,
        },
      })
    }
  })
}

/**
 * Pure procedural calculator shared by all four wall-cabinet families.
 *
 * Model number is the authoritative discrete size selection when supplied.
 * Otherwise input.width is snapped to the nearest allowed family model.
 * Catalog height and the documented 12-inch depth are always fixed, so
 * arbitrary input.height and input.depth values are intentionally ignored.
 */
export function calculateWallCabinetLayout(
  cabinetType: WallCabinetType,
  input: Partial<CabinetParameters> = {},
  options: Partial<WallCabinetOptions> = {},
): WallCabinetLayout {
  const C = WALL_CABINET_CONFIG
  const family = getWallCabinetFamily(cabinetType)
  const { selectedModel, selectedOptions } = normalizeSelection(
    cabinetType,
    input,
    options,
  )
  const parameters = wallModelToParameters(selectedModel)
  const { width: W, height: H, depth: D } = parameters
  const T = C.panelThickness
  const B = C.backThickness
  const interiorWidth = W - 2 * T
  const interiorHeight = H - 2 * T
  const interiorDepth = D - B
  const frontZ = D / 2 + C.doorStandOff + C.doorThickness / 2
  const pinSystemPitch = C.pinSystemPitchMm / MILLIMETERS_PER_INCH
  const pinRowStartY = T + C.pinRowEndClearance
  const pinRowEndY = H - T - C.pinRowEndClearance
  const pinRowCount =
    Math.floor((pinRowEndY - pinRowStartY) / pinSystemPitch) + 1
  const pinRowPositions = Array.from(
    { length: pinRowCount },
    (_, index) => pinRowStartY + index * pinSystemPitch,
  )
  const shelfSupportRows = Array.from(
    { length: family.shelfCount },
    (_, index) =>
      pinRowPositions[
        Math.round(
          ((index + 1) * (pinRowPositions.length - 1)) /
            (family.shelfCount + 1),
        )
      ],
  )
  const shelfPositions = shelfSupportRows.map(
    (supportY) => supportY + T / 2,
  )
  const doorHeight = H - 2 * C.doorReveal
  const listPrice = selectedModel.prices[selectedOptions.doorCategory]

  const derived: WallCabinetDerivedDimensions = {
    interiorWidth,
    interiorHeight,
    interiorDepth,
    usableFrontHeight: doorHeight,
    drawerZoneHeight: 0,
    doorHeight,
    bottomTopY: T,
    shelfY: shelfPositions[0],
    drawerBoxOuterWidth: 0,
    drawerBoxHeight: 0,
    drawerBoxDepth: 0,
    slideLength: 0,
    frontZ,
    panelThickness: T,
    backThickness: B,
    shelfCount: family.shelfCount,
    doorCount: family.doorCount,
    shelfPositions,
    pinRowPositions,
    pinSystemPitch,
    selectedModel,
    selectedOptions,
    listPrice,
  }

  const carcassPartMaterial: PartMaterial =
    selectedOptions.carcassMaterial === 'maple-veneer'
      ? 'natural-wood'
      : 'white-melamine'
  const frontMaterial: PartMaterial =
    selectedOptions.doorCategory === 'C'
      ? 'thermafoil-front'
      : selectedOptions.doorCategory === 'B'
        ? 'laminate-front'
        : 'white-melamine'
  const carcassMaterialSpecification =
    selectedOptions.carcassMaterial === 'maple-veneer'
      ? '3/4 maple veneer core plywood with clear coat finish'
      : '3/4 industrial grade melamine with PVC edge'
  const sharedCarcassMetadata = {
    cabinetConstruction: 'european-frameless',
    cabinetApplication: 'wall-cabinet',
    carcassMaterial: selectedOptions.carcassMaterial,
    materialSpecification: carcassMaterialSpecification,
    edgeBanding: 'PVC',
    edgeTreatment:
      selectedOptions.carcassMaterial === 'maple-veneer'
        ? 'clear-coated-veneer'
        : 'pvc-edge',
    assemblyMethod: 'preglued-8mm-hardwood-dowels',
    system: '32mm',
  }

  const parts: PartLayout[] = []
  const add = (partOptions: AddPartOptions): PartLayout => {
    const part: PartLayout = {
      id: partOptions.id,
      name: partOptions.name,
      category: partOptions.category,
      kind: partOptions.kind ?? 'box',
      material: partOptions.material ?? 'white-melamine',
      dimensions: {
        x: precise(partOptions.dimensions.x),
        y: precise(partOptions.dimensions.y),
        z: precise(partOptions.dimensions.z),
      },
      position: {
        x: precise(partOptions.position.x),
        y: precise(partOptions.position.y),
        z: precise(partOptions.position.z),
      },
      rotation: partOptions.rotation ?? ZERO,
      explosion: {
        translation: partOptions.explosion ?? ZERO,
        rotation: partOptions.explosionRotation ?? ZERO,
      },
      metadata: partOptions.metadata ?? {},
    }
    parts.push(part)
    return part
  }

  add({
    id: 'leftSidePanel',
    name: 'Left wall-cabinet side panel',
    category: 'carcass',
    material: carcassPartMaterial,
    dimensions: v(T, H, D),
    position: v(-W / 2 + T / 2, H / 2, 0),
    explosion: v(-10, 0, 0),
    metadata: {
      ...sharedCarcassMetadata,
      component: 'side',
      side: 'left',
      thicknessInches: T,
    },
  })
  add({
    id: 'rightSidePanel',
    name: 'Right wall-cabinet side panel',
    category: 'carcass',
    material: carcassPartMaterial,
    dimensions: v(T, H, D),
    position: v(W / 2 - T / 2, H / 2, 0),
    explosion: v(10, 0, 0),
    metadata: {
      ...sharedCarcassMetadata,
      component: 'side',
      side: 'right',
      thicknessInches: T,
    },
  })
  add({
    id: 'topPanel',
    name: 'Wall-cabinet top panel',
    category: 'carcass',
    material: carcassPartMaterial,
    dimensions: v(interiorWidth, T, interiorDepth),
    position: v(0, H - T / 2, B / 2),
    explosion: v(0, 9, 0),
    metadata: {
      ...sharedCarcassMetadata,
      component: 'top',
      thicknessInches: T,
    },
  })
  add({
    id: 'bottomPanel',
    name: 'Wall-cabinet bottom panel',
    category: 'carcass',
    material: carcassPartMaterial,
    dimensions: v(interiorWidth, T, interiorDepth),
    position: v(0, T / 2, B / 2),
    explosion: v(0, -9, 0),
    metadata: {
      ...sharedCarcassMetadata,
      component: 'bottom',
      thicknessInches: T,
    },
  })
  add({
    id: 'backPanel',
    name: 'Wall-cabinet back panel',
    category: 'carcass',
    material: carcassPartMaterial,
    dimensions: v(interiorWidth, interiorHeight, B),
    position: v(0, H / 2, -D / 2 + B / 2),
    explosion: v(0, 0, -10),
    metadata: {
      ...sharedCarcassMetadata,
      component: 'back',
      thicknessInches: B,
      edgeBanding: 'none',
      edgeTreatment: 'melamine-faced',
      standardMaterialSpecification:
        '1/2 industrial grade melamine',
    },
  })

  shelfPositions.forEach((shelfY, index) => {
    add({
      id: `shelf${index + 1}`,
      name: `Adjustable shelf ${index + 1}`,
      category: 'carcass',
      material: carcassPartMaterial,
      dimensions: v(
        interiorWidth - C.shelfWidthClearance,
        T,
        interiorDepth - C.shelfFrontInset,
      ),
      position: v(0, shelfY, 0),
      explosion: v(
        index % 2 === 0 ? -5 : 5,
        2 + index * 2.2,
        7 + index * 1.5,
      ),
      metadata: {
        ...sharedCarcassMetadata,
        component: 'adjustable-shelf',
        shelfNumber: index + 1,
        adjustable: true,
        thicknessInches: T,
        supportedBy: 'white-nylon-locking-pins',
        frontEdge: 'PVC',
      },
    })
  })

  const doorCategory =
    WALL_DOOR_CATEGORY_DETAILS[selectedOptions.doorCategory]
  const commonDoorMetadata = {
    component: 'door-front',
    doorCategory: selectedOptions.doorCategory,
    categoryLabel: doorCategory.label,
    categorySummary: doorCategory.summary,
    catalogOptions: doorCategory.options,
    materialSpecification:
      selectedOptions.doorCategory === 'C'
        ? 'Thermafoil door'
        : 'Laminate or melamine front',
    thicknessInches: C.doorThickness,
    framelessOverlay: true,
    edgeTreatment:
      selectedOptions.doorCategory === 'C'
        ? 'thermafoil'
        : selectedOptions.doorCategory === 'B'
          ? 'postformed'
          : 'pvc-edge',
  }
  const doors: DoorSpec[] =
    family.doorCount === 1
      ? [
          {
            id: 'singleDoor',
            label: 'Single door',
            slug: 'single',
            centerX: 0,
            width: W - 2 * C.doorReveal,
            hingeSide: selectedOptions.doorHand === 'left' ? -1 : 1,
          },
        ]
      : (() => {
          const width =
            (W - 2 * C.doorReveal - C.pairedDoorGap) / 2
          const centerOffset = C.pairedDoorGap / 2 + width / 2
          return [
            {
              id: 'leftDoor',
              label: 'Left door',
              slug: 'left',
              centerX: -centerOffset,
              width,
              hingeSide: -1,
            },
            {
              id: 'rightDoor',
              label: 'Right door',
              slug: 'right',
              centerX: centerOffset,
              width,
              hingeSide: 1,
            },
          ]
        })()

  for (const door of doors) {
    const hingeSide = door.hingeSide < 0 ? 'left' : 'right'
    add({
      id: door.id,
      name: door.label,
      category: 'front',
      material: frontMaterial,
      dimensions: v(door.width, doorHeight, C.doorThickness),
      position: v(door.centerX, H / 2, frontZ),
      explosion: v(door.hingeSide * 7, 0, 16),
      explosionRotation: v(0, door.hingeSide * 0.24, 0),
      metadata: {
        ...commonDoorMetadata,
        door: door.slug,
        handing:
          family.doorCount === 1
            ? selectedOptions.doorHand
            : hingeSide,
        hingeSide,
      },
    })
    addConcealedHinges(add, door, W, H, D, frontZ)
  }

  const pinColumnInset = C.pinColumnEdgeInsetMm / MILLIMETERS_PER_INCH
  const pinColumnZs = [
    {
      slug: 'rear',
      z: -D / 2 + B + pinColumnInset,
    },
    {
      slug: 'front',
      z: D / 2 - pinColumnInset,
    },
  ] as const
  const pinHoleDiameter =
    C.pinHoleDiameterMm / MILLIMETERS_PER_INCH

  for (const side of [-1, 1] as const) {
    const sideLabel = side < 0 ? 'left' : 'right'
    for (const column of pinColumnZs) {
      pinRowPositions.forEach((pinY, rowIndex) => {
        add({
          id: `${sideLabel}ShelfPin${column.slug}Hole${rowIndex + 1}`,
          name: `${sideLabel} ${column.slug} 32 mm shelf-pin hole`,
          category: 'detail',
          kind: 'cylinder',
          material: 'recess',
          dimensions: v(
            pinHoleDiameter,
            C.pinHoleDepth,
            pinHoleDiameter,
          ),
          position: v(
            side *
              (interiorWidth / 2 + C.pinHoleDepth / 2 - 0.01),
            pinY,
            column.z,
          ),
          rotation: v(0, 0, Math.PI / 2),
          explosion: v(side * 10, 0, 0),
          metadata: {
            detailType: 'shelf-pin-hole',
            system: '32mm',
            pitchMm: C.pinSystemPitchMm,
            diameterMm: C.pinHoleDiameterMm,
            radius: pinHoleDiameter / 2,
            segments: 14,
            side: sideLabel,
            column: column.slug,
            row: rowIndex + 1,
          },
        })
      })
    }
  }

  shelfSupportRows.forEach((supportY, shelfIndex) => {
    for (const side of [-1, 1] as const) {
      const sideLabel = side < 0 ? 'left' : 'right'
      for (const column of pinColumnZs) {
        add({
          id: `shelf${shelfIndex + 1}${sideLabel}${
            column.slug === 'front' ? 'Front' : 'Rear'
          }Holder`,
          name: `Shelf ${shelfIndex + 1} ${sideLabel} ${
            column.slug
          } white nylon locking pin`,
          category: 'hardware',
          kind: 'cylinder',
          material: 'white-nylon',
          dimensions: v(
            C.shelfHolderDiameter,
            C.shelfHolderProjection,
            C.shelfHolderDiameter,
          ),
          position: v(
            side *
              (interiorWidth / 2 -
                C.shelfHolderProjection / 2),
            supportY,
            column.z,
          ),
          rotation: v(0, 0, Math.PI / 2),
          explosion: v(side * 8, shelfIndex * 1.4, 3),
          metadata: {
            hardwareType: 'shelf-holder',
            materialSpecification: 'white nylon locking pin',
            locking: true,
            shelf: shelfIndex + 1,
            side: sideLabel,
            column: column.slug,
            system: '32mm',
            radius: C.shelfHolderDiameter / 2,
            segments: 16,
          },
        })
      }
    }
  })

  const dowelDiameter = C.dowelDiameterMm / MILLIMETERS_PER_INCH
  const dowelZs = [
    -D / 2 + B + 2.25,
    D / 2 - 2.25,
  ] as const
  for (const side of [-1, 1] as const) {
    const sideLabel = side < 0 ? 'left' : 'right'
    for (const end of ['bottom', 'top'] as const) {
      const y = end === 'bottom' ? T / 2 : H - T / 2
      for (const [positionIndex, z] of dowelZs.entries()) {
        add({
          id: `${sideLabel}${end === 'top' ? 'Top' : 'Bottom'}Dowel${
            positionIndex + 1
          }`,
          name: `Preglued 8 mm hardwood dowel at ${sideLabel} ${end} joint`,
          category: 'detail',
          kind: 'cylinder',
          material: 'natural-wood',
          dimensions: v(
            dowelDiameter,
            C.dowelLength,
            dowelDiameter,
          ),
          position: v(side * (W / 2 - T / 2), y, z),
          rotation: v(0, 0, Math.PI / 2),
          explosion: v(side * 8, end === 'top' ? 5 : -5, 0),
          metadata: {
            detailType: 'assembly-dowel',
            constructionMethod: 'preglued-hardwood-dowel',
            diameterMm: C.dowelDiameterMm,
            preglued: true,
            materialSpecification: 'hardwood',
            joint: `${sideLabel}-${end}`,
            radius: dowelDiameter / 2,
            segments: 16,
          },
        })
      }
    }
  }

  return finalizeCabinetLayout(
    cabinetType,
    parameters,
    derived,
    parts,
  ) as WallCabinetLayout
}
