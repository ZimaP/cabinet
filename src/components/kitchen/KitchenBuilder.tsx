import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { formatInches } from '../../dimensions'
import {
  CABINET_CATALOG,
  CABINET_TYPES,
  WALL_CABINET_TYPES,
  getCabinetCatalogEntry,
  getWallCabinetFamily,
  getWallCabinetModel,
  isWallCabinetType,
  type CabinetParameters,
  type CabinetType,
  type WallCabinetModelNumber,
  type WallCabinetOptions,
  type WallCarcassMaterial,
  type WallDoorCategory,
  type WallDoorHand,
} from '../../model'
import {
  KITCHEN_STORAGE_KEY,
  KITCHEN_WALLS,
  ROOM_DIMENSION_RANGES,
  addCabinet,
  canRedoKitchenHistory,
  canUndoKitchenHistory,
  calculateCabinetRunDimensions,
  commitKitchenHistory,
  createKitchenProject,
  createKitchenHistory,
  createPlacedCabinet,
  duplicateCabinet,
  findFirstAvailableOffset,
  getCabinetRunLevel,
  getCabinetPlacementIssues,
  getWallLength,
  parseKitchenProject,
  redoKitchenHistory,
  removeCabinet,
  serializeKitchenProject,
  undoKitchenHistory,
  updateCabinetPlacement,
  updateRoomDimensions,
  type AddCabinetInput,
  type CabinetRunDimensions,
  type KitchenProject,
  type KitchenProjectUpdate,
  type KitchenWall,
  type PlacedCabinet,
  type RoomDimensions,
} from '../../kitchen'
import {
  KitchenBuilderViewer,
  type KitchenCameraPreset,
} from './KitchenBuilderViewer'

type MobilePanel = 'view' | 'room' | 'library' | 'selected'
type LibraryCategory = 'base' | 'wall'
type RoomDimension = keyof RoomDimensions
type CabinetDimension = keyof CabinetParameters

const BASE_CABINET_TYPES = CABINET_TYPES.filter(
  (cabinetType) => !isWallCabinetType(cabinetType),
)

const WALL_LABELS: Readonly<Record<KitchenWall, string>> = {
  back: 'Back wall',
  left: 'Left wall',
  right: 'Right wall',
}

const ROOM_FIELDS: readonly {
  dimension: RoomDimension
  label: string
}[] = [
  { dimension: 'width', label: 'Room width' },
  { dimension: 'depth', label: 'Room depth' },
  { dimension: 'height', label: 'Ceiling height' },
]

const CABINET_FIELDS: readonly {
  dimension: CabinetDimension
  label: string
}[] = [
  { dimension: 'width', label: 'Width' },
  { dimension: 'height', label: 'Height' },
  { dimension: 'depth', label: 'Depth' },
]

const readStoredProject = (): KitchenProject => {
  try {
    return parseKitchenProject(window.localStorage.getItem(KITCHEN_STORAGE_KEY))
  } catch {
    return createKitchenProject()
  }
}

const feetAndInches = (value: number) => {
  const feet = Math.floor(value / 12)
  const inches = value - feet * 12
  return `${feet}′ ${formatInches(inches)}`
}

const cabinetSize = (parameters: CabinetParameters) =>
  `${formatInches(parameters.width)} × ${formatInches(parameters.height)} × ${formatInches(parameters.depth)}`

const cabinetCountLabel = (count: number) =>
  `${count} cabinet${count === 1 ? '' : 's'}`

const cabinetRunSize = (run: CabinetRunDimensions) =>
  `${formatInches(run.span.length)} W × ${formatInches(
    run.topElevation - run.bottomElevation,
  )} H × ${formatInches(run.maxDepth)} D`

const knownWallPrice = (cabinet: PlacedCabinet): number => {
  if (!isWallCabinetType(cabinet.cabinetType) || !cabinet.wallOptions) {
    return 0
  }
  const model = getWallCabinetModel(
    cabinet.cabinetType,
    cabinet.wallOptions.modelNumber,
  )
  return model.prices[cabinet.wallOptions.doorCategory]
}

function replaceCabinetDefinition(
  project: KitchenProject,
  cabinetId: string,
  input: Partial<AddCabinetInput>,
): KitchenProject {
  const current = project.cabinets.find(
    (cabinet) => cabinet.id === cabinetId,
  )
  if (!current) return project

  const replacement = createPlacedCabinet(
    project.room,
    {
      id: current.id,
      cabinetType: input.cabinetType ?? current.cabinetType,
      parameters: input.parameters ?? current.parameters,
      wallOptions: input.wallOptions ?? current.wallOptions,
      placement: input.placement ?? current.placement,
    },
    project.cabinets.filter((cabinet) => cabinet.id !== cabinetId),
  )

  const sameParameters =
    replacement.parameters.width === current.parameters.width &&
    replacement.parameters.height === current.parameters.height &&
    replacement.parameters.depth === current.parameters.depth
  const samePlacement =
    replacement.placement.wall === current.placement.wall &&
    replacement.placement.offset === current.placement.offset &&
    replacement.placement.elevation === current.placement.elevation
  const sameWallOptions =
    replacement.wallOptions?.modelNumber === current.wallOptions?.modelNumber &&
    replacement.wallOptions?.doorCategory ===
      current.wallOptions?.doorCategory &&
    replacement.wallOptions?.doorHand === current.wallOptions?.doorHand &&
    replacement.wallOptions?.carcassMaterial ===
      current.wallOptions?.carcassMaterial

  if (
    replacement.cabinetType === current.cabinetType &&
    sameParameters &&
    samePlacement &&
    sameWallOptions
  ) {
    return project
  }

  return {
    ...project,
    cabinets: project.cabinets.map((cabinet) =>
      cabinet.id === cabinetId ? replacement : cabinet,
    ),
  }
}

