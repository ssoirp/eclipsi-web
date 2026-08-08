const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "eclipsi-web/1.0 (ús personal; dades OpenStreetMap)";
const TARGET_LAT = 41.5;
const TARGET_LON = 0.78;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radius = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dphi = toRad(lat2 - lat1);
  const dlambda = toRad(lon2 - lon1);
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlambda / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

interface NominatimCandidate {
  lat: string;
  lon: string;
  type?: string;
  display_name?: string;
  address?: Record<string, string>;
}

export interface GeocodeResult {
  latitud: number;
  longitud: number;
  municipi: string;
  displayName: string;
  confidence: string;
}

export async function geocodePlace(name: string): Promise<GeocodeResult | null> {
  const queries = [
    `${name}, Lleida, Catalunya, Espanya`,
    `${name}, Catalunya, Espanya`,
    name,
  ];

  let candidates: NominatimCandidate[] = [];
  for (const query of queries) {
    const url = `${NOMINATIM_URL}?${new URLSearchParams({
      q: query,
      format: "jsonv2",
      limit: "5",
      addressdetails: "1",
      countrycodes: "es",
    })}`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "ca,es;q=0.9,en;q=0.7" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) continue;
    candidates = await res.json();
    if (candidates.length > 0) break;
  }

  if (candidates.length === 0) return null;

  const score = (c: NominatimCandidate): number => {
    const lat = parseFloat(c.lat);
    const lon = parseFloat(c.lon);
    const display = (c.display_name || "").toLowerCase();
    const distance = haversineKm(TARGET_LAT, TARGET_LON, lat, lon);
    let value = -distance;
    if (display.includes("lleida") || c.address?.province?.toLowerCase() === "lleida") value += 100;
    if (["viewpoint", "place_of_worship", "ruins", "castle"].includes(c.type || "")) value += 10;
    return value;
  };

  const best = candidates.reduce((a, b) => (score(b) > score(a) ? b : a));
  const lat = parseFloat(best.lat);
  const lon = parseFloat(best.lon);
  const address = best.address || {};
  const municipi =
    address.municipality || address.town || address.village || address.city || address.county || "";
  const distance = haversineKm(TARGET_LAT, TARGET_LON, lat, lon);

  return {
    latitud: lat,
    longitud: lon,
    municipi,
    displayName: best.display_name || "",
    confidence: distance > 100 ? "REVISAR" : "Automàtica",
  };
}
