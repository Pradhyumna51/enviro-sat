import React, { useState, useCallback, useEffect } from 'react'
import MapView from '@/components/MapView'
import Sidebar from '@/components/Sidebar'
import { useClassify } from '@/hooks/useClassify'
import { injectHatchPattern } from '@/utils/patterns'

/**
 * Root Application Container — connects Sidebar AI controls, Leaflet GeoJSON view, and inference pipelines.
 */
export default function App() {
  const [mode, setMode] = useState('classify')
  const [bbox, setBbox] = useState(null)
  const [flyBounds, setFlyBounds] = useState(null)
  const { data, loading, error, runClassify, runChange, clear } = useClassify()

  useEffect(() => {
    injectHatchPattern()
  }, [])

  // Clear previous analysis layer on mode switch
  useEffect(() => {
    clear()
  }, [mode, clear])

  const handleBboxDrawn = useCallback((newBbox) => {
    setBbox(newBbox)
  }, [])

  const handleFlyTo = useCallback((bounds) => {
    setFlyBounds(bounds)
  }, [])

  const handleAnalyze = useCallback((params) => {
    if (mode === 'classify') {
      runClassify(params)
    } else {
      runChange(params)
    }
  }, [mode, runClassify, runChange])

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden select-none">
      <Sidebar
        mode={mode}
        setMode={setMode}
        bbox={bbox}
        setBbox={setBbox}
        onAnalyze={handleAnalyze}
        loading={loading}
        error={error}
        data={data}
        onFlyTo={handleFlyTo}
      />
      <main className="flex-1 relative h-full">
        <MapView
          geojsonData={data}
          mode={mode}
          flyBounds={flyBounds}
          onBboxDrawn={handleBboxDrawn}
        />
      </main>
    </div>
  )
}
