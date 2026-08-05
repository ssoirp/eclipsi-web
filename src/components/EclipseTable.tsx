"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";

const EclipseMap = dynamic(() => import("./EclipseMap"), { ssr: false });

interface Vote { id: number; user_id: number; rating: number }
interface ImageRecord { id: number; url: string }

interface Location {
  id: number;
  nom: string;
  custom_name: string | null;
  municipi: string;
  tipus_eclipsi: string;
  inici_eclipsi: string;
  inici_totalitat: string;
  maxim_eclipsi: string;
  final_totalitat: string;
  final_eclipsi: string;
  durada_totalitat_s: number;
  magnitud: number;
  obscuracio: string;
  distancia_km: number;
  distancia_min: number;
  latitud: number;
  longitud: number;
  google_maps_url: string;
  proposat: boolean;
  descartat: boolean;
  notes: string;
  tipus_entorn: string;
  votes: Vote[];
  images: ImageRecord[];
}

interface User { id: number; name: string; is_admin: boolean }

type SortKey = "nom" | "distancia_km" | "distancia_min" | "durada_totalitat_s" | "inici_totalitat" | "magnitud" | "avg_rating";
type ViewMode = "table" | "map";

export default function EclipseTable() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("distancia_km");
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: number; field: string } | null>(null);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [showOnlyProposed, setShowOnlyProposed] = useState(false);
  const [hideDiscarded, setHideDiscarded] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/locations");
    const data = await res.json();
    setLocations(data.locations || []);
    setUsers(data.users || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (!data.locations || data.locations.length === 0) {
        await fetch("/api/setup", { method: "POST" });
        await fetchData();
      } else {
        setLocations(data.locations);
        setUsers(data.users);
        setLoading(false);
      }
    }
    init();
  }, [fetchData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const avgRating = (loc: Location) => {
    if (!loc.votes.length) return 0;
    return loc.votes.reduce((s, v) => s + (v.rating || 0), 0) / loc.votes.length;
  };

  const sorted = [...locations]
    .filter((l) => (!showOnlyProposed || l.proposat) && (!hideDiscarded || !l.descartat))
    .sort((a, b) => {
      let av: number | string, bv: number | string;
      if (sortKey === "avg_rating") { av = avgRating(a); bv = avgRating(b); }
      else if (sortKey === "nom") { av = displayName(a).toLowerCase(); bv = displayName(b).toLowerCase(); }
      else { av = a[sortKey] as number; bv = b[sortKey] as number; }
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

  // --- API helpers ---

  const updateField = async (locationId: number, field: string, value: string | number | boolean) => {
    await fetch("/api/location-update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: locationId, field, value }),
    });
    setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, [field]: value } : loc));
    setEditing(null);
  };

  const saveCustomName = async (locationId: number, customName: string) => {
    await fetch("/api/custom-name", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: locationId, custom_name: customName || null }),
    });
    setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, custom_name: customName || null } : loc));
    setEditing(null);
  };

  const saveNote = async (locationId: number, notes: string) => {
    await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: locationId, notes }),
    });
    setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, notes } : loc));
    setEditing(null);
  };

  const saveUserName = async (userId: number, name: string) => {
    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, name }),
    });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, name } : u));
    setEditingUser(null);
  };

  const saveEntorn = async (locationId: number, tipus_entorn: string) => {
    await fetch("/api/entorn", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: locationId, tipus_entorn }),
    });
    setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, tipus_entorn } : loc));
  };

  const setRating = async (userId: number, locationId: number, rating: number) => {
    await fetch("/api/votes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, location_id: locationId, rating }),
    });
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === locationId
          ? { ...loc, votes: loc.votes.map((v) => v.user_id === userId ? { ...v, rating } : v) }
          : loc
      )
    );
  };

  const togglePropose = async (locationId: number, current: boolean) => {
    await updateField(locationId, "descartat", false);
    await fetch("/api/propose", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: locationId, proposat: !current }),
    });
    setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, proposat: !current, descartat: false } : loc));
  };

  const toggleDiscard = async (locationId: number, current: boolean) => {
    const newVal = !current;
    await updateField(locationId, "descartat", newVal);
    if (newVal) {
      await fetch("/api/propose", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId, proposat: false }),
      });
      setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, proposat: false } : loc));
    }
  };

  const uploadImage = async (locationId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("location_id", String(locationId));
    await fetch("/api/images", { method: "POST", body: formData });
    await fetchData();
  };

  const deleteImage = async (id: number, url: string) => {
    await fetch("/api/images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, url }),
    });
    await fetchData();
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return " ↕";
    return sortAsc ? " ↑" : " ↓";
  };

  const isEditing = (id: number, field: string) => editing?.id === id && editing?.field === field;

  if (loading) return <div className="text-center py-12 text-gray-500">Carregant dades...</div>;

  return (
    <div>
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl" />
        </div>
      )}

      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
          <button onClick={() => setViewMode("table")} className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "table" ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>Taula</button>
          <button onClick={() => setViewMode("map")} className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "map" ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>Mapa</button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showOnlyProposed} onChange={() => setShowOnlyProposed(!showOnlyProposed)} className="rounded" />
          Només proposats
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hideDiscarded} onChange={() => setHideDiscarded(!hideDiscarded)} className="rounded" />
          Amagar descartats
        </label>
        <span className="text-sm text-gray-400">{sorted.length} de {locations.length} punts</span>
      </div>

      {viewMode === "map" ? (
        <EclipseMap locations={locations} showOnlyProposed={showOnlyProposed} onTogglePropose={togglePropose} />
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 px-2 py-2 text-left font-medium whitespace-nowrap min-w-[180px] border-r border-gray-200 dark:border-gray-700">
                  <span className="cursor-pointer hover:text-blue-600" onClick={() => handleSort("nom")}>Localització{sortIcon("nom")}</span>
                </th>
                <th className="px-1 py-2 text-center font-medium whitespace-nowrap" title="Proposat">P</th>
                <th className="px-1 py-2 text-center font-medium whitespace-nowrap" title="Descartat">D</th>
                <th className="px-1 py-2 text-center font-medium whitespace-nowrap" title="Urbà / Picnic / Natura">Ent.</th>
                <th className="px-1 py-2 text-center font-medium whitespace-nowrap">Foto</th>
                <th className="px-2 py-2 text-right font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("distancia_km")}>km{sortIcon("distancia_km")}</th>
                <th className="px-2 py-2 text-right font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("distancia_min")}>min{sortIcon("distancia_min")}</th>
                <th className="px-2 py-2 text-center font-medium whitespace-nowrap">Inici ecl.</th>
                <th className="px-2 py-2 text-center font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("inici_totalitat")}>Inici tot.{sortIcon("inici_totalitat")}</th>
                <th className="px-2 py-2 text-center font-medium whitespace-nowrap">Fi tot.</th>
                <th className="px-2 py-2 text-center font-medium whitespace-nowrap">Fi ecl.</th>
                <th className="px-2 py-2 text-right font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("durada_totalitat_s")}>Dur.(s){sortIcon("durada_totalitat_s")}</th>
                <th className="px-2 py-2 text-right font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("magnitud")}>Mag.{sortIcon("magnitud")}</th>
                {users.map((user) => (
                  <th key={user.id} className="px-1 py-2 text-center font-medium whitespace-nowrap min-w-[70px]">
                    {editingUser === user.id ? (
                      <input defaultValue={user.name} className="w-16 px-1 py-0.5 text-[10px] border rounded dark:bg-gray-700 dark:border-gray-600"
                        onBlur={(e) => saveUserName(user.id, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveUserName(user.id, (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingUser(null); }}
                        autoFocus />
                    ) : (
                      <span className="cursor-pointer hover:text-blue-600 text-[10px]" onClick={() => setEditingUser(user.id)} title="Clic per canviar nom">{user.name}</span>
                    )}
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("avg_rating")}>Mitj.{sortIcon("avg_rating")}</th>
                <th className="px-2 py-2 text-left font-medium whitespace-nowrap min-w-[100px]">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((loc) => {
                const firstImg = loc.images?.[0];
                const avg = avgRating(loc);
                const rowClass = loc.descartat
                  ? "border-b border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-900/20 opacity-60"
                  : loc.proposat
                    ? "border-b border-green-200 dark:border-green-900 bg-green-50/60 dark:bg-green-900/15"
                    : "border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50";
                return (
                  <tr key={loc.id} className={rowClass}>
                    {/* Sticky name */}
                    <td className={`sticky left-0 z-10 px-2 py-1.5 border-r border-gray-200 dark:border-gray-700 ${loc.descartat ? "bg-red-50 dark:bg-red-950" : loc.proposat ? "bg-green-50 dark:bg-green-950" : "bg-white dark:bg-gray-900"}`}>
                      {isEditing(loc.id, "nom") ? (
                        <input defaultValue={loc.custom_name || loc.nom} className="w-full px-1 py-0.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                          onBlur={(e) => saveCustomName(loc.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveCustomName(loc.id, (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditing(null); }}
                          autoFocus />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className={`cursor-pointer hover:text-blue-600 font-medium truncate max-w-[150px] ${loc.descartat ? "line-through text-red-400" : ""}`}
                            onClick={() => setEditing({ id: loc.id, field: "nom" })}
                            title={`${loc.nom}${loc.custom_name ? ` (original: ${loc.nom})` : ""} — clic per editar`}>
                            {displayName(loc)}
                          </span>
                          <a href={loc.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600 shrink-0" title="Google Maps">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </a>
                        </div>
                      )}
                      {isEditing(loc.id, "municipi") ? (
                        <input defaultValue={loc.municipi || ""} className="w-full px-1 py-0.5 text-[10px] border rounded dark:bg-gray-700 dark:border-gray-600 mt-0.5"
                          placeholder="Municipi..."
                          onBlur={(e) => updateField(loc.id, "municipi", e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") updateField(loc.id, "municipi", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditing(null); }}
                          autoFocus />
                      ) : (
                        <div className="text-[10px] text-gray-400 truncate cursor-pointer hover:text-blue-500" onClick={() => setEditing({ id: loc.id, field: "municipi" })} title="Clic per editar municipi">
                          {loc.municipi || "—"}
                        </div>
                      )}
                    </td>

                    {/* Propose */}
                    <td className="px-1 py-1.5 text-center">
                      <button onClick={() => togglePropose(loc.id, loc.proposat)}
                        className={`w-5 h-5 rounded text-[10px] font-bold ${loc.proposat ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"}`}
                        title={loc.proposat ? "Desproposar" : "Proposar"}>
                        {loc.proposat ? "✓" : ""}
                      </button>
                    </td>

                    {/* Discard */}
                    <td className="px-1 py-1.5 text-center">
                      <button onClick={() => toggleDiscard(loc.id, loc.descartat)}
                        className={`w-5 h-5 rounded text-[10px] font-bold ${loc.descartat ? "bg-red-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"}`}
                        title={loc.descartat ? "Recuperar" : "Descartar"}>
                        {loc.descartat ? "✗" : ""}
                      </button>
                    </td>

                    {/* Environment */}
                    <td className="px-1 py-1.5 text-center">
                      <select value={loc.tipus_entorn || ""} onChange={(e) => saveEntorn(loc.id, e.target.value)}
                        className="text-[10px] bg-transparent border border-gray-200 dark:border-gray-600 rounded px-0.5 py-0.5 cursor-pointer w-[52px]"
                        title="Urbà = al mig d'un poble · Picnic = entorn natural urbanitzat · Natura = al mig del no res">
                        <option value="">—</option>
                        <option value="urba">Urbà</option>
                        <option value="picnic">Picnic</option>
                        <option value="natura">Natura</option>
                      </select>
                    </td>

                    {/* Image */}
                    <td className="px-1 py-1">
                      <div className="flex items-center gap-1">
                        {firstImg ? (
                          <div className="relative group">
                            <img src={firstImg.url} alt="" className="w-10 h-10 object-cover rounded cursor-pointer border border-gray-200 dark:border-gray-600 hover:opacity-80 transition-opacity"
                              onClick={() => setLightboxImg(firstImg.url)} />
                            {loc.images.length > 1 && <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center">{loc.images.length}</span>}
                            <button onClick={() => deleteImage(firstImg.id, firstImg.url)} className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] rounded-full hidden group-hover:flex items-center justify-center leading-none">x</button>
                          </div>
                        ) : null}
                        <label className="cursor-pointer text-gray-300 hover:text-blue-500 text-lg leading-none" title="Pujar imatge">
                          +<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(loc.id, f); }} />
                        </label>
                      </div>
                    </td>

                    {/* km - editable */}
                    <EditableCell id={loc.id} field="distancia_km" value={loc.distancia_km} type="number"
                      editing={editing} setEditing={setEditing} onSave={updateField} align="right" />

                    {/* min - editable */}
                    <EditableCell id={loc.id} field="distancia_min" value={loc.distancia_min} type="number"
                      editing={editing} setEditing={setEditing} onSave={updateField} align="right" />

                    {/* Inici eclipsi - editable */}
                    <EditableCell id={loc.id} field="inici_eclipsi" value={loc.inici_eclipsi} type="text"
                      editing={editing} setEditing={setEditing} onSave={updateField} align="center" />

                    {/* Inici totalitat - editable */}
                    <EditableCell id={loc.id} field="inici_totalitat" value={loc.inici_totalitat} type="text"
                      editing={editing} setEditing={setEditing} onSave={updateField} align="center" />

                    {/* Final totalitat - editable */}
                    <EditableCell id={loc.id} field="final_totalitat" value={loc.final_totalitat} type="text"
                      editing={editing} setEditing={setEditing} onSave={updateField} align="center" />

                    {/* Final eclipsi - editable */}
                    <EditableCell id={loc.id} field="final_eclipsi" value={loc.final_eclipsi} type="text"
                      editing={editing} setEditing={setEditing} onSave={updateField} align="center" />

                    {/* Durada - editable */}
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {isEditing(loc.id, "durada_totalitat_s") ? (
                        <input type="number" defaultValue={loc.durada_totalitat_s} className="w-12 px-1 py-0.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 text-right"
                          onBlur={(e) => updateField(loc.id, "durada_totalitat_s", Number(e.target.value))}
                          onKeyDown={(e) => { if (e.key === "Enter") updateField(loc.id, "durada_totalitat_s", Number((e.target as HTMLInputElement).value)); if (e.key === "Escape") setEditing(null); }}
                          autoFocus />
                      ) : (
                        <span className={`cursor-pointer hover:text-blue-600 font-medium ${Number(loc.durada_totalitat_s) < 0 ? "text-red-500" : ""}`}
                          onClick={() => setEditing({ id: loc.id, field: "durada_totalitat_s" })}>
                          {loc.durada_totalitat_s}
                        </span>
                      )}
                    </td>

                    {/* Magnitud - editable */}
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {isEditing(loc.id, "magnitud") ? (
                        <input type="number" step="0.0001" defaultValue={Number(loc.magnitud)} className="w-16 px-1 py-0.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 text-right"
                          onBlur={(e) => updateField(loc.id, "magnitud", Number(e.target.value))}
                          onKeyDown={(e) => { if (e.key === "Enter") updateField(loc.id, "magnitud", Number((e.target as HTMLInputElement).value)); if (e.key === "Escape") setEditing(null); }}
                          autoFocus />
                      ) : (
                        <span className="cursor-pointer hover:text-blue-600" onClick={() => setEditing({ id: loc.id, field: "magnitud" })}>
                          {Number(loc.magnitud).toFixed(4)}
                        </span>
                      )}
                    </td>

                    {/* Star ratings */}
                    {users.map((user) => {
                      const vote = loc.votes.find((v) => v.user_id === user.id);
                      return (
                        <td key={user.id} className="px-0 py-1.5 text-center">
                          <StarRating rating={vote?.rating ?? 0} onChange={(r) => setRating(user.id, loc.id, r)} />
                        </td>
                      );
                    })}

                    {/* Average */}
                    <td className="px-2 py-1.5 text-right tabular-nums font-medium">{avg > 0 ? avg.toFixed(1) : "—"}</td>

                    {/* Notes */}
                    <td className="px-2 py-1.5">
                      {isEditing(loc.id, "notes") ? (
                        <textarea defaultValue={loc.notes || ""} className="w-full min-w-[80px] px-1 py-0.5 text-[10px] border rounded dark:bg-gray-700 dark:border-gray-600" rows={2}
                          onBlur={(e) => saveNote(loc.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }}
                          autoFocus />
                      ) : (
                        <span className="cursor-pointer hover:text-blue-600 text-[10px] block max-w-[120px] truncate"
                          onClick={() => setEditing({ id: loc.id, field: "notes" })} title={loc.notes || "Clic per afegir notes"}>
                          {loc.notes || "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-[10px] text-gray-400 space-y-0.5">
        <p>Clic a qualsevol valor per editar-lo · Clic a les capçaleres per ordenar</p>
        <p>P = Proposat · D = Descartat · Clic als noms d&apos;usuari per canviar-los</p>
      </div>
    </div>
  );
}

function displayName(loc: { custom_name: string | null; nom: string }) {
  return loc.custom_name || loc.nom;
}

function EditableCell({ id, field, value, type, editing, setEditing, onSave, align }: {
  id: number; field: string; value: string | number; type: "text" | "number";
  editing: { id: number; field: string } | null;
  setEditing: (e: { id: number; field: string } | null) => void;
  onSave: (id: number, field: string, value: string | number) => void;
  align: "left" | "center" | "right";
}) {
  const isActive = editing?.id === id && editing?.field === field;
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <td className={`px-2 py-1.5 tabular-nums ${alignClass}`}>
      {isActive ? (
        <input type={type} defaultValue={value} className={`w-16 px-1 py-0.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 ${alignClass}`}
          onBlur={(e) => onSave(id, field, type === "number" ? Number(e.target.value) : e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave(id, field, type === "number" ? Number((e.target as HTMLInputElement).value) : (e.target as HTMLInputElement).value);
            if (e.key === "Escape") setEditing(null);
          }}
          autoFocus />
      ) : (
        <span className="cursor-pointer hover:text-blue-600" onClick={() => setEditing({ id, field })}>{value}</span>
      )}
    </td>
  );
}

function StarRating({ rating, onChange }: { rating: number; onChange: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0 justify-center" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star}
          className={`text-sm leading-none transition-colors ${star <= (hover || rating) ? "text-amber-400" : "text-gray-300 dark:text-gray-600"}`}
          onMouseEnter={() => setHover(star)}
          onClick={() => onChange(star === rating ? 0 : star)}
          title={star === rating ? "Treure valoració" : `${star} estrella${star > 1 ? "s" : ""}`}>
          ★
        </button>
      ))}
    </div>
  );
}
