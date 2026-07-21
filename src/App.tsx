import { useCallback, useMemo, useState } from 'react'
import { CabinetViewer } from './components/CabinetViewer'
import { ControlsPanel } from './components/ControlsPanel'
import {
  DEFAULT_PARAMETERS,
  calculateCabinetLayout,
  type CabinetParameters,
} from './model'

type DimensionName = keyof Pick<
  CabinetParameters,
  'width' | 'height' | 'depth'
>

const formatDimension = (value: number) =>
  Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2).replace(/0$/, '')

function App() {
  const [parameters, setParameters] = useState<CabinetParameters>(() => ({
    ...DEFAULT_PARAMETERS,
  }))
  const [exploded, setExploded] = useState(0)
  const [cameraReset, setCameraReset] = useState(0)

  const layout = useMemo(
    () => calculateCabinetLayout(parameters),
    [parameters],
  )

  const updateDimension = useCallback(
    (dimension: DimensionName, value: number) => {
      setParameters((current) => ({ ...current, [dimension]: value }))
    },
    [],
  )

  const resetDimensions = useCallback(() => {
    setParameters({ ...DEFAULT_PARAMETERS })
  }, [])

  return (
    <main className="app-shell">
      <section className="viewer" aria-label="Interactive cabinet model">
        <CabinetViewer
          layout={layout}
          exploded={exploded}
          onExplodedChange={setExploded}
          cameraReset={cameraReset}
        />

        <header className="viewer-heading">
          <p className="eyebrow">Parametric assembly</p>
          <h1>Base cabinet</h1>
          <p className="viewer-subtitle">Frameless plywood construction</p>
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
          parameters={layout.parameters}
          exploded={exploded}
          onDimensionChange={updateDimension}
          onExplodedChange={setExploded}
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
