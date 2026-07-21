import { useEffect, useId, useState, type CSSProperties } from 'react'
import { PARAMETER_RANGES, type CabinetParameters } from '../model'

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

interface ControlsPanelProps {
  parameters: CabinetParameters
  exploded: number
  onDimensionChange: (dimension: DimensionName, value: number) => void
  onExplodedChange: (value: number) => void
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
  onChange,
}: {
  definition: DimensionDefinition
  value: number
  onChange: (value: number) => void
}) {
  const id = useId()
  const [draft, setDraft] = useState(String(value))
  const range = PARAMETER_RANGES[definition.key]

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
  parameters,
  exploded,
  onDimensionChange,
  onExplodedChange,
  onResetCamera,
  onResetDimensions,
}: ControlsPanelProps) {
  const explodedId = useId()

  return (
    <aside className="controls-panel" aria-label="Cabinet controls">
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
            onChange={(value) => onDimensionChange(definition.key, value)}
          />
        ))}
      </div>

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
        <button type="button" onClick={onResetCamera}>
          Reset camera
        </button>
        <button type="button" onClick={onResetDimensions}>
          Reset dimensions
        </button>
      </div>
    </aside>
  )
}
