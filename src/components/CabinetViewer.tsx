import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CabinetModel } from './CabinetModel'
import type { CabinetLayout } from '../model'

interface CabinetViewerProps {
  layout: CabinetLayout
  exploded: number
  dimensionsMode: boolean
  cameraReset: number
  onExplodedChange: (value: number) => void
}

interface CameraFramerProps {
  model: RefObject<THREE.Group | null>
  layout: CabinetLayout
  exploded: number
  dimensionsMode: boolean
  dimensionKey: string
  cameraReset: number
}

interface OrbitControlLike {
  target: THREE.Vector3
  update: () => void
}

const frameDirection = new THREE.Vector3(1.05, 0.48, 1.32).normalize()

function SoftGroundShadow({ layout }: { layout: CabinetLayout }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 192
    canvas.height = 192
    const context = canvas.getContext('2d')
    if (context) {
      const gradient = context.createRadialGradient(96, 96, 4, 96, 96, 92)
      gradient.addColorStop(0, 'rgba(40, 48, 44, 0.44)')
      gradient.addColorStop(0.38, 'rgba(40, 48, 44, 0.22)')
      gradient.addColorStop(0.78, 'rgba(40, 48, 44, 0.05)')
      gradient.addColorStop(1, 'rgba(40, 48, 44, 0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, 192, 192)
    }
    const result = new THREE.CanvasTexture(canvas)
    result.colorSpace = THREE.SRGBColorSpace
    return result
  }, [])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh
      name="soft-contact-shadow"
      position={[0, -0.035, 0.6]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[layout.parameters.width * 1.18, layout.parameters.depth * 1.1, 1]}
      renderOrder={-1}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.48}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function CameraFramer({
  model,
  layout,
  exploded,
  dimensionsMode,
  dimensionKey,
  cameraReset,
}: CameraFramerProps) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as OrbitControlLike | null
  const viewport = useThree((state) => state.size)

  useEffect(() => {
    let animationFrame = 0
    const timeout = window.setTimeout(() => {
      animationFrame = window.requestAnimationFrame(() => {
        if (!model.current || !(camera instanceof THREE.PerspectiveCamera)) {
          return
        }

        // Establish a valid cabinet-facing pose even before child geometry has
        // produced bounds (important on the first WebGL frame).
        const fallbackTarget = new THREE.Vector3(0, layout.parameters.height / 2, 0)
        camera.lookAt(fallbackTarget)
        if (controls) {
          controls.target.copy(fallbackTarget)
          controls.update()
        }

        const bounds = new THREE.Box3().setFromObject(model.current)
        if (bounds.isEmpty()) return

        const center = bounds.getCenter(new THREE.Vector3())
        const sphere = bounds.getBoundingSphere(new THREE.Sphere())
        const verticalFov = THREE.MathUtils.degToRad(camera.fov)
        const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
        const limitingFov = Math.min(verticalFov, horizontalFov)
        // The screen-space labels need a little more visual spread on phones.
        // Keep the established framing untouched whenever Dimensions is off.
        const mobileExplosionMargin = dimensionsMode ? 1.5 : 0.55
        const explosionMargin =
          exploded * (viewport.width <= 760 ? mobileExplosionMargin : 0.1)
        const distance =
          (sphere.radius / Math.sin(limitingFov / 2)) * (1.18 + explosionMargin)
        const target = center.clone()

        // On phones the controls occupy the lower portion of the viewport, so
        // aim slightly below the cabinet and leave the model visible above it.
        if (viewport.width <= 760) {
          const verticalSphereShare = dimensionsMode ? 0.56 : 0.38
          const verticalCabinetShare = dimensionsMode ? 0.3 : 0.18
          target.y -= Math.min(
            sphere.radius * verticalSphereShare,
            layout.parameters.height * verticalCabinetShare,
          )
        } else {
          target.x -= sphere.radius * 0.08
        }

        camera.position.copy(target).addScaledVector(frameDirection, distance)
        camera.near = Math.max(0.1, distance / 100)
        camera.far = Math.max(400, distance * 8)
        camera.updateProjectionMatrix()
        camera.lookAt(target)

        if (controls) {
          controls.target.copy(target)
          controls.update()
        }
      })
    }, 220)

    return () => {
      window.clearTimeout(timeout)
      window.cancelAnimationFrame(animationFrame)
    }
  }, [
    camera,
    controls,
    model,
    layout,
    exploded,
    dimensionsMode,
    dimensionKey,
    cameraReset,
    viewport.width,
  ])

  return null
}

