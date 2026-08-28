import { useEffect, useRef, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

/**
 * DrawControl — Rectangular bounding box drafting tool.
 */
export default function DrawControl({ onBboxDrawn, isDrawTriggered, onResetDrawTrigger }) {
  const map = useMap()
  const isDrawingRef = useRef(false)
  const startPointRef = useRef(null)
  const previewRectRef = useRef(null)
  const btnRef = useRef(null)

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false
    startPointRef.current = null
    map.getContainer().style.cursor = ''
    map.dragging.enable()
    if (btnRef.current) {
      btnRef.current.style.background = '#0f172a'
      btnRef.current.style.color = '#94a3b8'
      btnRef.current.style.borderColor = '#334155'
    }
    if (previewRectRef.current) {
      map.removeLayer(previewRectRef.current)
      previewRectRef.current = null
    }
  }, [map])

  const startDrawing = useCallback(() => {
    isDrawingRef.current = true
    map.getContainer().style.cursor = 'crosshair'
    if (btnRef.current) {
      btnRef.current.style.background = '#2563eb'
      btnRef.current.style.color = '#ffffff'
      btnRef.current.style.borderColor = '#3b82f6'
    }
  }, [map])

  // Programmatic draw triggering
  useEffect(() => {
    if (isDrawTriggered) {
      startDrawing()
      if (onResetDrawTrigger) onResetDrawTrigger()
    }
  }, [isDrawTriggered, startDrawing, onResetDrawTrigger])

  useEffect(() => {
    const DrawRectControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd() {
        const container = L.DomUtil.create(
          'div',
          'leaflet-bar leaflet-control envirosat-draw-control'
        )
        const btn = L.DomUtil.create('a', 'envirosat-draw-btn', container)
        btnRef.current = btn
        btn.href = '#'
        btn.title = 'Draw Custom Bounding Box (Click and drag on map)'
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" stroke-dasharray="3 3"/><circle cx="3" cy="3" r="1.5" fill="currentColor"/><circle cx="21" cy="3" r="1.5" fill="currentColor"/><circle cx="21" cy="21" r="1.5" fill="currentColor"/><circle cx="3" cy="21" r="1.5" fill="currentColor"/></svg>`
        btn.style.cssText =
          'display:flex;align-items:center;justify-content:center;width:32px;height:32px;text-decoration:none;background:#0f172a;color:#94a3b8;border:1px solid #334155;border-radius:6px;cursor:pointer;transition:all 0.15s;'

        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.stop(e)
          if (isDrawingRef.current) {
            stopDrawing()
          } else {
            startDrawing()
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
          fillColor: '#0284c7',
          fillOpacity: 0.18,
          dashArray: '5 3',
        }).addTo(map)
      }
    }

    const onMouseUp = (e) => {
      if (!isDrawingRef.current || !startPointRef.current) return

      const bounds = L.latLngBounds(startPointRef.current, e.latlng)
      stopDrawing()

      // Calculate normalized bbox [min_lon, min_lat, max_lon, max_lat]
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      let minLon = Math.min(sw.lng, ne.lng)
      let maxLon = Math.max(sw.lng, ne.lng)
      let minLat = Math.min(sw.lat, ne.lat)
      let maxLat = Math.max(sw.lat, ne.lat)

      if (maxLon - minLon < 0.01) maxLon = minLon + 0.08
      if (maxLat - minLat < 0.01) maxLat = minLat + 0.08

      const bbox = [
        Math.round(minLon * 1e5) / 1e5,
        Math.round(minLat * 1e5) / 1e5,
        Math.round(maxLon * 1e5) / 1e5,
        Math.round(maxLat * 1e5) / 1e5,
      ]

      if (onBboxDrawn) {
        onBboxDrawn(bbox)
      }
    }

    map.on('mousedown', onMouseDown)
    map.on('mousemove', onMouseMove)
    map.on('mouseup', onMouseUp)

    return () => {
      map.removeControl(control)
      map.off('mousedown', onMouseDown)
      map.off('mousemove', onMouseMove)
      map.off('mouseup', onMouseUp)
      if (previewRectRef.current) {
        map.removeLayer(previewRectRef.current)
      }
    }
  }, [map, startDrawing, stopDrawing, onBboxDrawn])

  return null
}
