import type {
  CabinetDerivedDimensions,
  CabinetLayout,
  CabinetParameters,
  CabinetType,
  ManufacturingPartDefinition,
  PartLayout,
  Vector3Value,
} from './types'

type SemanticDefinitions = Readonly<Record<string, ManufacturingPartDefinition>>

const zero = (): Vector3Value => ({ x: 0, y: 0, z: 0 })

const measurement = (
  localAxis: 'x' | 'y' | 'z',
  axisLabel: 'W' | 'H' | 'D' | 'L',
  edgeSign: -1 | 1,
  lineOffset = 0.72,
) => ({ localAxis, axisLabel, edgeSign, lineOffset }) as const

const annotation = (
  faceAxis: 'x' | 'y' | 'z',
  faceSign: -1 | 1,
  labelOffset: Vector3Value = zero(),
  labelScreenOffset?: Readonly<{ x: number; y: number }>,
  mobileLabelScreenOffset?: Readonly<{ x: number; y: number }>,
  mobileExplodedLabelScreenOffset?: Readonly<{ x: number; y: number }>,
) => ({
  faceAxis,
  faceSign,
  surfaceOffset: 0.22,
  labelOffset,
  labelScreenOffset,
  mobileLabelScreenOffset,
  mobileExplodedLabelScreenOffset,
}) as const

const panelWidthHeight = (
  displayName: string,
  labelOffset = zero(),
  labelScreenOffset?: Readonly<{ x: number; y: number }>,
  mobileLabelScreenOffset?: Readonly<{ x: number; y: number }>,
): ManufacturingPartDefinition => ({
  displayName,
  measurements: [measurement('x', 'W', -1), measurement('y', 'H', 1)],
  annotation: annotation(
    'z',
    1,
    labelOffset,
    labelScreenOffset,
    mobileLabelScreenOffset,
  ),
})

const drawerSide = (
  displayName: string,
  faceSign: -1 | 1,
  edgeSign: -1 | 1,
  labelOffset = zero(),
  labelScreenOffset?: Readonly<{ x: number; y: number }>,
): ManufacturingPartDefinition => ({
  displayName,
  measurements: [
    measurement('z', 'L', edgeSign, faceSign < 0 ? 2 : 0.72),
    measurement('y', 'H', 1),
  ],
  annotation: annotation('x', faceSign, labelOffset, labelScreenOffset),
})

const drawerEnd = (
  displayName: string,
  faceSign: -1 | 1,
  edgeSign: -1 | 1,
  labelOffset = zero(),
  labelScreenOffset?: Readonly<{ x: number; y: number }>,
): ManufacturingPartDefinition => ({
  displayName,
  measurements: [
    measurement('x', 'W', edgeSign, faceSign < 0 ? 1.8 : 0.72),
    measurement('y', 'H', 1),
  ],
  annotation: annotation('z', faceSign, labelOffset, labelScreenOffset),
})

const drawerBottom = (
  displayName: string,
  labelOffset = zero(),
  labelScreenOffset?: Readonly<{ x: number; y: number }>,
): ManufacturingPartDefinition => ({
  displayName,
  measurements: [measurement('x', 'W', -1), measurement('z', 'D', 1)],
  annotation: annotation('y', 1, labelOffset, labelScreenOffset),
})

/**
 * The original cabinet's established annotations. Keep these definitions and
 * their tuned offsets stable so adding catalog models does not move its labels.
 */
