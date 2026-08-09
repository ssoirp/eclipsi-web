export interface Espai {
  id: string;
  name: string | null;
  category: string;
  subcategory: string | null;
  comarca: string;
  municipality: string;
  latitude: number;
  longitude: number;
  picnic: string | null;
  tables: string | null;
  barbecue: string | null;
  drinking_water: string | null;
  toilets: string | null;
  parking: string | null;
  camping: string | null;
  caravan: string | null;
  accessibility: string | null;
  bathing: string | null;
  playground: string | null;
  sports_area: string | null;
  confidence_score: string | null;
  possible_duplicate: boolean;
  sources: string[];
  source_urls: string[];
  osm_id: string | null;
  notes: string | null;
  curation_status: "pending" | "interesting" | "not_interesting";
  curation_updated_at: string | null;
  selected: boolean;
}

export const CATEGORY_META: Record<string, { color: string; label: string }> = {
  espai_lleure: { color: "#2e7d32", label: "Espai de lleure" },
  acampada: { color: "#1565c0", label: "Acampada / turisme" },
  patrimoni: { color: "#8e24aa", label: "Patrimoni" },
  servei_puntual: { color: "#757575", label: "Servei puntual" },
  desconegut: { color: "#424242", label: "Desconegut" },
};

export function statusColor(r: Espai): string {
  if (r.selected) return "#f9a825";
  if (r.curation_status === "interesting") return "#2e7d32";
  if (r.curation_status === "not_interesting") return "#c62828";
  return CATEGORY_META[r.category]?.color || "#888";
}
