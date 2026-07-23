import type { CabinetParameters } from './types'

/**
 * The four menu-level wall-cabinet families represented by the catalog page.
 * Individual catalog model numbers remain a discrete setting within a family.
 */
export const WALL_CABINET_TYPES = [
  'wall-single-42',
  'wall-double-42',
  'wall-single-36',
  'wall-double-36',
] as const

export type WallCabinetType = (typeof WALL_CABINET_TYPES)[number]
export type WallDoorCategory = 'A' | 'B' | 'C'
export type WallDoorHand = 'left' | 'right'
export type WallCarcassMaterial =
  | 'standard-melamine'
  | 'maple-veneer'

export type WallCabinetModelNumber =
  | 'W942'
  | 'W1242'
  | 'W1542'
  | 'W1842'
  | 'W2142'
  | 'W2442'
  | 'W2742'
  | 'W3042'
  | 'W3342'
  | 'W3642'
  | 'W3942'
  | 'W4242'
  | 'W4842'
  | 'W936'
  | 'W1236'
  | 'W1536'
  | 'W1836'
  | 'W2136'
  | 'W2436'
  | 'W2736'
  | 'W3036'
  | 'W3336'
  | 'W3636'
  | 'W4236'
  | 'W4836'

export type WallCabinetPrices = Readonly<
  Record<WallDoorCategory, number>
>

export interface WallCabinetModel {
  modelNumber: WallCabinetModelNumber
  width: number
  height: number
  depth: number
  prices: WallCabinetPrices
}

export interface WallCabinetFamily {
  cabinetType: WallCabinetType
  label: string
  shortLabel: string
  description: string
  doorCount: 1 | 2
  height: 36 | 42
  depth: 12
  shelfCount: 2 | 3
  models: readonly WallCabinetModel[]
}

export interface WallCabinetOptions {
  modelNumber: WallCabinetModelNumber
  doorCategory: WallDoorCategory
  /**
   * Hinge side for a single-door family. Paired doors always hinge on their
   * respective outside edges, so this value is intentionally ignored there.
   */
  doorHand: WallDoorHand
  carcassMaterial: WallCarcassMaterial
}

export interface WallDoorCategoryDetail {
  label: string
  summary: string
  options: readonly string[]
}

/**
 * Door/front descriptions transcribed from the category page. Category D was
 * blank in the supplied wall-cabinet price tables, so only A–C are selectable.
 */
export const WALL_DOOR_CATEGORY_DETAILS = {
  A: {
    label: 'Category A',
    summary: 'Melamine door and drawer-front choices',
    options: [
      '3/4 melamine with 0.18 PVC edge',
      '3/4 melamine with 3 mm PVC edge',
      '3/4 melamine with oak J-pull',
    ],
  },
  B: {
    label: 'Category B',
    summary: 'Laminate and postformed door and drawer-front choices',
    options: [
      'White matte or gloss Laminate with 0.18 PVC edge',
      'Color Laminate with 0.18 PVC edge',
      'White matte or gloss 90 degree postformed',
      'Color Laminate 90 degree postformed',
      'White matte or gloss 180 degree postformed with C-channel',
      'Color Laminate 180 degree postformed with C-channel',
    ],
  },
  C: {
    label: 'Category C',
    summary: 'Thermafoil door choice',
    options: ['All Thermafoil doors'],
  },
} as const satisfies Readonly<
  Record<WallDoorCategory, WallDoorCategoryDetail>
>

const model = (
  modelNumber: WallCabinetModelNumber,
  width: number,
  height: 36 | 42,
  prices: WallCabinetPrices,
): WallCabinetModel => ({
  modelNumber,
  width,
  height,
  // The photographed page does not state wall depth. Twelve inches is the
  // documented project assumption for every family and model in this module.
  depth: 12,
  prices,
})

