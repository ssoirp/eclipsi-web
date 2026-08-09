"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Espai, CATEGORY_META, statusColor } from "./LleureTypes";

interface Facets { comarques: string[]; municipis: string[]; categories: string[] }

function popupBadge(val: string | null) {
  if (val === "yes") return <span className="text-green-700 font-semibold">si</span>;
  if (val === "no") return <span className="text-red-700 font-semibold">no</span>;
  return <span className="text-gray-500">desconegut</span>;
}

export default function LleureCuracio({
  data,
  facets,
  onUpdate,
  onBulkUpdate,
}: {
  data: Espai[];
  facets: Facets;
  onUpdate: (id: string, patch: Partial<Espai>) => void;
  onBulkUpdate: (ids: string[], patch: Partial<Espai>) => void;
}) {
  const [comarca, setComarca] = useState("");
  const [municipi, setMunicipi] = useState("");
  const [categoria, setCategoria] = useState("");
  const [status, setStatus] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef<Record<string, L.CircleMarker | null>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filtered = data.filter((r) => {
    if (comarca && r.comarca !== comarca) return false;
    if (municipi && r.municipality !== municipi) return false;
    if (categoria && r.category !== categoria) return false;
    if (status && r.curation_status !== status) return false;
    if (selectedOnly && !r.selected) return false;
    return true;
  });

  const municipisForComarca = comarca
    ? [...new Set(data.filter((r) => r.comarca === comarca).map((r) => r.municipality))].sort()
    : facets.municipis;

  const selectFromList = useCallback((id: string) => {
    setHighlightedId(id);
    const r = filtered.find((x) => x.id === id);
    const marker = markerRefs.current[id];
    if (r && marker && mapRef.current) {
      mapRef.current.panTo([r.latitude, r.longitude]);
      marker.openPopup();
    }
  }, [filtered]);

  const selectFromMap = useCallback((id: string) => {
    setHighlightedId(id);
    itemRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  async function setCurationStatus(r: Espai, newStatus: Espai["curation_status"]) {
    const res = await fetch("/api/espais/curation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, status: newStatus }),
    });
    if (res.ok) onUpdate(r.id, { curation_status: newStatus });
  }

  async function setSelected(r: Espai, selected: boolean) {
    const res = await fetch("/api/espais/selected", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, selected }),
    });
    if (res.ok) onUpdate(r.id, { selected });
  }

  async function bulkSetStatus(newStatus: Espai["curation_status"]) {
    if (!comarca && !municipi && !categoria) {
      alert("Selecciona almenys un filtre (comarca, municipi o categoria) abans d'aplicar-ho a tots");
      return;
    }
    const label = newStatus === "interesting" ? "M'interessa" : newStatus === "not_interesting" ? "No m'interessa" : "Pendent";
    if (!confirm(`Marcar els ${filtered.length} llocs visibles com a "${label}"? No s'esborra cap punt, nomes canvia l'estat.`)) return;

    setBulkBusy(true);
    try {
      const res = await fetch("/api/espais/bulk-curation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comarca: comarca || undefined,
          municipality: municipi || undefined,
          category: categoria || undefined,
          status: newStatus,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        onBulkUpdate(json.ids as string[], { curation_status: newStatus });
      } else {
        alert("Error: " + json.error);
      }
    } finally {
      setBulkBusy(false);
    }
  }

  useEffect(() => {
    // neteja refs de marcadors que ja no son visibles
    const visibleIds = new Set(filtered.map((r) => r.id));
    Object.keys(markerRefs.current).forEach((id) => {
      if (!visibleIds.has(id)) delete markerRefs.current[id];
    });
  }, [filtered]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap gap-3 items-center p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-gray-100">
        <label className="flex items-center gap-1">
          Comarca
          <select className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" value={comarca} onChange={(e) => { setComarca(e.target.value); setMunicipi(""); }}>
            <option value="">Totes</option>
            {facets.comarques.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Municipi
          <select className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" value={municipi} onChange={(e) => setMunicipi(e.target.value)}>
            <option value="">Tots</option>
            {municipisForComarca.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Categoria
          <select className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Totes</option>
            {facets.categories.map((c) => <option key={c} value={c}>{CATEGORY_META[c]?.label || c}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Estat
          <select className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tots</option>
            <option value="pending">Pendents</option>
            <option value="interesting">M&apos;interessa</option>
            <option value="not_interesting">No m&apos;interessa</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={selectedOnly} onChange={(e) => setSelectedOnly(e.target.checked)} />
          Nomes seleccionats
        </label>
        <span className="text-gray-600 dark:text-gray-400">{filtered.length} de {data.length} llocs</span>

        {(comarca || municipi || categoria) && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-gray-500 dark:text-gray-400">Marcar els {filtered.length} visibles:</span>
            <button
              disabled={bulkBusy}
              className="border rounded px-2 py-0.5 border-green-700 text-green-700 dark:text-green-400 disabled:opacity-50"
              onClick={() => bulkSetStatus("interesting")}
            >
              M&apos;interessa
            </button>
            <button
              disabled={bulkBusy}
              className="border rounded px-2 py-0.5 border-red-700 text-red-700 dark:text-red-400 disabled:opacity-50"
              onClick={() => bulkSetStatus("not_interesting")}
            >
              No m&apos;interessa
            </button>
            <button
              disabled={bulkBusy}
              className="border rounded px-2 py-0.5 border-gray-400 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              onClick={() => bulkSetStatus("pending")}
            >
              Pendent
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-[1.1] min-w-0">
          <MapContainer
            center={[41.4, 0.9]}
            zoom={9}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtered.map((r) => {
              const color = statusColor(r);
              return (
                <CircleMarker
                  key={r.id}
                  center={[r.latitude, r.longitude]}
                  radius={6}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 1 }}
                  eventHandlers={{ click: () => selectFromMap(r.id) }}
                  ref={(el) => { markerRefs.current[r.id] = el; }}
                >
                  <Popup>
                    <div style={{ minWidth: 200, color: "#111827" }}>
                      <b>{r.name || "(sense nom)"}</b>
                      {r.selected && <span className="ml-1">★</span>}
                      <br />
                      <small>{CATEGORY_META[r.category]?.label || r.category} / {r.subcategory}</small><br />
                      <small>{r.municipality}, {r.comarca}</small>
                      <table className="text-xs mt-1">
                        <tbody>
                          <tr><td className="pr-2">Taules</td><td>{popupBadge(r.tables)}</td></tr>
                          <tr><td className="pr-2">Barbacoa</td><td>{popupBadge(r.barbecue)}</td></tr>
                          <tr><td className="pr-2">WC</td><td>{popupBadge(r.toilets)}</td></tr>
                          <tr><td className="pr-2">Aparcament</td><td>{popupBadge(r.parking)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          {filtered.map((r) => (
            <div
              key={r.id}
              ref={(el) => { itemRefs.current[r.id] = el; }}
              onClick={() => selectFromList(r.id)}
              className={`p-2 border-b border-gray-100 dark:border-gray-800 cursor-pointer text-xs hover:bg-gray-50 dark:hover:bg-gray-800 ${highlightedId === r.id ? "bg-green-50 dark:bg-green-950/40 border-l-4 border-l-green-600" : ""}`}
            >
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                {r.name || "(sense nom)"} {r.selected && "★"}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {CATEGORY_META[r.category]?.label || r.category} / {r.subcategory} — {r.municipality}, {r.comarca}
              </div>
              <div className="flex gap-1 flex-wrap mt-1" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`border rounded px-2 py-0.5 ${r.curation_status === "interesting" ? "bg-green-700 text-white border-green-700" : "border-gray-300 dark:border-gray-600"}`}
                  onClick={() => setCurationStatus(r, "interesting")}
                >
                  M&apos;interessa
                </button>
                <button
                  className={`border rounded px-2 py-0.5 ${r.curation_status === "not_interesting" ? "bg-red-700 text-white border-red-700" : "border-gray-300 dark:border-gray-600"}`}
                  onClick={() => setCurationStatus(r, "not_interesting")}
                >
                  No m&apos;interessa
                </button>
                <button
                  className="border rounded px-2 py-0.5 border-gray-300 dark:border-gray-600"
                  onClick={() => setCurationStatus(r, "pending")}
                >
                  Pendent
                </button>
                <button
                  className={`border rounded px-2 py-0.5 ${r.selected ? "bg-amber-500 text-white border-amber-500" : "border-gray-300 dark:border-gray-600"}`}
                  onClick={() => setSelected(r, !r.selected)}
                >
                  {r.selected ? "★ Seleccionat" : "☆ Seleccionar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
