export interface CabinetParameters {
  width: number
  height: number
  depth: number
}

export type CabinetType =
  | 'door-drawer'
  | 'triple-drawer'
  | 'double-door-double-drawer'
  | 'vanity-sink-base'
  | 'wall-single-42'
  | 'wall-double-42'
  | 'wall-single-36'
  | 'wall-double-36'

export interface Vector3Value {
  x: number
  y: number
  z: number
}

export type Dimensions3D = Vector3Value
export type LocalAxis = 'x' | 'y' | 'z'
export type ManufacturingAxisLabel = 'W' | 'H' | 'D' | 'L'
export type AxisDirection = -1 | 1

export interface ManufacturingMeasurementDefinition {
  localAxis: LocalAxis
  axisLabel: ManufacturingAxisLabel
  edgeSign: AxisDirection
  lineOffset?: number
}

export interface ManufacturingAnnotationDefinition {
  faceAxis: LocalAxis
  faceSign: AxisDirection
  surfaceOffset?: number
  labelOffset?: Vector3Value
  labelScreenOffset?: Readonly<{ x: number; y: number }>
  mobileLabelScreenOffset?: Readonly<{ x: number; y: number }>
  /** Optional final phone fan-out for dense, fully exploded assemblies. */
  mobileExplodedLabelScreenOffset?: Readonly<{ x: number; y: number }>
}

/** Explicit semantic cut-size metadata; hardware and visual details omit it. */
export interface ManufacturingPartDefinition {
  displayName: string
  measurements: readonly [
    ManufacturingMeasurementDefinition,
    ManufacturingMeasurementDefinition,
  ]
  annotation: ManufacturingAnnotationDefinition
}

export type PartCategory =
  | 'carcass'
  | 'front'
  | 'drawer'
  | 'hardware'
  | 'detail'

export type PartKind = 'box' | 'cylinder' | 'hole' | 'screw' | 'dovetail'

export type PartMaterial =
  | 'white-melamine'
  | 'laminate-front'
  | 'thermafoil-front'
  | 'white-nylon'
  | 'plywood-edge'
  | 'natural-wood'
  | 'drawer-bottom'
  | 'metal'
  | 'dark-metal'
  | 'recess'

export interface PartMetadata {
  radius?: number
  segments?: number
  side?: string
  [key: string]: unknown
}

export interface PartLayout {
  id: string
  name: string
  category: PartCategory
  kind: PartKind
  material: PartMaterial
  dimensions: Dimensions3D
  position: Vector3Value
  rotation: Vector3Value
  explosion: {
    translation: Vector3Value
    rotation: Vector3Value
  }
  metadata: PartMetadata
  manufacturing?: ManufacturingPartDefinition
}

export interface CabinetDerivedDimensions {
  interiorWidth: number
  usableFrontHeight: number
  drawerZoneHeight: number
  doorHeight: number
  bottomTopY: number
  shelfY: number
  drawerBoxOuterWidth: number
  drawerBoxHeight: number
  drawerBoxDepth: number
  slideLength: number
  frontZ: number
}

export interface CabinetLayout {
  cabinetType: CabinetType
  parameters: CabinetParameters
  derived: CabinetDerivedDimensions
  parts: readonly PartLayout[]
  partMap: Readonly<Record<string, PartLayout>>
}
