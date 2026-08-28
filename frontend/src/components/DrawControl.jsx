import { useEffect, useRef, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

/**
 * DrawControl — Tactical AOI rectangle drawing tool for Sentinel-2 spatial targeting.
 * Integrates directly with Leaflet DOM and exposes smooth crosshair and holographic bounds.
 */
export default function DrawControl({ onBboxDrawn, isDrawTriggered, onResetDrawTrigger }) {
  const map = useMap()
  const drawnLayerRef = useRef(null)
  const isDrawingRef = useRef(false)
  const startPointRef = useRef(null)
  const previewRectRef = useRef(null)

  const clearPrevious = useCallback(() => {
    if (drawnLayerRef.current) {
      map.removeLayer(drawnLayerRef.current)
      drawnLayerRef.current = null
    }
    if (previewRectRef.current) {
      map.removeLayer(previewRectRef.current)
      previewRectRef.current = null
    }
  }, [map])

  // Programmatic draw triggering from Sidebar
  useEffect(() => {
    if (isDrawTriggered) {
      isDrawingRef.current = true
      map.getContainer().style.cursor = 'crosshair'
      const btn = document.querySelector('.envirosat-draw-btn')
      if (btn) {
        btn.style.background = 'rgba(6, 182, 212, 0.25)'
        btn.style.color = '#38bdf8'
        btn.style.borderColor = 'rgba(56, 189, 248, 0.6)'
        btn.style.boxShadow = '0 0 16px rgba(6, 182, 212, 0.4)'
      }
      if (onResetDrawTrigger) onResetDrawTrigger()
    }
  }, [isDrawTriggered, map, onResetDrawTrigger])

  useEffect(() => {
    // Custom draw-rectangle control
    const DrawRectControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd() {
        const container = L.DomUtil.create(
          'div',
          'leaflet-bar leaflet-control envirosat-draw-control'
        )
        const btn = L.DomUtil.create('a', 'envirosat-draw-btn', container)
        btn.href = '#'
        btn.title = 'Define Custom AOI Bounding Box (Click & Drag on Map)'
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="3" stroke-dasharray="4 3"/><circle cx="3" cy="3" r="2" fill="currentColor"/><circle cx="21" cy="3" r="2" fill="currentColor"/><circle cx="21" cy="21" r="2" fill="currentColor"/><circle cx="3" cy="21" r="2" fill="currentColor"/></svg>`
        btn.style.cssText =
          'display:flex;align-items:center;justify-content:center;width:34px;height:34px;text-decoration:none;background:rgba(10,15,28,0.85);color:#94a3b8;border:1px solid rgba(255,255,255,0.12);border-radius:9999px;cursor:pointer;transition:all 0.2s cubic-bezier(0.16,1,0.3,1);backdrop-filter:blur(16px);box-shadow:0 12px 25px rgba(0,0,0,0.5);margin-top:1.25rem;margin-left:1.25rem;'

        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.stop(e)
          if (isDrawingRef.current) {
            isDrawingRef.current = false
            btn.style.background = 'rgba(10,15,28,0.85)'
            btn.style.color = '#94a3b8'
            btn.style.borderColor = 'rgba(255,255,255,0.12)'
            btn.style.boxShadow = '0 12px 25px rgba(0,0,0,0.5)'
            map.getContainer().style.cursor = ''
            clearPrevious()
          } else {
            isDrawingRef.current = true
            btn.style.background = 'rgba(6, 182, 212, 0.25)'
            btn.style.color = '#38bdf8'
            btn.style.borderColor = 'rgba(56, 189, 248, 0.6)'
            btn.style.boxShadow = '0 0 16px rgba(6, 182, 212, 0.4)'
            map.getContainer().style.cursor = 'crosshair'
          }
        })

        return container
      },
    })

    const control = new DrawRectControl()
    map.addControl(control)

    const onMouseDown = (e) => {
      if (!isDrawingRef.current) return
      startPointRef.current = e.latlng
      map.dragging.disable()
    }

    const onMouseMove = (e) => {
      if (!isDrawingRef.current || !startPointRef.current) return
      const bounds = L.latLngBounds(startPointRef.current, e.latlng)
      if (previewRectRef.current) {
        previewRectRef.current.setBounds(bounds)
      } else {
        previewRectRef.current = L.rectangle(bounds, {
          color: '#38bdf8',
          weight: 2,
          fillOpacity: 0.15,
          dashArray: '6 4',
        }).addTo(map)
      }
    }

    const onMouseUp = (e) => {
      if (!isDrawingRef.current || !startPointRef.current) return
      map.dragging.enable()

      const bounds = L.latLngBounds(startPointRef.current, e.latlng)
      startPointRef.current = null
      isDrawingRef.current = false
      map.getContainer().style.cursor = ''

      // Reset button style
      const btn = document.querySelector('.envirosat-draw-btn')
      if (btn) {
        btn.style.background = 'rgba(10,15,28,0.85)'
        btn.style.color = '#94a3b8'
        btn.style.borderColor = 'rgba(255,255,255,0.12)'
        btn.style.boxShadow = '0 12px 25px rgba(0,0,0,0.5)'
      }

      // Clear preview
      clearPrevious()

      // Draw glowing persistent AOI boundary rectangle
      drawnLayerRef.current = L.rectangle(bounds, {
        color: '#06b6d4',
        weight: 2,
        fillColor: '#06b6d4',
        fillOpacity: 0.08,
        dashArray: '8 4',
      }).addTo(map)

      // Emit normalized bbox [min_lon, min_lat, max_lon, max_lat]
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      let minLon = Math.min(sw.lng, ne.lng)
      let maxLon = Math.max(sw.lng, ne.lng)
      let minLat = Math.min(sw.lat, ne.lat)
      let maxLat = Math.max(sw.lat, ne.lat)

      if (maxLon - minLon < 0.01) maxLon = minLon + 0.10
      if (maxLat - minLat < 0.01) maxLat = minLat + 0.10

      const bbox = [
        Math.round(minLon * 1e6) / 1e6,
        Math.round(minLat * 1e6) / 1e6,
        Math.round(maxLon * 1e6) / 1e6,
        Math.round(maxLat * 1e6) / 1e6,
      ]
      onBboxDrawn(bbox)
    }

    map.on('mousedown', onMouseDown)
    map.on('mousemove', onMouseMove)
    map.on('mouseup', onMouseUp)

    return () => {
      map.removeControl(control)
      map.off('mousedown', onMouseDown)
      map.off('mousemove', onMouseMove)
      map.off('mouseup', onMouseUp)
      clearPrevious()
    }
  }, [map, onBboxDrawn, clearPrevious])

  return null
}