const ORIGINAL_DEFINITIONS: SemanticDefinitions = {
  leftSidePanel: {
    displayName: 'Left Side',
    measurements: [measurement('z', 'D', 1), measurement('y', 'H', 1)],
    annotation: annotation(
      'x',
      -1,
      { x: 0, y: 0.3, z: -6 },
      { x: -90, y: -9 },
    ),
  },
  rightSidePanel: {
    displayName: 'Right Side',
    measurements: [measurement('z', 'D', 1), measurement('y', 'H', 1)],
    annotation: annotation(
      'x',
      1,
      { x: 0, y: -0.3, z: 6 },
      { x: 34, y: -49 },
    ),
  },
  bottomPanel: {
    displayName: 'Bottom Panel',
    measurements: [measurement('x', 'W', 1), measurement('z', 'D', 1)],
    annotation: annotation(
      'y',
      -1,
      { x: 7, y: 0, z: 0 },
      { x: 40, y: -13 },
    ),
  },
  backPanel: {
    displayName: 'Back Panel',
    measurements: [measurement('x', 'W', 1), measurement('y', 'H', 1)],
    annotation: annotation(
      'z',
      1,
      { x: 0, y: 0.45, z: 0 },
      { x: -65, y: -13 },
    ),
  },
  fullDepthShelf: {
    displayName: 'Shelf',
    measurements: [measurement('x', 'W', 1), measurement('z', 'D', 1)],
    annotation: annotation(
      'y',
      1,
      { x: 0, y: 0, z: 0.3 },
      { x: -61, y: -18 },
    ),
  },
  upperStrengtheningPanel: {
    displayName: 'Upper Strengthening Panel',
    measurements: [measurement('x', 'L', 1), measurement('z', 'H', 1)],
    annotation: annotation(
      'y',
      1,
      { x: -6, y: 0, z: 0.2 },
      { x: -45, y: -60 },
    ),
  },
  backUpperReinforcingRail: {
    displayName: 'Upper Back Reinforcing Rail',
    measurements: [measurement('x', 'L', 1), measurement('y', 'H', 1)],
    annotation: annotation(
      'z',
      1,
      { x: 4, y: 0.2, z: 0 },
      { x: 12, y: -56 },
    ),
  },
  backLowerReinforcingRail: {
    displayName: 'Lower Back Reinforcing Rail',
    measurements: [measurement('x', 'L', -1), measurement('y', 'H', 1)],
    annotation: annotation('z', 1, { x: 0, y: -0.2, z: 0 }),
  },
  toeKickPanel: {
    displayName: 'Toe Kick',
    measurements: [measurement('x', 'W', -1), measurement('y', 'H', 1)],
    annotation: annotation('z', 1, { x: 0, y: -0.2, z: 0 }),
  },
  drawerFront: {
    displayName: 'Drawer Front',
    measurements: [
      measurement('x', 'W', 1, 1.6),
      measurement('y', 'H', 1),
    ],
    annotation: annotation(
      'z',
      1,
      { x: 8, y: 0.8, z: 0 },
      { x: 15, y: -6 },
    ),
  },
  lowerDoor: panelWidthHeight('Lower Door', { x: 0, y: -0.25, z: 0 }),
  drawerBoxLeftSide: drawerSide(
    'Drawer Box Left Side',
    -1,
    1,
    { x: 0, y: 0.9, z: -7 },
    { x: -56, y: 20 },
  ),
  drawerBoxRightSide: drawerSide(
    'Drawer Box Right Side',
    1,
    -1,
    { x: 0, y: -0.9, z: 7 },
    { x: 94, y: -2 },
  ),
  drawerBoxFrontBoard: drawerEnd(
    'Drawer Box Front Board',
    1,
    1,
    { x: -2.2, y: 0.75, z: 0 },
    { x: -17, y: 17 },
  ),
  drawerBoxBackBoard: drawerEnd(
    'Drawer Box Back Board',
    -1,
    -1,
    { x: 8, y: -0.75, z: 0 },
    { x: -32, y: -14 },
  ),
  drawerBoxBottom: drawerBottom(
    'Drawer Box Bottom',
    { x: 8, y: 0, z: -1.5 },
    { x: 78, y: -23 },
  ),
}

const COMMON_CARCASS_IDS = [
  'leftSidePanel',
  'rightSidePanel',
  'bottomPanel',
  'backPanel',
  'upperStrengtheningPanel',
  'backUpperReinforcingRail',
  'backLowerReinforcingRail',
  'toeKickPanel',
] as const

const commonCarcassDefinitions = (): Record<
  (typeof COMMON_CARCASS_IDS)[number],
  ManufacturingPartDefinition
> => Object.fromEntries(
  COMMON_CARCASS_IDS.map((id) => [id, ORIGINAL_DEFINITIONS[id]]),
) as Record<
  (typeof COMMON_CARCASS_IDS)[number],
  ManufacturingPartDefinition
>

