"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Espai, CATEGORY_META } from "./LleureTypes";

function popupBadge(val: string | null) {
  if (val === "yes") return <span className="text-green-700 font-semibold">si</span>;
  if (val === "no") return <span className="text-red-700 font-semibold">no</span>;
  return <span className="text-gray-500">desconegut</span>;
}

export default function LleureMapGeneral({ data }: { data: Espai[] }) {
  const center: [number, number] = [41.4, 0.9];

  return (
    <MapContainer center={center} zoom={9} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {data.map((r) => {
        const color = CATEGORY_META[r.category]?.color || "#888";
        return (
          <CircleMarker
            key={r.id}
            center={[r.latitude, r.longitude]}
            radius={5}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 1 }}
          >
            <Popup>
              <div style={{ minWidth: 200, color: "#111827" }}>
                <b>{r.name || "(sense nom)"}</b>
                {r.possible_duplicate && (
                  <span className="ml-1 text-xs bg-orange-500 text-white px-1 rounded">possible duplicat</span>
                )}
                <br />
                <small>
                  {CATEGORY_META[r.category]?.label || r.category} / {r.subcategory}
                </small>
                <br />
                <small>{r.municipality}, {r.comarca}</small>
                <br />
                <small>{r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}</small>
                <table className="text-xs mt-1">
                  <tbody>
                    <tr><td className="pr-2">Taules</td><td>{popupBadge(r.tables)}</td></tr>
                    <tr><td className="pr-2">Barbacoa</td><td>{popupBadge(r.barbecue)}</td></tr>
                    <tr><td className="pr-2">Font/aigua</td><td>{popupBadge(r.drinking_water)}</td></tr>
                    <tr><td className="pr-2">WC</td><td>{popupBadge(r.toilets)}</td></tr>
                    <tr><td className="pr-2">Aparcament</td><td>{popupBadge(r.parking)}</td></tr>
                    <tr><td className="pr-2">Acampada</td><td>{popupBadge(r.camping)}</td></tr>
                    <tr><td className="pr-2">Accessibilitat</td><td>{popupBadge(r.accessibility)}</td></tr>
                  </tbody>
                </table>
                <small>
                  Confiança: <b>{r.confidence_score}</b> | Font: {(r.sources || []).join(", ") || "desconegut"}
                  {(r.source_urls || []).map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer" className="ml-1 underline">
                      font
                    </a>
                  ))}
                </small>
                <br />
                <small>ID: {r.id} {r.osm_id ? `| OSM: ${r.osm_id}` : ""}</small>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
