import { describe, expect, it } from 'vitest'

import {
  calculateWallCabinetLayout,
  WALL_CABINET_CONFIG,
  type WallCabinetLayout,
} from './calculateWallCabinetLayout'
import {
  createDefaultWallCabinetOptions,
  getWallCabinetFamily,
  getWallCabinetModel,
  getWallCabinetModelByWidth,
  isWallCabinetType,
  WALL_CABINET_CATALOG,
  WALL_CABINET_TYPES,
  WALL_DOOR_CATEGORY_DETAILS,
  wallModelToParameters,
  type WallCabinetModelNumber,
} from './wallCabinetCatalog'

function part(layout: WallCabinetLayout, id: string) {
  const result = layout.partMap[id]
  if (!result) throw new Error(`Missing part: ${id}`)
  return result
}

const EXPECTED_TABLES = {
  'wall-single-42': [
    ['W942', 9, 270, 265, 260],
    ['W1242', 12, 300, 295, 290],
    ['W1542', 15, 320, 330, 340],
    ['W1842', 18, 360, 370, 380],
    ['W2142', 21, 390, 380, 420],
    ['W2442', 24, 420, 440, 460],
  ],
  'wall-double-42': [
    ['W2442', 24, 470, 480, 490],
    ['W2742', 27, 500, 520, 540],
    ['W3042', 30, 530, 550, 570],
    ['W3342', 33, 560, 590, 620],
    ['W3642', 36, 590, 620, 660],
    ['W3942', 39, 620, 660, 700],
    ['W4242', 42, 650, 690, 740],
    ['W4842', 48, 710, 760, 810],
  ],
  'wall-single-36': [
    ['W936', 9, 280, 270, 260],
    ['W1236', 12, 290, 290, 280],
    ['W1536', 15, 310, 310, 310],
    ['W1836', 18, 340, 335, 330],
    ['W2136', 21, 370, 380, 390],
    ['W2436', 24, 400, 410, 420],
  ],
  'wall-double-36': [
    ['W2436', 24, 440, 440, 440],
    ['W2736', 27, 470, 480, 500],
    ['W3036', 30, 500, 510, 530],
    ['W3336', 33, 530, 550, 570],
    ['W3636', 36, 560, 590, 610],
    ['W4236', 42, 610, 650, 700],
    ['W4836', 48, 670, 700, 750],
  ],
} as const

describe('wallCabinetCatalog', () => {
  it('transcribes every supplied A/B/C wall-cabinet price exactly', () => {
    for (const cabinetType of WALL_CABINET_TYPES) {
      const actual = WALL_CABINET_CATALOG[cabinetType].models.map(
        (candidate) => [
          candidate.modelNumber,
          candidate.width,
          candidate.prices.A,
          candidate.prices.B,
          candidate.prices.C,
        ],
      )
      expect(actual).toEqual(EXPECTED_TABLES[cabinetType])
    }
  })

  it('keeps catalog heights fixed and documents a 12-inch wall depth', () => {
    for (const cabinetType of WALL_CABINET_TYPES) {
      const family = getWallCabinetFamily(cabinetType)
      expect(
        family.models.every(
          (candidate) =>
            candidate.height === family.height &&
            candidate.depth === family.depth,
        ),
      ).toBe(true)
      expect(family.depth).toBe(12)
      expect(family.shelfCount).toBe(family.height === 42 ? 3 : 2)
      expect(family.doorCount).toBe(
        cabinetType.includes('single') ? 1 : 2,
      )
    }
  })

  it('preserves all printed front-category descriptions', () => {
    expect(WALL_DOOR_CATEGORY_DETAILS).toEqual({
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
    })
  })

  it('provides type, model, default-option, and parameter helpers', () => {
    expect(WALL_CABINET_TYPES.every(isWallCabinetType)).toBe(true)
    expect(isWallCabinetType('wall-single-30')).toBe(false)
    expect(isWallCabinetType(undefined)).toBe(false)

    expect(createDefaultWallCabinetOptions('wall-double-42')).toEqual({
      modelNumber: 'W2442',
      doorCategory: 'A',
      doorHand: 'left',
      carcassMaterial: 'standard-melamine',
    })

    const singleW2442 = getWallCabinetModel(
      'wall-single-42',
      'W2442',
    )
    const doubleW2442 = getWallCabinetModel(
      'wall-double-42',
      'W2442',
    )
    expect(singleW2442.prices).toEqual({ A: 420, B: 440, C: 460 })
    expect(doubleW2442.prices).toEqual({ A: 470, B: 480, C: 490 })
    expect(wallModelToParameters(doubleW2442)).toEqual({
      width: 24,
      height: 42,
      depth: 12,
    })
    expect(() =>
      getWallCabinetModel('wall-single-42', 'W4842'),
    ).toThrow(RangeError)
  })

  it('snaps arbitrary widths to the nearest discrete family model', () => {
    expect(
      getWallCabinetModelByWidth('wall-single-42', 14).modelNumber,
    ).toBe('W1542')
    expect(
      getWallCabinetModelByWidth('wall-single-42', 13.5).modelNumber,
    ).toBe('W1242')
    expect(
      getWallCabinetModelByWidth('wall-double-36', 39).modelNumber,
    ).toBe('W3636')
    expect(
      getWallCabinetModelByWidth(
        'wall-double-36',
        Number.NaN,
      ).modelNumber,
    ).toBe('W2436')
  })
})