function drawerDefinitions(
  prefix: string,
  displayPrefix: string,
  screenDirection: -1 | 1,
  verticalFan = 0,
): SemanticDefinitions {
  const fallbackScreen = {
    left: { x: -100, y: -verticalFan * 18 - 18 },
    right: { x: 100, y: -verticalFan * 18 + 12 },
    front: { x: -66 * screenDirection, y: -verticalFan * 18 - 30 },
    back: { x: 66 * screenDirection, y: -verticalFan * 18 + 22 },
    bottom: { x: 28 * screenDirection, y: -verticalFan * 18 + 54 },
  }
  const screenLayouts: Readonly<
    Record<string, typeof fallbackScreen>
  > = {
    topDrawer: {
      left: { x: -130, y: -72 },
      right: { x: 125, y: -45 },
      front: { x: -50, y: -90 },
      back: { x: 65, y: -72 },
      bottom: { x: 12, y: 58 },
    },
    middleDrawer: {
      left: { x: -145, y: -25 },
      right: { x: 145, y: 10 },
      front: { x: -108, y: 28 },
      back: { x: 108, y: -30 },
      bottom: { x: 8, y: 74 },
    },
    bottomDrawer: {
      left: { x: -145, y: 25 },
      right: { x: 145, y: 52 },
      front: { x: -102, y: 65 },
      back: { x: 88, y: 72 },
      bottom: { x: 0, y: 98 },
    },
    leftDrawer: {
      left: { x: -76, y: -88 },
      right: { x: -18, y: -12 },
      front: { x: -72, y: 28 },
      back: { x: -12, y: -70 },
      bottom: { x: -52, y: 108 },
    },
    rightDrawer: {
      left: { x: 84, y: -66 },
      right: { x: 172, y: -12 },
      front: { x: 72, y: 30 },
      back: { x: 166, y: -72 },
      bottom: { x: 126, y: 92 },
    },
  }
  const screen = screenLayouts[prefix] ?? fallbackScreen
  return {
    [`${prefix}BoxLeftSide`]: drawerSide(
      `${displayPrefix} Box Left Side`,
      -1,
      1,
      { x: 0, y: 0.45 + verticalFan, z: -3.5 },
      screen.left,
    ),
    [`${prefix}BoxRightSide`]: drawerSide(
      `${displayPrefix} Box Right Side`,
      1,
      -1,
      { x: 0, y: -0.45 + verticalFan, z: 3.5 },
      screen.right,
    ),
    [`${prefix}BoxFrontBoard`]: drawerEnd(
      `${displayPrefix} Box Front Board`,
      1,
      1,
      { x: -1.25, y: 0.35 + verticalFan, z: 0 },
      screen.front,
    ),
    [`${prefix}BoxBackBoard`]: drawerEnd(
      `${displayPrefix} Box Back Board`,
      -1,
      -1,
      { x: 1.25, y: -0.35 + verticalFan, z: 0 },
      screen.back,
    ),
    [`${prefix}BoxBottom`]: drawerBottom(
      `${displayPrefix} Box Bottom`,
      { x: 2.5 * screenDirection, y: 0, z: -0.75 },
      screen.bottom,
    ),
  }
}

const TRIPLE_DRAWER_DEFINITIONS: SemanticDefinitions = {
  ...commonCarcassDefinitions(),
  topDrawerFront: panelWidthHeight(
    'Top Drawer Front',
    { x: 5, y: 0.55, z: 0 },
    { x: -158, y: -96 },
  ),
  ...drawerDefinitions('topDrawer', 'Top Drawer', -1, 1.3),
  middleDrawerFront: panelWidthHeight(
    'Middle Drawer Front',
    { x: 0, y: 0, z: 0 },
    { x: 158, y: -8 },
  ),
  ...drawerDefinitions('middleDrawer', 'Middle Drawer', 1, 0),
  bottomDrawerFront: panelWidthHeight(
    'Bottom Drawer Front',
    { x: -5, y: -0.55, z: 0 },
    { x: -158, y: 92 },
  ),
  ...drawerDefinitions('bottomDrawer', 'Bottom Drawer', -1, -1.3),
}

