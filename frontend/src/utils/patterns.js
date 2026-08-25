/**
 * SVG pattern utilities for low-confidence tile styling.
 * Creates diagonal-hatch patterns that Leaflet can render via CSS.
 */

/**
 * Inject a reusable SVG hatch pattern into the DOM (once).
 * Leaflet polygons with `needs_review: true` reference this via className.
 */
export function injectHatchPattern() {
  if (document.getElementById('envirosat-hatch-defs')) return;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('id', 'envirosat-hatch-defs');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.pointerEvents = 'none';

  svg.innerHTML = `
    <defs>
      <pattern id="hatch-pattern" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.45)" stroke-width="2" />
      </pattern>
    </defs>
  `;

  document.body.appendChild(svg);
}
