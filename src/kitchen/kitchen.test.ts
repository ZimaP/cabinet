import { describe, expect, it } from 'vitest'

import {
  DEFAULT_ROOM_DIMENSIONS,
  KITCHEN_PROJECT_VERSION,
  addCabinet,
  cabinetPlacementsOverlap,
  calculateCabinetRoomBounds,
  calculateCabinetWallSpan,
  calculateCabinetWorldTransform,
  createKitchenProject,
  duplicateCabinet,
  findFirstAvailableOffset,
  getCabinetPlacementIssues,
  getWallLength,
  normalizeCabinetPlacement,
  normalizeRoomDimensions,
  parseKitchenProject,
  removeCabinet,
  serializeKitchenProject,
  updateCabinetPlacement,
  updateRoomDimensions,
} from './index'

describe('kitchen room geometry', () => {
  it('uses practical defaults and safely snaps/clamps edited dimensions', () => {
    expect(createKitchenProject()).toEqual({
      version: KITCHEN_PROJECT_VERSION,
      room: { width: 144, depth: 120, height: 96 },
      cabinets: [],
    })

    expect(
      normalizeRoomDimensions({
        width: 144.13,
        depth: 30,
        height: 300,
      }),
    ).toEqual({ width: 144.25, depth: 60, height: 180 })
    expect(
      normalizeRoomDimensions({
        width: Number.NaN,
        depth: Number.POSITIVE_INFINITY,
      }),
    ).toEqual(DEFAULT_ROOM_DIMENSIONS)
  })

  it('calculates back and side wall lengths and cabinet spans', () => {
    const project = addCabinet(createKitchenProject(), {
      cabinetType: 'door-drawer',
      placement: { wall: 'back', offset: 12 },
    })
    const cabinet = project.cabinets[0]

    expect(getWallLength(project.room, 'back')).toBe(144)
    expect(getWallLength(project.room, 'left')).toBe(120)
    expect(getWallLength(project.room, 'right')).toBe(120)
    expect(calculateCabinetWallSpan(cabinet)).toEqual({
      start: 12,
      end: 36,
      length: 24,
    })
  })

  it('snaps placement and keeps the full cabinet inside wall and ceiling bounds', () => {
    const room = { width: 100, depth: 80, height: 90 }
    const parameters = { width: 24, depth: 24, height: 34.5 }

    expect(
      normalizeCabinetPlacement(room, parameters, {
        wall: 'back',
        offset: 99,
        elevation: 80,
      }),
    ).toEqual({ wall: 'back', offset: 76, elevation: 55.5 })
    expect(
      normalizeCabinetPlacement(room, parameters, {
        wall: 'left',
        offset: 12.13,
        elevation: -5,
      }),
    ).toEqual({ wall: 'left', offset: 12.25, elevation: 0 })
  })

  it('maps wall-relative placements to centered 3D room coordinates', () => {
    const room = { width: 120, depth: 96, height: 96 }
    const cabinet = {
      parameters: { width: 24, height: 34.5, depth: 24 },
      placement: { wall: 'back' as const, offset: 12, elevation: 0 },
    }

    expect(calculateCabinetWorldTransform(room, cabinet)).toEqual({
      position: { x: -36, y: 17.25, z: -36 },
      rotationY: 0,
    })
    expect(
      calculateCabinetWorldTransform(room, {
        ...cabinet,
        placement: { wall: 'left', offset: 12, elevation: 0 },
      }),
    ).toEqual({
      position: { x: -48, y: 17.25, z: -24 },
      rotationY: Math.PI / 2,
    })
  })
})