const DOUBLE_COMBO_DEFINITIONS: SemanticDefinitions = {
  ...commonCarcassDefinitions(),
  fullDepthShelf: {
    ...ORIGINAL_DEFINITIONS.fullDepthShelf,
    annotation: {
      ...ORIGINAL_DEFINITIONS.fullDepthShelf.annotation,
      labelScreenOffset: { x: -62, y: 88 },
    },
  },
  centerVerticalDivider: {
    displayName: 'Center Drawer Divider',
    measurements: [measurement('z', 'D', 1), measurement('y', 'H', 1)],
    annotation: annotation(
      'x',
      1,
      { x: 0, y: 0.4, z: 1.5 },
      { x: 0, y: -104 },
    ),
  },
  leftDrawerFront: panelWidthHeight(
    'Left Drawer Front',
    { x: -2.5, y: 0.5, z: 0 },
    { x: -78, y: -112 },
  ),
  rightDrawerFront: panelWidthHeight(
    'Right Drawer Front',
    { x: 2.5, y: 0.5, z: 0 },
    { x: 156, y: -106 },
  ),
  leftDoor: panelWidthHeight(
    'Left Door',
    { x: -2.5, y: -0.35, z: 0 },
    { x: -82, y: 72 },
  ),
  rightDoor: panelWidthHeight(
    'Right Door',
    { x: 2.5, y: -0.35, z: 0 },
    { x: 164, y: 35 },
  ),
  ...drawerDefinitions('leftDrawer', 'Left Drawer', -1, 0.7),
  ...drawerDefinitions('rightDrawer', 'Right Drawer', 1, -0.7),
}

/**
 * The vanity has an open plumbing bay rather than drawer boxes or a shelf.
 * Its paired upper slabs are false fronts, but they are still independent
 * manufactured panels and therefore receive their own nominal cut sizes.
 */
const VANITY_SINK_BASE_DEFINITIONS: SemanticDefinitions = {
  leftSidePanel: {
    ...ORIGINAL_DEFINITIONS.leftSidePanel,
    annotation: {
      ...ORIGINAL_DEFINITIONS.leftSidePanel.annotation,
      mobileLabelScreenOffset: { x: -90, y: 18 },
    },
  },
  rightSidePanel: {
    ...ORIGINAL_DEFINITIONS.rightSidePanel,
    annotation: {
      ...ORIGINAL_DEFINITIONS.rightSidePanel.annotation,
      mobileLabelScreenOffset: { x: 34, y: 145 },
    },
  },
  bottomPanel: {
    ...ORIGINAL_DEFINITIONS.bottomPanel,
    annotation: {
      ...ORIGINAL_DEFINITIONS.bottomPanel.annotation,
      mobileLabelScreenOffset: { x: 220, y: 21 },
    },
  },
  backPanel: {
    ...ORIGINAL_DEFINITIONS.backPanel,
    annotation: {
      ...ORIGINAL_DEFINITIONS.backPanel.annotation,
      mobileLabelScreenOffset: { x: -446, y: -150 },
      mobileExplodedLabelScreenOffset: { x: -466, y: -150 },
    },
  },
  upperStrengtheningPanel: {
    ...ORIGINAL_DEFINITIONS.upperStrengtheningPanel,
    annotation: {
      ...ORIGINAL_DEFINITIONS.upperStrengtheningPanel.annotation,
      mobileLabelScreenOffset: { x: -105, y: -136 },
    },
  },
  rearUpperStretcher: {
    displayName: 'Rear Upper Stretcher',
    measurements: [measurement('x', 'L', 1), measurement('z', 'H', 1)],
    annotation: annotation(
      'y',
      1,
      { x: 3.5, y: 0, z: -0.25 },
      { x: 170, y: -25 },
      { x: 130, y: -116 },
    ),
  },
  falseFrontLowerSupportRail: {
    displayName: 'False-Front Lower Support Rail',
    measurements: [measurement('x', 'L', 1), measurement('z', 'D', 1)],
    annotation: annotation(
      'y',
      1,
      { x: -3.5, y: 0, z: 0.35 },
      { x: -116, y: -34 },
      { x: -135, y: -78 },
      { x: -180, y: -78 },
    ),
  },
  falseFrontCenterSupport: {
    displayName: 'False-Front Center Support',
    measurements: [measurement('z', 'D', 1), measurement('y', 'H', 1)],
    annotation: annotation(
      'x',
      1,
      { x: 0, y: 0.2, z: 0.4 },
      { x: 120, y: 80 },
      { x: 345, y: -42 },
      { x: 445, y: -42 },
    ),
  },
  toeKickPanel: {
    ...ORIGINAL_DEFINITIONS.toeKickPanel,
    annotation: {
      ...ORIGINAL_DEFINITIONS.toeKickPanel.annotation,
      mobileLabelScreenOffset: { x: -140, y: 17 },
      mobileExplodedLabelScreenOffset: { x: -220, y: 45 },
    },
  },
  leftFalseFront: panelWidthHeight(
    'Left False Front',
    { x: -2, y: 0.35, z: 0 },
    { x: -92, y: -82 },
    { x: -92, y: -133 },
  ),
  rightFalseFront: panelWidthHeight(
    'Right False Front',
    { x: 2, y: 0.35, z: 0 },
    { x: 92, y: -112 },
    { x: 92, y: -110 },
  ),
  leftDoor: panelWidthHeight(
    'Left Door',
    { x: -2, y: -0.25, z: 0 },
    { x: -92, y: 58 },
    { x: 10, y: 68 },
  ),
  rightDoor: panelWidthHeight(
    'Right Door',
    { x: 2, y: -0.25, z: 0 },
    { x: 92, y: 58 },
    { x: 92, y: 169 },
  ),
}

