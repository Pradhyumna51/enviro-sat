import { useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getFeatureColor } from '../utils/colors';
import { renderToString } from 'react-dom/server';
import TilePopup from './TilePopup';
import DrawControl from './DrawControl';
import './MapView.css';

/**
 * FlyTo — helper component that flies the map to given bounds when they change.
 */
function FlyTo({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 14, duration: 0.8 });
    }
  }, [bounds, map]);
  return null;
}

/**
 * MapView — Leaflet map with OpenStreetMap base layer and GeoJSON overlay.
 */
export default function MapView({ geojsonData, mode, flyBounds, onBboxDrawn }) {
  const geojsonRef = useRef(null);
  const geojsonKey = useMemo(() => {
    // Force re-render of GeoJSON layer when data changes
    return geojsonData ? JSON.stringify(geojsonData.metadata || {}) : 'empty';
  }, [geojsonData]);

  const styleFeature = useCallback((feature) => {
    const color = getFeatureColor(feature, mode);
    const isReview = feature.properties.needs_review;
    return {
      fillColor: color,
      fillOpacity: isReview ? 0.3 : 0.65,
      color: isReview ? '#fbbf24' : color,
      weight: isReview ? 1.5 : 1,
      dashArray: isReview ? '6 3' : undefined,
      opacity: 0.9,
    };
  }, [mode]);

  const onEachFeature = useCallback((feature, layer) => {
    const popupContent = renderToString(
      <TilePopup feature={feature} mode={mode} />
    );
    layer.bindPopup(popupContent, {
      className: 'envirosat-popup',
      maxWidth: 300,
      minWidth: 200,
    });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 2.5, fillOpacity: 0.85 });
      layer.bringToFront();
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleFeature(feature));
    });
  }, [mode, styleFeature]);

  return (
    <div className="map-view">
      <MapContainer
        center={[48.15, 11.55]}
        zoom={10}
        className="map-view__container"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
  );
}