describe('placed cabinets', () => {
  it('creates catalog-backed base and wall cabinets with safe defaults', () => {
    let project = addCabinet(createKitchenProject(), {
      cabinetType: 'door-drawer',
    })
    project = addCabinet(project, {
      cabinetType: 'wall-double-36',
      parameters: { width: 31 },
      wallOptions: {
        doorCategory: 'C',
        doorHand: 'right',
        carcassMaterial: 'maple-veneer',
      },
    })

    expect(project.cabinets[0]).toMatchObject({
      id: 'cabinet-1',
      cabinetType: 'door-drawer',
      parameters: { width: 24, height: 34.5, depth: 24 },
      placement: { wall: 'back', offset: 0, elevation: 0 },
    })
    expect(project.cabinets[1]).toMatchObject({
      id: 'cabinet-2',
      cabinetType: 'wall-double-36',
      parameters: { width: 30, height: 36, depth: 12 },
      wallOptions: {
        modelNumber: 'W3036',
        doorCategory: 'C',
        doorHand: 'right',
        carcassMaterial: 'maple-veneer',
      },
      placement: { wall: 'back', offset: 0, elevation: 54 },
    })
  })

  it('automatically adds repeated cabinets at the first open offset', () => {
    let project = addCabinet(createKitchenProject(), {
      cabinetType: 'door-drawer',
    })
    project = addCabinet(project, {
      cabinetType: 'door-drawer',
    })
    project = addCabinet(project, {
      cabinetType: 'wall-single-36',
    })

    expect(
      project.cabinets.map((cabinet) => cabinet.placement),
    ).toEqual([
      { wall: 'back', offset: 0, elevation: 0 },
      { wall: 'back', offset: 24, elevation: 0 },
      { wall: 'back', offset: 0, elevation: 54 },
    ])
  })

  it('adds, duplicates beside the source, updates, and removes immutably', () => {
    const empty = createKitchenProject()
    const added = addCabinet(empty, {
      cabinetType: 'triple-drawer',
      placement: { wall: 'right', offset: 10 },
    })
    const duplicated = duplicateCabinet(added, 'cabinet-1')
    const moved = updateCabinetPlacement(
      duplicated,
      'cabinet-2',
      { offset: 118, elevation: 100 },
    )
    const removed = removeCabinet(moved, 'cabinet-1')

    expect(empty.cabinets).toHaveLength(0)
    expect(added.cabinets).toHaveLength(1)
    expect(duplicated.cabinets).toHaveLength(2)
    expect(duplicated.cabinets[1]).toMatchObject({
      id: 'cabinet-2',
      cabinetType: 'triple-drawer',
      placement: { wall: 'right', offset: 34, elevation: 0 },
    })
    expect(moved.cabinets[1].placement).toEqual({
      wall: 'right',
      offset: 96,
      elevation: 61.5,
    })
    expect(removed.cabinets.map((cabinet) => cabinet.id)).toEqual([
      'cabinet-2',
    ])
    expect(removeCabinet(removed, 'missing')).toBe(removed)
  })

  it('reclamps every cabinet after the room is resized', () => {
    const project = addCabinet(createKitchenProject(), {
      cabinetType: 'door-drawer',
      placement: { wall: 'back', offset: 120, elevation: 60 },
    })
    const resized = updateRoomDimensions(project, {
      width: 80,
      height: 72,
    })

    expect(resized.room).toEqual({
      width: 80,
      depth: 120,
      height: 72,
    })
    expect(resized.cabinets[0].placement).toEqual({
      wall: 'back',
      offset: 56,
      elevation: 37.5,
    })
  })

  it('detects overlap only when both wall axes overlap', () => {
    const first = {
      parameters: { width: 24, height: 34.5, depth: 24 },
      placement: { wall: 'back' as const, offset: 0, elevation: 0 },
    }

    expect(
      cabinetPlacementsOverlap(first, {
        ...first,
        placement: { ...first.placement, offset: 12 },
      }),
    ).toBe(true)
    expect(
      cabinetPlacementsOverlap(first, {
        ...first,
        placement: { ...first.placement, offset: 24 },
      }),
    ).toBe(false)
    expect(
      cabinetPlacementsOverlap(first, {
        ...first,
        placement: {
          ...first.placement,
          offset: 12,
          elevation: 34.5,
        },
      }),
    ).toBe(false)
    expect(
      cabinetPlacementsOverlap(first, {
        ...first,
        placement: { ...first.placement, wall: 'left' },
      }),
    ).toBe(false)
  })

  it('calculates exact room-world cabinet bounds on every wall', () => {
    const room = { width: 120, depth: 96, height: 96 }
    const parameters = { width: 24, height: 34.5, depth: 21 }

    expect(
      calculateCabinetRoomBounds(room, {
        parameters,
        placement: { wall: 'back', offset: 12, elevation: 4 },
      }),
    ).toEqual({
      minX: -48,
      maxX: -24,
      minY: 4,
      maxY: 38.5,
      minZ: -48,
      maxZ: -27,
    })
    expect(
      calculateCabinetRoomBounds(room, {
        parameters,
        placement: { wall: 'left', offset: 12, elevation: 4 },
      }),
    ).toEqual({
      minX: -60,
      maxX: -39,
      minY: 4,
      maxY: 38.5,
      minZ: -36,
      maxZ: -12,
    })
    expect(
      calculateCabinetRoomBounds(room, {
        parameters,
        placement: { wall: 'right', offset: 12, elevation: 4 },
      }),
    ).toEqual({
      minX: 39,
      maxX: 60,
      minY: 4,
      maxY: 38.5,
      minZ: -36,
      maxZ: -12,
    })
  })

  it('reports out-of-bounds and overlapping cabinet ids', () => {
    const base = addCabinet(createKitchenProject(), {
      id: 'base',
      cabinetType: 'door-drawer',
    })
    const overlapping = addCabinet(base, {
      id: 'overlap',
      cabinetType: 'triple-drawer',
      placement: { offset: 12 },
    })
    const invalid = {
      ...overlapping.cabinets[1],
      id: 'outside',
      placement: { wall: 'back' as const, offset: 140, elevation: 0 },
    }
    const project = {
      ...overlapping,
      cabinets: [...overlapping.cabinets, invalid],
    }

    expect(getCabinetPlacementIssues(project)).toEqual({
      outOfBoundsIds: ['outside'],
      overlapIds: ['base', 'overlap'],
      overlapPairs: [['base', 'overlap']],
    })
  })

  it('reports physical corner collisions across perpendicular walls', () => {
    let project = addCabinet(createKitchenProject(), {
      id: 'back-corner',
      cabinetType: 'door-drawer',
      placement: { wall: 'back', offset: 0, elevation: 0 },
    })
    project = addCabinet(project, {
      id: 'left-corner',
      cabinetType: 'door-drawer',
      placement: { wall: 'left', offset: 0, elevation: 0 },
    })
    project = addCabinet(project, {
      id: 'left-upper',
      cabinetType: 'wall-double-36',
      placement: { wall: 'left', offset: 0, elevation: 54 },
    })

    expect(getCabinetPlacementIssues(project)).toEqual({
      outOfBoundsIds: [],
      overlapIds: ['back-corner', 'left-corner'],
      overlapPairs: [['back-corner', 'left-corner']],
    })
  })

  it('finds the first free interval at exact edges or with clearance', () => {
    let project = addCabinet(createKitchenProject({ width: 80 }), {
      cabinetType: 'door-drawer',
      placement: { wall: 'back', offset: 0, elevation: 0 },
    })
    project = addCabinet(project, {
      cabinetType: 'wall-double-36',
      placement: { wall: 'back', offset: 0, elevation: 54 },
    })
    const parameters = { width: 24, height: 34.5, depth: 24 }

    expect(
      findFirstAvailableOffset(
        project,
        parameters,
        'back',
        0,
      ),
    ).toBe(24)
    expect(
      findFirstAvailableOffset(
        project,
        parameters,
        'back',
        0,
        1,
      ),
    ).toBe(25)
    expect(
      findFirstAvailableOffset(
        project,
        parameters,
        'back',
        54,
      ),
    ).toBe(24)

    project = addCabinet(project, {
      cabinetType: 'double-door-double-drawer',
      parameters: { width: 42 },
      placement: { wall: 'back', offset: 24, elevation: 0 },
    })
    expect(
      findFirstAvailableOffset(
        project,
        parameters,
        'back',
        0,
      ),
    ).toBeNull()
  })

  it('duplicates into the earliest open interval instead of overlapping', () => {
    let project = addCabinet(createKitchenProject({ width: 90 }), {
      id: 'first',
      cabinetType: 'door-drawer',
      placement: { offset: 24 },
    })
    project = addCabinet(project, {
      id: 'at-start',
      cabinetType: 'door-drawer',
      placement: { offset: 0 },
    })

    const duplicated = duplicateCabinet(project, 'first')
    expect(duplicated.cabinets[2].placement.offset).toBe(48)
    expect(getCabinetPlacementIssues(duplicated).overlapIds).toEqual([])
  })

  it('skips perpendicular corner footprints when finding an offset', () => {
    let project = addCabinet(createKitchenProject({ width: 96 }), {
      id: 'left-corner',
      cabinetType: 'door-drawer',
      placement: { wall: 'left', offset: 0, elevation: 0 },
    })
    const parameters = { width: 24, height: 34.5, depth: 24 }

    expect(
      findFirstAvailableOffset(project, parameters, 'back', 0),
    ).toBe(24)
    expect(
      findFirstAvailableOffset(project, parameters, 'back', 0, 1),
    ).toBe(25)
    expect(
      findFirstAvailableOffset(project, parameters, 'back', 54),
    ).toBe(0)

    project = addCabinet(project, {
      id: 'back-after-corner',
      cabinetType: 'door-drawer',
      placement: { wall: 'back', offset: 24, elevation: 0 },
    })
    const duplicated = duplicateCabinet(project, 'back-after-corner')
    expect(duplicated.cabinets[2].placement.offset).toBe(48)
    expect(getCabinetPlacementIssues(duplicated).overlapIds).toEqual([])
  })
})

