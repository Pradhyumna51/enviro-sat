import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { getFeatureColor } from '@/utils/colors'
import { renderToString } from 'react-dom/server'
import TilePopup from './TilePopup'
import DrawControl from './DrawControl'
import { Radar, Radio } from 'lucide-react'

/**
 * Smoothly flies the map view to given geospatial bounds.
 */
function FlyTo({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, {
        padding: [60, 60],
        maxZoom: 14,
        duration: 1.2,
        easeLinearity: 0.25,
      })
    }
  }, [bounds, map])
  return null
}

/**
 * MapView — High-performance geospatial Leaflet canvas.
 * Renders calibrated EuroSAT GeoJSON chips, CartoDB dark tiles, and active radar sweep overlay.
 */
export default function MapView({
  geojsonData,
  mode,
  flyBounds,
  onBboxDrawn,
  onSelectFeature,
  isDrawTriggered,
  onResetDrawTrigger,
  loading,
}) {
  const geojsonRef = useRef(null)
  const geojsonKey = useMemo(() => {
    return geojsonData ? JSON.stringify(geojsonData.metadata || {}) : 'empty'
  }, [geojsonData])

  const styleFeature = useCallback(
    (feature) => {
      const color = getFeatureColor(feature, mode)
      const isReview = feature.properties.needs_review
      return {
        fillColor: color,
        fillOpacity: isReview ? 0.40 : 0.76,
        color: isReview ? '#f59e0b' : '#ffffff',
        weight: isReview ? 1.5 : 0.75,
        dashArray: isReview ? '4 3' : undefined,
        opacity: 0.9,
      }
    },
    [mode]
  )

  const onEachFeature = useCallback(
    (feature, layer) => {
      // Hover Tooltip Popup
      const popupContent = renderToString(<TilePopup feature={feature} mode={mode} />)
      layer.bindPopup(popupContent, {
        className: 'envirosat-popup',
        maxWidth: 320,
        minWidth: 260,
      })

      // Hover feedback
      layer.on('mouseover', () => {
        layer.setStyle({
          weight: 2.5,
          fillOpacity: 0.92,
          color: '#38bdf8',
        })
        layer.bringToFront()
      })

      layer.on('mouseout', () => {
        layer.setStyle(styleFeature(feature))
      })

      // Click to open detailed inspector
      layer.on('click', () => {
        if (onSelectFeature) {
          onSelectFeature(feature)
        }
      })
    },
    [mode, styleFeature, onSelectFeature]
  )

  return (
    <div className="relative flex-1 h-full w-full bg-[#04060a] overflow-hidden">
      {/* Active Radar Sweep Overlay during AI Processing */}
      {loading && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px]">
          <div className="relative flex items-center justify-center">
            {/* Concentric expanding radar rings */}
            <div className="absolute size-96 rounded-full border border-cyan-500/20 animate-ping opacity-30" />
            <div className="absolute size-64 rounded-full border border-cyan-400/40 animate-pulse" />
            <div className="absolute size-40 rounded-full border border-cyan-300/60" />

            {/* Rotating Radar Scan Beam */}
            <div className="size-80 rounded-full border border-cyan-500/30 overflow-hidden relative animate-radar-sweep shadow-[0_0_60px_rgba(6,182,212,0.25)]">
              <div className="absolute top-1/2 left-1/2 w-40 h-40 origin-top-left bg-gradient-to-br from-cyan-400/30 via-cyan-500/10 to-transparent -translate-x-full -translate-y-full" />
            </div>

            {/* Central Badge */}
            <div className="absolute flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-cyan-400/40 shadow-2xl backdrop-blur-xl font-mono text-xs text-cyan-300">
              <Radio className="size-3.5 animate-pulse text-cyan-400" />
              <span>Scanning Sentinel-2 Imagery...</span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Leaflet Container */}
      <MapContainer
        center={[48.15, 11.55]}
        zoom={10}
        className="w-full h-full z-10"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${
            import.meta.env.VITE_CARTO_API_KEY
              ? `?api_key=${import.meta.env.VITE_CARTO_API_KEY}`
              : '?api_key=cb1_2ez0_1_d9de38ac60e752fa3828b29f'
          }`}
        />
        <DrawControl
          onBboxDrawn={onBboxDrawn}
          isDrawTriggered={isDrawTriggered}
          onResetDrawTrigger={onResetDrawTrigger}
        />
        <FlyTo bounds={flyBounds} />
        {geojsonData && geojsonData.features && geojsonData.features.length > 0 && (
          <GeoJSON
            key={geojsonKey}
            ref={geojsonRef}
            data={geojsonData}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  )
}
