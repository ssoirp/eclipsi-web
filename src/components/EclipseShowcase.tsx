"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import LocationCard from "./LocationCard";
import LocationDetailModal from "./LocationDetailModal";
import { ShowcaseLocation, ShowcaseUser, entornLabel, avgRating } from "./showcaseTypes";

const EclipseShowcaseMap = dynamic(() => import("./EclipseShowcaseMap"), { ssr: false });

type SortKey = "none" | "valoracio" | "trajecte" | "eclipsi";

export default function EclipseShowcase() {
  const [locations, setLocations] = useState<ShowcaseLocation[]>([]);
  const [users, setUsers] = useState<ShowcaseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"fitxes" | "mapa">("fitxes");
  const [entornFilter, setEntornFilter] = useState<string[]>([]);
  const [selected, setSelected] = useState<ShowcaseLocation | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("none");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/locations");
      const data = await res.json();
      setLocations((data.locations || []).filter((l: ShowcaseLocation) => l.visible));
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

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "none") return 0;
    let av: number, bv: number;
    if (sortKey === "valoracio") { av = avgRating(a); bv = avgRating(b); }
    else if (sortKey === "trajecte") { av = a.distancia_min; bv = b.distancia_min; }
    else { av = a.durada_totalitat_s; bv = b.durada_totalitat_s; }
    return sortAsc ? av - bv : bv - av;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

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

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-400 mr-1">Ordenar:</span>
          <SortBtn label="Valoració" active={sortKey === "valoracio"} asc={sortAsc} onClick={() => toggleSort("valoracio")} />
          <SortBtn label="Temps de trajecte" active={sortKey === "trajecte"} asc={sortAsc} onClick={() => toggleSort("trajecte")} />
          <SortBtn label="Durada eclipsi" active={sortKey === "eclipsi"} asc={sortAsc} onClick={() => toggleSort("eclipsi")} />
        </div>

        <span className="text-sm text-gray-400 ml-auto">{filtered.length} llocs</span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Encara no hi ha punts publicats amb aquest filtre.</div>
      ) : viewMode === "fitxes" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sorted.map((loc) => (
            <LocationCard key={loc.id} loc={loc} onOpen={() => setSelected(loc)} />
          ))}
        </div>
      ) : (
        <EclipseShowcaseMap locations={sorted} onOpen={setSelected} />
      )}

      {selected && <LocationDetailModal loc={selected} users={users} onClose={() => setSelected(null)} />}
    </div>
  );
}

function SortBtn({ label, active, asc, onClick }: { label: string; active: boolean; asc: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-sm transition-colors ${
        active ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      {label} {active ? (asc ? "↑" : "↓") : ""}
    </button>
  );
}
