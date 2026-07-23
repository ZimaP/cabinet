import { RoundedBox } from '@react-three/drei'

import type { PartLayout } from '../model'
import { PartTransform } from './model/AnimatedPart'
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

  return <SlideChannel part={part} />
}

/**
 * Each calculated rail, damper, hinge cup, arm, plate, and fastener remains a
 * separately named scene-graph part with its own exploded transform.
 */
export function Hardware({
  parts,
  exploded,
  staticParts,
}: CabinetSubassemblyProps) {
  return (
    <group name="cabinet-hardware">
      {parts.map((part) => (
        <PartTransform
          key={part.id}
          part={part}
          exploded={exploded}
          animate={!staticParts}
        >
          <HardwareGeometry part={part} />
        </PartTransform>
      ))}
    </group>
  )
}

export default Hardware
