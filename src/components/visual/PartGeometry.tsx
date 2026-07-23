import { Edges, RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

import type { Dimensions3D, PartLayout } from '../../model'
import { calculateToeKickSideProfile } from '../../model/toeKickSideProfile'
import { CABINET_COLORS, CABINET_RENDERING } from './renderingConstants'

type MaterialKind = PartLayout['material']
type Axis = 'x' | 'y' | 'z'

interface DimensionsProps {
  dimensions: Dimensions3D
  name: string
}

function smallestAxis(dimensions: Dimensions3D): Axis {
  if (dimensions.x <= dimensions.y && dimensions.x <= dimensions.z) return 'x'
  if (dimensions.y <= dimensions.z) return 'y'
  return 'z'
}

function SurfaceMaterial({ material }: { material: MaterialKind }) {
  switch (material) {
    case 'natural-wood':
      return (
        <meshStandardMaterial
          color={CABINET_COLORS.maple}
          roughness={0.66}
          metalness={0}
        />
      )
    case 'drawer-bottom':
      return (
        <meshStandardMaterial
          color={CABINET_COLORS.drawerBottom}
          roughness={0.72}
          metalness={0}
        />
      )
    case 'laminate-front':
      return (
        <meshStandardMaterial
          color={CABINET_COLORS.laminate}
          roughness={0.26}
          metalness={0.01}
        />
      )
    case 'thermafoil-front':
      return (
        <meshStandardMaterial
          color={CABINET_COLORS.thermafoil}
          roughness={0.2}
          metalness={0.015}
        />
      )
    case 'white-nylon':
      return (
        <meshStandardMaterial
          color={CABINET_COLORS.whiteNylon}
          roughness={0.62}
          metalness={0}
        />
      )
    case 'metal':
      return (
        <meshStandardMaterial
          color={CABINET_COLORS.metal}
          roughness={0.3}
          metalness={0.82}
        />
      )
    case 'dark-metal':
      return (
        <meshStandardMaterial
          color={CABINET_COLORS.darkMetal}
          roughness={0.38}
          metalness={0.76}
        />
      )
    case 'plywood-edge':
      return (
        <meshStandardMaterial
          color={CABINET_COLORS.plywoodCore}
          roughness={0.76}
          metalness={0}
        />
      )
    case 'recess':
      return (
        <meshStandardMaterial
          color={CABINET_COLORS.hole}
          roughness={0.76}
          metalness={0}
        />
      )
    case 'white-melamine':
    default:
      return (
        <meshStandardMaterial
          color={CABINET_COLORS.melamine}
          roughness={0.48}
          metalness={0.02}
        />
      )
  }
}

function CoreMaterial({ stripe = false }: { stripe?: boolean }) {
  return (
    <meshStandardMaterial
      color={stripe ? CABINET_COLORS.plywoodLayer : CABINET_COLORS.plywoodCore}
      roughness={0.8}
      metalness={0}
    />
  )
}

function PlywoodFrontEdge({ dimensions }: { dimensions: Dimensions3D }) {
  const axis = smallestAxis(dimensions)
  const capDepth = CABINET_RENDERING.edgeCapDepth
  const stripeWidth = CABINET_RENDERING.plywoodStripeWidth
  const offset = CABINET_RENDERING.surfaceOffset
  const stripeFractions = [-0.34, -0.17, 0, 0.17, 0.34]

  if (axis === 'x') {
    return (
      <group name="exposed-plywood-edges">
        <mesh
          position={[0, 0, dimensions.z / 2 + offset]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[
              Math.max(0.01, dimensions.x - 0.03),
              Math.max(0.01, dimensions.y - 0.06),
              capDepth,
            ]}
          />
          <CoreMaterial />
        </mesh>
        {stripeFractions.map((fraction) => (
          <mesh
            key={fraction}
            position={[
              fraction * dimensions.x,
              0,
              dimensions.z / 2 + offset + capDepth / 2,
            ]}
          >
            <boxGeometry
              args={[
                stripeWidth,
                Math.max(0.01, dimensions.y - 0.09),
                0.008,
              ]}
            />
            <CoreMaterial stripe />
          </mesh>
        ))}
        <mesh position={[0, dimensions.y / 2 + offset, 0]}>
          <boxGeometry
            args={[
              Math.max(0.01, dimensions.x - 0.03),
              capDepth,
              Math.max(0.01, dimensions.z - 0.06),
            ]}
          />
          <CoreMaterial />
        </mesh>
      </group>
    )
  }

  if (axis === 'y') {
    return (
      <group name="exposed-plywood-edges">
        <mesh position={[0, 0, dimensions.z / 2 + offset]} castShadow>
          <boxGeometry
            args={[
              Math.max(0.01, dimensions.x - 0.06),
              Math.max(0.01, dimensions.y - 0.03),
              capDepth,
            ]}
          />
          <CoreMaterial />
        </mesh>
        {stripeFractions.map((fraction) => (
          <mesh
            key={fraction}
            position={[
              0,
              fraction * dimensions.y,
              dimensions.z / 2 + offset + capDepth / 2,
            ]}
          >
            <boxGeometry
              args={[
                Math.max(0.01, dimensions.x - 0.09),
                stripeWidth,
                0.008,
              ]}
            />
            <CoreMaterial stripe />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <group name="exposed-plywood-edges">
      <mesh position={[-dimensions.x / 2 - offset, 0, 0]} castShadow>
        <boxGeometry
          args={[
            capDepth,
            Math.max(0.01, dimensions.y - 0.06),
            Math.max(0.01, dimensions.z - 0.03),
          ]}
        />
        <CoreMaterial />
      </mesh>
      <mesh position={[dimensions.x / 2 + offset, 0, 0]} castShadow>
        <boxGeometry
          args={[
            capDepth,
            Math.max(0.01, dimensions.y - 0.06),
            Math.max(0.01, dimensions.z - 0.03),
          ]}
        />
        <CoreMaterial />
      </mesh>
      {stripeFractions.map((fraction) => (
        <group key={fraction}>
          <mesh
            position={[
              -dimensions.x / 2 - offset - capDepth / 2,
              0,
              fraction * dimensions.z,
            ]}
          >
            <boxGeometry
              args={[
                0.008,
                Math.max(0.01, dimensions.y - 0.09),
                stripeWidth,
              ]}
            />
            <CoreMaterial stripe />
          </mesh>
          <mesh
            position={[
              dimensions.x / 2 + offset + capDepth / 2,
              0,
              fraction * dimensions.z,
            ]}
          >
            <boxGeometry
              args={[
                0.008,
                Math.max(0.01, dimensions.y - 0.09),
                stripeWidth,
              ]}
            />
            <CoreMaterial stripe />
          </mesh>
        </group>
      ))}
      <mesh position={[0, dimensions.y / 2 + offset, 0]}>
        <boxGeometry
          args={[
            Math.max(0.01, dimensions.x - 0.06),
            capDepth,
            Math.max(0.01, dimensions.z - 0.03),
          ]}
        />
        <CoreMaterial />
      </mesh>
    </group>
  )
}

function WoodGrain({ dimensions }: { dimensions: Dimensions3D }) {
  const axis = smallestAxis(dimensions)
  const lines = [-0.28, -0.06, 0.17, 0.34]
  const offset = CABINET_RENDERING.surfaceOffset

  if (axis === 'x') {
    return (
      <group name="wood-grain">
        {lines.map((fraction, index) => (
          <mesh
            key={fraction}
            position={[
              dimensions.x / 2 + offset,
              fraction * dimensions.y,
              0,
            ]}
          >
            <boxGeometry
              args={[
                0.008,
                CABINET_RENDERING.woodGrainWidth,
                Math.max(0.05, dimensions.z * (0.72 + index * 0.035)),
              ]}
            />
            <meshStandardMaterial
              color={CABINET_COLORS.mapleDark}
              transparent
              opacity={0.32}
              roughness={0.9}
            />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <group name="wood-grain">
      {lines.map((fraction, index) => (
        <mesh
          key={fraction}
          position={[
            0,
            fraction * dimensions.y,
            dimensions.z / 2 + offset,
          ]}
        >
          <boxGeometry
            args={[
              Math.max(0.05, dimensions.x * (0.72 + index * 0.035)),
              CABINET_RENDERING.woodGrainWidth,
              0.008,
            ]}
          />
          <meshStandardMaterial
            color={CABINET_COLORS.mapleDark}
            transparent
            opacity={0.3}
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  )
}

export function BeveledPartBox({
  dimensions,
  name,
  material,
  showPlywoodEdge = false,
  showWoodGrain = false,
}: DimensionsProps & {
  material: MaterialKind
  showPlywoodEdge?: boolean
  showWoodGrain?: boolean
}) {
  const minimum = Math.min(dimensions.x, dimensions.y, dimensions.z)
  const radius = Math.min(
    material === 'metal' || material === 'dark-metal'
      ? CABINET_RENDERING.metalBevelRadius
      : CABINET_RENDERING.bevelRadius,
    minimum * 0.16,
  )

  return (
    <group name={`${name}-geometry`}>
      <RoundedBox
        name={`${name}-solid`}
        args={[dimensions.x, dimensions.y, dimensions.z]}
        radius={Math.max(0.004, radius)}
        smoothness={CABINET_RENDERING.bevelSmoothness}
        castShadow
        receiveShadow
      >
        <SurfaceMaterial material={material} />
      </RoundedBox>
      {showPlywoodEdge && <PlywoodFrontEdge dimensions={dimensions} />}
      {showWoodGrain && <WoodGrain dimensions={dimensions} />}
    </group>
  )
}

/**
 * One-piece side panel with the real orthogonal lower-front toe-kick notch.
 * The extrusion remains exactly the nominal 3/4-inch stock thickness; only
 * the D x H face profile differs from the rectangular manufacturing blank.
 */
export function ToeKickSidePanel({
  dimensions,
  name,
  toeKickHeight,
  toeKickSetback,
}: DimensionsProps & {
  toeKickHeight: number
  toeKickSetback: number
}) {
  const shape = useMemo(() => {
    const result = new THREE.Shape()
    const points = calculateToeKickSideProfile({
      height: dimensions.y,
      depth: dimensions.z,
      toeKickHeight,
      toeKickSetback,
    })

    // ExtrudeGeometry draws in XY and extrudes +Z. Negating local cabinet Z
    // here lets the mesh rotate +90 degrees around Y into local X/Y/Z space.
    result.moveTo(-points[0].z, points[0].y)
    points.slice(1).forEach((point) => result.lineTo(-point.z, point.y))
    result.closePath()
    return result
  }, [dimensions.y, dimensions.z, toeKickHeight, toeKickSetback])

  const extrusion = useMemo<THREE.ExtrudeGeometryOptions>(
    () => ({
      depth: dimensions.x,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 1,
    }),
    [dimensions.x],
  )

  return (
    <group name={`${name}-geometry`}>
      <mesh
        name={`${name}-notched-solid`}
        position={[-dimensions.x / 2, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
        receiveShadow
      >
        <extrudeGeometry args={[shape, extrusion]} />
        <meshStandardMaterial
          attach="material-0"
          color={CABINET_COLORS.melamine}
          roughness={0.48}
          metalness={0.02}
        />
        <meshStandardMaterial
          attach="material-1"
          color={CABINET_COLORS.plywoodCore}
          roughness={0.78}
          metalness={0}
        />
        <Edges
          threshold={18}
          color={CABINET_COLORS.melamineEdge}
        />
      </mesh>
    </group>
  )
}

/**
 * Five-piece painted front used by the two newly supplied catalog references.
 * The four frame members and recessed center panel are visual submeshes of one
 * semantic manufactured front, so sizing and exploded transforms remain tied
 * to the parent PartLayout.
 */
export function ShakerFrontPanel({ dimensions, name }: DimensionsProps) {
  const frameWidth = Math.min(
    2.1,
    Math.max(1.05, Math.min(dimensions.x * 0.13, dimensions.y * 0.22)),
  )
  const innerWidth = Math.max(0.55, dimensions.x - 2 * frameWidth)
  const innerHeight = Math.max(0.55, dimensions.y - 2 * frameWidth)
  const panelThickness = Math.max(0.16, dimensions.z * 0.44)
  const panelRecess = Math.min(0.14, dimensions.z * 0.22)
  const panelZ = dimensions.z / 2 - panelRecess - panelThickness / 2
  const frameRadius = Math.min(0.045, dimensions.z * 0.08)

  const paintedMaterial = (
    <meshStandardMaterial
      color={CABINET_COLORS.melamine}
      roughness={0.46}
      metalness={0.015}
    />
  )
  const recessedPanelMaterial = (
    <meshStandardMaterial
      color={CABINET_COLORS.melamineEdge}
      roughness={0.52}
      metalness={0.01}
    />
  )

  return (
    <group name={`${name}-shaker-front`}>
      <RoundedBox
        name={`${name}-left-stile`}
        args={[frameWidth, dimensions.y, dimensions.z]}
        position={[-dimensions.x / 2 + frameWidth / 2, 0, 0]}
        radius={frameRadius}
        smoothness={2}
        castShadow
        receiveShadow
      >
        {paintedMaterial}
      </RoundedBox>
      <RoundedBox
        name={`${name}-right-stile`}
        args={[frameWidth, dimensions.y, dimensions.z]}
        position={[dimensions.x / 2 - frameWidth / 2, 0, 0]}
        radius={frameRadius}
        smoothness={2}
        castShadow
        receiveShadow
      >
        {paintedMaterial}
      </RoundedBox>
      <RoundedBox
        name={`${name}-top-rail`}
        args={[innerWidth + 0.04, frameWidth, dimensions.z]}
        position={[0, dimensions.y / 2 - frameWidth / 2, 0]}
        radius={frameRadius}
        smoothness={2}
        castShadow
        receiveShadow
      >
        {paintedMaterial}
      </RoundedBox>
      <RoundedBox
        name={`${name}-bottom-rail`}
        args={[innerWidth + 0.04, frameWidth, dimensions.z]}
        position={[0, -dimensions.y / 2 + frameWidth / 2, 0]}
        radius={frameRadius}
        smoothness={2}
        castShadow
        receiveShadow
      >
        {paintedMaterial}
      </RoundedBox>

      <RoundedBox
        name={`${name}-reveal-shadow`}
        args={[innerWidth + 0.12, innerHeight + 0.12, 0.045]}
        position={[0, 0, panelZ - panelThickness / 2 - 0.004]}
        radius={Math.min(0.035, frameRadius)}
        smoothness={1}
      >
        <meshStandardMaterial
          color={CABINET_COLORS.darkMetal}
          roughness={0.74}
          metalness={0}
        />
      </RoundedBox>
      <RoundedBox
        name={`${name}-recessed-center-panel`}
        args={[innerWidth, innerHeight, panelThickness]}
        position={[0, 0, panelZ]}
        radius={Math.min(0.055, frameRadius)}
        smoothness={2}
        castShadow
        receiveShadow
      >
        {recessedPanelMaterial}
      </RoundedBox>
    </group>
  )
}

export function DovetailInsert({ dimensions, name }: DimensionsProps) {
  const tailHeight = dimensions.y * 0.19
  const shape = useMemo(() => {
    const result = new THREE.Shape()
    result.moveTo(-dimensions.x * 0.27, -tailHeight / 2)
    result.lineTo(dimensions.x * 0.27, -tailHeight / 2)
    result.lineTo(dimensions.x / 2, tailHeight / 2)
    result.lineTo(-dimensions.x / 2, tailHeight / 2)
    result.closePath()
    return result
  }, [dimensions.x, tailHeight])

  const options = useMemo<THREE.ExtrudeGeometryOptions>(
    () => ({
      depth: dimensions.z,
      bevelEnabled: true,
      bevelSize: Math.min(0.025, dimensions.x * 0.04),
      bevelThickness: 0.012,
      bevelSegments: 1,
      steps: 1,
    }),
    [dimensions.x, dimensions.z],
  )

  return (
    <group name={`${name}-dovetail`}>
      {[-0.36, -0.12, 0.12, 0.36].map((verticalFraction, index) => (
        <mesh
          key={verticalFraction}
          name={`${name}-tail-${index + 1}`}
          position={[0, dimensions.y * verticalFraction, -dimensions.z / 2]}
          castShadow
          receiveShadow
        >
          <extrudeGeometry args={[shape, options]} />
          <meshStandardMaterial
            color={
              index % 2 === 0
                ? CABINET_COLORS.mapleLight
                : CABINET_COLORS.mapleDark
            }
            roughness={0.74}
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  )
}

export function GenericCylinder({
  dimensions,
  name,
  material,
  radius,
  segments = 20,
}: DimensionsProps & {
  material: MaterialKind
  radius?: number
  segments?: number
}) {
  const resolvedRadius =
    radius ?? Math.max(0.01, Math.min(dimensions.x, dimensions.z) / 2)

  return (
    <mesh name={`${name}-cylinder`} castShadow receiveShadow>
      <cylinderGeometry
        args={[resolvedRadius, resolvedRadius, dimensions.y, segments]}
      />
      <SurfaceMaterial material={material} />
    </mesh>
  )
}

export function ScrewGeometry({
  dimensions,
  name,
}: DimensionsProps) {
  const radius = Math.max(0.035, Math.min(dimensions.x, dimensions.z) / 2)
  const shaftLength = Math.max(0.06, dimensions.y)
  const headDepth = Math.min(
    CABINET_RENDERING.screwHeadDepth,
    shaftLength * 0.35,
  )

  return (
    <group name={`${name}-fastener`}>
      <mesh name={`${name}-shaft`} castShadow>
        <cylinderGeometry args={[radius * 0.43, radius * 0.36, shaftLength, 12]} />
        <meshStandardMaterial
          color={CABINET_COLORS.screw}
          roughness={0.32}
          metalness={0.86}
        />
      </mesh>
      <mesh
        name={`${name}-head`}
        position={[0, shaftLength / 2 + headDepth / 2, 0]}
        castShadow
      >
        <cylinderGeometry args={[radius, radius * 0.92, headDepth, 16]} />
        <meshStandardMaterial
          color={CABINET_COLORS.metalHighlight}
          roughness={0.27}
          metalness={0.9}
        />
      </mesh>
      <mesh
        name={`${name}-cross-slot-a`}
        position={[
          0,
          shaftLength / 2 + headDepth + CABINET_RENDERING.screwSlotDepth / 2,
          0,
        ]}
      >
        <boxGeometry args={[radius * 1.25, 0.008, radius * 0.22]} />
        <meshBasicMaterial color={CABINET_COLORS.darkMetal} />
      </mesh>
      <mesh
        name={`${name}-cross-slot-b`}
        position={[
          0,
          shaftLength / 2 + headDepth + CABINET_RENDERING.screwSlotDepth / 2,
          0,
        ]}
      >
        <boxGeometry args={[radius * 0.22, 0.008, radius * 1.25]} />
        <meshBasicMaterial color={CABINET_COLORS.darkMetal} />
      </mesh>
    </group>
  )
}
