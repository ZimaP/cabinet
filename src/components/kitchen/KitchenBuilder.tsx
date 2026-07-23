import {
  useEffect,
  useMemo,
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
  calculateCabinetRunDimensions,
  createKitchenProject,
  createPlacedCabinet,
  duplicateCabinet,
  getCabinetRunLevel,
  getCabinetPlacementIssues,
  getWallLength,
  parseKitchenProject,
  removeCabinet,
  serializeKitchenProject,
  updateCabinetPlacement,
  updateRoomDimensions,
  type AddCabinetInput,
  type CabinetRunDimensions,
  type KitchenProject,
  type KitchenWall,
  type PlacedCabinet,
  type RoomDimensions,
} from '../../kitchen'
import {
  KitchenBuilderViewer,
  type KitchenCameraPreset,
} from './KitchenBuilderViewer'

type MobilePanel = 'room' | 'library' | 'selected'
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

  useEffect(() => setDraft(String(value)), [value])

  const commit = () => {
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
  const [project, setProject] = useState<KitchenProject>(readStoredProject)
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(
    () => project.cabinets[0]?.id ?? null,
  )
  const [activeWall, setActiveWall] = useState<KitchenWall>('back')
  const [libraryCategory, setLibraryCategory] =
    useState<LibraryCategory>('base')
  const [cameraPreset, setCameraPreset] =
    useState<KitchenCameraPreset>('perspective')
  const [cameraReset, setCameraReset] = useState(0)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('library')
  const [notice, setNotice] = useState(
    project.cabinets.length
      ? 'Saved layout restored.'
      : 'Set your room, then add a cabinet.',
  )

  useEffect(() => {
    try {
      window.localStorage.setItem(
        KITCHEN_STORAGE_KEY,
        serializeKitchenProject(project),
      )
    } catch {
      // The planner remains fully usable when browser storage is unavailable.
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
  const placementIssues = useMemo(
    () => getCabinetPlacementIssues(project),
    [project],
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

  const selectCabinet = (cabinetId: string | null) => {
    setSelectedCabinetId(cabinetId)
    if (cabinetId) {
      const cabinet = project.cabinets.find(
        (candidate) => candidate.id === cabinetId,
      )
      if (cabinet) setActiveWall(cabinet.placement.wall)
      setMobilePanel('selected')
    }
  }

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
    setNotice(
      `${getCabinetCatalogEntry(cabinetType).shortLabel} added to the ${WALL_LABELS[
        activeWall
      ].toLowerCase()}.`,
    )
  }

  const updateRoom = (dimension: RoomDimension, value: number) => {
    setProject((current) =>
      updateRoomDimensions(current, { [dimension]: value }),
    )
    setCameraReset((value) => value + 1)
    setNotice('Room dimensions updated and layout saved.')
  }

  const updateSelectedPlacement = (
    changes: Partial<PlacedCabinet['placement']>,
  ) => {
    if (!selectedCabinet) return
    setProject((current) =>
      updateCabinetPlacement(current, selectedCabinet.id, changes),
    )
    if (changes.wall) setActiveWall(changes.wall)
    setNotice('Cabinet position updated.')
  }

  const updateSelectedDefinition = (input: Partial<AddCabinetInput>) => {
    if (!selectedCabinet) return
    setProject((current) =>
      replaceCabinetDefinition(current, selectedCabinet.id, input),
    )
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

  const deleteSelected = () => {
    if (!selectedCabinet) return
    setProject((current) => removeCabinet(current, selectedCabinet.id))
    setNotice('Cabinet removed from the layout.')
  }

  const clearLayout = () => {
    if (
      project.cabinets.length > 0 &&
      !window.confirm('Remove every cabinet and start a new layout?')
    ) {
      return
    }
    setProject(createKitchenProject(project.room))
    setSelectedCabinetId(null)
    setNotice('The room is ready for a new layout.')
  }

  const libraryTypes =
    libraryCategory === 'base'
      ? BASE_CABINET_TYPES
      : WALL_CABINET_TYPES

  return (
    <main className="app-shell kitchen-builder">
      <section
        className="kitchen-builder-workspace"
        aria-label="Kitchen builder"
      >
        <KitchenBuilderViewer
          project={project}
          selectedCabinetId={selectedCabinetId}
          cameraPreset={cameraPreset}
          cameraReset={cameraReset}
          onSelectCabinet={selectCabinet}
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

        <aside
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
              {formatInches(activeWallLength)} available
            </p>

            <ul className="builder-library-list">
              {libraryTypes.map((cabinetType) => {
                const entry = CABINET_CATALOG[cabinetType]
                return (
                  <li key={cabinetType}>
                    <button
                      type="button"
                      onClick={() => addCabinetType(cabinetType)}
                    >
                      <span>
                        <strong>{entry.shortLabel}</strong>
                        <small>{entry.description}</small>
                      </span>
                      <span className="builder-card-add" aria-hidden="true">
                        Add
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </PanelSection>
        </aside>

        <aside
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

                {placementIssues.overlapIds.includes(selectedCabinet.id) && (
                  <p className="builder-warning" role="alert">
                    This cabinet overlaps another cabinet in the room.
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
                    max={Math.max(
                      0,
                      getWallLength(
                        project.room,
                        selectedCabinet.placement.wall,
                      ) - selectedCabinet.parameters.width,
                    )}
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
                {project.cabinets.map((cabinet, index) => (
                  <li key={cabinet.id}>
                    <button
                      type="button"
                      aria-current={
                        cabinet.id === selectedCabinetId
                          ? 'true'
                          : undefined
                      }
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
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
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

        <div
          className="kitchen-camera-toolbar"
          role="group"
          aria-label="Kitchen camera"
        >
          {(['perspective', 'front', 'top'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={cameraPreset === preset}
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
        </div>

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

        <div className="kitchen-save-status">
          <span aria-hidden="true" />
          Saved on this device
        </div>

        <p className="kitchen-builder-notice" aria-live="polite">
          {notice}
        </p>

        <nav className="kitchen-mobile-nav" aria-label="Builder panels">
          {(['room', 'library', 'selected'] as const).map((panel) => (
            <button
              key={panel}
              type="button"
              aria-pressed={mobilePanel === panel}
              onClick={() => setMobilePanel(panel)}
            >
              {panel === 'room'
                ? 'Room'
                : panel === 'library'
                  ? 'Add'
                  : 'Selected'}
            </button>
          ))}
        </nav>
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
