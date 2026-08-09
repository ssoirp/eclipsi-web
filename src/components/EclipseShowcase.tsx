"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import LocationCard from "./LocationCard";
import LocationDetailModal from "./LocationDetailModal";
import { ShowcaseLocation, ShowcaseUser, entornLabel } from "./showcaseTypes";

const EclipseShowcaseMap = dynamic(() => import("./EclipseShowcaseMap"), { ssr: false });

export default function EclipseShowcase() {
  const [locations, setLocations] = useState<ShowcaseLocation[]>([]);
  const [users, setUsers] = useState<ShowcaseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"fitxes" | "mapa">("fitxes");
  const [entornFilter, setEntornFilter] = useState<string[]>([]);
  const [selected, setSelected] = useState<ShowcaseLocation | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/locations");
      const data = await res.json();
      setLocations((data.locations || []).filter((l: ShowcaseLocation) => l.visible && !l.descartat));
      setUsers(data.users || []);
      setLoading(false);
    }
    load();
  }, []);

  const availableEntorns = useMemo(
    () => [...new Set(locations.map((l) => l.tipus_entorn).filter(Boolean))],
    [locations]
  );

  function toggleEntorn(t: string) {
    setEntornFilter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  const filtered = locations.filter((l) => entornFilter.length === 0 || entornFilter.includes(l.tipus_entorn));

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Carregant...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setViewMode("fitxes")}
            className={`px-4 py-2 text-sm font-medium ${viewMode === "fitxes" ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-800"}`}
          >
            Fitxes
          </button>
          <button
            onClick={() => setViewMode("mapa")}
            className={`px-4 py-2 text-sm font-medium ${viewMode === "mapa" ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-800"}`}
          >
            Mapa
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {availableEntorns.map((t) => (
            <button
              key={t}
              onClick={() => toggleEntorn(t)}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                entornFilter.includes(t)
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              }`}
            >
              {entornLabel(t)}
            </button>
          ))}
          {entornFilter.length > 0 && (
            <button onClick={() => setEntornFilter([])} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 underline">
              Netejar
            </button>
          )}
        </div>

        <span className="text-sm text-gray-400 ml-auto">{filtered.length} llocs</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Encara no hi ha punts publicats amb aquest filtre.</div>
      ) : viewMode === "fitxes" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((loc) => (
            <LocationCard key={loc.id} loc={loc} onOpen={() => setSelected(loc)} />
          ))}
        </div>
      ) : (
        <EclipseShowcaseMap locations={filtered} onOpen={setSelected} />
      )}

      {selected && <LocationDetailModal loc={selected} users={users} onClose={() => setSelected(null)} />}
    </div>
  );
}
