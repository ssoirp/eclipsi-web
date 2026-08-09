"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

const EclipseMap = dynamic(() => import("./EclipseMap"), { ssr: false });

interface Vote { id: number; user_id: number; rating: number }
interface ImageRecord { id: number; url: string }
interface Location {
  id: number; nom: string; custom_name: string | null; municipi: string;
  tipus_eclipsi: string; inici_eclipsi: string; inici_totalitat: string;
  maxim_eclipsi: string; final_totalitat: string; final_eclipsi: string;
  durada_totalitat_s: number; magnitud: number; obscuracio: string;
  distancia_km: number; distancia_min: number; latitud: number; longitud: number;
  google_maps_url: string; proposat: boolean; descartat: boolean; visible: boolean;
  notes: string; tipus_entorn: string; votes: Vote[]; images: ImageRecord[];
}
interface User { id: number; name: string; is_admin: boolean }

type SortKey = "nom" | "distancia_km" | "distancia_min" | "durada_totalitat_s" | "inici_totalitat" | "magnitud" | "avg_rating";

function displayName(loc: { custom_name: string | null; nom: string }) {
  return loc.custom_name || loc.nom;
}

export default function EclipseTable() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("distancia_km");
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: number; field: string } | null>(null);
  const [showOnlyProposed, setShowOnlyProposed] = useState(false);
  const [hideDiscarded, setHideDiscarded] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "map">("cards");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingPoint, setAddingPoint] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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
      } else { setLocations(data.locations); setUsers(data.users); setLoading(false); }
    }
    init();
  }, [fetchData]);

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

  // --- API ---
  const updateField = async (locationId: number, field: string, value: string | number | boolean) => {
    await fetch("/api/location-update", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location_id: locationId, field, value }) });
    setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, [field]: value } : loc));
    setEditing(null);
  };
  const saveCustomName = async (locationId: number, customName: string) => {
    await fetch("/api/custom-name", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location_id: locationId, custom_name: customName || null }) });
    setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, custom_name: customName || null } : loc));
    setEditing(null);
  };
  const saveNote = async (locationId: number, notes: string) => {
    await fetch("/api/notes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location_id: locationId, notes }) });
    setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, notes } : loc));
    setEditing(null);
  };
  const saveUserName = async (userId: number, name: string) => {
    await fetch("/api/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: userId, name }) });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, name } : u));
  };
  const saveEntorn = async (locationId: number, tipus_entorn: string) => {
    await fetch("/api/entorn", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location_id: locationId, tipus_entorn }) });
    setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, tipus_entorn } : loc));
  };
  const setRating = async (userId: number, locationId: number, rating: number) => {
    await fetch("/api/votes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, location_id: locationId, rating }) });
    setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, votes: loc.votes.map((v) => v.user_id === userId ? { ...v, rating } : v) } : loc));
  };
  const togglePropose = async (locationId: number, current: boolean) => {
    await updateField(locationId, "descartat", false);
    await fetch("/api/propose", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location_id: locationId, proposat: !current }) });
    setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, proposat: !current, descartat: false } : loc));
  };
  const toggleDiscard = async (locationId: number, current: boolean) => {
    const newVal = !current;
    await updateField(locationId, "descartat", newVal);
    if (newVal) {
      await fetch("/api/propose", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location_id: locationId, proposat: false }) });
      setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, proposat: false } : loc));
    }
  };
  const toggleVisible = async (locationId: number, current: boolean) => {
    await updateField(locationId, "visible", !current);
    setLocations((prev) => prev.map((loc) => loc.id === locationId ? { ...loc, visible: !current } : loc));
  };
  const uploadImage = async (locationId: number, file: File) => {
    const fd = new FormData(); fd.append("file", file); fd.append("location_id", String(locationId));
    await fetch("/api/images", { method: "POST", body: fd });
    await fetchData();
  };
  const deleteImage = async (id: number, url: string) => {
    await fetch("/api/images", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, url }) });
    await fetchData();
  };
  const addPoint = async (nom: string, latitud: string, longitud: string) => {
    setAddingPoint(true);
    setAddError(null);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, latitud: latitud || null, longitud: longitud || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Error afegint el punt");
        return;
      }
      setLocations((prev) => [...prev, data.location]);
      setShowAddForm(false);
    } catch {
      setAddError("Error de connexió");
    } finally {
      setAddingPoint(false);
    }
  };

  const isEd = (id: number, field: string) => editing?.id === id && editing?.field === field;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => handleSort(k)}
      className={`px-2 py-1 rounded text-xs transition-colors ${sortKey === k ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label} {sortKey === k ? (sortAsc ? "↑" : "↓") : ""}
    </button>
  );

  if (loading) return <div className="text-center py-12 text-gray-500">Carregant dades...</div>;

  return (
    <div>
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer p-4" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl" />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
          <button onClick={() => setViewMode("cards")} className={`px-3 py-1.5 text-sm font-medium ${viewMode === "cards" ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-800"}`}>Llista</button>
          <button onClick={() => setViewMode("map")} className={`px-3 py-1.5 text-sm font-medium ${viewMode === "map" ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-800"}`}>Mapa</button>
        </div>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={showOnlyProposed} onChange={() => setShowOnlyProposed(!showOnlyProposed)} className="rounded" />Només proposats</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={hideDiscarded} onChange={() => setHideDiscarded(!hideDiscarded)} className="rounded" />Amagar descartats</label>
        <span className="text-sm text-gray-400">{sorted.length}/{locations.length}</span>
        <span className="text-xs text-gray-400">P=Proposar · D=Descartar · 👁=Visible a la Mostra pública</span>
        <button onClick={() => { setShowAddForm(true); setAddError(null); }}
          className="ml-auto px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600">
          + Afegir punt
        </button>
      </div>

      {showAddForm && (
        <AddPointForm
          submitting={addingPoint}
          error={addError}
          onCancel={() => setShowAddForm(false)}
          onSubmit={addPoint}
        />
      )}

      {/* Sort bar */}
      {viewMode === "cards" && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="text-xs text-gray-400 mr-1">Ordenar:</span>
          <SortBtn k="distancia_km" label="Dist. km" />
          <SortBtn k="distancia_min" label="Dist. min" />
          <SortBtn k="durada_totalitat_s" label="Durada" />
          <SortBtn k="inici_totalitat" label="Inici total." />
          <SortBtn k="magnitud" label="Magnitud" />
          <SortBtn k="avg_rating" label="Valoració" />
          <SortBtn k="nom" label="Nom" />
        </div>
      )}

      {viewMode === "map" ? (
        <EclipseMap locations={locations} users={users} showOnlyProposed={showOnlyProposed} onTogglePropose={togglePropose} />
      ) : (
        <div className="space-y-2">
          {sorted.map((loc) => {
            const avg = avgRating(loc);
            const borderColor = loc.descartat ? "border-red-300 dark:border-red-800" : loc.proposat ? "border-green-400 dark:border-green-700" : "border-gray-200 dark:border-gray-700";
            const bgColor = loc.descartat ? "bg-red-50/50 dark:bg-red-950/30" : loc.proposat ? "bg-green-50/50 dark:bg-green-950/20" : "bg-white dark:bg-gray-900";

            return (
              <div key={loc.id} className={`border ${borderColor} ${bgColor} rounded-lg p-3 ${loc.descartat ? "opacity-50" : ""}`}>
                {/* Row 1: Name + status + image */}
                <div className="flex gap-3 items-start">
                  {/* Image column */}
                  <div className="shrink-0">
                    {loc.images?.[0] ? (
                      <div className="relative group">
                        <img src={loc.images[0].url} alt="" className="w-16 h-16 object-cover rounded-lg cursor-pointer border border-gray-200 dark:border-gray-600 hover:opacity-80"
                          onClick={() => setLightboxImg(loc.images[0].url)} />
                        {loc.images.length > 1 && <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{loc.images.length}</span>}
                        <button onClick={() => deleteImage(loc.images[0].id, loc.images[0].url)} className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full hidden group-hover:flex items-center justify-center">x</button>
                      </div>
                    ) : (
                      <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors">
                        <span className="text-gray-400 text-xl">+</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(loc.id, f); }} />
                      </label>
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Propose / Discard buttons */}
                      <button onClick={() => togglePropose(loc.id, loc.proposat)}
                        className={`w-6 h-6 rounded-md text-xs font-bold shrink-0 ${loc.proposat ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400 hover:bg-green-100"}`}
                        title={loc.proposat ? "Desproposar" : "Proposar"}>
                        {loc.proposat ? "✓" : "P"}
                      </button>
                      <button onClick={() => toggleDiscard(loc.id, loc.descartat)}
                        className={`w-6 h-6 rounded-md text-xs font-bold shrink-0 ${loc.descartat ? "bg-red-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400 hover:bg-red-100"}`}
                        title={loc.descartat ? "Recuperar" : "Descartar"}>
                        {loc.descartat ? "✗" : "D"}
                      </button>
                      <button onClick={() => toggleVisible(loc.id, loc.visible)}
                        className={`w-6 h-6 rounded-md text-xs font-bold shrink-0 ${loc.visible ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400 hover:bg-blue-100"}`}
                        title={loc.visible ? "Visible a la Mostra pública (clic per amagar)" : "Amagat de la Mostra pública (clic per mostrar)"}>
                        {loc.visible ? "👁" : "—"}
                      </button>

                      {/* Name */}
                      {isEd(loc.id, "nom") ? (
                        <input defaultValue={loc.custom_name || loc.nom} className="text-sm font-semibold px-1.5 py-0.5 border rounded dark:bg-gray-700 dark:border-gray-600 flex-1"
                          onBlur={(e) => saveCustomName(loc.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveCustomName(loc.id, (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditing(null); }}
                          autoFocus />
                      ) : (
                        <span className={`text-sm font-semibold cursor-pointer hover:text-blue-600 truncate ${loc.descartat ? "line-through" : ""}`}
                          onClick={() => setEditing({ id: loc.id, field: "nom" })}
                          title={`${loc.nom}${loc.custom_name ? ` (orig: ${loc.nom})` : ""} — clic per editar`}>
                          {displayName(loc)}
                        </span>
                      )}

                      <a href={loc.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600 shrink-0" title="Google Maps">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </a>

                      {/* Municipi */}
                      {isEd(loc.id, "municipi") ? (
                        <input defaultValue={loc.municipi || ""} className="text-xs px-1.5 py-0.5 border rounded dark:bg-gray-700 dark:border-gray-600 w-28" placeholder="Municipi..."
                          onBlur={(e) => updateField(loc.id, "municipi", e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") updateField(loc.id, "municipi", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditing(null); }}
                          autoFocus />
                      ) : loc.municipi ? (
                        <span className="text-xs text-gray-400 cursor-pointer hover:text-blue-500" onClick={() => setEditing({ id: loc.id, field: "municipi" })}>({loc.municipi})</span>
                      ) : (
                        <span className="text-xs text-gray-300 cursor-pointer hover:text-blue-500" onClick={() => setEditing({ id: loc.id, field: "municipi" })}>+ municipi</span>
                      )}

                      {/* Entorn */}
                      <select value={loc.tipus_entorn || ""} onChange={(e) => saveEntorn(loc.id, e.target.value)}
                        className="text-[11px] bg-transparent border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 cursor-pointer"
                        title="Urbà = al mig d'un poble · Picnic = entorn natural urbanitzat · Natura = al mig del no res">
                        <option value="">Entorn...</option>
                        <option value="urba">Urbà</option>
                        <option value="picnic">Picnic</option>
                        <option value="natura">Natura</option>
                      </select>
                    </div>

                    {/* Row 2: Data grid */}
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-1 text-xs">
                      <DataCell label="Dist." id={loc.id} field="distancia_km" value={loc.distancia_km} suffix=" km" type="number" editing={editing} setEditing={setEditing} onSave={updateField} />
                      <DataCell label="Temps" id={loc.id} field="distancia_min" value={loc.distancia_min} suffix=" min" type="number" editing={editing} setEditing={setEditing} onSave={updateField} />
                      <DataCell label="Inici ecl." id={loc.id} field="inici_eclipsi" value={loc.inici_eclipsi} type="text" editing={editing} setEditing={setEditing} onSave={updateField} />
                      <DataCell label="Inici tot." id={loc.id} field="inici_totalitat" value={loc.inici_totalitat} type="text" editing={editing} setEditing={setEditing} onSave={updateField} />
                      <DataCell label="Fi tot." id={loc.id} field="final_totalitat" value={loc.final_totalitat} type="text" editing={editing} setEditing={setEditing} onSave={updateField} />
                      <DataCell label="Fi ecl." id={loc.id} field="final_eclipsi" value={loc.final_eclipsi} type="text" editing={editing} setEditing={setEditing} onSave={updateField} />
                      <div>
                        <span className="text-gray-400">Durada </span>
                        {isEd(loc.id, "durada_totalitat_s") ? (
                          <input type="number" defaultValue={loc.durada_totalitat_s} className="w-12 px-1 py-0 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                            onBlur={(e) => updateField(loc.id, "durada_totalitat_s", Number(e.target.value))}
                            onKeyDown={(e) => { if (e.key === "Enter") updateField(loc.id, "durada_totalitat_s", Number((e.target as HTMLInputElement).value)); if (e.key === "Escape") setEditing(null); }}
                            autoFocus />
                        ) : (
                          <span className={`font-semibold cursor-pointer hover:text-blue-600 ${Number(loc.durada_totalitat_s) < 0 ? "text-red-500" : ""}`}
                            onClick={() => setEditing({ id: loc.id, field: "durada_totalitat_s" })}>{loc.durada_totalitat_s}s</span>
                        )}
                      </div>
                      <DataCell label="Mag." id={loc.id} field="magnitud" value={Number(loc.magnitud).toFixed(4)} type="number" editing={editing} setEditing={setEditing} onSave={updateField} />
                    </div>

                    {/* Row 3: Ratings + Notes */}
                    <div className="mt-2 flex gap-4 items-start flex-wrap">
                      {/* Ratings inline */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {users.map((user) => {
                          const vote = loc.votes.find((v) => v.user_id === user.id);
                          const r = vote?.rating ?? 0;
                          return (
                            <UserRating key={user.id} user={user} rating={r}
                              onRate={(rating) => setRating(user.id, loc.id, rating)}
                              onRename={(name) => saveUserName(user.id, name)} />
                          );
                        })}
                        {avg > 0 && (
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                            Mitj: {avg.toFixed(1)}
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="flex-1 min-w-[120px]">
                        {isEd(loc.id, "notes") ? (
                          <textarea defaultValue={loc.notes || ""} className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600" rows={2} placeholder="Notes..."
                            onBlur={(e) => saveNote(loc.id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }}
                            autoFocus />
                        ) : (
                          <div className="text-xs text-gray-400 cursor-pointer hover:text-blue-600 truncate"
                            onClick={() => setEditing({ id: loc.id, field: "notes" })} title={loc.notes || "Clic per afegir notes"}>
                            {loc.notes ? <span className="text-gray-600 dark:text-gray-300">{loc.notes}</span> : <span>+ notes</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddPointForm({ submitting, error, onCancel, onSubmit }: {
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (nom: string, latitud: string, longitud: string) => void;
}) {
  const [nom, setNom] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    onSubmit(nom.trim(), latitud.trim(), longitud.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Nom / lloc *</label>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Ermita de..."
          className="px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 w-56" autoFocus required />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Latitud (opcional)</label>
        <input value={latitud} onChange={(e) => setLatitud(e.target.value)} placeholder="41.466194"
          className="px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 w-32" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Longitud (opcional)</label>
        <input value={longitud} onChange={(e) => setLongitud(e.target.value)} placeholder="0.847361"
          className="px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 w-32" />
      </div>
      <button type="submit" disabled={submitting}
        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50">
        {submitting ? "Calculant..." : "Afegir"}
      </button>
      <button type="button" onClick={onCancel} disabled={submitting}
        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
        Cancel·lar
      </button>
      {error && <p className="text-sm text-red-500 basis-full">{error}</p>}
      <p className="text-xs text-gray-400 basis-full">
        Si no poses coordenades, es buscarà el lloc automàticament per nom (com fa el script Python).
      </p>
    </form>
  );
}

function DataCell({ label, id, field, value, suffix, type, editing, setEditing, onSave }: {
  label: string; id: number; field: string; value: string | number; suffix?: string; type: "text" | "number";
  editing: { id: number; field: string } | null;
  setEditing: (e: { id: number; field: string } | null) => void;
  onSave: (id: number, field: string, value: string | number) => void;
}) {
  const isActive = editing?.id === id && editing?.field === field;
  return (
    <div>
      <span className="text-gray-400">{label} </span>
      {isActive ? (
        <input type={type === "number" ? "number" : "text"} defaultValue={value}
          className="w-16 px-1 py-0 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
          onBlur={(e) => onSave(id, field, type === "number" ? Number(e.target.value) : e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave(id, field, type === "number" ? Number((e.target as HTMLInputElement).value) : (e.target as HTMLInputElement).value);
            if (e.key === "Escape") setEditing(null);
          }}
          autoFocus />
      ) : (
        <span className="tabular-nums cursor-pointer hover:text-blue-600" onClick={() => setEditing({ id, field })}>
          {value}{suffix || ""}
        </span>
      )}
    </div>
  );
}

function UserRating({ user, rating, onRate, onRename }: {
  user: User; rating: number;
  onRate: (r: number) => void;
  onRename: (name: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-1">
      {renaming ? (
        <input ref={inputRef} defaultValue={user.name} className="w-14 text-[10px] px-1 py-0.5 border rounded dark:bg-gray-700 dark:border-gray-600"
          onBlur={(e) => { onRename(e.target.value); setRenaming(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") { onRename((e.target as HTMLInputElement).value); setRenaming(false); } if (e.key === "Escape") setRenaming(false); }}
          autoFocus />
      ) : (
        <span className="text-[10px] text-gray-400 cursor-pointer hover:text-blue-500 w-14 truncate"
          onClick={() => setRenaming(true)} title="Clic per canviar nom">
          {user.name}
        </span>
      )}
      <div className="flex gap-px">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onRate(n === rating ? 0 : n)}
            className={`w-5 h-5 rounded text-[10px] font-bold transition-all ${
              n <= rating
                ? "bg-amber-400 text-white shadow-sm"
                : "bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            }`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
