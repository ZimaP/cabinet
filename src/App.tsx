import { useCallback, useMemo, useState } from 'react'
import { CabinetViewer } from './components/CabinetViewer'
import { ControlsPanel } from './components/ControlsPanel'
import {
  DEFAULT_CABINET_TYPE,
  getCabinetCatalogEntry,
  calculateCatalogCabinetLayout,
  type CabinetParameters,
  type CabinetType,
} from './model'

type DimensionName = keyof Pick<
  CabinetParameters,
  'width' | 'height' | 'depth'
>

const formatDimension = (value: number) =>
  Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2).replace(/0$/, '')

function App() {
  const [cabinetType, setCabinetType] = useState<CabinetType>(
    DEFAULT_CABINET_TYPE,
  )
  const [parameters, setParameters] = useState<CabinetParameters>(() => ({
    ...getCabinetCatalogEntry(DEFAULT_CABINET_TYPE).defaultParameters,
  }))
  const [exploded, setExploded] = useState(0)
  const [dimensionsMode, setDimensionsMode] = useState(false)
  const [cameraReset, setCameraReset] = useState(0)

  const catalogEntry = getCabinetCatalogEntry(cabinetType)
  const layout = useMemo(
    () => calculateCatalogCabinetLayout(cabinetType, parameters),
    [cabinetType, parameters],
  )

  const updateDimension = useCallback(
    (dimension: DimensionName, value: number) => {
      setParameters((current) => ({ ...current, [dimension]: value }))
    },
    [],
  )

  const resetDimensions = useCallback(() => {
    setParameters({ ...getCabinetCatalogEntry(cabinetType).defaultParameters })
  }, [cabinetType])

  const changeCabinetType = useCallback((nextType: CabinetType) => {
    setCabinetType(nextType)
    setParameters({ ...getCabinetCatalogEntry(nextType).defaultParameters })
    setCameraReset((value) => value + 1)
  }, [])

  return (
    <main className="app-shell">
      <section className="viewer" aria-label="Interactive cabinet model">
        <CabinetViewer
          layout={layout}
          exploded={exploded}
          dimensionsMode={dimensionsMode}
          onExplodedChange={setExploded}
          cameraReset={cameraReset}
        />

        <header className="viewer-heading">
          <p className="eyebrow">Parametric assembly</p>
          <h1>{catalogEntry.label}</h1>
          <p className="viewer-subtitle">{catalogEntry.description}</p>
        </header>

        <output className="size-readout" aria-live="polite">
          <span>{formatDimension(layout.parameters.width)}</span>
          <span className="size-readout__separator" aria-hidden="true">
            ×
          </span>
          <span>{formatDimension(layout.parameters.height)}</span>
          <span className="size-readout__separator" aria-hidden="true">
            ×
          </span>
          <span>{formatDimension(layout.parameters.depth)}</span>
          <span className="size-readout__unit">in</span>
        </output>

        <ControlsPanel
          cabinetType={cabinetType}
          parameters={layout.parameters}
          parameterRanges={catalogEntry.parameterRanges}
          exploded={exploded}
          dimensionsMode={dimensionsMode}
          onCabinetTypeChange={changeCabinetType}
          onDimensionChange={updateDimension}
          onExplodedChange={setExploded}
          onDimensionsModeChange={setDimensionsMode}
          onResetCamera={() => setCameraReset((value) => value + 1)}
          onResetDimensions={resetDimensions}
        />

        <div className="interaction-hint" aria-hidden="true">
          <span className="interaction-hint__mouse" />
          Drag to orbit <span className="hint-divider">·</span> Scroll to explode
          <span className="desktop-hint">
            {' '}
            <span className="hint-divider">·</span> Ctrl/⌘ + scroll to zoom
          </span>
        </div>
      </section>
    </main>
  )
}

export default App