describe('calculateWallCabinetLayout', () => {
  it('uses one procedural calculator for all four shelf/door families', () => {
    const expected = {
      'wall-single-42': {
        height: 42,
        width: 9,
        shelfCount: 3,
        doors: ['singleDoor'],
      },
      'wall-double-42': {
        height: 42,
        width: 24,
        shelfCount: 3,
        doors: ['leftDoor', 'rightDoor'],
      },
      'wall-single-36': {
        height: 36,
        width: 9,
        shelfCount: 2,
        doors: ['singleDoor'],
      },
      'wall-double-36': {
        height: 36,
        width: 24,
        shelfCount: 2,
        doors: ['leftDoor', 'rightDoor'],
      },
    } as const

    for (const cabinetType of WALL_CABINET_TYPES) {
      const layout = calculateWallCabinetLayout(cabinetType)
      const familyExpectation = expected[cabinetType]

      expect(layout.cabinetType).toBe(cabinetType)
      expect(layout.parameters).toEqual({
        width: familyExpectation.width,
        height: familyExpectation.height,
        depth: 12,
      })
      expect(layout.derived.shelfCount).toBe(
        familyExpectation.shelfCount,
      )
      expect(layout.derived.doorCount).toBe(
        familyExpectation.doors.length,
      )
      expect(
        layout.parts
          .filter((candidate) => candidate.category === 'front')
          .map((candidate) => candidate.id),
      ).toEqual(familyExpectation.doors)

      for (
        let shelfNumber = 1;
        shelfNumber <= familyExpectation.shelfCount;
        shelfNumber += 1
      ) {
        expect(part(layout, `shelf${shelfNumber}`).metadata.adjustable).toBe(
          true,
        )
      }
      expect(layout.partMap.shelf3).toBe(
        familyExpectation.shelfCount === 3 ? layout.partMap.shelf3 : undefined,
      )
    }
  })

  it('builds the specified 3/4-inch carcass and shelves with a 1/2-inch back', () => {
    const layout = calculateWallCabinetLayout('wall-single-42', {}, {
      modelNumber: 'W2442',
    })
    const T = WALL_CABINET_CONFIG.panelThickness
    const B = WALL_CABINET_CONFIG.backThickness

    expect(part(layout, 'leftSidePanel').dimensions).toEqual({
      x: T,
      y: 42,
      z: 12,
    })
    expect(part(layout, 'rightSidePanel').dimensions).toEqual({
      x: T,
      y: 42,
      z: 12,
    })
    expect(part(layout, 'topPanel').dimensions).toEqual({
      x: 24 - 2 * T,
      y: T,
      z: 12 - B,
    })
    expect(part(layout, 'bottomPanel').dimensions).toEqual({
      x: 24 - 2 * T,
      y: T,
      z: 12 - B,
    })
    expect(part(layout, 'backPanel').dimensions).toEqual({
      x: 24 - 2 * T,
      y: 42 - 2 * T,
      z: B,
    })
    for (const shelfId of ['shelf1', 'shelf2', 'shelf3']) {
      const shelf = part(layout, shelfId)
      expect(shelf.dimensions.y).toBe(T)
      expect(shelf.metadata.frontEdge).toBe('PVC')
      expect(shelf.metadata.supportedBy).toBe(
        'white-nylon-locking-pins',
      )
    }

    const manufacturedWood = layout.parts.filter(
      (candidate) =>
        candidate.category === 'carcass' ||
        candidate.category === 'front',
    )
    expect(
      manufacturedWood.every(
        (candidate) => candidate.manufacturing !== undefined,
      ),
    ).toBe(true)
    for (const sourcePart of layout.parts) {
      expect(layout.partMap[sourcePart.id]).toBe(sourcePart)
    }
  })

  it('makes model number authoritative and otherwise snaps input width', () => {
    const snapped = calculateWallCabinetLayout('wall-single-42', {
      width: 14,
      height: 28,
      depth: 30,
    })
    expect(snapped.parameters).toEqual({
      width: 15,
      height: 42,
      depth: 12,
    })
    expect(snapped.derived.selectedModel.modelNumber).toBe('W1542')

    const selected = calculateWallCabinetLayout(
      'wall-single-42',
      { width: 9 },
      { modelNumber: 'W2142', doorCategory: 'C' },
    )
    expect(selected.parameters).toEqual({
      width: 21,
      height: 42,
      depth: 12,
    })
    expect(selected.derived.selectedOptions.modelNumber).toBe('W2142')
    expect(selected.derived.listPrice).toBe(420)

    expect(() =>
      calculateWallCabinetLayout(
        'wall-single-42',
        {},
        { modelNumber: 'W4842' },
      ),
    ).toThrow(RangeError)
  })

  it('selects A melamine, B laminate, and C thermafoil fronts at exact list prices', () => {
    const categoryCases = [
      ['A', 270, 'white-melamine'],
      ['B', 265, 'laminate-front'],
      ['C', 260, 'thermafoil-front'],
    ] as const

    for (const [doorCategory, price, material] of categoryCases) {
      const layout = calculateWallCabinetLayout(
        'wall-single-42',
        {},
        { modelNumber: 'W942', doorCategory },
      )
      expect(part(layout, 'singleDoor').material).toBe(material)
      expect(part(layout, 'singleDoor').metadata.doorCategory).toBe(
        doorCategory,
      )
      expect(layout.derived.listPrice).toBe(price)
    }
  })

  it('switches a single door between left- and right-hand hinge geometry', () => {
    const left = calculateWallCabinetLayout(
      'wall-single-42',
      {},
      { doorHand: 'left' },
    )
    const right = calculateWallCabinetLayout(
      'wall-single-42',
      {},
      { doorHand: 'right' },
    )

    expect(part(left, 'singleDoor').metadata.handing).toBe('left')
    expect(part(right, 'singleDoor').metadata.handing).toBe('right')
    expect(part(left, 'singleDoorHingeUpperCup').position.x).toBeLessThan(0)
    expect(part(right, 'singleDoorHingeUpperCup').position.x).toBeGreaterThan(
      0,
    )
    expect(part(left, 'singleDoor').dimensions).toEqual(
      part(right, 'singleDoor').dimensions,
    )
  })

  it('applies the optional maple-veneer carcass without changing construction sizes', () => {
    const standard = calculateWallCabinetLayout('wall-single-36')
    const maple = calculateWallCabinetLayout(
      'wall-single-36',
      {},
      { carcassMaterial: 'maple-veneer' },
    )
    const standardCarcass = standard.parts.filter(
      (candidate) => candidate.category === 'carcass',
    )
    const mapleCarcass = maple.parts.filter(
      (candidate) => candidate.category === 'carcass',
    )

    expect(
      standardCarcass.every(
        (candidate) => candidate.material === 'white-melamine',
      ),
    ).toBe(true)
    expect(
      mapleCarcass.every(
        (candidate) => candidate.material === 'natural-wood',
      ),
    ).toBe(true)
    expect(
      mapleCarcass.every(
        (candidate) =>
          candidate.metadata.carcassMaterial === 'maple-veneer',
      ),
    ).toBe(true)
    expect(
      mapleCarcass.map((candidate) => candidate.dimensions),
    ).toEqual(
      standardCarcass.map((candidate) => candidate.dimensions),
    )
  })

  it('models white nylon holders, self-closing hinges, and eight 8 mm dowels', () => {
    for (const cabinetType of WALL_CABINET_TYPES) {
      const layout = calculateWallCabinetLayout(cabinetType)
      const holders = layout.parts.filter(
        (candidate) =>
          candidate.metadata.hardwareType === 'shelf-holder',
      )
      const hingeCups = layout.parts.filter(
        (candidate) =>
          candidate.metadata.hardwareType ===
            'self-closing-concealed-hinge' &&
          candidate.metadata.component === 'cup',
      )
      const hingeComponents = layout.parts.filter(
        (candidate) =>
          candidate.metadata.hardwareType ===
          'self-closing-concealed-hinge',
      )
      const dowels = layout.parts.filter(
        (candidate) =>
          candidate.metadata.detailType === 'assembly-dowel',
      )
      const hingesPerDoor = layout.parameters.height === 42 ? 3 : 2

      expect(holders).toHaveLength(layout.derived.shelfCount * 4)
      expect(
        holders.every(
          (candidate) =>
            candidate.material === 'white-nylon' &&
            candidate.metadata.locking === true,
        ),
      ).toBe(true)
      expect(hingeCups).toHaveLength(
        layout.derived.doorCount * hingesPerDoor,
      )
      expect(hingeComponents).toHaveLength(
        layout.derived.doorCount * hingesPerDoor * 5,
      )
      expect(
        hingeComponents.every(
          (candidate) =>
            candidate.material === 'metal' &&
            candidate.metadata.concealed === true &&
            candidate.metadata.selfClosing === true,
        ),
      ).toBe(true)
      expect(dowels).toHaveLength(8)
      expect(
        dowels.every(
          (candidate) =>
            candidate.metadata.diameterMm === 8 &&
            candidate.metadata.preglued === true,
        ),
      ).toBe(true)
      for (const dowel of dowels) {
        const halfWidth = layout.parameters.width / 2
        const dowelOuterX =
          Math.abs(dowel.position.x) + dowel.dimensions.y / 2

        expect(Math.abs(dowel.position.x)).toBeCloseTo(
          halfWidth - WALL_CABINET_CONFIG.panelThickness,
          8,
        )
        expect(dowelOuterX).toBeLessThan(halfWidth)
      }
    }
  })

  it('places complete front/rear shelf-pin rows on an exact 32 mm pitch', () => {
    const layout = calculateWallCabinetLayout('wall-double-42')
    const holes = layout.parts.filter(
      (candidate) =>
        candidate.metadata.detailType === 'shelf-pin-hole',
    )
    const leftFrontHoles = holes
      .filter(
        (candidate) =>
          candidate.metadata.side === 'left' &&
          candidate.metadata.column === 'front',
      )
      .sort((a, b) => a.position.y - b.position.y)

    expect(holes).toHaveLength(
      layout.derived.pinRowPositions.length * 4,
    )
    expect(leftFrontHoles.length).toBeGreaterThan(20)
    for (let index = 1; index < leftFrontHoles.length; index += 1) {
      expect(
        leftFrontHoles[index].position.y -
          leftFrontHoles[index - 1].position.y,
      ).toBeCloseTo(32 / 25.4, 3)
      expect(leftFrontHoles[index].metadata.pitchMm).toBe(32)
    }
    for (const shelfY of layout.derived.shelfPositions) {
      const supportY = shelfY - WALL_CABINET_CONFIG.panelThickness / 2
      expect(
        layout.derived.pinRowPositions.some(
          (pinY) => Math.abs(pinY - supportY) < 0.0001,
        ),
      ).toBe(true)
    }
  })

  it('contains no base-cabinet toe kick, drawers, or slide hardware', () => {
    const forbiddenId = /(toe.?kick|drawer|slide)/i

    for (const cabinetType of WALL_CABINET_TYPES) {
      const layout = calculateWallCabinetLayout(cabinetType)
      expect(
        layout.parts.some(
          (candidate) =>
            candidate.category === 'drawer' ||
            forbiddenId.test(candidate.id) ||
            forbiddenId.test(candidate.name),
        ),
      ).toBe(false)
    }
  })

  it('accepts every exact model number belonging to its own family', () => {
    for (const cabinetType of WALL_CABINET_TYPES) {
      const family = getWallCabinetFamily(cabinetType)
      for (const selectedModel of family.models) {
        const layout = calculateWallCabinetLayout(
          cabinetType,
          {},
          {
            modelNumber:
              selectedModel.modelNumber as WallCabinetModelNumber,
          },
        )
        expect(layout.parameters).toEqual(
          wallModelToParameters(selectedModel),
        )
      }
    }
  })
})
