"use client";

import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ShowcaseLocation, displayName, entornLabel, avgRating } from "./showcaseTypes";

const ENTORN_HEX: Record<string, string> = {
  natura: "#16a34a",
  picnic: "#d97706",
  urba: "#475569",
};

function iconFor(tipus: string) {
  const color = ENTORN_HEX[tipus] || "#6b7280";
  return new L.Icon({
    iconUrl: "data:image/svg+xml," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`
    ),
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

export default function EclipseShowcaseMap({
  locations,
  onOpen,
}: {
  locations: ShowcaseLocation[];
  onOpen: (loc: ShowcaseLocation) => void;
}) {
  const center: [number, number] = [41.48, 0.78];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden" style={{ height: "720px" }}>
      <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            position={[Number(loc.latitud), Number(loc.longitud)]}
            icon={iconFor(loc.tipus_entorn)}
            eventHandlers={{ click: () => onOpen(loc) }}
          >
            <Tooltip direction="top" offset={[0, -36]} opacity={1} className="eclipse-map-tooltip">
              <div style={{ width: 260 }}>
                <div className="relative">
                  {loc.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={loc.images[0].url} alt="" className="w-full h-36 object-cover rounded-t-lg" />
                  ) : (
                    <div className="w-full h-36 rounded-t-lg bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                      sense foto
                    </div>
                  )}
                  {avgRating(loc) > 0 && (
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-sm font-bold px-2 py-0.5 rounded-full">
                      <span style={{ color: "#fbbf24" }}>★</span>
                      {avgRating(loc).toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="px-1 pt-2 pb-1">
                  <div className="text-base font-bold leading-tight" style={{ color: "#111827" }}>{displayName(loc)}</div>
                  <div className="text-xs mb-1.5" style={{ color: "#6b7280" }}>{entornLabel(loc.tipus_entorn)}</div>
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <span style={{ color: "#2563eb" }}>{loc.distancia_min} min</span>
                    <span style={{ color: "#9333ea" }}>{loc.durada_totalitat_s}s totalitat</span>
                  </div>
                </div>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
