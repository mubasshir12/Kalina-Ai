import React from 'react';
import { Location } from '../types';

interface InteractiveMapProps {
    locations: Location[];
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ locations }) => {
    if (!locations || locations.length === 0) return null;

    // This HTML document will be rendered inside the iframe. It includes Leaflet.js
    // from a CDN and contains the necessary JavaScript to create an interactive map.
    const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Nearby Locations</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
        <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            #map { height: 100vh; width: 100vw; }
            .leaflet-popup-content-wrapper { border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.15); }
            .leaflet-popup-content { font-size: 13px; line-height: 1.5; }
            .leaflet-popup-content p { margin: 0.5em 0; }
            .leaflet-popup-content b { font-size: 14px; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            try {
                const locations = ${JSON.stringify(locations)};
                const map = L.map('map');

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);

                const markers = [];
                locations.forEach(loc => {
                    if (loc.lat && loc.lon) {
                        const marker = L.marker([loc.lat, loc.lon]);
                        const popupContent = \`<b>\${loc.name || ''}</b><br>\${loc.details || ''}\`;
                        marker.bindPopup(popupContent);
                        
                        marker.on('mouseover', function (e) {
                            this.openPopup();
                        });
                        marker.on('mouseout', function (e) {
                            this.closePopup();
                        });

                        marker.addTo(map);
                        markers.push(marker);
                    }
                });

                if (markers.length > 0) {
                    const group = new L.featureGroup(markers);
                    map.fitBounds(group.getBounds().pad(0.3));
                } else if (locations.length > 0 && locations[0].lat && locations[0].lon) {
                    map.setView([locations[0].lat, locations[0].lon], 13);
                } else {
                    map.setView([51.505, -0.09], 2); // Fallback view
                }
            } catch (e) {
                document.body.innerHTML = '<p>Error loading map: ' + e.message + '</p>';
            }
        </script>
    </body>
    </html>
    `;

    return (
        <div className="my-4 rounded-lg overflow-hidden border border-neutral-200 dark:border-gray-700 shadow-md w-full max-w-sm h-64">
            <iframe
                srcDoc={mapHtml}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                title="Nearby Locations Map"
                sandbox="allow-scripts allow-popups"
            />
        </div>
    );
};

export default InteractiveMap;
