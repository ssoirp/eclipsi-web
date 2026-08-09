"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Espai } from "./LleureTypes";

const LleureMapGeneral = dynamic(() => import("./LleureMapGeneral"), { ssr: false });
const LleureCuracio = dynamic(() => import("./LleureCuracio"), { ssr: false });

interface Facets { comarques: string[]; municipis: string[]; categories: string[] }

export default function LleureViewer() {
  const [tab, setTab] = useState<"general" | "curacio">("general");
  const [data, setData] = useState<Espai[]>([]);
  const [facets, setFacets] = useState<Facets>({ comarques: [], municipis: [], categories: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/espais");
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      await fetch("/api/espais/setup", { method: "POST" });
      const res2 = await fetch("/api/espais");
      setData(await res2.json());
    } else {
      setData(rows);
    }
    const facetsRes = await fetch("/api/espais/facets");
    setFacets(await facetsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleUpdate(id: string, patch: Partial<Espai>) {
    setData((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function handleBulkUpdate(ids: string[], patch: Partial<Espai>) {
    const idSet = new Set(ids);
    setData((prev) => prev.map((r) => (idSet.has(r.id) ? { ...r, ...patch } : r)));
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">Carregant inventari...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex bg-[#1b3a2f]">
        <button
          className={`px-5 py-3 text-sm ${tab === "general" ? "bg-[#0f241c] text-white font-semibold" : "text-[#cfe8dc]"}`}
          onClick={() => setTab("general")}
        >
          Mapa general
        </button>
        <button
          className={`px-5 py-3 text-sm ${tab === "curacio" ? "bg-[#0f241c] text-white font-semibold" : "text-[#cfe8dc]"}`}
          onClick={() => setTab("curacio")}
        >
          Curació
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {tab === "general" ? (
          <LleureMapGeneral data={data} />
        ) : (
          <LleureCuracio data={data} facets={facets} onUpdate={handleUpdate} onBulkUpdate={handleBulkUpdate} />
        )}
      </div>
    </div>
  );
}