export const WALL_CABINET_CATALOG = {
  'wall-single-42': {
    cabinetType: 'wall-single-42',
    label: 'Wall Cabinet — Single Door, 42" High',
    shortLabel: 'Single Door 42"',
    description:
      'Single left- or right-hand door with three adjustable shelves',
    doorCount: 1,
    height: 42,
    depth: 12,
    shelfCount: 3,
    models: [
      model('W942', 9, 42, { A: 270, B: 265, C: 260 }),
      model('W1242', 12, 42, { A: 300, B: 295, C: 290 }),
      model('W1542', 15, 42, { A: 320, B: 330, C: 340 }),
      model('W1842', 18, 42, { A: 360, B: 370, C: 380 }),
      model('W2142', 21, 42, { A: 390, B: 380, C: 420 }),
      model('W2442', 24, 42, { A: 420, B: 440, C: 460 }),
    ],
  },
  'wall-double-42': {
    cabinetType: 'wall-double-42',
    label: 'Wall Cabinet — Double Door, 42" High',
    shortLabel: 'Double Door 42"',
    description: 'Paired doors with three adjustable shelves',
    doorCount: 2,
    height: 42,
    depth: 12,
    shelfCount: 3,
    models: [
      model('W2442', 24, 42, { A: 470, B: 480, C: 490 }),
      model('W2742', 27, 42, { A: 500, B: 520, C: 540 }),
      model('W3042', 30, 42, { A: 530, B: 550, C: 570 }),
      model('W3342', 33, 42, { A: 560, B: 590, C: 620 }),
      model('W3642', 36, 42, { A: 590, B: 620, C: 660 }),
      model('W3942', 39, 42, { A: 620, B: 660, C: 700 }),
      model('W4242', 42, 42, { A: 650, B: 690, C: 740 }),
      model('W4842', 48, 42, { A: 710, B: 760, C: 810 }),
    ],
  },
  'wall-single-36': {
    cabinetType: 'wall-single-36',
    label: 'Wall Cabinet — Single Door, 36" High',
    shortLabel: 'Single Door 36"',
    description:
      'Single left- or right-hand door with two adjustable shelves',
    doorCount: 1,
    height: 36,
    depth: 12,
    shelfCount: 2,
    models: [
      model('W936', 9, 36, { A: 280, B: 270, C: 260 }),
      model('W1236', 12, 36, { A: 290, B: 290, C: 280 }),
      model('W1536', 15, 36, { A: 310, B: 310, C: 310 }),
      model('W1836', 18, 36, { A: 340, B: 335, C: 330 }),
      model('W2136', 21, 36, { A: 370, B: 380, C: 390 }),
      model('W2436', 24, 36, { A: 400, B: 410, C: 420 }),
    ],
  },
  'wall-double-36': {
    cabinetType: 'wall-double-36',
    label: 'Wall Cabinet — Double Door, 36" High',
    shortLabel: 'Double Door 36"',
    description: 'Paired doors with two adjustable shelves',
    doorCount: 2,
    height: 36,
    depth: 12,
    shelfCount: 2,
    models: [
      model('W2436', 24, 36, { A: 440, B: 440, C: 440 }),
      model('W2736', 27, 36, { A: 470, B: 480, C: 500 }),
      model('W3036', 30, 36, { A: 500, B: 510, C: 530 }),
      model('W3336', 33, 36, { A: 530, B: 550, C: 570 }),
      model('W3636', 36, 36, { A: 560, B: 590, C: 610 }),
      model('W4236', 42, 36, { A: 610, B: 650, C: 700 }),
      model('W4836', 48, 36, { A: 670, B: 700, C: 750 }),
    ],
  },
} as const satisfies Readonly<
  Record<WallCabinetType, WallCabinetFamily>
>

export function isWallCabinetType(value: unknown): value is WallCabinetType {
  return (
    typeof value === 'string' &&
    (WALL_CABINET_TYPES as readonly string[]).includes(value)
  )
}

export function getWallCabinetFamily(
  cabinetType: WallCabinetType,
): WallCabinetFamily {
  return WALL_CABINET_CATALOG[cabinetType]
}

export function getWallCabinetModel(
  cabinetType: WallCabinetType,
  modelNumber: WallCabinetModelNumber,
): WallCabinetModel {
  const result = getWallCabinetFamily(cabinetType).models.find(
    (candidate) => candidate.modelNumber === modelNumber,
  )

  if (!result) {
    throw new RangeError(
      `${modelNumber} is not a model in the ${cabinetType} family`,
    )
  }
  return result
}

/**
 * Snaps an arbitrary requested width to the nearest model in the selected
 * family. Exact ties resolve to the smaller model because catalog order is
 * ascending. Non-finite widths resolve to the family's first model.
 */
export function getWallCabinetModelByWidth(
  cabinetType: WallCabinetType,
  width: number,
): WallCabinetModel {
  const family = getWallCabinetFamily(cabinetType)
  if (!Number.isFinite(width)) return family.models[0]

  return family.models.reduce((nearest, candidate) =>
    Math.abs(candidate.width - width) <
    Math.abs(nearest.width - width)
      ? candidate
      : nearest,
  )
}

export function createDefaultWallCabinetOptions(
  cabinetType: WallCabinetType,
): WallCabinetOptions {
  return {
    modelNumber: getWallCabinetFamily(cabinetType).models[0].modelNumber,
    doorCategory: 'A',
    doorHand: 'left',
    carcassMaterial: 'standard-melamine',
  }
}

export function wallModelToParameters(
  selectedModel: WallCabinetModel,
): CabinetParameters {
  return {
    width: selectedModel.width,
    height: selectedModel.height,
    depth: selectedModel.depth,
  }
}
