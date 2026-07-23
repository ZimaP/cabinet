import { useEffect, useId, useState, type CSSProperties } from 'react'
import {
  CABINET_CATALOG,
  CABINET_TYPES,
  isWallCabinetType,
  type CabinetParameterRanges,
  type CabinetParameters,
  type CabinetType,
  type WallCabinetModelNumber,
  type WallCabinetOptions,
  type WallCarcassMaterial,
  type WallDoorCategory,
  type WallDoorHand,
} from '../model'
import { WallCabinetAdjustments } from './WallCabinetAdjustments'

type DimensionName = keyof Pick<
  CabinetParameters,
  'width' | 'height' | 'depth'
>

interface DimensionDefinition {
  key: DimensionName
  label: string
}

const DIMENSIONS: readonly DimensionDefinition[] = [
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
  { key: 'depth', label: 'Depth' },
]

const BASE_CABINET_TYPES = CABINET_TYPES.filter(
  (type) => !isWallCabinetType(type),
)
const WALL_CABINET_TYPES = CABINET_TYPES.filter(isWallCabinetType)

interface ControlsPanelProps {
  cabinetType: CabinetType
  parameters: CabinetParameters
  parameterRanges: CabinetParameterRanges
  exploded: number
  dimensionsMode: boolean
  wallOptions: WallCabinetOptions | null
  onCabinetTypeChange: (type: CabinetType) => void
  onDimensionChange: (dimension: DimensionName, value: number) => void
  onWallModelNumberChange: (modelNumber: WallCabinetModelNumber) => void
  onWallDoorCategoryChange: (category: WallDoorCategory) => void
  onWallDoorHandChange: (hand: WallDoorHand) => void
  onWallCarcassMaterialChange: (material: WallCarcassMaterial) => void
  onExplodedChange: (value: number) => void
  onDimensionsModeChange: (enabled: boolean) => void
  onResetCamera: () => void
  onResetDimensions: () => void
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const rangeStyle = (value: number, min: number, max: number) =>
  ({
    '--range-progress': `${((value - min) / (max - min)) * 100}%`,
  }) as CSSProperties

function DimensionControl({
  definition,
  value,
  ranges,
  onChange,
}: {
  definition: DimensionDefinition
  value: number
  ranges: CabinetParameterRanges
  onChange: (value: number) => void
}) {
  const id = useId()
  const [draft, setDraft] = useState(String(value))
  const range = ranges[definition.key]

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commitDraft = () => {
    const parsed = Number(draft)
    const next = Number.isFinite(parsed)
      ? clamp(parsed, range.min, range.max)
      : value
    onChange(next)
    setDraft(String(next))
  }

  return (
    <div className="dimension-control">
      <label className="dimension-control__label" htmlFor={`${id}-number`}>
        {definition.label}
      </label>
      <input
        id={`${id}-range`}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        style={rangeStyle(value, range.min, range.max)}
        aria-label={`${definition.label} in inches`}
        aria-controls={`${id}-number`}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <span className="number-field">
        <input
          id={`${id}-number`}
          type="number"
          min={range.min}
          max={range.max}
          step={range.step}
          inputMode="decimal"
          value={draft}
          aria-label={`${definition.label} numeric value in inches`}
          aria-controls={`${id}-range`}
          onChange={(event) => {
            const nextDraft = event.currentTarget.value
            setDraft(nextDraft)
            const parsed = Number(nextDraft)
            if (
              nextDraft !== '' &&
              Number.isFinite(parsed) &&
              parsed >= range.min &&
              parsed <= range.max
            ) {
              onChange(parsed)
            }
          }}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
            if (event.key === 'Escape') {
              setDraft(String(value))
              event.currentTarget.blur()
            }
          }}
        />
        <span className="number-field__unit" aria-hidden="true">
          in
        </span>
      </span>
    </div>
  )
}

export function ControlsPanel({
  cabinetType,
  parameters,
  parameterRanges,
  exploded,
  dimensionsMode,
  wallOptions,
  onCabinetTypeChange,
  onDimensionChange,
  onWallModelNumberChange,
  onWallDoorCategoryChange,
  onWallDoorHandChange,
  onWallCarcassMaterialChange,
  onExplodedChange,
  onDimensionsModeChange,
  onResetCamera,
  onResetDimensions,
}: ControlsPanelProps) {
  const explodedId = useId()
  const catalogId = useId()
  const catalogEntry = CABINET_CATALOG[cabinetType]
  const wallCabinetType = isWallCabinetType(cabinetType)
    ? cabinetType
    : null

  return (
    <aside className="controls-panel" aria-label="Cabinet controls">
      <div className="catalog-control">
        <label htmlFor={catalogId}>Cabinet model</label>
        <span className="catalog-select">
          <select
            id={catalogId}
            value={cabinetType}
            onChange={(event) =>
              onCabinetTypeChange(event.currentTarget.value as CabinetType)
            }
          >
            <optgroup label="Base cabinets">
              {BASE_CABINET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CABINET_CATALOG[type].label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Wall cabinets">
              {WALL_CABINET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CABINET_CATALOG[type].label}
                </option>
              ))}
            </optgroup>
          </select>
        </span>
        <p>{catalogEntry.description}</p>
        <p className="standard-widths">
          Standard widths: {catalogEntry.standardWidths.join(' · ')} in
        </p>
      </div>

      {wallCabinetType && wallOptions ? (
        <WallCabinetAdjustments
          cabinetType={wallCabinetType}
          options={wallOptions}
          onModelNumberChange={onWallModelNumberChange}
          onDoorCategoryChange={onWallDoorCategoryChange}
          onDoorHandChange={onWallDoorHandChange}
          onCarcassMaterialChange={onWallCarcassMaterialChange}
        />
      ) : (
        <>
          <div className="panel-heading">
            <h2>Dimensions</h2>
            <span>inches</span>
          </div>

          <div className="dimensions-list">
            {DIMENSIONS.map((definition) => (
              <DimensionControl
                key={definition.key}
                definition={definition}
                value={parameters[definition.key]}
                ranges={parameterRanges}
                onChange={(value) => onDimensionChange(definition.key, value)}
              />
            ))}
          </div>
        </>
      )}

      <div className="explode-control">
        <div className="explode-control__heading">
          <label className="explode-label" htmlFor={explodedId}>
            Exploded view
          </label>
          <output className="explode-value" htmlFor={explodedId}>
            {Math.round(exploded * 100)}%
          </output>
        </div>
        <div className="explode-range">
          <span>Closed</span>
          <input
            id={explodedId}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={exploded}
            style={rangeStyle(exploded, 0, 1)}
            onChange={(event) =>
              onExplodedChange(Number(event.currentTarget.value))
            }
          />
          <span>Open</span>
        </div>
      </div>

      <div className="panel-actions">
        <button
          type="button"
          className="dimensions-mode-toggle"
          aria-pressed={dimensionsMode}
          onClick={() => onDimensionsModeChange(!dimensionsMode)}
        >
          Dimensions
        </button>
        <button type="button" onClick={onResetCamera}>
          Reset camera
        </button>
        <button type="button" onClick={onResetDimensions}>
          {wallCabinetType ? 'Reset options' : 'Reset dimensions'}
        </button>
      </div>
    </aside>
  )
}
