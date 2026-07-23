import { useEffect, useState } from 'react'
import { CabinetCatalogApp } from './CabinetCatalogApp'
import { KitchenBuilder } from './components/kitchen/KitchenBuilder'

type WorkspaceMode = 'catalog' | 'builder'

const workspaceFromHash = (): WorkspaceMode =>
  window.location.hash === '#builder' ? 'builder' : 'catalog'

function App() {
  const [workspace, setWorkspace] =
    useState<WorkspaceMode>(workspaceFromHash)

  useEffect(() => {
    const handleHashChange = () => setWorkspace(workspaceFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const changeWorkspace = (nextWorkspace: WorkspaceMode) => {
    window.location.hash = nextWorkspace === 'builder' ? 'builder' : 'catalog'
    setWorkspace(nextWorkspace)
  }

  return (
    <>
      <nav className="workspace-switcher" aria-label="Cabinet workspace">
        <button
          type="button"
          aria-pressed={workspace === 'catalog'}
          onClick={() => changeWorkspace('catalog')}
        >
          3D Catalog
        </button>
        <button
          type="button"
          aria-pressed={workspace === 'builder'}
          onClick={() => changeWorkspace('builder')}
        >
          Kitchen Builder
        </button>
      </nav>
      {workspace === 'catalog' ? (
        <CabinetCatalogApp />
      ) : (
        <KitchenBuilder />
      )}
    </>
  )
}

export default App