const DEFINITIONS_BY_CABINET_TYPE: Readonly<
  Record<CabinetType, SemanticDefinitions>
> = {
  'door-drawer': ORIGINAL_DEFINITIONS,
  'triple-drawer': TRIPLE_DRAWER_DEFINITIONS,
  'double-door-double-drawer': DOUBLE_COMBO_DEFINITIONS,
  'vanity-sink-base': VANITY_SINK_BASE_DEFINITIONS,
}

/** Returns the explicit semantic allowlist for a catalog model. */
export function getManufacturingDefinitions(
  cabinetType: CabinetType,
): SemanticDefinitions {
  return DEFINITIONS_BY_CABINET_TYPE[cabinetType]
}

/**
 * Attaches nominal cut-size metadata only to known wooden manufacturing parts.
 * Hardware and lightweight visual/detail meshes are excluded even if a future
 * part accidentally reuses a semantic ID.
 */
export function attachManufacturingMetadata(
  cabinetType: CabinetType,
  parts: readonly PartLayout[],
): readonly PartLayout[] {
  const definitions = getManufacturingDefinitions(cabinetType)
  const seen = new Set<string>()
  const missingDefinitions: string[] = []

  const annotated = parts.map((part) => {
    const definition = definitions[part.id]
    const isWoodCategory =
      part.category === 'carcass' ||
      part.category === 'front' ||
      part.category === 'drawer'

    if (isWoodCategory && !definition) {
      missingDefinitions.push(part.id)
      return part
    }
    if (!definition || !isWoodCategory) return part
    seen.add(part.id)
    // A calculator may provide model-specific placement tuned to its own
    // explosion directions. Preserve that explicit semantic metadata.
    if (part.manufacturing) {
      return {
        ...part,
        manufacturing: {
          ...definition,
          ...part.manufacturing,
          annotation: {
            ...definition.annotation,
            ...part.manufacturing.annotation,
          },
        },
      }
    }
    return { ...part, manufacturing: definition }
  })

  if (missingDefinitions.length > 0) {
    throw new Error(
      `Wood parts missing manufacturing definitions in ${cabinetType} layout: ${missingDefinitions.join(', ')}`,
    )
  }

  const missing = Object.keys(definitions).filter((id) => !seen.has(id))
  if (missing.length > 0) {
    throw new Error(
      `Manufacturing parts missing from ${cabinetType} layout: ${missing.join(', ')}`,
    )
  }

  return annotated
}

export type FinalizedCabinetLayout<
  TDerived extends CabinetDerivedDimensions = CabinetDerivedDimensions,
> = Omit<CabinetLayout, 'derived'> & { derived: TDerived }

/**
 * Shared calculator finishing step: annotate semantic boards and build the
 * scene lookup map from the exact same PartLayout objects used for rendering.
 */
export function finalizeCabinetLayout<
  TDerived extends CabinetDerivedDimensions,
>(
  cabinetType: CabinetType,
  parameters: CabinetParameters,
  derived: TDerived,
  sourceParts: readonly PartLayout[],
): FinalizedCabinetLayout<TDerived> {
  const parts = attachManufacturingMetadata(cabinetType, sourceParts)
  const partMap = Object.fromEntries(
    parts.map((part) => [part.id, part]),
  ) as Record<string, PartLayout>

  if (Object.keys(partMap).length !== parts.length) {
    throw new Error(`Duplicate part ID in ${cabinetType} cabinet layout`)
  }

  return { cabinetType, parameters, derived, parts, partMap }
}
