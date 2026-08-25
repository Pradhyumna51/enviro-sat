import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { getFeatureColor } from '@/utils/colors'
import { renderToString } from 'react-dom/server'
import TilePopup from './TilePopup'
import DrawControl from './DrawControl'

/**
 * Helper component that smoothly flies the map to given bounds on selection change.
 */
function FlyTo({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14, duration: 1.0 })
    }
  }, [bounds, map])
  return null
}

/**
 * MapView — High-performance Leaflet container with Dark CartoDB basemap and calibrated GeoJSON chip overlays.
 */
export default function MapView({ geojsonData, mode, flyBounds, onBboxDrawn }) {
  const geojsonRef = useRef(null)
  const geojsonKey = useMemo(() => {
    return geojsonData ? JSON.stringify(geojsonData.metadata || {}) : 'empty'
  }, [geojsonData])

  const styleFeature = useCallback((feature) => {
    const color = getFeatureColor(feature, mode)
    const isReview = feature.properties.needs_review
    return {
      fillColor: color,
      fillOpacity: isReview ? 0.35 : 0.72,
      color: isReview ? '#fbbf24' : color,
      weight: isReview ? 2 : 1,
      dashArray: isReview ? '5 4' : undefined,
      opacity: 0.95,
    }
  }, [mode])

  const onEachFeature = useCallback((feature, layer) => {
    const popupContent = renderToString(
      <TilePopup feature={feature} mode={mode} />
    )
    layer.bindPopup(popupContent, {
      className: 'envirosat-popup',
      maxWidth: 320,
      minWidth: 240,
    })

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.9, color: '#ffffff' })
      layer.bringToFront()
    })
    layer.on('mouseout', () => {
      layer.setStyle(styleFeature(feature))
    })
  }, [mode, styleFeature])

  return (
    <div className="relative flex-1 h-full w-full bg-slate-950 overflow-hidden">
      <MapContainer
        center={[48.15, 11.55]}
        zoom={10}
        className="w-full h-full z-10"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <DrawControl onBboxDrawn={onBboxDrawn} />
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
