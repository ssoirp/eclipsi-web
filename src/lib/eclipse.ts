import * as Astronomy from "astronomy-engine";

const ECLIPSE_SEARCH_START_UTC = Date.UTC(2026, 7, 12, 0, 0, 0); // 12 Aug 2026 00:00 UTC
const LOCAL_TZ = "Europe/Madrid";
const AGRAMUNT_LAT = 41.7868;
const AGRAMUNT_LON = 1.0968;
const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";

const timeFmt = new Intl.DateTimeFormat("ca-ES", {
  timeZone: LOCAL_TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function fmtTime(date: Date | undefined): string {
  if (!date) return "";
  return timeFmt.format(date);
}

export interface EclipseInfo {
  tipus_eclipsi: string;
  inici_eclipsi: string;
  inici_totalitat: string;
  maxim_eclipsi: string;
  final_totalitat: string;
  final_eclipsi: string;
  durada_totalitat_s: number | null;
  magnitud: number | null;
  obscuracio: string;
}

export function computeEclipseLocal(lat: number, lon: number): EclipseInfo {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const startTime = Astronomy.MakeTime(new Date(ECLIPSE_SEARCH_START_UTC));
  const eclipse = Astronomy.SearchLocalSolarEclipse(startTime, observer);

  const kindMap: Record<string, string> = {
    total: "Total",
    annular: "Anular",
    partial: "Parcial",
    annular_total: "Híbrid",
  };
  const tipus = kindMap[eclipse.kind] || eclipse.kind;

  const isTotalOrAnnular = eclipse.total_begin !== undefined && eclipse.total_end !== undefined;
  const durada = isTotalOrAnnular
    ? (eclipse.total_end!.time.date.getTime() - eclipse.total_begin!.time.date.getTime()) / 1000
    : null;

  return {
    tipus_eclipsi: tipus,
    inici_eclipsi: fmtTime(eclipse.partial_begin?.time.date),
    inici_totalitat: eclipse.total_begin ? fmtTime(eclipse.total_begin.time.date) : "",
    maxim_eclipsi: fmtTime(eclipse.peak?.time.date),
    final_totalitat: eclipse.total_end ? fmtTime(eclipse.total_end.time.date) : "",
    final_eclipsi: fmtTime(eclipse.partial_end?.time.date),
    durada_totalitat_s: durada,
    magnitud: typeof eclipse.obscuration === "number" ? Number(eclipse.obscuration.toFixed(6)) : null,
    obscuracio: typeof eclipse.obscuration === "number" ? `${(eclipse.obscuration * 100).toFixed(4)}%` : "",
  };
}

export function mapsLink(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lon.toFixed(6)}`;
}

export async function drivingDistanceFromAgramunt(
  lat: number,
  lon: number
): Promise<{ distancia_km: number | null; distancia_min: number | null }> {
  try {
    const url =
      `${OSRM_ROUTE_URL}/${AGRAMUNT_LON.toFixed(6)},${AGRAMUNT_LAT.toFixed(6)};` +
      `${lon.toFixed(6)},${lat.toFixed(6)}?overview=false&steps=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { distancia_km: null, distancia_min: null };
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return { distancia_km: null, distancia_min: null };
    return {
      distancia_km: Number((route.distance / 1000).toFixed(1)),
      distancia_min: Math.round(route.duration / 60),
    };
  } catch {
    return { distancia_km: null, distancia_min: null };
  }
}
