/**
 * Rendering-only dimensions. All values are inches because the cabinet layout
 * uses one Three.js world unit per inch. Construction dimensions live in
 * src/model; these values only describe small visible surface details.
 */
export const CABINET_RENDERING = {
  bevelRadius: 0.055,
  bevelSmoothness: 2,
  edgeCapDepth: 0.022,
  plywoodStripeWidth: 0.018,
  surfaceOffset: 0.014,
  woodGrainWidth: 0.012,
  screwHeadDepth: 0.055,
  screwSlotDepth: 0.012,
  metalBevelRadius: 0.025,
} as const

export const CABINET_COLORS = {
  melamine: '#f5f3ec',
  melamineEdge: '#dedbd0',
  laminate: '#fbfbf8',
  thermafoil: '#f1f4f5',
  whiteNylon: '#f6f7f2',
  plywoodCore: '#cba878',
  plywoodLayer: '#896740',
  maple: '#c99158',
  mapleLight: '#e1b77f',
  mapleDark: '#956035',
  drawerBottom: '#bc9468',
  metal: '#8d969c',
  metalHighlight: '#c8ced1',
  darkMetal: '#3e4549',
  screw: '#697176',
  hole: '#555a58',
  softClose: '#30373b',
  slideLatch: '#b34b38',
} as const