function CabinetScene({
  layout,
  exploded,
  dimensionsMode,
  cameraReset,
}: Pick<
  CabinetViewerProps,
  'layout' | 'exploded' | 'dimensionsMode' | 'cameraReset'
>) {
  const model = useRef<THREE.Group>(null)

  return (
    <>
      <color attach="background" args={['#e9ece8']} />
      <hemisphereLight args={['#ffffff', '#a6aaa4', 1.75]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        castShadow
        position={[28, 54, 38]}
        intensity={2.5}
        color="#fffdf8"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={150}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-bias={-0.00018}
      />
      <directionalLight
        position={[-32, 24, -24]}
        intensity={0.75}
        color="#dbe8ee"
      />

      <group ref={model} key={layout.cabinetType}>
        <CabinetModel
          layout={layout}
          exploded={exploded}
          dimensionsMode={dimensionsMode}
        />
      </group>

      <SoftGroundShadow layout={layout} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.075}
        minDistance={15}
        maxDistance={
          260 *
          Math.max(
            1,
            layout.parameters.width / 24,
            layout.parameters.height / 34.5,
            layout.parameters.depth / 24,
          )
        }
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2.015}
        rotateSpeed={0.72}
        zoomSpeed={0.75}
        panSpeed={0.72}
        screenSpacePanning={false}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />
      <CameraFramer
        model={model}
        layout={layout}
        exploded={exploded}
        dimensionsMode={dimensionsMode}
        dimensionKey={`${layout.cabinetType}:${layout.parameters.width}:${layout.parameters.height}:${layout.parameters.depth}:${dimensionsMode}`}
        cameraReset={cameraReset}
      />
    </>
  )
}

export function CabinetViewer({
  layout,
  exploded,
  dimensionsMode,
  cameraReset,
  onExplodedChange,
}: CabinetViewerProps) {
  const canvasHost = useRef<HTMLDivElement>(null)
  const changeExploded = useRef(onExplodedChange)
  const explodedValue = useRef(exploded)

  useEffect(() => {
    changeExploded.current = onExplodedChange
  }, [onExplodedChange])

  useEffect(() => {
    explodedValue.current = exploded
  }, [exploded])

  useEffect(() => {
    const host = canvasHost.current
    if (!host) return

    const handleWheel = (event: WheelEvent) => {
      // A plain wheel gesture inspects the assembly. Holding a common modifier
      // leaves the event to OrbitControls so desktop users can still wheel-zoom.
      if (event.ctrlKey || event.metaKey || event.altKey) return

      event.preventDefault()
      event.stopPropagation()
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : 1
      const delta = event.deltaY * unit * 0.00125
      const next = Math.min(1, Math.max(0, explodedValue.current + delta))
      explodedValue.current = next
      changeExploded.current(next)
    }

    host.addEventListener('wheel', handleWheel, { passive: false, capture: true })
    return () =>
      host.removeEventListener('wheel', handleWheel, { capture: true })
  }, [])

  return (
    <div ref={canvasHost} className="viewer-canvas">
      <Canvas
        shadows="percentage"
        style={{ touchAction: 'none' }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [46, 38, 58], fov: 34, near: 0.1, far: 500 }}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = 'none'
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.02
        }}
      >
        <CabinetScene
          layout={layout}
          exploded={exploded}
          dimensionsMode={dimensionsMode}
          cameraReset={cameraReset}
        />
      </Canvas>
    </div>
  )
}
