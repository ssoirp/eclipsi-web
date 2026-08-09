"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Vote { id: number; user_id: number; rating: number }
interface User { id: number; name: string }

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
  votes: Vote[];
}

const RATING_OPTIONS = [0, 1, 2, 3, 4, 5];

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
  users,
  showOnlyProposed,
  onTogglePropose,
}: {
  locations: Location[];
  users: User[];
  showOnlyProposed: boolean;
  onTogglePropose: (id: number, current: boolean) => void;
}) {
  const center: [number, number] = [41.48, 0.78];
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);

  function toggleUser(id: number) {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }
  function toggleRating(r: number) {
    setSelectedRatings((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  function matchesVoteFilter(loc: Location) {
    if (selectedUserIds.length === 0 || selectedRatings.length === 0) return true;
    return loc.votes.some(
      (v) => selectedUserIds.includes(v.user_id) && selectedRatings.includes(v.rating || 0)
    );
  }

  const voteFiltered = locations.filter(matchesVoteFilter);
  const visible = voteFiltered.filter((l) => !showOnlyProposed || l.proposat);
  const faded = showOnlyProposed ? [] : voteFiltered.filter((l) => !l.proposat);
  const proposed = voteFiltered.filter((l) => l.proposat);

  const allVisible = [...visible];
  const allMarkers = showOnlyProposed ? proposed : [...proposed, ...faded];
  const voteFilterActive = selectedUserIds.length > 0 && selectedRatings.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-start gap-4 mb-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">
        <div>
          <div className="text-gray-500 dark:text-gray-400 mb-1">Persones</div>
          <div className="flex flex-wrap gap-1">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => toggleUser(u.id)}
                className={`px-2 py-0.5 rounded border ${
                  selectedUserIds.includes(u.id)
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                }`}
              >
                {u.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400 mb-1">Valoracions</div>
          <div className="flex flex-wrap gap-1">
            {RATING_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => toggleRating(r)}
                className={`w-6 h-6 rounded border font-bold ${
                  selectedRatings.includes(r)
                    ? "bg-amber-400 text-white border-amber-400"
                    : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                }`}
                title={r === 0 ? "Sense valorar" : `${r} estrelles`}
              >
                {r === 0 ? "–" : r}
              </button>
            ))}
          </div>
        </div>
        {(selectedUserIds.length > 0 || selectedRatings.length > 0) && (
          <button
            onClick={() => { setSelectedUserIds([]); setSelectedRatings([]); }}
            className="self-end text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
          >
            Netejar filtre
          </button>
        )}
        {voteFilterActive && (
          <span className="self-end text-gray-500 dark:text-gray-400">
            {allMarkers.length} de {locations.length} punts
          </span>
        )}
      </div>

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
    </div>
  );
}
