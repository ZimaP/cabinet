import { Edges, Grid, Html, Line, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as THREE from 'three'

import {
  calculateCatalogCabinetLayout,
  getCabinetCatalogEntry,
  type CabinetLayout,
} from '../../model'
import {
  calculateCabinetRoomBounds,
  calculateCabinetWorldTransform,
  type KitchenProject,
  type KitchenWall,
  type PlacedCabinet,
  type RoomDimensions,
} from '../../kitchen'
import {
  calculateCabinetFocusPose,
  calculateKitchenCameraPose,
  type KitchenCameraPose,
  type KitchenCameraPreset,
} from '../../kitchen/camera'
import { CabinetModel } from '../CabinetModel'
import { KitchenDimensionOverlay } from './KitchenDimensionOverlay'

export type { KitchenCameraPreset } from '../../kitchen/camera'

interface KitchenBuilderViewerProps {
  project: KitchenProject
  selectedCabinetId: string | null
  activeWall: KitchenWall
  cameraPreset: KitchenCameraPreset
  cameraReset: number
  focusReset: number
  compactPanelOpen: boolean
  showDimensions: boolean
  invalidCabinetIds: readonly string[]
  onSelectCabinet: (cabinetId: string | null) => void
  onFocusCabinet: (cabinetId: string) => void
}

interface OrbitControlLike {
  target: THREE.Vector3
  update: () => void
  addEventListener?: (type: 'start', listener: () => void) => void
  removeEventListener?: (type: 'start', listener: () => void) => void
}

type Point3 = [number, number, number]

interface CameraTransition {
  elapsed: number
  duration: number
  fromPosition: THREE.Vector3
  fromTarget: THREE.Vector3
  fromUp: THREE.Vector3
  toPosition: THREE.Vector3
  toTarget: THREE.Vector3
  toUp: THREE.Vector3
}

const cabinetLayout = (cabinet: PlacedCabinet): CabinetLayout =>
  calculateCatalogCabinetLayout(
    cabinet.cabinetType,
    cabinet.parameters,
    cabinet.wallOptions,
  )

const toVector3 = ({
  x,
  y,
  z,
}: Readonly<{ x: number; y: number; z: number }>): THREE.Vector3 =>
  new THREE.Vector3(x, y, z)

const easeInOutCubic = (progress: number): number =>
  progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2

const scaleVerticalFov = (fov: number, ratio: number): number =>
  (Math.atan(Math.tan((fov * Math.PI) / 360) * ratio) * 360) /
  Math.PI

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return
    }

    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setReducedMotion(query.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return reducedMotion
}