function BuilderNumberField({
  label,
  value,
  min,
  max,
  step = 0.25,
  helper,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  helper?: ReactNode
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const cancelNextBlurRef = useRef(false)

  useEffect(() => setDraft(String(value)), [value])

  const commit = () => {
    if (cancelNextBlurRef.current) {
      cancelNextBlurRef.current = false
      setDraft(String(value))
      return
    }
    const parsed = Number(draft)
    const next = Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, parsed))
      : value
    onCommit(next)
    setDraft(String(next))
  }

  return (
    <label className="builder-number-field">
      <span>
        <span>{label}</span>
        {helper && <small>{helper}</small>}
      </span>
      <span className="builder-number-input">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          inputMode="decimal"
          value={draft}
          aria-label={`${label} in inches`}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              event.preventDefault()
              cancelNextBlurRef.current = true
              setDraft(String(value))
              event.currentTarget.blur()
            }
          }}
        />
        <span aria-hidden="true">in</span>
      </span>
    </label>
  )
}

function PanelSection({
  eyebrow,
  title,
  children,
  className = '',
}: {
  eyebrow: string
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`builder-panel-section ${className}`}>
      <header className="builder-panel-heading">
        <div>
          <p>{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </header>
      {children}
    </section>
  )
}

function CabinetSizeReadout({
  parameters,
}: {
  parameters: CabinetParameters
}) {
  return (
    <div
      className="builder-size-readout"
      aria-label={`Selected cabinet size: ${cabinetSize(parameters)}`}
    >
      {CABINET_FIELDS.map(({ dimension, label }) => (
        <span key={dimension}>
          <small>{label}</small>
          <strong>{formatInches(parameters[dimension])}</strong>
        </span>
      ))}
    </div>
  )
}

function CabinetRunReadout({
  run,
}: {
  run: CabinetRunDimensions
}) {
  const gapWidth = Math.max(0, run.span.length - run.summedWidth)

  return (
    <section
      className="builder-run-readout"
      aria-label={`${run.level} cabinet run overall dimensions`}
    >
      <header>
        <div>
          <p>Run overall</p>
          <span>
            {WALL_LABELS[run.wall]} ·{' '}
            {cabinetCountLabel(run.cabinetCount)}
          </span>
        </div>
        <strong>{cabinetRunSize(run)}</strong>
      </header>
      <div>
        <span>
          <small>Combined cabinet width</small>
          <strong>{formatInches(run.summedWidth)}</strong>
        </span>
        <span>
          <small>Gaps inside run</small>
          <strong>{formatInches(gapWidth)}</strong>
        </span>
      </div>
    </section>
  )
}

