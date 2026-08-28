import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, Rectangle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { getFeatureColor } from '@/utils/colors'
import { renderToString } from 'react-dom/server'
import TilePopup from './TilePopup'
import DrawControl from './DrawControl'
import { Loader2 } from 'lucide-react'

const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || 'cb1_2ez0_1_d9de38ac60e752fa3828b29f'
const TILE_URL = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`

/**
 * Smoothly moves map viewport to given bounds.
 */
function FlyTo({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, {
        padding: [50, 50],
        maxZoom: 14,
        duration: 0.8,
      })
    }
  }, [bounds, map])
  return null
}

/**
 * MapView — Geospatial Leaflet canvas with CARTO Dark Matter basemap.
 */
export default function MapView({
  geojsonData,
  mode,
  flyBounds,
  bbox,
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
        fillOpacity: isReview ? 0.45 : 0.75,
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
      const popupContent = renderToString(<TilePopup feature={feature} mode={mode} />)
      layer.bindPopup(popupContent, {
        className: 'envirosat-popup',
        maxWidth: 320,
        minWidth: 260,
      })

      layer.on('mouseover', () => {
        layer.setStyle({
          weight: 2,
          fillOpacity: 0.92,
          color: '#38bdf8',
        })
        layer.bringToFront()
      })

      layer.on('mouseout', () => {
        layer.setStyle(styleFeature(feature))
      })

      layer.on('click', () => {
        if (onSelectFeature) {
          onSelectFeature(feature)
        }
      })
    },
    [mode, styleFeature, onSelectFeature]
  )

  const bboxBounds = useMemo(() => {
    if (!bbox || bbox.length !== 4) return null
    // [min_lon, min_lat, max_lon, max_lat] -> [[min_lat, min_lon], [max_lat, max_lon]]
    return [
      [bbox[1], bbox[0]],
      [bbox[3], bbox[2]],
    ]
  }, [bbox])

  return (
    <div className="relative flex-1 h-full w-full bg-[#06090f] overflow-hidden">
      {/* Processing Banner */}
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-blue-500/50 text-xs font-medium text-blue-200 shadow-xl backdrop-blur-md">
          <Loader2 className="size-3.5 animate-spin text-blue-400" />
          <span>Processing scene chips...</span>
        </div>
      )}

      {/* Leaflet Map */}
      <MapContainer
        center={[48.15, 11.55]}
        zoom={10}
        className="w-full h-full z-10"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={TILE_URL}
          subdomains="abcd"
          maxZoom={20}
        />
        <DrawControl
          onBboxDrawn={onBboxDrawn}
          isDrawTriggered={isDrawTriggered}
          onResetDrawTrigger={onResetDrawTrigger}
        />
        <FlyTo bounds={flyBounds} />

        {/* Stable Active Bounding Box Highlight */}
        {bboxBounds && (
          <Rectangle
            bounds={bboxBounds}
            pathOptions={{
              color: '#38bdf8',
              weight: 2,
              fillColor: '#0284c7',
              fillOpacity: 0.08,
              dashArray: '6 4',
            }}
          />
        )}

        {/* GeoJSON Feature Chips */}
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