function KitchenRoom({
  room,
  activeWall,
  preset,
}: {
  room: RoomDimensions
  activeWall: KitchenWall
  preset: KitchenCameraPreset
}) {
  const gridSize = Math.max(room.width, room.depth)
  const occludingWall =
    preset === 'front'
      ? activeWall === 'left'
        ? 'right'
        : activeWall === 'right'
          ? 'left'
          : null
      : null
  const wallAppearance = (wall: KitchenWall) => {
    const active = wall === activeWall
    const isRightWall = wall === 'right'

    return {
      color: active ? '#a5b6ac' : '#b1bbb5',
      edgeColor: active ? '#667d70' : '#87968d',
      opacity:
        wall === occludingWall
          ? 0.04
          : isRightWall
            ? active
              ? 0.46
              : 0.22
            : active
              ? 0.82
              : 0.68,
    }
  }
  const backAppearance = wallAppearance('back')
  const leftAppearance = wallAppearance('left')
  const rightAppearance = wallAppearance('right')

  return (
    <group name="kitchen-room">
      <mesh
        name="floor"
        position={[0, -0.35, 0]}
        receiveShadow
      >
        <boxGeometry args={[room.width, 0.7, room.depth]} />
        <meshStandardMaterial
          color="#d9d2c8"
          roughness={0.96}
          metalness={0}
        />
        <Edges color="#a79b8d" threshold={12} />
      </mesh>

      <Grid
        args={[room.width, room.depth]}
        position={[0, 0.025, 0]}
        cellSize={3}
        cellThickness={0.32}
        cellColor="#c9bfb2"
        sectionSize={12}
        sectionThickness={0.75}
        sectionColor="#a99b8a"
        fadeDistance={gridSize * 1.25}
        fadeStrength={1}
        infiniteGrid={false}
      />

      <mesh
        name="back-wall"
        position={[0, room.height / 2, -room.depth / 2 - 0.3]}
        receiveShadow
      >
        <boxGeometry args={[room.width, room.height, 0.6]} />
        <meshStandardMaterial
          color={backAppearance.color}
          roughness={0.96}
          metalness={0}
          transparent
          opacity={backAppearance.opacity}
          depthWrite={false}
        />
        <Edges color={backAppearance.edgeColor} threshold={15} />
      </mesh>

      <mesh
        name="left-wall"
        position={[-room.width / 2 - 0.3, room.height / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[0.6, room.height, room.depth]} />
        <meshStandardMaterial
          color={leftAppearance.color}
          roughness={0.96}
          metalness={0}
          transparent
          opacity={leftAppearance.opacity}
          depthWrite={false}
        />
        <Edges color={leftAppearance.edgeColor} threshold={15} />
      </mesh>

      <mesh
        name="right-wall"
        position={[room.width / 2 + 0.3, room.height / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[0.6, room.height, room.depth]} />
        <meshStandardMaterial
          color={rightAppearance.color}
          roughness={0.96}
          metalness={0}
          transparent
          opacity={rightAppearance.opacity}
          depthWrite={false}
        />
        <Edges color={rightAppearance.edgeColor} threshold={15} />
      </mesh>
    </group>
  )
}

function CameraRig({
  room,
  preset,
  reset,
  activeWall,
  focusReset,
  compactPanelOpen,
  selectedCabinet,
}: {
  room: RoomDimensions
  preset: KitchenCameraPreset
  reset: number
  activeWall: KitchenWall
  focusReset: number
  compactPanelOpen: boolean
  selectedCabinet: PlacedCabinet | undefined
}) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as OrbitControlLike | null
  const { width: viewportWidth, height: viewportHeight } = useThree(
    (state) => state.size,
  )
  const framingWidth =
    viewportWidth > 1060
      ? Math.max(320, viewportWidth - 700)
      : viewportWidth > 900
        ? Math.max(280, viewportWidth - 610)
        : Math.max(280, viewportWidth - 20)
  const compactPanelFraming =
    compactPanelOpen && viewportWidth <= 900
  const framingHeightRatio = compactPanelFraming
    ? viewportHeight <= 520
      ? 0.46
      : 0.54
    : 1
  const reducedMotion = usePrefersReducedMotion()
  const transition = useRef<CameraTransition | null>(null)
  const previousFocusReset = useRef(focusReset)
  const presetWall = preset === 'front' ? activeWall : 'back'

  const applyPose = useCallback(
    (pose: KitchenCameraPose) => {
      const target = toVector3(pose.target)
      camera.position.copy(toVector3(pose.position))
      camera.up.copy(toVector3(pose.up)).normalize()
      camera.lookAt(target)
      controls?.target.copy(target)
      controls?.update()
    },
    [camera, controls],
  )

  const moveToPose = useCallback(
    (pose: KitchenCameraPose) => {
      const currentTarget =
        controls?.target.clone() ??
        camera.position
          .clone()
          .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(100))

      if (reducedMotion) {
        transition.current = null
        applyPose(pose)
        return
      }

      transition.current = {
        elapsed: 0,
        duration: 0.46,
        fromPosition: camera.position.clone(),
        fromTarget: currentTarget,
        fromUp: camera.up.clone().normalize(),
        toPosition: toVector3(pose.position),
        toTarget: toVector3(pose.target),
        toUp: toVector3(pose.up).normalize(),
      }
    },
    [applyPose, camera, controls, reducedMotion],
  )

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return

    const longest = Math.max(room.width, room.depth, room.height)

    camera.near = 0.1
    camera.far = Math.max(2400, longest * 12)
    camera.updateProjectionMatrix()
    if (compactPanelFraming) {
      camera.setViewOffset(
        Math.round(viewportWidth),
        Math.round(viewportHeight),
        0,
        Math.round(viewportHeight * 0.14),
        Math.round(viewportWidth),
        Math.round(viewportHeight),
      )
    } else {
      camera.clearViewOffset()
    }

    moveToPose(
      calculateKitchenCameraPose({
        room,
        preset,
        activeWall: presetWall,
        viewportWidth: framingWidth,
        viewportHeight,
        verticalFov: scaleVerticalFov(
          camera.fov,
          framingHeightRatio,
        ),
      }),
    )
  }, [
    camera,
    compactPanelFraming,
    framingWidth,
    framingHeightRatio,
    moveToPose,
    preset,
    presetWall,
    reset,
    room,
    viewportHeight,
    viewportWidth,
  ])

  useEffect(() => {
    if (focusReset === previousFocusReset.current) return
    previousFocusReset.current = focusReset
    if (!selectedCabinet) return

    const currentTarget =
      controls?.target.clone() ??
      camera.position
        .clone()
        .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(100))

    moveToPose(
      calculateCabinetFocusPose({
        bounds: calculateCabinetRoomBounds(room, selectedCabinet),
        currentPosition: camera.position,
        currentTarget,
        currentUp: camera.up,
        wall: selectedCabinet.placement.wall,
        viewportWidth: framingWidth,
        viewportHeight,
        verticalFov:
          camera instanceof THREE.PerspectiveCamera
            ? scaleVerticalFov(
                camera.fov,
                framingHeightRatio,
              )
            : 40,
      }),
    )
  }, [
    camera,
    controls,
    focusReset,
    framingWidth,
    framingHeightRatio,
    moveToPose,
    room,
    selectedCabinet,
    viewportHeight,
  ])

  useEffect(() => {
    if (!controls?.addEventListener || !controls.removeEventListener) return

    const cancelTransition = () => {
      transition.current = null
    }
    controls.addEventListener('start', cancelTransition)
    return () => controls.removeEventListener?.('start', cancelTransition)
  }, [controls])

  useFrame((_, delta) => {
    const activeTransition = transition.current
    if (!activeTransition) return

    activeTransition.elapsed += Math.min(delta, 0.05)
    const progress = Math.min(
      1,
      activeTransition.elapsed / activeTransition.duration,
    )
    const easedProgress = easeInOutCubic(progress)
    const target = activeTransition.fromTarget
      .clone()
      .lerp(activeTransition.toTarget, easedProgress)

    camera.position
      .copy(activeTransition.fromPosition)
      .lerp(activeTransition.toPosition, easedProgress)
    camera.up
      .copy(activeTransition.fromUp)
      .lerp(activeTransition.toUp, easedProgress)
      .normalize()
    camera.lookAt(target)
    controls?.target.copy(target)
    controls?.update()

    if (progress === 1) {
      transition.current = null
    }
  })

  return null
}