export function KitchenBuilder() {
  const [projectHistory, setProjectHistory] = useState(() =>
    createKitchenHistory(readStoredProject()),
  )
  const project = projectHistory.present
  const setProject = useCallback((update: KitchenProjectUpdate) => {
    setProjectHistory((current) =>
      commitKitchenHistory(current, update),
    )
  }, [])
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(
    () => project.cabinets[0]?.id ?? null,
  )
  const [activeWall, setActiveWall] = useState<KitchenWall>(
    () => project.cabinets[0]?.placement.wall ?? 'back',
  )
  const [libraryCategory, setLibraryCategory] =
    useState<LibraryCategory>('base')
  const [cameraPreset, setCameraPreset] =
    useState<KitchenCameraPreset>('perspective')
  const [cameraReset, setCameraReset] = useState(0)
  const [focusReset, setFocusReset] = useState(0)
  const [showDimensions, setShowDimensions] = useState(true)
  const [mobilePanel, setMobilePanel] =
    useState<MobilePanel>('library')
  const [notice, setNotice] = useState(
    project.cabinets.length
      ? 'Saved layout restored.'
      : 'Set your room, then add a cabinet.',
  )
  const [storageState, setStorageState] = useState<
    'saved' | 'unavailable'
  >('saved')
  const selectedPanelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        KITCHEN_STORAGE_KEY,
        serializeKitchenProject(project),
      )
      setStorageState('saved')
    } catch {
      setStorageState('unavailable')
      setNotice(
        'Autosave is unavailable in this browser. Keep this tab open to preserve the layout.',
      )
    }
  }, [project])

  useEffect(() => {
    if (
      selectedCabinetId &&
      !project.cabinets.some(
        (cabinet) => cabinet.id === selectedCabinetId,
      )
    ) {
      setSelectedCabinetId(project.cabinets[0]?.id ?? null)
    }
  }, [project.cabinets, selectedCabinetId])

  const selectedCabinet =
    project.cabinets.find(
      (cabinet) => cabinet.id === selectedCabinetId,
    ) ?? null
  useEffect(() => {
    if (selectedCabinet) {
      setActiveWall(selectedCabinet.placement.wall)
    }
  }, [selectedCabinet])
  const placementIssues = useMemo(
    () => getCabinetPlacementIssues(project),
    [project],
  )
  const invalidCabinetIds = useMemo(
    () => [
      ...new Set([
        ...placementIssues.overlapIds,
        ...placementIssues.outOfBoundsIds,
      ]),
    ],
    [placementIssues],
  )
  const knownSubtotal = useMemo(
    () =>
      project.cabinets.reduce(
        (total, cabinet) => total + knownWallPrice(cabinet),
        0,
      ),
    [project.cabinets],
  )
  const activeWallLength = getWallLength(project.room, activeWall)
  const activeBaseRun = calculateCabinetRunDimensions(
    project.cabinets,
    activeWall,
    'base',
  )
  const activeWallRun = calculateCabinetRunDimensions(
    project.cabinets,
    activeWall,
    'wall',
  )
  const selectedRun = selectedCabinet
    ? calculateCabinetRunDimensions(
        project.cabinets,
        selectedCabinet.placement.wall,
        getCabinetRunLevel(selectedCabinet),
      )
    : null
  const selectedMaximumOffset = selectedCabinet
    ? Math.max(
        0,
        getWallLength(project.room, selectedCabinet.placement.wall) -
          selectedCabinet.parameters.width,
      )
    : 0
  const canUndo = canUndoKitchenHistory(projectHistory)
  const canRedo = canRedoKitchenHistory(projectHistory)

  const undoProject = useCallback(() => {
    if (!canUndo) return
    setProjectHistory((current) => undoKitchenHistory(current))
    setNotice('Undid the last layout change.')
  }, [canUndo])

  const redoProject = useCallback(() => {
    if (!canRedo) return
    setProjectHistory((current) => redoKitchenHistory(current))
    setNotice('Restored the next layout change.')
  }, [canRedo])

  const selectCabinet = useCallback(
    (cabinetId: string | null) => {
      setSelectedCabinetId(cabinetId)
      if (cabinetId) {
        const cabinet = project.cabinets.find(
          (candidate) => candidate.id === cabinetId,
        )
        if (cabinet) setActiveWall(cabinet.placement.wall)
        setMobilePanel('selected')
      }
    },
    [project.cabinets],
  )

  const focusCabinet = useCallback(
    (cabinetId: string | null = selectedCabinetId) => {
      if (!cabinetId) return
      selectCabinet(cabinetId)
      setFocusReset((value) => value + 1)
      if (window.matchMedia('(max-width: 900px)').matches) {
        setMobilePanel('view')
      }
      setNotice('Selected cabinet centered in the 3D view.')
    },
    [selectCabinet, selectedCabinetId],
  )

  const addCabinetType = (cabinetType: CabinetType) => {
    const next = addCabinet(project, {
      cabinetType,
      placement: { wall: activeWall },
    })
    if (next === project) {
      setNotice(
        `${WALL_LABELS[activeWall]} has no open span for that cabinet.`,
      )
      return
    }

    const added = next.cabinets[next.cabinets.length - 1]
    setProject(next)
    setSelectedCabinetId(added.id)
    setMobilePanel('selected')
    if (window.matchMedia('(max-width: 900px)').matches) {
      window.requestAnimationFrame(() => {
        selectedPanelRef.current?.focus()
      })
    }
    setNotice(
      `${getCabinetCatalogEntry(cabinetType).shortLabel} added to the ${WALL_LABELS[
        activeWall
      ].toLowerCase()}.`,
    )
  }

  const updateRoom = (dimension: RoomDimension, value: number) => {
    const nextProject = updateRoomDimensions(project, {
      [dimension]: value,
    })
    if (
      nextProject.room[dimension] === project.room[dimension] &&
      nextProject.cabinets.every(
        (cabinet, index) =>
          cabinet.placement.wall ===
            project.cabinets[index]?.placement.wall &&
          cabinet.placement.offset ===
            project.cabinets[index]?.placement.offset &&
          cabinet.placement.elevation ===
            project.cabinets[index]?.placement.elevation,
      )
    ) {
      setNotice('Room dimension is unchanged.')
      return
    }
    const movedCount = nextProject.cabinets.filter(
      (cabinet, index) =>
        cabinet.placement.offset !==
          project.cabinets[index]?.placement.offset ||
        cabinet.placement.elevation !==
          project.cabinets[index]?.placement.elevation,
    ).length
    const issueCount =
      getCabinetPlacementIssues(nextProject).overlapIds.length
    const label =
      ROOM_FIELDS.find((field) => field.dimension === dimension)?.label ??
      'Room dimension'
    setProject(nextProject)
    setCameraReset((value) => value + 1)
    setNotice(
      `${label} set to ${feetAndInches(
        nextProject.room[dimension],
      )}.${movedCount ? ` ${cabinetCountLabel(movedCount)} repositioned.` : ''}${
        issueCount
          ? ` ${cabinetCountLabel(issueCount)} need attention.`
          : ''
      }`,
    )
  }

  const updateSelectedPlacement = useCallback(
    (changes: Partial<PlacedCabinet['placement']>) => {
      if (!selectedCabinet) return
      const nextProject = updateCabinetPlacement(
        project,
        selectedCabinet.id,
        changes,
      )
      const updatedCabinet = nextProject.cabinets.find(
        (cabinet) => cabinet.id === selectedCabinet.id,
      )
      if (
        !updatedCabinet ||
        (updatedCabinet.placement.wall === selectedCabinet.placement.wall &&
          updatedCabinet.placement.offset ===
            selectedCabinet.placement.offset &&
          updatedCabinet.placement.elevation ===
            selectedCabinet.placement.elevation)
      ) {
        setNotice('Cabinet position is already at that limit.')
        return
      }
      setProject(nextProject)
      if (changes.wall) setActiveWall(changes.wall)
      setNotice(
        `${WALL_LABELS[updatedCabinet.placement.wall]} · ${formatInches(
          updatedCabinet.placement.offset,
        )} from start · ${formatInches(
          updatedCabinet.placement.elevation,
        )} elevation.`,
      )
    },
    [project, selectedCabinet, setProject],
  )

  const updateSelectedDefinition = (input: Partial<AddCabinetInput>) => {
    if (!selectedCabinet) return
    const nextProject = replaceCabinetDefinition(
      project,
      selectedCabinet.id,
      input,
    )
    if (nextProject === project) {
      setNotice('Cabinet specification is already up to date.')
      return
    }
    setProject(nextProject)
    setNotice('Cabinet specification updated.')
  }

  const duplicateSelected = () => {
    if (!selectedCabinet) return
    const next = duplicateCabinet(project, selectedCabinet.id)
    if (next === project) {
      setNotice('There is no open span to duplicate this cabinet.')
      return
    }
    const duplicate = next.cabinets[next.cabinets.length - 1]
    setProject(next)
    setSelectedCabinetId(duplicate.id)
    setNotice('Cabinet duplicated into the next open position.')
  }

  const deleteSelected = useCallback(() => {
    if (!selectedCabinet) return
    setProject((current) => removeCabinet(current, selectedCabinet.id))
    setNotice('Cabinet removed. Use Undo to restore it.')
  }, [selectedCabinet, setProject])

  const clearLayout = () => {
    if (project.cabinets.length === 0) {
      setNotice('The layout is already empty.')
      return
    }
    if (!window.confirm('Remove every cabinet and start a new layout?')) {
      return
    }
    setProject(createKitchenProject(project.room))
    setSelectedCabinetId(null)
    setNotice('Layout cleared. Use Undo to restore the cabinets.')
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isEditableTarget =
        target instanceof HTMLElement &&
        Boolean(
          target.closest(
            'input, select, textarea, [contenteditable="true"]',
          ),
        )
      const modifier = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (!isEditableTarget && modifier && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          redoProject()
        } else {
          undoProject()
        }
        return
      }

      if (!isEditableTarget && modifier && key === 'y') {
        event.preventDefault()
        redoProject()
        return
      }

      const isInteractiveTarget =
        target instanceof HTMLElement &&
        Boolean(
          target.closest(
            'input, select, textarea, button, a, [contenteditable="true"]',
          ),
        )
      if (isInteractiveTarget) return

      if (modifier || event.altKey) return

      if (!selectedCabinet) return

      if (key === 'f') {
        event.preventDefault()
        focusCabinet(selectedCabinet.id)
        return
      }

      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        !event.repeat
      ) {
        event.preventDefault()
        deleteSelected()
        return
      }

      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return
      }

      event.preventDefault()
      const movement = event.shiftKey ? 6 : 1
      const direction = event.key === 'ArrowLeft' ? -1 : 1
      const nextOffset = Math.min(
        selectedMaximumOffset,
        Math.max(
          0,
          selectedCabinet.placement.offset + movement * direction,
        ),
      )
      if (nextOffset === selectedCabinet.placement.offset) {
        setNotice(
          direction < 0
            ? 'Cabinet is already at the wall start.'
            : 'Cabinet is already at the wall end.',
        )
        return
      }
      updateSelectedPlacement({ offset: nextOffset })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    deleteSelected,
    focusCabinet,
    redoProject,
    selectedCabinet,
    selectedMaximumOffset,
    undoProject,
    updateSelectedPlacement,
  ])

  const libraryTypes =
    libraryCategory === 'base'
      ? BASE_CABINET_TYPES
      : WALL_CABINET_TYPES
  const cabinetAvailability = useMemo(
    () =>
      new Map(
        libraryTypes.map((cabinetType) => {
          const candidate = createPlacedCabinet(
            project.room,
            {
              cabinetType,
              placement: { wall: activeWall },
            },
            project.cabinets,
          )
          const offset = findFirstAvailableOffset(
            project,
            candidate.parameters,
            activeWall,
            candidate.placement.elevation,
          )
          return [cabinetType, offset !== null] as const
        }),
      ),
    [activeWall, libraryTypes, project],
  )

  return (
    <main className="app-shell kitchen-builder">
      <section
        className="kitchen-builder-workspace"
        aria-label="Kitchen builder"
      >
        <KitchenBuilderViewer
          project={project}
          selectedCabinetId={selectedCabinetId}
          activeWall={activeWall}
          cameraPreset={cameraPreset}
          cameraReset={cameraReset}
          focusReset={focusReset}
          compactPanelOpen={mobilePanel !== 'view'}
          showDimensions={showDimensions}
          invalidCabinetIds={invalidCabinetIds}
          onSelectCabinet={selectCabinet}
          onFocusCabinet={focusCabinet}
        />

        <header className="kitchen-builder-heading">
          <p className="eyebrow">Room planner</p>
          <h1>Kitchen Builder</h1>
          <p>
            {project.cabinets.length} cabinet
            {project.cabinets.length === 1 ? '' : 's'} ·{' '}
            {feetAndInches(project.room.width)} ×{' '}
            {feetAndInches(project.room.depth)}
          </p>
        </header>

        <div
          className="kitchen-camera-toolbar"
          role="group"
          aria-label="View and history controls"
        >
          <button
            type="button"
            className="kitchen-history-button"
            disabled={!canUndo}
            aria-label="Undo last layout change"
            aria-keyshortcuts="Control+Z Meta+Z"
            title="Undo (Ctrl/⌘ Z)"
            onClick={undoProject}
          >
            <span aria-hidden="true">↶</span>
            <span>Undo</span>
          </button>
          <button
            type="button"
            className="kitchen-history-button"
            disabled={!canRedo}
            aria-label="Redo layout change"
            aria-keyshortcuts="Control+Y Meta+Shift+Z"
            title="Redo (Ctrl/⌘ Shift Z)"
            onClick={redoProject}
          >
            <span aria-hidden="true">↷</span>
            <span>Redo</span>
          </button>
          <span
            className="kitchen-toolbar-divider"
            aria-hidden="true"
          />
          {(['perspective', 'front', 'top'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={cameraPreset === preset}
              aria-label={
                preset === 'front'
                  ? `${WALL_LABELS[activeWall]} elevation view`
                  : preset === 'top'
                    ? 'Top plan view'
                    : 'Perspective 3D view'
              }
              onClick={() => {
                setCameraPreset(preset)
                setCameraReset((value) => value + 1)
              }}
            >
              {preset === 'perspective'
                ? '3D'
                : preset === 'front'
                  ? 'Front'
                  : 'Top'}
            </button>
          ))}
          <button
            type="button"
            aria-label="Fit room in view"
            onClick={() => setCameraReset((value) => value + 1)}
          >
            Fit
          </button>
          <button
            type="button"
            className="kitchen-dimensions-toggle"
            aria-pressed={showDimensions}
            aria-label="Show 3D dimensions"
            onClick={() => {
              const next = !showDimensions
              setShowDimensions(next)
              if (next) setCameraReset((value) => value + 1)
              setNotice(
                next
                  ? '3D dimensions shown for the room and cabinet runs.'
                  : '3D dimensions hidden.',
              )
            }}
          >
            <span aria-hidden="true">Dimensions</span>
            <span aria-hidden="true">Dims</span>
          </button>
        </div>
        <p
          id="kitchen-view-instructions"
          className="kitchen-view-hint"
        >
          <span>
            {cameraPreset === 'top'
              ? 'Drag to pan · Scroll to zoom · F focuses selection'
              : 'Drag to orbit · Scroll to zoom · F focuses selection'}
          </span>
          <span>
            {cameraPreset === 'top'
              ? 'Drag to pan · Pinch to zoom'
              : 'Drag to orbit · Pinch to zoom'}
          </span>
        </p>

        <nav className="kitchen-mobile-nav" aria-label="Builder panels">
          {(['view', 'room', 'library', 'selected'] as const).map((panel) => (
            <button
              key={panel}
              type="button"
              aria-pressed={mobilePanel === panel}
              aria-controls={
                panel === 'view'
                  ? 'kitchen-3d-view'
                  : panel === 'selected'
                    ? 'kitchen-selected-panel'
                    : 'kitchen-room-library-panel'
              }
              onClick={() => setMobilePanel(panel)}
            >
              {panel === 'view'
                ? 'View'
                : panel === 'room'
                  ? 'Room'
                  : panel === 'library'
                    ? 'Add'
                    : 'Selected'}
            </button>
          ))}
        </nav>

        <aside
          id="kitchen-room-library-panel"
          className={`kitchen-panel kitchen-panel--left mobile-panel-${mobilePanel}`}
          aria-label="Room and cabinet library"
          data-mobile-visible={
            mobilePanel === 'room' || mobilePanel === 'library'
          }
        >
          <PanelSection
            eyebrow="Step 1"
            title="Room"
            className="builder-room-section"
          >
            <div className="builder-field-stack">
              {ROOM_FIELDS.map(({ dimension, label }) => {
                const range = ROOM_DIMENSION_RANGES[dimension]
                return (
                  <BuilderNumberField
                    key={dimension}
                    label={label}
                    value={project.room[dimension]}
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    helper={feetAndInches(project.room[dimension])}
                    onCommit={(value) => updateRoom(dimension, value)}
                  />
                )
              })}
            </div>

            <fieldset className="builder-wall-picker">
              <legend>Placement wall</legend>
              <div>
                {KITCHEN_WALLS.map((wall) => (
                  <button
                    key={wall}
                    type="button"
                    aria-pressed={activeWall === wall}
                    onClick={() => setActiveWall(wall)}
                  >
                    {wall === 'back'
                      ? 'Back'
                      : wall === 'left'
                        ? 'Left'
                        : 'Right'}
                  </button>
                ))}
              </div>
            </fieldset>
          </PanelSection>

          <PanelSection
            eyebrow="Step 2"
            title="Cabinet library"
            className="builder-library-section"
          >
            <div
              className="builder-segmented"
              role="group"
              aria-label="Cabinet library category"
            >
              <button
                type="button"
                aria-pressed={libraryCategory === 'base'}
                onClick={() => setLibraryCategory('base')}
              >
                Base cabinets
              </button>
              <button
                type="button"
                aria-pressed={libraryCategory === 'wall'}
                onClick={() => setLibraryCategory('wall')}
              >
                Wall cabinets
              </button>
            </div>

            <p className="builder-library-destination">
              Adding to <strong>{WALL_LABELS[activeWall]}</strong> ·{' '}
              {formatInches(activeWallLength)} wall span
            </p>

            <ul className="builder-library-list">
              {libraryTypes.map((cabinetType) => {
                const entry = CABINET_CATALOG[cabinetType]
                const available =
                  cabinetAvailability.get(cabinetType) ?? false
                return (
                  <li key={cabinetType}>
                    <button
                      type="button"
                      disabled={!available}
                      data-unavailable={!available || undefined}
                      title={
                        available
                          ? `Add ${entry.shortLabel} to the ${WALL_LABELS[
                              activeWall
                            ].toLowerCase()}`
                          : `No open span remains for this cabinet on the ${WALL_LABELS[
                              activeWall
                            ].toLowerCase()}`
                      }
                      onClick={() => addCabinetType(cabinetType)}
                    >
                      <span>
                        <strong>{entry.shortLabel}</strong>
                        <small>
                          {available
                            ? entry.description
                            : `No open span on ${WALL_LABELS[
                                activeWall
                              ].toLowerCase()}`}
                        </small>
                      </span>
                      <span className="builder-card-add" aria-hidden="true">
                        {available ? 'Add' : 'No space'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </PanelSection>
        </aside>

        <aside
          id="kitchen-selected-panel"
          ref={selectedPanelRef}
          tabIndex={-1}
          className="kitchen-panel kitchen-panel--right"
          aria-label="Selected cabinet and placed cabinets"
          data-mobile-visible={mobilePanel === 'selected'}
        >
          <PanelSection
            eyebrow="Step 3"
            title={selectedCabinet ? 'Selected cabinet' : 'Your layout'}
          >
            {selectedCabinet ? (
              <div className="builder-inspector">
                <div className="builder-selected-title">
                  <div>
                    <strong>
                      {
                        getCabinetCatalogEntry(selectedCabinet.cabinetType)
                          .shortLabel
                      }
                    </strong>
                    <span>{cabinetSize(selectedCabinet.parameters)}</span>
                  </div>
                  {isWallCabinetType(selectedCabinet.cabinetType) &&
                    selectedCabinet.wallOptions && (
                      <output>
                        $
                        {knownWallPrice(selectedCabinet).toLocaleString(
                          'en-US',
                        )}
                      </output>
                    )}
                </div>

                <CabinetSizeReadout
                  parameters={selectedCabinet.parameters}
                />
                {selectedRun && <CabinetRunReadout run={selectedRun} />}

                {(placementIssues.overlapIds.includes(selectedCabinet.id) ||
                  placementIssues.outOfBoundsIds.includes(
                    selectedCabinet.id,
                  )) && (
                  <p className="builder-warning" role="alert">
                    {placementIssues.overlapIds.includes(
                      selectedCabinet.id,
                    ) &&
                    placementIssues.outOfBoundsIds.includes(
                      selectedCabinet.id,
                    )
                      ? 'This cabinet overlaps another cabinet and extends beyond the wall boundary.'
                      : placementIssues.overlapIds.includes(
                            selectedCabinet.id,
                          )
                        ? 'This cabinet overlaps another cabinet in the room.'
                        : 'This cabinet extends beyond the wall boundary.'}
                  </p>
                )}

                <label className="builder-select-field">
                  <span>Wall</span>
                  <span className="catalog-select">
                    <select
                      value={selectedCabinet.placement.wall}
                      onChange={(event) =>
                        updateSelectedPlacement({
                          wall: event.currentTarget.value as KitchenWall,
                        })
                      }
                    >
                      {KITCHEN_WALLS.map((wall) => (
                        <option key={wall} value={wall}>
                          {WALL_LABELS[wall]}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>

                <div className="builder-field-stack builder-position-fields">
                  <BuilderNumberField
                    label="From wall start"
                    value={selectedCabinet.placement.offset}
                    min={0}
                    max={selectedMaximumOffset}
                    onCommit={(offset) =>
                      updateSelectedPlacement({ offset })
                    }
                  />
                  <BuilderNumberField
                    label="Bottom elevation"
                    value={selectedCabinet.placement.elevation}
                    min={0}
                    max={Math.max(
                      0,
                      project.room.height -
                        selectedCabinet.parameters.height,
                    )}
                    onCommit={(elevation) =>
                      updateSelectedPlacement({ elevation })
                    }
                  />
                </div>

                <div
                  className="builder-nudge"
                  role="group"
                  aria-label="Nudge selected cabinet"
                >
                  <button
                    type="button"
                    disabled={selectedCabinet.placement.offset <= 0}
                    aria-label="Move selected cabinet one inch toward wall start"
                    onClick={() =>
                      updateSelectedPlacement({
                        offset: selectedCabinet.placement.offset - 1,
                      })
                    }
                  >
                    − 1″
                  </button>
                  <span>Position</span>
                  <button
                    type="button"
                    disabled={
                      selectedCabinet.placement.offset >=
                      selectedMaximumOffset
                    }
                    aria-label="Move selected cabinet one inch toward wall end"
                    onClick={() =>
                      updateSelectedPlacement({
                        offset: selectedCabinet.placement.offset + 1,
                      })
                    }
                  >
                    + 1″
                  </button>
                </div>

                {isWallCabinetType(selectedCabinet.cabinetType) &&
                selectedCabinet.wallOptions ? (
                  <WallCabinetInspector
                    cabinet={selectedCabinet}
                    onChange={(wallOptions) =>
                      updateSelectedDefinition({ wallOptions })
                    }
                  />
                ) : (
                  <BaseCabinetInspector
                    cabinet={selectedCabinet}
                    onChange={(parameters) =>
                      updateSelectedDefinition({ parameters })
                    }
                  />
                )}

                <div className="builder-inspector-actions">
                  <button
                    type="button"
                    aria-keyshortcuts="F"
                    onClick={() => focusCabinet(selectedCabinet.id)}
                  >
                    Focus 3D
                  </button>
                  <button type="button" onClick={duplicateSelected}>
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="builder-danger-button"
                    onClick={deleteSelected}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="builder-no-selection">
                <span aria-hidden="true">◇</span>
                <p>Select a cabinet in the room or from the list below.</p>
              </div>
            )}
          </PanelSection>

          <PanelSection
            eyebrow={`${project.cabinets.length} total`}
            title="Placed cabinets"
            className="builder-placed-section"
          >
            {project.cabinets.length ? (
              <ul className="builder-placed-list">
                {project.cabinets.map((cabinet, index) => {
                  const overlaps =
                    placementIssues.overlapIds.includes(cabinet.id)
                  const outOfBounds =
                    placementIssues.outOfBoundsIds.includes(cabinet.id)
                  const invalid = overlaps || outOfBounds
                  const issueLabel =
                    overlaps && outOfBounds
                      ? 'Overlaps and outside wall bounds'
                      : overlaps
                        ? 'Overlaps another cabinet'
                        : outOfBounds
                          ? 'Outside wall bounds'
                          : ''
                  return (
                    <li key={cabinet.id}>
                      <button
                        type="button"
                        aria-current={
                          cabinet.id === selectedCabinetId
                            ? 'true'
                            : undefined
                        }
                        data-invalid={invalid || undefined}
                        onClick={() => selectCabinet(cabinet.id)}
                      >
                        <span>{index + 1}</span>
                        <span>
                          <strong>
                            {
                              getCabinetCatalogEntry(cabinet.cabinetType)
                                .shortLabel
                            }
                          </strong>
                          <small>
                            {WALL_LABELS[cabinet.placement.wall]} ·{' '}
                            {formatInches(cabinet.placement.offset)} from start
                            {' · '}
                            {formatInches(cabinet.parameters.width)} wide
                            {issueLabel ? ` · ${issueLabel}` : ''}
                          </small>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="builder-list-empty">
                Your placed cabinets will appear here.
              </p>
            )}
          </PanelSection>

          <button
            type="button"
            className="builder-clear-button"
            onClick={clearLayout}
          >
            Clear layout
          </button>
        </aside>

        {project.cabinets.length === 0 && (
          <div className="kitchen-empty-state">
            <span aria-hidden="true">⌂</span>
            <p className="eyebrow">Empty room</p>
            <h2>Start your kitchen</h2>
            <p>
              Set the room size, choose a wall, then add your first cabinet.
            </p>
            <button
              type="button"
              onClick={() => {
                setMobilePanel('library')
                addCabinetType('door-drawer')
              }}
            >
              Add first cabinet
            </button>
          </div>
        )}

        <div className="kitchen-summary" aria-label="Layout summary">
          <span>
            <small>{WALL_LABELS[activeWall]}</small>
            <strong>{formatInches(activeWallLength)}</strong>
          </span>
          <span>
            <small>
              Base run · {formatInches(activeBaseRun.summedWidth)} cabinet
              width
            </small>
            <strong>
              {cabinetCountLabel(activeBaseRun.cabinetCount)} ·{' '}
              {formatInches(activeBaseRun.span.length)} overall
            </strong>
          </span>
          <span>
            <small>
              Wall run · {formatInches(activeWallRun.summedWidth)} cabinet
              width
            </small>
            <strong>
              {cabinetCountLabel(activeWallRun.cabinetCount)} ·{' '}
              {formatInches(activeWallRun.span.length)} overall
            </strong>
          </span>
          <span>
            <small>Known 1999 subtotal</small>
            <strong>${knownSubtotal.toLocaleString('en-US')}</strong>
          </span>
        </div>

        <div
          className="kitchen-save-status"
          role="status"
          data-state={storageState}
        >
          <span aria-hidden="true" />
          {storageState === 'saved'
            ? 'Autosaved on this device'
            : 'Autosave unavailable'}
        </div>

        <p
          className="kitchen-builder-notice"
          role="status"
          aria-live="polite"
        >
          {notice}
        </p>

      </section>
    </main>
  )
}

function BaseCabinetInspector({
  cabinet,
  onChange,
}: {
  cabinet: PlacedCabinet
  onChange: (parameters: Partial<CabinetParameters>) => void
}) {
  const entry = getCabinetCatalogEntry(cabinet.cabinetType)

  return (
    <div className="builder-specification">
      <div className="builder-mini-heading">
        <span>Change cabinet size</span>
        <small>Width · height · depth</small>
      </div>
      <div className="builder-field-stack">
        {CABINET_FIELDS.map(({ dimension, label }) => {
          const range = entry.parameterRanges[dimension]
          return (
            <BuilderNumberField
              key={dimension}
              label={label}
              value={cabinet.parameters[dimension]}
              min={range.min}
              max={range.max}
              step={range.step}
              onCommit={(value) =>
                onChange({ ...cabinet.parameters, [dimension]: value })
              }
            />
          )
        })}
      </div>
    </div>
  )
}

function WallCabinetInspector({
  cabinet,
  onChange,
}: {
  cabinet: PlacedCabinet & { wallOptions?: WallCabinetOptions }
  onChange: (wallOptions: Partial<WallCabinetOptions>) => void
}) {
  if (
    !isWallCabinetType(cabinet.cabinetType) ||
    !cabinet.wallOptions
  ) {
    return null
  }

  const family = getWallCabinetFamily(cabinet.cabinetType)
  const options = cabinet.wallOptions

  return (
    <div className="builder-specification">
      <div className="builder-mini-heading">
        <span>Change cabinet size</span>
        <small>Catalog models</small>
      </div>
      <label className="builder-select-field">
        <span>Model number and size</span>
        <span className="catalog-select">
          <select
            value={options.modelNumber}
            onChange={(event) =>
              onChange({
                ...options,
                modelNumber: event.currentTarget
                  .value as WallCabinetModelNumber,
              })
            }
          >
            {family.models.map((model) => (
              <option key={model.modelNumber} value={model.modelNumber}>
                {model.modelNumber} · {model.width}″ W × {model.height}″ H ×{' '}
                {model.depth}″ D
              </option>
            ))}
          </select>
        </span>
      </label>

      {family.doorCount === 1 && (
        <label className="builder-select-field">
          <span>Door handing</span>
          <span className="catalog-select">
            <select
              value={options.doorHand}
              onChange={(event) =>
                onChange({
                  ...options,
                  doorHand: event.currentTarget.value as WallDoorHand,
                })
              }
            >
              <option value="left">Left hinged</option>
              <option value="right">Right hinged</option>
            </select>
          </span>
        </label>
      )}

      <label className="builder-select-field">
        <span>Door category</span>
        <span className="catalog-select">
          <select
            value={options.doorCategory}
            onChange={(event) =>
              onChange({
                ...options,
                doorCategory: event.currentTarget
                  .value as WallDoorCategory,
              })
            }
          >
            <option value="A">Category A</option>
            <option value="B">Category B</option>
            <option value="C">Category C</option>
          </select>
        </span>
      </label>

      <label className="builder-select-field">
        <span>Carcass material</span>
        <span className="catalog-select">
          <select
            value={options.carcassMaterial}
            onChange={(event) =>
              onChange({
                ...options,
                carcassMaterial: event.currentTarget
                  .value as WallCarcassMaterial,
              })
            }
          >
            <option value="standard-melamine">Industrial melamine</option>
            <option value="maple-veneer">Maple veneer + clear coat</option>
          </select>
        </span>
      </label>
    </div>
  )
}

export default KitchenBuilder
