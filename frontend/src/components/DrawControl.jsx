import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * DrawControl — lets users draw a rectangle on the map to define a bounding box.
 * Uses native Leaflet (no geoman dependency) for a lightweight rectangle draw tool.
 */
export default function DrawControl({ onBboxDrawn }) {
  const map = useMap();
  const drawnLayerRef = useRef(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef(null);
  const previewRectRef = useRef(null);

  const clearPrevious = useCallback(() => {
    if (drawnLayerRef.current) {
      map.removeLayer(drawnLayerRef.current);
      drawnLayerRef.current = null;
    }
    if (previewRectRef.current) {
      map.removeLayer(previewRectRef.current);
      previewRectRef.current = null;
    }
  }, [map]);

  useEffect(() => {
    // Custom draw-rectangle control
    const DrawRectControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control envirosat-draw-control');
        const btn = L.DomUtil.create('a', 'envirosat-draw-btn', container);
        btn.href = '#';
        btn.title = 'Draw bounding box';
        btn.innerHTML = '⬜';
        btn.style.cssText = 'font-size:18px;display:flex;align-items:center;justify-content:center;width:34px;height:34px;text-decoration:none;background:#1e293b;color:#e2e8f0;border:none;cursor:crosshair;';

        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.stop(e);
          if (isDrawingRef.current) {
            // Cancel drawing
            isDrawingRef.current = false;
            btn.style.background = '#1e293b';
            map.getContainer().style.cursor = '';
            clearPrevious();
          } else {
            isDrawingRef.current = true;
            btn.style.background = '#3b82f6';
            map.getContainer().style.cursor = 'crosshair';
          }
        });

        return container;
      },
    });

    const control = new DrawRectControl();
    map.addControl(control);

    const onMouseDown = (e) => {
      if (!isDrawingRef.current) return;
      startPointRef.current = e.latlng;
      map.dragging.disable();
    };

    const onMouseMove = (e) => {
      if (!isDrawingRef.current || !startPointRef.current) return;
      const bounds = L.latLngBounds(startPointRef.current, e.latlng);
      if (previewRectRef.current) {
        previewRectRef.current.setBounds(bounds);
      } else {
        previewRectRef.current = L.rectangle(bounds, {
          color: '#3b82f6',
          weight: 2,
          fillOpacity: 0.1,
          dashArray: '6 3',
        }).addTo(map);
      }
    };

    const onMouseUp = (e) => {
      if (!isDrawingRef.current || !startPointRef.current) return;
      map.dragging.enable();

      const bounds = L.latLngBounds(startPointRef.current, e.latlng);
      startPointRef.current = null;
      isDrawingRef.current = false;
      map.getContainer().style.cursor = '';

      // Update control button style
      const btn = document.querySelector('.envirosat-draw-btn');
      if (btn) btn.style.background = '#1e293b';

      // Clear previous drawing
      clearPrevious();

      // Draw final rectangle
      drawnLayerRef.current = L.rectangle(bounds, {
        color: '#3b82f6',
        weight: 2,
        fillOpacity: 0.08,
        dashArray: '8 4',
      }).addTo(map);

      // Emit bbox [min_lon, min_lat, max_lon, max_lat]
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const bbox = [
        Math.round(sw.lng * 1e6) / 1e6,
        Math.round(sw.lat * 1e6) / 1e6,
        Math.round(ne.lng * 1e6) / 1e6,
        Math.round(ne.lat * 1e6) / 1e6,
      ];
      onBboxDrawn(bbox);
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => {
      map.removeControl(control);
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      clearPrevious();
    };
  }, [map, onBboxDrawn, clearPrevious]);

  // Expose a way to programmatically set a rectangle
  useEffect(() => {
    // This hook is purely side-effect-based; no rendering.
  }, []);

  return null;
}