function KitchenCabinetBoundaries({
  project,
}: {
  project: KitchenProject
}) {
  const viewportWidth = useThree((state) => state.size.width)
  const points = useMemo<Point3[]>(() => {
    const yAxis = new THREE.Vector3(0, 1, 0)

    return project.cabinets.flatMap((cabinet) => {
      const { width, height, depth } = cabinet.parameters
      const transform = calculateCabinetWorldTransform(project.room, cabinet)
      const worldPosition = new THREE.Vector3(
        transform.position.x,
        transform.position.y,
        transform.position.z,
      )
      const frontZ = depth / 2 + 0.9
      const bottomY = -height / 2 + (cabinet.placement.elevation === 0 ? 0.12 : 0)
      const topY = height / 2

      const toWorldPoint = (point: Point3): Point3 => {
        const worldPoint = new THREE.Vector3(...point)
          .applyAxisAngle(yAxis, transform.rotationY)
          .add(worldPosition)
        return [worldPoint.x, worldPoint.y, worldPoint.z]
      }

      const lowerLeft = toWorldPoint([-width / 2, bottomY, frontZ])
      const lowerRight = toWorldPoint([width / 2, bottomY, frontZ])
      const upperRight = toWorldPoint([width / 2, topY, frontZ])
      const upperLeft = toWorldPoint([-width / 2, topY, frontZ])

      return [
        lowerLeft,
        lowerRight,
        lowerRight,
        upperRight,
        upperRight,
        upperLeft,
        upperLeft,
        lowerLeft,
      ]
    })
  }, [project])

  if (points.length === 0) return null

  return (
    <Line
      name="kitchen-cabinet-boundaries"
      points={points}
      segments
      color="#707a75"
      lineWidth={viewportWidth <= 900 ? 1.15 : 0.95}
      depthTest
      depthWrite={false}
      renderOrder={40}
      raycast={() => undefined}
    />
  )
}

