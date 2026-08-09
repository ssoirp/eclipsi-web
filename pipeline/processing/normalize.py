"""
Normalitza registres: nom normalitzat, assignació de municipi/comarca via
point-in-polygon contra els límits administratius municipals (OSM), i neteja
bàsica de categories.

Evitem Nominatim per registre (massa lent per milers de punts, 1 req/s);
construïm els polígons municipals un únic cop i fem la cerca localment.
"""
import json
import re
import unicodedata
from pathlib import Path
from shapely.geometry import Polygon, MultiPolygon, Point
from shapely.ops import polygonize, unary_union

COMARCA_ADMIN = {
    "Segrià": "Lleida",
    "Garrigues": "Lleida",
    "Conca de Barberà": "Tarragona",
    "Priorat": "Tarragona",
}


def normalize_text(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = s.lower().strip()
    s = re.sub(r"[^\w\s]", "", s)
    s = re.sub(r"\s+", " ", s)
    return s


def _relation_to_polygon(rel):
    """Construeix un (Multi)Polygon a partir dels segments 'geometry' dels
    membres way d'una relation OSM (out geom)."""
    segments = []
    for m in rel.get("members", []):
        if m.get("type") == "way" and "geometry" in m:
            coords = [(pt["lon"], pt["lat"]) for pt in m["geometry"]]
            if len(coords) >= 2:
                segments.append(coords)
    if not segments:
        return None
    try:
        merged = list(polygonize(segments))
        if not merged:
            return None
        poly = unary_union(merged)
        if poly.is_empty:
            return None
        return poly
    except Exception:
        return None


def load_municipality_polygons(path):
    data = json.loads(Path(path).read_text())
    polys = []
    for el in data.get("elements", []):
        if el.get("type") != "relation":
            continue
        name = el.get("tags", {}).get("name")
        if not name:
            continue
        poly = _relation_to_polygon(el)
        if poly is None:
            continue
        polys.append((name, poly))
    return polys


def assign_municipality(lat, lon, polys, allowed_names=None):
    """allowed_names: si es proporciona, nomes es consideren municipis que
    pertanyen realment a la comarca del registre (evita que un punt vora la
    frontera "cauci" dins un municipi vei d'una altra comarca)."""
    pt = Point(lon, lat)
    candidates = [(n, p) for n, p in polys if allowed_names is None or n in allowed_names]
    best = None
    for name, poly in candidates:
        try:
            if poly.contains(pt) or poly.touches(pt):
                return name
        except Exception:
            continue
    min_dist = None
    for name, poly in candidates:
        try:
            d = poly.distance(pt)
        except Exception:
            continue
        if min_dist is None or d < min_dist:
            min_dist = d
            best = name
    if min_dist is not None and min_dist < 0.01:  # ~1km en graus, marge de tolerancia
        return best
    return None


def load_comarca_polygons(path):
    return load_municipality_polygons(path)  # mateixa estructura (relations amb geometry)


def build_municipality_to_comarca(muni_polys, comarca_polys):
    """Per cada municipi, determina a quina comarca pertany comprovant quin
    poligon de comarca conte el seu centroide. Aixo es fa una vegada i
    substitueix qualsevol llista hardcoded (mes fiable i actualitzable)."""
    mapping = {}
    for muni_name, muni_poly in muni_polys:
        try:
            centroid = muni_poly.centroid
        except Exception:
            continue
        for comarca_name, comarca_poly in comarca_polys:
            try:
                if comarca_poly.contains(centroid):
                    mapping[muni_name] = comarca_name
                    break
            except Exception:
                continue
    return mapping


def normalize_record(rec, comarca, polys, muni_to_comarca):
    rec = dict(rec)
    rec["normalized_name"] = normalize_text(rec.get("name") or "")
    rec["comarca"] = comarca
    rec["province"] = COMARCA_ADMIN.get(comarca, "desconegut")
    allowed = {n for n, c in muni_to_comarca.items() if c == comarca} or None
    muni = assign_municipality(rec["latitude"], rec["longitude"], polys, allowed_names=allowed)
    rec["municipality"] = muni or "desconegut"
    return rec


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "collectors"))
    from osm import parse_elements

    polys = load_municipality_polygons("data/raw/municipis_4comarques.json")
    comarca_polys = load_comarca_polygons("data/raw/comarques_boundaries.json")
    muni_to_comarca = build_municipality_to_comarca(polys, comarca_polys)
    print(f"Poligons municipals carregats: {len(polys)}")
    print(f"Poligons de comarca carregats: {len(comarca_polys)}")
    print(f"Municipis mapejats a comarca: {len(muni_to_comarca)}")

    comarques = ["Priorat", "Segrià", "Garrigues", "Conca de Barberà"]
    all_records = []
    for comarca in comarques:
        fname = f"data/raw/osm_{comarca.lower()}.json"
        data = json.loads(Path(fname).read_text())
        recs = parse_elements(data)
        normed = [normalize_record(r, comarca, polys, muni_to_comarca) for r in recs]
        sense_muni = sum(1 for r in normed if r["municipality"] == "desconegut")
        print(f"{comarca}: {len(normed)} registres, {sense_muni} sense municipi assignat")
        all_records.extend(normed)

    out = Path("data/processed/normalized.json")
    out.write_text(json.dumps(all_records, ensure_ascii=False, indent=1))
    print(f"Total: {len(all_records)} registres -> {out}")
