import { RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

import type { PartLayout } from '../model'
import { AnimatedPart } from './model/AnimatedPart'
import {
  numericPartMetadata,
  stringPartMetadata,
} from './model/partMetadata'
import { GenericCylinder, ScrewGeometry } from './visual/PartGeometry'
import { CABINET_COLORS, CABINET_RENDERING } from './visual/renderingConstants'
import type { CabinetSubassemblyProps } from './Carcass'

function MetalMaterial({ dark = false }: { dark?: boolean }) {
  return (
    <meshStandardMaterial
      color={dark ? CABINET_COLORS.darkMetal : CABINET_COLORS.metal}
      roughness={dark ? 0.4 : 0.27}
      metalness={dark ? 0.74 : 0.88}
    />
  )
}

/**
 * Low-profile triangular bracket used to lock an open cabinet top square.
 * The calculated part supplies the complete local envelope; its layout
 * rotation turns this single right-corner form into each installed corner.
 */
function TopCornerBrace({ part }: { part: PartLayout }) {
  const width = Math.max(0.08, part.dimensions.x)
  const height = Math.max(0.035, part.dimensions.y)
  const depth = Math.max(0.08, part.dimensions.z)
  const plateThickness = Math.min(height, Math.max(0.035, height * 0.28))
  const ribWidth = Math.min(
    width * 0.28,
    depth * 0.28,
    Math.max(0.08, Math.min(width, depth) * 0.11),
  )
  const ribHeight = Math.min(height, Math.max(plateThickness, height * 0.82))
  const ribY = -height / 2 + ribHeight / 2
  const diagonalLength = Math.hypot(
    Math.max(0.02, width - ribWidth),
    Math.max(0.02, depth - ribWidth),
  )
  const diagonalAngle = Math.atan2(depth, width)
  const holeRadius = Math.max(0.035, Math.min(width, depth) * 0.065)
  const dark = part.material === 'dark-metal'

  const shape = useMemo(() => {
    const result = new THREE.Shape()
    result.moveTo(-width / 2, -depth / 2)
    result.lineTo(width / 2, -depth / 2)
    result.lineTo(-width / 2, depth / 2)
    result.closePath()
    return result
  }, [depth, width])

  const extrusion = useMemo<THREE.ExtrudeGeometryOptions>(
    () => ({
      depth: plateThickness,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 1,
    }),
    [plateThickness],
  )

  return (
    <group name={`${part.id}-corner-brace`}>
      <mesh
        name={`${part.id}-triangular-plate`}
        position={[0, -height / 2 + plateThickness, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <extrudeGeometry args={[shape, extrusion]} />
        <MetalMaterial dark={dark} />
      </mesh>

      <RoundedBox
        name={`${part.id}-first-raised-leg`}
        args={[width, ribHeight, ribWidth]}
        position={[0, ribY, -depth / 2 + ribWidth / 2]}
        radius={Math.min(0.03, ribWidth * 0.2)}
        smoothness={1}
        castShadow
      >
        <MetalMaterial dark={dark} />
      </RoundedBox>
      <RoundedBox
        name={`${part.id}-second-raised-leg`}
        args={[ribWidth, ribHeight, depth]}
        position={[-width / 2 + ribWidth / 2, ribY, 0]}
        radius={Math.min(0.03, ribWidth * 0.2)}
        smoothness={1}
        castShadow
      >
        <MetalMaterial dark={dark} />
      </RoundedBox>
      <RoundedBox
        name={`${part.id}-diagonal-stiffening-rib`}
        args={[diagonalLength, ribHeight * 0.58, ribWidth * 0.58]}
        position={[0, -height / 2 + (ribHeight * 0.58) / 2, 0]}
        rotation={[0, diagonalAngle, 0]}
        radius={Math.min(0.025, ribWidth * 0.18)}
        smoothness={1}
        castShadow
      >
        <MetalMaterial dark={dark} />
      </RoundedBox>

      {[
        { x: -width * 0.27, z: depth * 0.08 },
        { x: width * 0.08, z: -depth * 0.27 },
      ].map((position, index) => (
        <mesh
          key={`${position.x}-${position.z}`}
          name={`${part.id}-mounting-hole-${index + 1}`}
          position={[
            position.x,
            -height / 2 + plateThickness + 0.007,
            position.z,
          ]}
        >
          <cylinderGeometry args={[holeRadius, holeRadius, 0.014, 18]} />
          <meshStandardMaterial
            color={CABINET_COLORS.darkMetal}
            roughness={0.62}
            metalness={0.48}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Unknown hardware remains neutral instead of accidentally looking like a slide. */
function GenericHardwareBlock({ part }: { part: PartLayout }) {
  const { x, y, z } = part.dimensions

  return (
    <RoundedBox
      name={`${part.id}-generic-hardware`}
      args={[Math.max(0.02, x), Math.max(0.02, y), Math.max(0.02, z)]}
      radius={Math.min(
        CABINET_RENDERING.metalBevelRadius,
        Math.max(0.004, Math.min(x, y, z) * 0.16),
      )}
      smoothness={1}
      castShadow
      receiveShadow
    >
      <MetalMaterial dark={part.material === 'dark-metal'} />
    </RoundedBox>
  )
}

function SlideChannel({ part }: { part: PartLayout }) {
  const { x, y, z } = part.dimensions
  const id = part.id.toLowerCase()
  const sideSign = stringPartMetadata(part, 'side') === 'right' ? -1 : 1
  const isInner = id.includes('inner')
  const isMiddle = id.includes('middle')
  const holePositions = [-0.32, 0, 0.32]

  return (
    <group name={`${part.id}-telescoping-channel`}>
      <RoundedBox
        name={`${part.id}-channel-web`}
        args={[Math.max(0.04, x * 0.38), y, z]}
        position={[sideSign * x * 0.22, 0, 0]}
        radius={Math.min(CABINET_RENDERING.metalBevelRadius, x * 0.09)}
        smoothness={1}
        castShadow
        receiveShadow
      >
        <MetalMaterial dark={part.material === 'dark-metal'} />
      </RoundedBox>
      <RoundedBox
        name={`${part.id}-upper-flange`}
        args={[x, Math.max(0.035, y * 0.19), Math.max(0.08, z * 0.985)]}
        position={[0, y * 0.39, 0]}
        radius={Math.min(0.018, y * 0.06)}
        smoothness={1}
        castShadow
      >
        <MetalMaterial dark={part.material === 'dark-metal'} />
      </RoundedBox>
      <RoundedBox
        name={`${part.id}-lower-flange`}
        args={[x, Math.max(0.035, y * 0.19), Math.max(0.08, z * 0.985)]}
        position={[0, -y * 0.39, 0]}
        radius={Math.min(0.018, y * 0.06)}
        smoothness={1}
        castShadow
      >
        <MetalMaterial dark={part.material === 'dark-metal'} />
      </RoundedBox>
      {holePositions.map((fraction) => (
        <mesh
          key={fraction}
          name={`${part.id}-mounting-hole`}
          position={[0, y / 2 + 0.007, fraction * z]}
        >
          <cylinderGeometry
            args={[
              Math.min(0.11, x * 0.24),
              Math.min(0.11, x * 0.24),
              0.018,
              14,
            ]}
          />
          <meshStandardMaterial
            color={CABINET_COLORS.darkMetal}
            roughness={0.55}
            metalness={0.6}
          />
        </mesh>
      ))}
      {(isInner || isMiddle) && (
        <group name={`${part.id}-bearing-cage`}>
          {[-0.34, -0.17, 0, 0.17, 0.34].map((fraction) => (
            <mesh
              key={fraction}
              position={[-sideSign * x * 0.34, 0, fraction * z]}
              castShadow
            >
              <sphereGeometry args={[Math.min(0.075, x * 0.14), 10, 7]} />
              <meshStandardMaterial
                color={CABINET_COLORS.metalHighlight}
                roughness={0.18}
                metalness={0.95}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

function SoftCloseHousing({ part }: { part: PartLayout }) {
  const { x, y, z } = part.dimensions
  const rodLength = Math.max(0.12, z * 0.44)

  return (
    <group name={`${part.id}-soft-close-mechanism`}>
      <RoundedBox
        name={`${part.id}-damper-housing`}
        args={[x, y, Math.max(0.08, z * 0.72)]}
        position={[0, 0, -z * 0.14]}
        radius={Math.min(0.08, Math.min(x, y) * 0.18)}
        smoothness={2}
        castShadow
      >
        <meshStandardMaterial
          color={CABINET_COLORS.softClose}
          roughness={0.5}
          metalness={0.28}
        />
      </RoundedBox>
      <mesh
        name={`${part.id}-damper-piston`}
        position={[0, 0, z * 0.28]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry
          args={[
            Math.max(0.025, Math.min(x, y) * 0.09),
            Math.max(0.025, Math.min(x, y) * 0.09),
            rodLength,
            12,
          ]}
        />
        <meshStandardMaterial
          color={CABINET_COLORS.metalHighlight}
          roughness={0.22}
          metalness={0.92}
        />
      </mesh>
      <RoundedBox
        name={`${part.id}-release-latch`}
        args={[
          Math.max(0.08, x * 0.7),
          Math.max(0.04, y * 0.16),
          Math.max(0.1, z * 0.16),
        ]}
        position={[0, -y * 0.48, z * 0.26]}
        radius={0.018}
        smoothness={1}
      >
        <meshStandardMaterial
          color={CABINET_COLORS.slideLatch}
          roughness={0.58}
        />
      </RoundedBox>
    </group>
  )
}

function HingeCup({ part }: { part: PartLayout }) {
  const radius =
    numericPartMetadata(part, 'radius') ??
    Math.max(0.18, Math.min(part.dimensions.x, part.dimensions.y) / 2)
  const depth = Math.max(0.08, part.dimensions.z)

  return (
    <group name={`${part.id}-concealed-cup`}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 0.91, depth, 28]} />
        <MetalMaterial />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.008]}>
        <torusGeometry args={[radius * 0.77, radius * 0.12, 8, 28]} />
        <meshStandardMaterial
          color={CABINET_COLORS.metalHighlight}
          roughness={0.26}
          metalness={0.9}
        />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.015]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.57, radius * 0.57, 0.018, 24]} />
        <meshStandardMaterial
          color={CABINET_COLORS.darkMetal}
          roughness={0.54}
          metalness={0.6}
        />
      </mesh>
    </group>
  )
}

function HingeArm({ part }: { part: PartLayout }) {
  const { x, y, z } = part.dimensions

  return (
    <group name={`${part.id}-articulated-arm`}>
      <RoundedBox
        args={[x, Math.max(0.08, y * 0.68), z]}
        radius={Math.min(0.09, Math.min(x, y) * 0.18)}
        smoothness={2}
        castShadow
      >
        <MetalMaterial />
      </RoundedBox>
      <mesh
        name={`${part.id}-pivot`}
        position={[0, 0, z * 0.28]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry
          args={[
            Math.max(0.08, Math.min(x, y) * 0.22),
            Math.max(0.08, Math.min(x, y) * 0.22),
            Math.max(0.08, x * 0.86),
            18,
          ]}
        />
        <meshStandardMaterial
          color={CABINET_COLORS.metalHighlight}
          roughness={0.2}
          metalness={0.94}
        />
      </mesh>
      <mesh name={`${part.id}-adjustment-cam`} position={[0, y * 0.36, -z * 0.12]}>
        <cylinderGeometry
          args={[
            Math.max(0.08, Math.min(x, z) * 0.18),
            Math.max(0.08, Math.min(x, z) * 0.18),
            Math.max(0.035, y * 0.12),
            18,
          ]}
        />
        <meshStandardMaterial
          color={CABINET_COLORS.darkMetal}
          roughness={0.38}
          metalness={0.76}
        />
      </mesh>
    </group>
  )
}

function HingePlate({ part }: { part: PartLayout }) {
  const { x, y, z } = part.dimensions
  // The calculated plate is thin on local Y, then rotated into the side-panel
  // plane. Keep the visible adjustment slots on that thin mounting face.
  const slotOffset = x * 0.27

  return (
    <group name={`${part.id}-mounting-plate`}>
      <RoundedBox
        args={[x, y, z]}
        radius={Math.min(0.06, Math.min(x, y, z) * 0.18)}
        smoothness={1}
        castShadow
      >
        <MetalMaterial />
      </RoundedBox>
      {[-slotOffset, slotOffset].map((offset) => (
        <RoundedBox
          key={offset}
          name={`${part.id}-elongated-slot`}
          args={[
            Math.max(0.08, x * 0.17),
            Math.max(0.012, y * 0.08),
            Math.max(0.12, z * 0.3),
          ]}
          position={[offset, y / 2 + 0.008, 0]}
          radius={Math.min(0.012, x * 0.035, y * 0.03)}
          smoothness={1}
        >
          <meshStandardMaterial
            color={CABINET_COLORS.darkMetal}
            roughness={0.48}
            metalness={0.65}
          />
        </RoundedBox>
      ))}
    </group>
  )
}

function HardwareGeometry({ part }: { part: PartLayout }) {
  const id = part.id.toLowerCase()
  const hardwareType = stringPartMetadata(part, 'hardwareType')

  // Fastener IDs often inherit their parent hardware name (for example,
  // "hingeUpperCupScrewA"), so kind-based screw dispatch must come first.
  if (part.kind === 'screw' || id.includes('screw')) {
    // Hinge-plate fasteners use a layout rotation for their presentation plane;
    // this local quarter-turn keeps the actual shaft normal to the side panel.
    const correction = id.includes('hinge') ? -Math.PI / 2 : 0
    return (
      <group rotation={[0, 0, correction]}>
        <ScrewGeometry dimensions={part.dimensions} name={part.id} />
      </group>
    )
  }
  if (hardwareType === 'top-corner-brace') {
    return <TopCornerBrace part={part} />
  }
  if (id.includes('slide') && id.includes('softclose')) {
    return <SoftCloseHousing part={part} />
  }
  if (
    id.includes('slide') &&
    (id.includes('outer') || id.includes('middle') || id.includes('inner'))
  ) {
    return <SlideChannel part={part} />
  }
  if (id.includes('hinge') && id.includes('cup')) {
    return <HingeCup part={part} />
  }
  if (id.includes('hinge') && id.includes('arm')) {
    return <HingeArm part={part} />
  }
  if (id.includes('hinge') && id.includes('plate')) {
    return <HingePlate part={part} />
  }
  if (part.kind === 'cylinder') {
    return (
      <GenericCylinder
        dimensions={part.dimensions}
        name={part.id}
        material={part.material}
        radius={numericPartMetadata(part, 'radius')}
        segments={numericPartMetadata(part, 'segments')}
      />
    )
  }

  return <GenericHardwareBlock part={part} />
}

/**
 * Each calculated rail, damper, hinge cup, arm, plate, and fastener remains a
 * separately named scene-graph part with its own exploded transform.
 */
export function Hardware({ parts, exploded }: CabinetSubassemblyProps) {
  return (
    <group name="cabinet-hardware">
      {parts.map((part) => (
        <AnimatedPart key={part.id} part={part} exploded={exploded}>
          <HardwareGeometry part={part} />
        </AnimatedPart>
      ))}
    </group>
  )
}

export default Hardware
