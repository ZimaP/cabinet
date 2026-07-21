import { useFrame } from '@react-three/fiber'
import { type ReactNode, useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { PartLayout } from '../../model'

interface AnimatedPartProps {
  part: PartLayout
  exploded: number
  children: ReactNode
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smoothstep = (value: number) => value * value * (3 - 2 * value)

/**
 * Applies explosion on top of the calculated assembled transform. Geometry is
 * never scaled: a resize supplies new part dimensions and assembled positions.
 */
export function AnimatedPart({ part, exploded, children }: AnimatedPartProps) {
  const amount = smoothstep(clamp01(exploded))
  const targetPosition = useMemo(
    () =>
      new THREE.Vector3(
        part.position.x + part.explosion.translation.x * amount,
        part.position.y + part.explosion.translation.y * amount,
        part.position.z + part.explosion.translation.z * amount,
      ),
    [amount, part.explosion.translation, part.position],
  )
  const targetRotation = useMemo(
    () =>
      new THREE.Euler(
        part.rotation.x + part.explosion.rotation.x * amount,
        part.rotation.y + part.explosion.rotation.y * amount,
        part.rotation.z + part.explosion.rotation.z * amount,
        'XYZ',
      ),
    [amount, part.explosion.rotation, part.rotation],
  )
  const groupRef = useRef<THREE.Group>(null)
  // Keep the declarative transform stable after mount. If the target transform
  // were passed as a changing JSX prop, R3F would apply it immediately on each
  // slider event and bypass the damping below.
  const initialTransform = useRef({
    position: [targetPosition.x, targetPosition.y, targetPosition.z] as const,
    rotation: [targetRotation.x, targetRotation.y, targetRotation.z] as const,
  })

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const damping = 13
    group.position.x = THREE.MathUtils.damp(
      group.position.x,
      targetPosition.x,
      damping,
      delta,
    )
    group.position.y = THREE.MathUtils.damp(
      group.position.y,
      targetPosition.y,
      damping,
      delta,
    )
    group.position.z = THREE.MathUtils.damp(
      group.position.z,
      targetPosition.z,
      damping,
      delta,
    )
    group.rotation.x = THREE.MathUtils.damp(
      group.rotation.x,
      targetRotation.x,
      damping,
      delta,
    )
    group.rotation.y = THREE.MathUtils.damp(
      group.rotation.y,
      targetRotation.y,
      damping,
      delta,
    )
    group.rotation.z = THREE.MathUtils.damp(
      group.rotation.z,
      targetRotation.z,
      damping,
      delta,
    )
  })

  return (
    <group
      ref={groupRef}
      name={part.id}
      position={initialTransform.current.position}
      rotation={initialTransform.current.rotation}
      userData={{
        cabinetPartId: part.id,
        cabinetPartName: part.name,
        category: part.category,
        dimensionsInches: part.dimensions,
      }}
    >
      {children}
    </group>
  )
}
