import { Html, Line } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useMemo, type CSSProperties } from 'react'

import { formatInches } from '../../dimensions'
import {
  KITCHEN_WALLS,
  calculateCabinetRoomBounds,
  calculateCabinetRunDimensions,
  getCabinetRunLevel,
  type CabinetRunDimensions,
  type CabinetRunLevel,
  type KitchenProject,
  type KitchenWall,
  type PlacedCabinet,
} from '../../kitchen'

type Point3 = [number, number, number]
type DimensionKind = 'cabinet' | 'run' | 'room'

interface DimensionGeometry {
  segments: Point3[]
  labelPosition: Point3
}

interface DimensionIndicatorProps {
  id: string
  geometry: DimensionGeometry
  label: string
  accessibleLabel: string
  kind: DimensionKind
  compact: boolean
}

export interface KitchenDimensionOverlayProps {
  project: KitchenProject
  showCabinetWidths?: boolean
  showRunDimensions?: boolean
  showRoomDimensions?: boolean
}

const COLORS: Readonly<Record<DimensionKind, string>> = {
  cabinet: '#344b4d',
  run: '#945f2f',
  room: '#687b76',
}

const WALL_NAMES: Readonly<Record<KitchenWall, string>> = {
  back: 'Back wall',
  left: 'Left wall',
  right: 'Right wall',
}

const LEVEL_NAMES: Readonly<Record<CabinetRunLevel, string>> = {
  base: 'Base',
  wall: 'Upper',
}

const addPoint = (point: Point3, delta: Point3, scale: number): Point3 => [
  point[0] + delta[0] * scale,
  point[1] + delta[1] * scale,
  point[2] + delta[2] * scale,
]

const midpoint = (start: Point3, end: Point3): Point3 => [
  (start[0] + end[0]) / 2,
  (start[1] + end[1]) / 2,
  (start[2] + end[2]) / 2,
]

function createDimensionGeometry(
  start: Point3,
  end: Point3,
  referenceStart: Point3,
  referenceEnd: Point3,
  labelOffset: Point3,
  tickDirection: Point3 = [0, 1, 0],
  tickSize = 0.72,
): DimensionGeometry {
  const labelPosition = addPoint(midpoint(start, end), labelOffset, 1)
  return {
    labelPosition,
    segments: [
      start,
      end,
      referenceStart,
      start,
      referenceEnd,
      end,
      addPoint(start, tickDirection, -tickSize),
      addPoint(start, tickDirection, tickSize),
      addPoint(end, tickDirection, -tickSize),
      addPoint(end, tickDirection, tickSize),
    ],
  }
}

const labelStyle = (
  kind: DimensionKind,
  compact: boolean,
): CSSProperties => {
  const cabinetLabel = kind === 'cabinet'

  return {
    display: cabinetLabel || compact ? 'inline-flex' : 'grid',
    alignItems: 'center',
    justifyContent: 'center',
    justifyItems: 'center',
    gap: compact ? 0 : 1,
    minHeight: cabinetLabel ? 18 : compact ? 18 : 21,
    padding: cabinetLabel
      ? compact
        ? '1px 5px'
        : '2px 6px'
      : compact
        ? '1px 5px'
        : '3px 6px',
    border: `1px solid ${
      kind === 'room' ? 'rgba(103, 123, 118, 0.38)' : COLORS[kind]
    }`,
    borderRadius: cabinetLabel || compact ? 999 : 6,
    background:
      kind === 'run'
        ? 'rgba(255, 248, 238, 0.94)'
        : kind === 'room'
          ? 'rgba(239, 243, 240, 0.9)'
          : 'rgba(250, 252, 249, 0.9)',
    color: COLORS[kind],
    boxShadow: cabinetLabel
      ? '0 1px 3px rgba(28, 37, 34, 0.12)'
      : '0 1px 5px rgba(28, 37, 34, 0.13)',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: compact ? 9 : 10,
    fontWeight: kind === 'run' ? 700 : 650,
    letterSpacing: kind === 'run' ? '0.035em' : '0.01em',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    userSelect: 'none',
  }
}

const secondaryLabelStyle: CSSProperties = {
  opacity: 0.72,
  fontSize: 8,
  fontWeight: 600,
  letterSpacing: '0.015em',
}

