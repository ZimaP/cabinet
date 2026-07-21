export interface CabinetParameters {
  width: number
  height: number
  depth: number
}

export interface Vector3Value {
  x: number
  y: number
  z: number
}

export type Dimensions3D = Vector3Value

export type PartCategory =
  | 'carcass'
  | 'front'
  | 'drawer'
  | 'hardware'
  | 'detail'

export type PartKind = 'box' | 'cylinder' | 'hole' | 'screw' | 'dovetail'

export type PartMaterial =
  | 'white-melamine'
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
  parameters: CabinetParameters
  derived: CabinetDerivedDimensions
  parts: readonly PartLayout[]
  partMap: Readonly<Record<string, PartLayout>>
}