function PlacedCabinetModel({
  cabinet,
  room,
  selected,
  invalid,
  onSelect,
  onFocus,
}: {
  cabinet: PlacedCabinet
  room: RoomDimensions
  selected: boolean
  invalid: boolean
  onSelect: () => void
  onFocus: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const layout = useMemo(() => cabinetLayout(cabinet), [cabinet])
  const transform = calculateCabinetWorldTransform(room, cabinet)
  const emphasized = invalid || selected || hovered
  const highlightColor = invalid
    ? '#bd493f'
    : selected
      ? '#a36f39'
      : '#c69a68'
  const edgeColor = invalid
    ? '#a62f29'
    : selected
      ? '#8b5d30'
      : '#b98a58'

  useEffect(() => {
    if (!hovered) return
    const previousCursor = document.body.style.cursor
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = previousCursor
    }
  }, [hovered])

  return (
    <group
      name={`placed-${cabinet.id}`}
      position={[
        transform.position.x,
        transform.position.y,
        transform.position.z,
      ]}
      rotation={[0, transform.rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onSelect()
        onFocus()
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      userData={{
        placedCabinetId: cabinet.id,
        cabinetType: cabinet.cabinetType,
      }}
    >
      {emphasized && (
        <mesh name={`${cabinet.id}-selection`}>
          <boxGeometry
            args={[
              cabinet.parameters.width + 1.5,
              cabinet.parameters.height + 1.5,
              cabinet.parameters.depth + 1.5,
            ]}
          />
          <meshBasicMaterial
            color={highlightColor}
            transparent
            opacity={invalid ? 0.115 : selected ? 0.08 : 0.035}
            depthWrite={false}
          />
          <Edges color={edgeColor} threshold={15} />
        </mesh>
      )}

      {selected && (
        <Html
          center
          position={[0, cabinet.parameters.height / 2 + 5, 0]}
          className="kitchen-cabinet-label-anchor"
          distanceFactor={110}
          zIndexRange={[4, 4]}
        >
          <span className="kitchen-cabinet-label">
            {getCabinetCatalogEntry(cabinet.cabinetType).shortLabel}
          </span>
        </Html>
      )}

      <group position={[0, -cabinet.parameters.height / 2, 0]}>
        <CabinetModel
          layout={layout}
          exploded={0}
          dimensionsMode={false}
          detailLevel="room"
        />
      </group>
    </group>
  )
}

function KitchenScene({
  project,
  selectedCabinetId,
  cameraPreset,
  cameraReset,
  focusReset,
  compactPanelOpen,
  showDimensions,
  activeWall,
  invalidCabinetIds,
  onSelectCabinet,
  onFocusCabinet,
}: KitchenBuilderViewerProps) {
  const longest = Math.max(
    project.room.width,
    project.room.depth,
    project.room.height,
  )
  const invalidIds = useMemo(
    () => new Set(invalidCabinetIds),
    [invalidCabinetIds],
  )
  const selectedCabinet = useMemo(
    () =>
      project.cabinets.find(
        (cabinet) => cabinet.id === selectedCabinetId,
      ),
    [project.cabinets, selectedCabinetId],
  )

  return (
    <>
      <color attach="background" args={['#e8ebe7']} />
      <fog attach="fog" args={['#e8ebe7', longest * 1.45, longest * 4.5]} />
      <hemisphereLight args={['#fffef9', '#909994', 1.45]} />
      <ambientLight intensity={0.62} />
      <directionalLight
        castShadow
        position={[project.room.width * 0.25, project.room.height * 1.35, 70]}
        intensity={2.05}
        color="#fff9ed"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={700}
        shadow-camera-left={-220}
        shadow-camera-right={220}
        shadow-camera-top={220}
        shadow-camera-bottom={-220}
        shadow-bias={-0.00018}
      />
      <directionalLight
        position={[-80, 70, -50]}
        intensity={0.58}
        color="#d8e9ef"
      />

      <KitchenRoom
        room={project.room}
        activeWall={activeWall}
        preset={cameraPreset}
      />
      {project.cabinets.map((cabinet) => (
        <PlacedCabinetModel
          key={cabinet.id}
          cabinet={cabinet}
          room={project.room}
          selected={cabinet.id === selectedCabinetId}
          invalid={invalidIds.has(cabinet.id)}
          onSelect={() => onSelectCabinet(cabinet.id)}
          onFocus={() => onFocusCabinet(cabinet.id)}
        />
      ))}
      <KitchenCabinetBoundaries project={project} />
      {showDimensions && <KitchenDimensionOverlay project={project} />}

      <OrbitControls
        makeDefault
        enableDamping
        enableRotate={cameraPreset !== 'top'}
        dampingFactor={0.08}
        minDistance={24}
        maxDistance={longest * 8}
        minPolarAngle={cameraPreset === 'top' ? 0 : 0.015}
        maxPolarAngle={Math.PI / 2.02}
        rotateSpeed={0.68}
        zoomSpeed={0.82}
        panSpeed={0.72}
        screenSpacePanning
        touches={{
          ONE:
            cameraPreset === 'top'
              ? THREE.TOUCH.PAN
              : THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />
      <CameraRig
        room={project.room}
        preset={cameraPreset}
        reset={cameraReset}
        activeWall={activeWall}
        focusReset={focusReset}
        compactPanelOpen={compactPanelOpen}
        selectedCabinet={selectedCabinet}
      />
    </>
  )
}

export function KitchenBuilderViewer(props: KitchenBuilderViewerProps) {
  return (
    <div
      id="kitchen-3d-view"
      className="kitchen-viewer-canvas"
      role="region"
      aria-label={`Interactive 3D kitchen room${
        props.showDimensions
          ? ' with room, cabinet, and run dimensions shown'
          : ''
      }. Select cabinets in the room or use the placed cabinet list.`}
      aria-describedby="kitchen-view-instructions"
    >
      <Canvas
        shadows="percentage"
        dpr={[1, 1.55]}
        camera={{ position: [110, 95, 120], fov: 40, near: 0.1, far: 1600 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onPointerMissed={() => props.onSelectCabinet(null)}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = 'none'
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.03
        }}
      >
        <KitchenScene {...props} />
      </Canvas>
    </div>
  )
}

export default KitchenBuilderViewer