function DimensionIndicator({
  id,
  geometry,
  label,
  accessibleLabel,
  kind,
  compact,
}: DimensionIndicatorProps) {
  const separatedLabel = label.split(' · ')
  const cabinetDimensions = label.split(' × ')
  const hasSeparatedValue = separatedLabel.length > 1

  return (
    <group
      name={`kitchen-dimension-${id}`}
      userData={{ dimensionKind: kind, accessibleLabel }}
    >
      <Line
        name={`kitchen-dimension-${id}-lines`}
        points={geometry.segments}
        segments
        color={COLORS[kind]}
        lineWidth={kind === 'run' ? 1.7 : kind === 'room' ? 1.05 : 1.3}
        depthTest={false}
        depthWrite={false}
        transparent
        opacity={kind === 'room' ? 0.7 : 0.9}
        renderOrder={kind === 'room' ? 780 : kind === 'run' ? 820 : 800}
      />
      <Html
        center
        position={geometry.labelPosition}
        distanceFactor={compact ? 122 : 108}
        zIndexRange={[3, 3]}
        pointerEvents="none"
        style={{ pointerEvents: 'none' }}
      >
        <span
          aria-hidden="true"
          title={accessibleLabel}
          style={labelStyle(kind, compact)}
        >
          {!compact && kind === 'cabinet' && cabinetDimensions.length > 1 ? (
            <>
              <strong>{cabinetDimensions[0]}</strong>
              <small style={secondaryLabelStyle}>
                {cabinetDimensions.slice(1).join(' × ')}
              </small>
            </>
          ) : !compact && hasSeparatedValue ? (
            <>
              <small style={secondaryLabelStyle}>
                {separatedLabel.slice(0, -1).join(' · ')}
              </small>
              <strong>{separatedLabel.at(-1)}</strong>
            </>
          ) : (
            label
          )}
        </span>
      </Html>
    </group>
  )
}

function cabinetWidthGeometry(
  project: KitchenProject,
  cabinet: PlacedCabinet,
): DimensionGeometry {
  const bounds = calculateCabinetRoomBounds(project.room, cabinet)
  const lineY = (bounds.minY + bounds.maxY) / 2
  // The cabinet bounds stop at the carcass. Keep the guide just beyond the
  // closed door/front so it reads as part of the face without z-fighting.
  const frontClearance = 0.9
  const labelOffset: Point3 = [0, 0, 0]

  if (cabinet.placement.wall === 'left') {
    const frontX = bounds.maxX + frontClearance
    const start: Point3 = [frontX, lineY, bounds.minZ]
    const end: Point3 = [frontX, lineY, bounds.maxZ]
    return createDimensionGeometry(
      start,
      end,
      start,
      end,
      labelOffset,
      [0, 1, 0],
      0.8,
    )
  }

  if (cabinet.placement.wall === 'right') {
    const frontX = bounds.minX - frontClearance
    const start: Point3 = [frontX, lineY, bounds.minZ]
    const end: Point3 = [frontX, lineY, bounds.maxZ]
    return createDimensionGeometry(
      start,
      end,
      start,
      end,
      labelOffset,
      [0, 1, 0],
      0.8,
    )
  }

  const frontZ = bounds.maxZ + frontClearance
  const start: Point3 = [bounds.minX, lineY, frontZ]
  const end: Point3 = [bounds.maxX, lineY, frontZ]
  return createDimensionGeometry(
    start,
    end,
    start,
    end,
    labelOffset,
    [0, 1, 0],
    0.8,
  )
}

function runGeometry(
  project: KitchenProject,
  run: CabinetRunDimensions,
): DimensionGeometry {
  const room = project.room
  const lineY =
    run.level === 'base'
      ? run.bottomElevation + 4
      : Math.max(3, run.bottomElevation - 4)
  const referenceY =
    run.level === 'base'
      ? run.bottomElevation + 0.3
      : run.bottomElevation - 0.3
  const labelOffset: Point3 = [0, run.level === 'base' ? 1.05 : -1.05, 0]

  if (run.wall === 'left') {
    const referenceX = -room.width / 2 + run.maxDepth + 0.22
    const lineX = referenceX + 4.1
    const startZ = -room.depth / 2 + run.span.start
    const endZ = -room.depth / 2 + run.span.end
    return createDimensionGeometry(
      [lineX, lineY, startZ],
      [lineX, lineY, endZ],
      [referenceX, referenceY, startZ],
      [referenceX, referenceY, endZ],
      labelOffset,
      [0, 1, 0],
      0.95,
    )
  }

  if (run.wall === 'right') {
    const referenceX = room.width / 2 - run.maxDepth - 0.22
    const lineX = referenceX - 4.1
    const startZ = -room.depth / 2 + run.span.start
    const endZ = -room.depth / 2 + run.span.end
    return createDimensionGeometry(
      [lineX, lineY, startZ],
      [lineX, lineY, endZ],
      [referenceX, referenceY, startZ],
      [referenceX, referenceY, endZ],
      labelOffset,
      [0, 1, 0],
      0.95,
    )
  }

  const referenceZ = -room.depth / 2 + run.maxDepth + 0.22
  const lineZ = referenceZ + 4.1
  const startX = -room.width / 2 + run.span.start
  const endX = -room.width / 2 + run.span.end
  return createDimensionGeometry(
    [startX, lineY, lineZ],
    [endX, lineY, lineZ],
    [startX, referenceY, referenceZ],
    [endX, referenceY, referenceZ],
    labelOffset,
    [0, 1, 0],
    0.95,
  )
}

