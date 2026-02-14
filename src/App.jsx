import { useState } from 'react'
import './App.css'
import { useFamilyData } from './hooks/useFamilyData'
import FamilyGraph from './components/FamilyGraph/FamilyGraph'
import InputDashboard from './components/InputDashboard/InputDashboard'
import FinishingRoom from './components/FinishingRoom/FinishingRoom'
import ViewControls from './components/ViewControls/ViewControls'
import Button from './components/UI/Button'

function App() {
  const { graphData, loading, addProfile } = useFamilyData()
  const [viewMode, setViewMode] = useState('graph') // 'graph' or 'list'
  const [isFinishing, setIsFinishing] = useState(false)

  // New State for Graph Customization
  const [viewSettings, setViewSettings] = useState({
    layout: 'tree',
    linkStyle: 'curved',
    theme: 'midnight',
    nodeShape: 'circle',
    particles: false
  })

  const [title, setTitle] = useState("My Family Tree")
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  if (loading) return <div className="loading-screen">Loading Family Tree...</div>

  // Ensure we pass a clean copy of data to D3 to avoid mutation issues if props update
  const nodes = graphData.nodes.map(n => ({ ...n }));
  const links = graphData.links.map(l => ({ ...l }));

  return (
    <div className="app-container">
      <header className="app-header glass-panel">
        <div className="title-container">
          {isEditingTitle ? (
            <input
              className="title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              autoFocus
            />
          ) : (
            <h1 onClick={() => setIsEditingTitle(true)} title="Click to edit">
              {title}
              <span className="edit-hint">✎</span>
            </h1>
          )}
        </div>
        <div className="controls">
          <button className={`glass-btn ${viewMode === 'graph' ? 'active' : ''}`} onClick={() => setViewMode('graph')}>Graph</button>
          <button className={`glass-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>List</button>
          {viewMode === 'graph' && (
            <Button variant="primary" onClick={() => setIsFinishing(true)}>
              Finishing Room
            </Button>
          )}
        </div>
      </header>

      <main className="main-content">
        {viewMode === 'graph' && (
          <>
            <FamilyGraph nodes={nodes} links={links} settings={viewSettings} />
            {!isFinishing && (
              <ViewControls settings={viewSettings} onSettingsChange={setViewSettings} />
            )}
          </>
        )}

        {viewMode === 'list' && (
          <div className="list-view glass-panel" style={{ margin: '6rem 2rem', padding: '2rem' }}>
            <h2>Family Members ({nodes.length})</h2>
            <ul>
              {nodes.map(node => (
                <li key={node.id}>
                  {node.name} ({node.role}) - {node.life_status}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="dashboard-overlay">
          {!isFinishing && <InputDashboard onAddProfile={addProfile} />}
        </div>

        {isFinishing && (
          <FinishingRoom onClose={() => setIsFinishing(false)} />
        )}
      </main>
    </div>
  )
}

export default App
