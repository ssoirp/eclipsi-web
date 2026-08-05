"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Location {
  id: number;
  nom: string;
  custom_name: string | null;
  latitud: number;
  longitud: number;
  municipi: string;
  durada_totalitat_s: number;
  distancia_km: number;
  proposat: boolean;
  google_maps_url: string;
}

const proposedIcon = new L.Icon({
  iconUrl: "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#16a34a"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`),
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
});

const defaultIcon = new L.Icon({
  iconUrl: "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#9ca3af"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`),
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
});

export default function EclipseMap({
  locations,
  showOnlyProposed,
  onTogglePropose,
}: {
  locations: Location[];
  showOnlyProposed: boolean;
  onTogglePropose: (id: number, current: boolean) => void;
}) {
  const center: [number, number] = [41.48, 0.78];

  const visible = locations.filter((l) => !showOnlyProposed || l.proposat);
  const faded = showOnlyProposed ? [] : locations.filter((l) => !l.proposat);
  const proposed = locations.filter((l) => l.proposat);

  const allVisible = [...visible];
  const allMarkers = showOnlyProposed ? proposed : [...proposed, ...faded];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden" style={{ height: "500px" }}>
      <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {allMarkers.map((loc) => (
          <Marker
            key={loc.id}
            position={[Number(loc.latitud), Number(loc.longitud)]}
            icon={loc.proposat ? proposedIcon : defaultIcon}
            opacity={!showOnlyProposed && !loc.proposat ? 0.4 : 1}
          >
            <Popup>
              <div className="text-sm min-w-[180px]">
                <div className="font-bold">{loc.custom_name || loc.nom}</div>
                {loc.municipi && <div className="text-gray-500 text-xs">{loc.municipi}</div>}
                <div className="mt-1 text-xs space-y-0.5">
                  <div>Distància: {loc.distancia_km} km</div>
                  <div>Durada totalitat: {loc.durada_totalitat_s}s</div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => onTogglePropose(loc.id, loc.proposat)}
                    className={`text-xs px-2 py-0.5 rounded ${loc.proposat ? "bg-green-500 text-white" : "bg-gray-200"}`}
                  >
                    {loc.proposat ? "Proposat ✓" : "Proposar"}
                  </button>
                  <a
                    href={loc.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Google Maps
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