describe('kitchen project storage', () => {
  it('round-trips a normalized project through compact JSON', () => {
    const project = addCabinet(createKitchenProject(), {
      id: 'sink-run',
      cabinetType: 'wall-single-42',
      wallOptions: {
        modelNumber: 'W1842',
        doorCategory: 'B',
        doorHand: 'right',
      },
      placement: { wall: 'left', offset: 18, elevation: 52 },
    })

    expect(parseKitchenProject(serializeKitchenProject(project))).toEqual(
      project,
    )
  })

  it('never throws for empty, corrupt, or unsupported localStorage data', () => {
    expect(parseKitchenProject(null)).toEqual(createKitchenProject())
    expect(parseKitchenProject('{not json')).toEqual(
      createKitchenProject(),
    )
    expect(
      parseKitchenProject(
        JSON.stringify({ version: 99, room: {}, cabinets: [] }),
      ),
    ).toEqual(createKitchenProject())
  })

  it('sanitizes untrusted fields and repairs duplicate ids', () => {
    const parsed = parseKitchenProject(
      JSON.stringify({
        version: 1,
        room: { width: 80, depth: 10, height: 90 },
        cabinets: [
          {
            id: 'same',
            cabinetType: 'door-drawer',
            parameters: { width: 1000, height: -5, depth: 24 },
            placement: {
              wall: 'not-a-wall',
              offset: 900,
              elevation: -5,
            },
          },
          {
            id: 'same',
            cabinetType: 'wall-single-36',
            parameters: { width: 20 },
            wallOptions: {
              modelNumber: 'not-a-model',
              doorCategory: 'Z',
            },
            placement: { wall: 'right', offset: 900, elevation: 900 },
          },
          { cabinetType: 'unknown-model' },
        ],
      }),
    )

    expect(parsed.room).toEqual({ width: 80, depth: 60, height: 90 })
    expect(parsed.cabinets).toHaveLength(2)
    expect(parsed.cabinets[0]).toMatchObject({
      id: 'same',
      parameters: { width: 42, height: 28, depth: 24 },
      placement: { wall: 'back', offset: 38, elevation: 0 },
    })
    expect(parsed.cabinets[1]).toMatchObject({
      id: 'cabinet-2',
      parameters: { width: 21, height: 36, depth: 12 },
      wallOptions: { modelNumber: 'W2136', doorCategory: 'A' },
      placement: { wall: 'right', offset: 39, elevation: 54 },
    })
  })
})