function roomDimensionIndicators(
  project: KitchenProject,
): readonly {
  id: string
  geometry: DimensionGeometry
  label: string
  accessibleLabel: string
}[] {
  const { width, depth, height } = project.room
  const halfWidth = width / 2
  const halfDepth = depth / 2
  const floorY = 0.45
  const frontGuideZ = halfDepth - 4
  const depthGuideX = halfWidth * 0.32
  const heightGuideX = halfWidth * 0.34
  const heightGuideZ = -halfDepth + 0.8

  return [
    {
      id: 'room-width',
      geometry: createDimensionGeometry(
        [-halfWidth, floorY, frontGuideZ],
        [halfWidth, floorY, frontGuideZ],
        [-halfWidth, 0.08, frontGuideZ],
        [halfWidth, 0.08, frontGuideZ],
        [0, 1.25, 0],
        [0, 1, 0],
        1.05,
      ),
      label: `Room W · ${formatInches(width)}`,
      accessibleLabel: `Room interior width: ${formatInches(width)}`,
    },
    {
      id: 'room-depth',
      geometry: createDimensionGeometry(
        [depthGuideX, floorY, -halfDepth],
        [depthGuideX, floorY, halfDepth],
        [depthGuideX, 0.08, -halfDepth],
        [depthGuideX, 0.08, halfDepth],
        [1.25, 1.25, 0],
        [0, 1, 0],
        1.05,
      ),
      label: `Room D · ${formatInches(depth)}`,
      accessibleLabel: `Room interior depth: ${formatInches(depth)}`,
    },
    {
      id: 'room-height',
      geometry: createDimensionGeometry(
        [heightGuideX, 0, heightGuideZ],
        [heightGuideX, height, heightGuideZ],
        [heightGuideX, 0, heightGuideZ],
        [heightGuideX, height, heightGuideZ],
        [2.4, 0, 0],
        [1, 0, 0],
        1.05,
      ),
      label: `Room H · ${formatInches(height)}`,
      accessibleLabel: `Room ceiling height: ${formatInches(height)}`,
    },
  ]
}

/**
 * In-scene kitchen measurements. Mount this inside the same R3F Canvas as the
 * room and cabinets; all coordinates are derived from the persisted project.
 */
export function KitchenDimensionOverlay({
  project,
  showCabinetWidths = true,
  showRunDimensions = true,
  showRoomDimensions = true,
}: KitchenDimensionOverlayProps) {
  const viewportWidth = useThree((state) => state.size.width)
  const compact =
    viewportWidth <= 900 || project.cabinets.length > 16

  const cabinetIndicators = useMemo(
    () =>
      project.cabinets.map((cabinet) => {
        const level = getCabinetRunLevel(cabinet)
        const width = formatInches(cabinet.parameters.width)
        const height = formatInches(cabinet.parameters.height)
        const depth = formatInches(cabinet.parameters.depth)
        const fullSize = `${width} W × ${height} H × ${depth} D`
        return {
          id: `cabinet-${cabinet.id}-width`,
          geometry: cabinetWidthGeometry(project, cabinet),
          label: width,
          accessibleLabel: `${WALL_NAMES[cabinet.placement.wall]} ${LEVEL_NAMES[level].toLowerCase()} cabinet ${cabinet.id}: ${fullSize}`,
        }
      }),
    [project],
  )

  const runIndicators = useMemo(() => {
    const indicators: {
      id: string
      geometry: DimensionGeometry
      label: string
      accessibleLabel: string
    }[] = []

    for (const wall of KITCHEN_WALLS) {
      for (const level of ['base', 'wall'] as const) {
        const run = calculateCabinetRunDimensions(
          project.cabinets,
          wall,
          level,
        )
        if (run.cabinetCount === 0) continue
        const length = formatInches(run.span.length)
        indicators.push({
          id: `run-${wall}-${level}`,
          geometry: runGeometry(project, run),
          label: compact
            ? `${LEVEL_NAMES[level]} · ${length}`
            : `${WALL_NAMES[wall]} ${LEVEL_NAMES[level].toLowerCase()} run · ${length}`,
          accessibleLabel: `${WALL_NAMES[wall]} ${LEVEL_NAMES[level].toLowerCase()} cabinet run, ${run.cabinetCount} cabinet${run.cabinetCount === 1 ? '' : 's'}: ${length} overall span`,
        })
      }
    }
    return indicators
  }, [compact, project])

  const roomIndicators = useMemo(
    () => roomDimensionIndicators(project),
    [project],
  )

  return (
    <group
      name="kitchen-dimension-overlay"
      userData={{
        cabinetDimensionCount: cabinetIndicators.length,
        runDimensionCount: runIndicators.length,
      }}
    >
      {showCabinetWidths &&
        cabinetIndicators.map((indicator) => (
          <DimensionIndicator
            key={indicator.id}
            {...indicator}
            kind="cabinet"
            compact={compact}
          />
        ))}
      {showRunDimensions &&
        runIndicators.map((indicator) => (
          <DimensionIndicator
            key={indicator.id}
            {...indicator}
            kind="run"
            compact={compact}
          />
        ))}
      {showRoomDimensions &&
        roomIndicators.map((indicator) => (
          <DimensionIndicator
            key={indicator.id}
            {...indicator}
            kind="room"
            compact={compact}
          />
        ))}
    </group>
  )
}

export default KitchenDimensionOverlay
