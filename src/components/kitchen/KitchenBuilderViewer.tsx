import { Edges, Grid, Html, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

import {
  calculateCatalogCabinetLayout,
  getCabinetCatalogEntry,
  type CabinetLayout,
} from '../../model'
import {
  calculateCabinetWorldTransform,
  type KitchenProject,
  type PlacedCabinet,
  type RoomDimensions,
} from '../../kitchen'
import { CabinetModel } from '../CabinetModel'

export type KitchenCameraPreset = 'perspective' | 'front' | 'top'

interface KitchenBuilderViewerProps {
  project: KitchenProject
  selectedCabinetId: string | null
  cameraPreset: KitchenCameraPreset
  cameraReset: number
  onSelectCabinet: (cabinetId: string | null) => void
}

interface OrbitControlLike {
  target: THREE.Vector3
  update: () => void
}

const cabinetLayout = (cabinet: PlacedCabinet): CabinetLayout =>
  calculateCatalogCabinetLayout(
    cabinet.cabinetType,
    cabinet.parameters,
    cabinet.wallOptions,
  )

function KitchenRoom({ room }: { room: RoomDimensions }) {
  const gridSize = Math.max(room.width, room.depth)
  const wallMaterial = (
    <meshStandardMaterial
      color="#e5e1da"
      roughness={0.92}
      metalness={0}
      transparent
      opacity={0.48}
      depthWrite={false}
    />
  )

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
        {wallMaterial}
        <Edges color="#b8aea2" threshold={15} />
      </mesh>

      <mesh
        name="left-wall"
        position={[-room.width / 2 - 0.3, room.height / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[0.6, room.height, room.depth]} />
        {wallMaterial}
        <Edges color="#b8aea2" threshold={15} />
      </mesh>

      <mesh
        name="right-wall"
        position={[room.width / 2 + 0.3, room.height / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[0.6, room.height, room.depth]} />
        <meshStandardMaterial
          color="#e5e1da"
          roughness={0.92}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
        <Edges color="#c8c0b6" threshold={15} />
      </mesh>
    </group>
  )
}

function CameraRig({
  room,
  preset,
  reset,
}: {
  room: RoomDimensions
  preset: KitchenCameraPreset
  reset: number
}) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as OrbitControlLike | null
  const { width: viewportWidth } = useThree((state) => state.size)

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return

    const longest = Math.max(room.width, room.depth, room.height)
    const target =
      preset === 'top'
        ? new THREE.Vector3(
            -room.width * 0.16,
            0,
            -room.depth * 0.18,
          )
        : new THREE.Vector3(0, room.height * 0.44, -room.depth * 0.1)
    let position: THREE.Vector3

    if (preset === 'top') {
      position = new THREE.Vector3(
        target.x,
        longest * 1.58,
        target.z + 0.01,
      )
    } else if (preset === 'front') {
      position = new THREE.Vector3(
        0,
        room.height * 0.55,
        room.depth / 2 + longest * 1.02,
      )
    } else {
      const mobileScale = viewportWidth <= 760 ? 1.15 : 1
      position = new THREE.Vector3(
        room.width * 0.86 * mobileScale,
        room.height * 1.06 * mobileScale,
        room.depth * 0.98 * mobileScale,
      )
    }

    camera.position.copy(position)
    camera.near = 0.1
    camera.far = Math.max(1200, longest * 8)
    camera.updateProjectionMatrix()
    camera.lookAt(target)
    controls?.target.copy(target)
    controls?.update()
  }, [camera, controls, preset, reset, room, viewportWidth])

  return null
}

function PlacedCabinetModel({
  cabinet,
  room,
  selected,
  onSelect,
}: {
  cabinet: PlacedCabinet
  room: RoomDimensions
  selected: boolean
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const layout = useMemo(() => cabinetLayout(cabinet), [cabinet])
  const transform = calculateCabinetWorldTransform(room, cabinet)

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
      onPointerDown={(event) => {
        event.stopPropagation()
        onSelect()
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
      {(selected || hovered) && (
        <mesh name={`${cabinet.id}-selection`}>
          <boxGeometry
            args={[
              cabinet.parameters.width + 1.5,
              cabinet.parameters.height + 1.5,
              cabinet.parameters.depth + 1.5,
            ]}
          />
          <meshBasicMaterial
            color={selected ? '#a36f39' : '#c69a68'}
            transparent
            opacity={selected ? 0.08 : 0.035}
            depthWrite={false}
          />
          <Edges
            color={selected ? '#8b5d30' : '#b98a58'}
            threshold={15}
          />
        </mesh>
      )}

      {selected && (
        <Html
          center
          position={[0, cabinet.parameters.height / 2 + 5, 0]}
          className="kitchen-cabinet-label-anchor"
          distanceFactor={110}
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
  onSelectCabinet,
}: KitchenBuilderViewerProps) {
  const longest = Math.max(
    project.room.width,
    project.room.depth,
    project.room.height,
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

      <KitchenRoom room={project.room} />
      {project.cabinets.map((cabinet) => (
        <PlacedCabinetModel
          key={cabinet.id}
          cabinet={cabinet}
          room={project.room}
          selected={cabinet.id === selectedCabinetId}
          onSelect={() => onSelectCabinet(cabinet.id)}
        />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={24}
        maxDistance={longest * 3.1}
        minPolarAngle={0.015}
        maxPolarAngle={Math.PI / 2.02}
        rotateSpeed={0.68}
        zoomSpeed={0.82}
        panSpeed={0.72}
        screenSpacePanning
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />
      <CameraRig
        room={project.room}
        preset={cameraPreset}
        reset={cameraReset}
      />
    </>
  )
}

export function KitchenBuilderViewer(props: KitchenBuilderViewerProps) {
  return (
    <div
      className="kitchen-viewer-canvas"
      role="img"
      aria-label="Interactive 3D kitchen room. Select cabinets in the room or use the placed cabinet list."
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
