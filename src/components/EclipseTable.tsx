"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface Vote {
  id: number;
  user_id: number;
  vote: boolean;
}

interface ImageRecord {
  id: number;
  url: string;
}

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
  google_maps_url: string;
  proposat: boolean;
  notes: string;
  votes: Vote[];
  images: ImageRecord[];
}

interface User {
  id: number;
  name: string;
  is_admin: boolean;
}

type SortKey =
  | "nom"
  | "municipi"
  | "distancia_km"
  | "distancia_min"
  | "durada_totalitat_s"
  | "inici_eclipsi"
  | "inici_totalitat"
  | "magnitud";

export default function EclipseTable() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("distancia_km");
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [setupDone, setSetupDone] = useState(false);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<number | null>(null);
  const [expandedImages, setExpandedImages] = useState<number | null>(null);
  const [showOnlyProposed, setShowOnlyProposed] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const userRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

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
        setSetupDone(true);
        await fetchData();
      } else {
        setLocations(data.locations);
        setUsers(data.users);
        setLoading(false);
        setSetupDone(true);
      }
    }
    init();
  }, [fetchData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sorted = [...locations]
    .filter((l) => !showOnlyProposed || l.proposat)
    .sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

  const toggleVote = async (userId: number, locationId: number, currentVote: boolean) => {
    await fetch("/api/votes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, location_id: locationId, vote: !currentVote }),
    });
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === locationId
          ? {
              ...loc,
              votes: loc.votes.map((v) =>
                v.user_id === userId ? { ...v, vote: !currentVote } : v
              ),
            }
          : loc
      )
    );
  };

  const saveNote = async (locationId: number, notes: string) => {
    await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: locationId, notes }),
    });
    setLocations((prev) =>
      prev.map((loc) => (loc.id === locationId ? { ...loc, notes } : loc))
    );
    setEditingNote(null);
  };

  const saveUserName = async (userId: number, name: string) => {
    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, name }),
    });
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, name } : u)));
    setEditingUser(null);
  };

  const saveCustomName = async (locationId: number, customName: string) => {
    await fetch("/api/custom-name", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: locationId, custom_name: customName || null }),
    });
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === locationId ? { ...loc, custom_name: customName || null } : loc
      )
    );
    setEditingName(null);
  };

  const togglePropose = async (locationId: number, current: boolean) => {
    await fetch("/api/propose", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: locationId, proposat: !current }),
    });
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === locationId ? { ...loc, proposat: !current } : loc
      )
    );
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

  if (loading && !setupDone) {
    return <div className="text-center py-12 text-gray-500">Carregant dades...</div>;
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Inicialitzant base de dades...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showOnlyProposed}
            onChange={() => setShowOnlyProposed(!showOnlyProposed)}
            className="rounded"
          />
          Mostrar només proposats
        </label>
        <span className="text-sm text-gray-400">
          {sorted.length} de {locations.length} punts
        </span>
      </div>

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="px-2 py-2 text-left font-medium">#</th>
              <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Proposat</th>
              <th
                className="px-2 py-2 text-left font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap"
                onClick={() => handleSort("nom")}
              >
                Nom{sortIcon("nom")}
              </th>
              <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Nom personalitzat</th>
              <th
                className="px-2 py-2 text-left font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap"
                onClick={() => handleSort("municipi")}
              >
                Municipi{sortIcon("municipi")}
              </th>
              <th
                className="px-2 py-2 text-right font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap"
                onClick={() => handleSort("distancia_km")}
              >
                Dist. km{sortIcon("distancia_km")}
              </th>
              <th
                className="px-2 py-2 text-right font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap"
                onClick={() => handleSort("distancia_min")}
              >
                Dist. min{sortIcon("distancia_min")}
              </th>
              <th
                className="px-2 py-2 text-center font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap"
                onClick={() => handleSort("inici_eclipsi")}
              >
                Inici eclipsi{sortIcon("inici_eclipsi")}
              </th>
              <th
                className="px-2 py-2 text-center font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap"
                onClick={() => handleSort("inici_totalitat")}
              >
                Inici totalitat{sortIcon("inici_totalitat")}
              </th>
              <th className="px-2 py-2 text-center font-medium whitespace-nowrap">Final totalitat</th>
              <th className="px-2 py-2 text-center font-medium whitespace-nowrap">Tipus</th>
              <th
                className="px-2 py-2 text-right font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap"
                onClick={() => handleSort("durada_totalitat_s")}
              >
                Durada (s){sortIcon("durada_totalitat_s")}
              </th>
              <th
                className="px-2 py-2 text-right font-medium cursor-pointer hover:text-blue-600 whitespace-nowrap"
                onClick={() => handleSort("magnitud")}
              >
                Magnitud{sortIcon("magnitud")}
              </th>
              {users.map((user) => (
                <th key={user.id} className="px-2 py-2 text-center font-medium whitespace-nowrap min-w-[80px]">
                  {editingUser === user.id ? (
                    <input
                      ref={userRef}
                      defaultValue={user.name}
                      className="w-20 px-1 py-0.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                      onBlur={(e) => saveUserName(user.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveUserName(user.id, (e.target as HTMLInputElement).value);
                        if (e.key === "Escape") setEditingUser(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="cursor-pointer hover:text-blue-600"
                      onClick={() => setEditingUser(user.id)}
                      title="Fes clic per canviar el nom"
                    >
                      {user.name}
                      {user.is_admin && " *"}
                    </span>
                  )}
                </th>
              ))}
              <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Imatges</th>
              <th className="px-2 py-2 text-left font-medium whitespace-nowrap min-w-[150px]">Notes</th>
              <th className="px-2 py-2 text-center font-medium whitespace-nowrap">Mapa</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((loc, idx) => (
              <tr
                key={loc.id}
                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                  loc.proposat ? "bg-green-50 dark:bg-green-900/20" : ""
                }`}
              >
                <td className="px-2 py-2 text-gray-400">{idx + 1}</td>
                <td className="px-2 py-2 text-center">
                  <button
                    onClick={() => togglePropose(loc.id, loc.proposat)}
                    className={`w-6 h-6 rounded text-xs font-bold ${
                      loc.proposat
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                    }`}
                    title={loc.proposat ? "Desproposar" : "Proposar"}
                  >
                    {loc.proposat ? "P" : "-"}
                  </button>
                </td>
                <td className="px-2 py-2 font-medium max-w-[200px] truncate" title={loc.nom}>
                  {loc.nom}
                </td>
                <td className="px-2 py-2">
                  {editingName === loc.id ? (
                    <input
                      ref={nameRef}
                      defaultValue={loc.custom_name || ""}
                      className="w-32 px-1 py-0.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Nom personalitzat..."
                      onBlur={(e) => saveCustomName(loc.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveCustomName(loc.id, (e.target as HTMLInputElement).value);
                        if (e.key === "Escape") setEditingName(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="cursor-pointer hover:text-blue-600 text-xs"
                      onClick={() => setEditingName(loc.id)}
                      title="Fes clic per editar"
                    >
                      {loc.custom_name || "—"}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2">{loc.municipi || "—"}</td>
                <td className="px-2 py-2 text-right tabular-nums">{loc.distancia_km}</td>
                <td className="px-2 py-2 text-right tabular-nums">{loc.distancia_min}</td>
                <td className="px-2 py-2 text-center tabular-nums">{loc.inici_eclipsi}</td>
                <td className="px-2 py-2 text-center tabular-nums">{loc.inici_totalitat}</td>
                <td className="px-2 py-2 text-center tabular-nums">{loc.final_totalitat}</td>
                <td className="px-2 py-2 text-center">
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      loc.tipus_eclipsi === "Total"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {loc.tipus_eclipsi}
                  </span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums font-medium">
                  <span className={loc.durada_totalitat_s < 0 ? "text-red-500" : ""}>
                    {loc.durada_totalitat_s}
                  </span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{Number(loc.magnitud).toFixed(4)}</td>
                {users.map((user) => {
                  const vote = loc.votes.find((v) => v.user_id === user.id);
                  const isVoted = vote?.vote ?? false;
                  return (
                    <td key={user.id} className="px-2 py-2 text-center">
                      <button
                        onClick={() => toggleVote(user.id, loc.id, isVoted)}
                        className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                          isVoted
                            ? "bg-blue-500 text-white hover:bg-blue-600"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {isVoted ? "Sí" : "No"}
                      </button>
                    </td>
                  );
                })}
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    {loc.images && loc.images.length > 0 && (
                      <button
                        onClick={() => setExpandedImages(expandedImages === loc.id ? null : loc.id)}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        {loc.images.length} img
                      </button>
                    )}
                    <label className="cursor-pointer text-xs text-gray-400 hover:text-blue-500">
                      +
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadImage(loc.id, file);
                        }}
                      />
                    </label>
                  </div>
                  {expandedImages === loc.id && loc.images && loc.images.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {loc.images.map((img) => (
                        <div key={img.id} className="relative group">
                          <a href={img.url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={img.url}
                              alt=""
                              className="w-12 h-12 object-cover rounded border"
                            />
                          </a>
                          <button
                            onClick={() => deleteImage(img.id, img.url)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full hidden group-hover:block leading-none"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-2 py-2">
                  {editingNote === loc.id ? (
                    <textarea
                      ref={noteRef}
                      defaultValue={loc.notes || ""}
                      className="w-full min-w-[120px] px-1 py-0.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                      rows={2}
                      onBlur={(e) => saveNote(loc.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingNote(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="cursor-pointer hover:text-blue-600 text-xs block max-w-[150px] truncate"
                      onClick={() => setEditingNote(loc.id)}
                      title={loc.notes || "Fes clic per afegir notes"}
                    >
                      {loc.notes || "—"}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-center">
                  <a
                    href={loc.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-xs"
                  >
                    Maps
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-400 space-y-1">
        <p>* = Administrador | P = Proposat | Fes clic als noms d&apos;usuari per canviar-los</p>
        <p>Fes clic a les capçaleres de columna per ordenar | Fes clic a &quot;Nom personalitzat&quot; per editar</p>
      </div>
    </div>
  );
}
