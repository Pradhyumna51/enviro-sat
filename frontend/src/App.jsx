import React, { useState, useCallback, useEffect } from 'react'
import MapView from '@/components/MapView'
import Sidebar from '@/components/Sidebar'
import HeaderIsland from '@/components/HeaderIsland'
import ChipInspectorModal from '@/components/ChipInspectorModal'
import { useClassify } from '@/hooks/useClassify'
import { fetchSampleRegions } from '@/api/client'
import { injectHatchPattern } from '@/utils/patterns'

/**
 * Root Application Container — connects TopBar, Sidebar,
 * Leaflet GeoJSON layer, and Detailed Chip Inspector.
 */
export default function App() {
  const [mode, setMode] = useState('classify')
  const [bbox, setBbox] = useState(null)
  const [flyBounds, setFlyBounds] = useState(null)
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [isDrawTriggered, setIsDrawTriggered] = useState(false)
  const [regions, setRegions] = useState({})
  const [selectedRegion, setSelectedRegion] = useState('')

  const { data, loading, error, runClassify, runChange, clear } = useClassify()

  useEffect(() => {
    injectHatchPattern()
    fetchSampleRegions()
      .then(setRegions)
      .catch(() => {
        setRegions({
          munich_urban_fringe: {
            name: 'Munich Urban Fringe (Germany)',
            bbox: [11.45, 48.10, 11.65, 48.25],
          },
          rhine_valley: {
            name: 'Rhine Valley Farmland (France/Germany)',
            bbox: [7.60, 48.45, 7.80, 48.60],
          },
          paris_metropolis: {
            name: 'Paris Metropolis (France)',
            bbox: [2.25, 48.80, 2.45, 48.92],
          },
        })
      })
  }, [])

  // Clear previous analysis layer on mode switch
  useEffect(() => {
    clear()
    setSelectedFeature(null)
  }, [mode, clear])

  const handleBboxDrawn = useCallback((newBbox) => {
    setBbox(newBbox)
  }, [])

  const handleFlyTo = useCallback((bounds) => {
    setFlyBounds(bounds)
  }, [])

  const handleSelectRegion = useCallback(
    (key) => {
      setSelectedRegion(key)
      if (regions[key]) {
        const b = regions[key].bbox
        setBbox(b)
        setFlyBounds([[b[1], b[0]], [b[3], b[2]]])
      }
    },
    [regions]
  )

  const handleAnalyze = useCallback(
    (params) => {
      setSelectedFeature(null)
      if (mode === 'classify') {
        runClassify(params)
      } else {
        runChange(params)
      }
    },
    [mode, runClassify, runChange]
  )

  const handleZoomToChip = useCallback((feat) => {
    if (feat && feat.geometry && feat.geometry.coordinates) {
      const coords = feat.geometry.coordinates[0]
      const lats = coords.map((c) => c[1])
      const lngs = coords.map((c) => c[0])
      const bounds = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ]
      setFlyBounds(bounds)
    }
  }, [])

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="relative flex h-screen w-screen bg-[#090d16] overflow-hidden select-none font-sans text-slate-200">
      {/* Top Header Bar */}
      <HeaderIsland
        mode={mode}
        setMode={setMode}
        regions={regions}
        selectedRegion={selectedRegion}
        onSelectRegion={handleSelectRegion}
        activeBbox={bbox}
        mobileSidebarOpen={mobileSidebarOpen}
        onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      />

      {/* Analytical Controls Sidebar */}
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
        onTriggerDraw={() => {
          setIsDrawTriggered(true)
          setMobileSidebarOpen(false)
        }}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Map Surface */}
      <main className="flex-1 relative h-full w-full pt-14">
        <MapView
          geojsonData={data}
          mode={mode}
          flyBounds={flyBounds}
          bbox={bbox}
          onBboxDrawn={handleBboxDrawn}
          onSelectFeature={setSelectedFeature}
          isDrawTriggered={isDrawTriggered}
          onResetDrawTrigger={() => setIsDrawTriggered(false)}
          loading={loading}
        />
      </main>

      {/* Chip Inspector Drawer */}
      {selectedFeature && (
        <ChipInspectorModal
          feature={selectedFeature}
          mode={mode}
          onClose={() => setSelectedFeature(null)}
          onZoomToChip={handleZoomToChip}
        />
      )}
    </div>
  )
}
